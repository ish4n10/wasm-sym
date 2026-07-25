"""
FastAPI server for WASM Symbolic Executor
"""

import traceback
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "src"))

from parser import parse_code
from engine import explore, ExecutionLimitError

app = FastAPI(title="WASM Symbolic Executor")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ExecuteRequest(BaseModel):
    code: str


class ModelValues(BaseModel):
    values: Dict[str, str]


class FindingResponse(BaseModel):
    type: str
    pc: int
    model: Optional[Dict[str, str]]
    constraints: List[str]


class StatisticsResponse(BaseModel):
    exploredStates: int
    totalFindings: int


class StateResponse(BaseModel):
    id: int
    pc: int
    label: str
    status: str
    parent_id: int | None
    via_condition: str | None
    findings: List[FindingResponse]
    constraints: List[str]


class ExecuteResponse(BaseModel):
    findings: List[FindingResponse]
    statistics: StatisticsResponse
    program: List
    states: List[StateResponse]


OPCODES = {
    "Control Flow": {
        "nop": "No operation",
        "br": "Unconditional branch to address",
        "br_if": "Pop condition; branch to address if true, else continue",
        "unreachable": "Trap — records finding if path is feasible, then halts",
        "call": "Call function at address (saves locals frame)",
        "return": "Return from function (restores locals frame)",
        "HALT": "Stop execution (path ends)",
        "FOUND": "Success marker",
        "LABEL": "Label marker (no-op)",
        "IF_TRUE": "If-true marker (no-op)",
        "IF_FALSE": "If-false marker (no-op)",
    },
    "Local Variables": {
        "local.get": "Push local variable (auto-initializes as symbolic if unset)",
        "local.set": "Pop value and store in local variable",
    },
    "Constants": {
        "i32.const": "Push 32-bit integer constant",
    },
    "Arithmetic": {
        "i32.add": "Pop b, a; push a + b",
        "i32.sub": "Pop b, a; push a - b",
        "i32.mul": "Pop b, a; push a * b",
        "i32.div_s": "Pop divisor, dividend; push dividend / divisor (trap on zero or INT32_MIN/-1)",
        "i32.div_u": "Unsigned division (trap on zero)",
        "i32.rem_s": "Signed remainder (trap on zero)",
        "i32.rem_u": "Unsigned remainder (trap on zero)",
    },
    "Bitwise": {
        "i32.xor": "Pop b, a; push a ^ b",
        "i32.or": "Pop b, a; push a | b",
        "i32.and": "Pop b, a; push a & b",
        "i32.shl": "Pop count, value; push value << count",
        "i32.shr_u": "Pop count, value; push value >> count (unsigned)",
    },
    "Comparison": {
        "i32.eqz": "Pop value; push value == 0",
        "i32.eq": "Pop b, a; push a == b",
        "i32.lt_s": "Pop b, a; push a < b (signed)",
        "i32.lt_u": "Pop b, a; push a < b (unsigned)",
    },
    "Memory": {
        "i32.load": "Pop address; load 4 bytes LE, push i32 (trap on OOB)",
        "i32.store": "Pop value, address; store 4 bytes LE (trap on OOB)",
        "memory.grow": "Pop page count; grow memory, return old page count or -1 (trap on failure)",
    },
}

EXAMPLES = {
    "simple": """# Check if a < 100
local.get 0
i32.const 100
i32.lt_s
br_if 4
HALT

# Success
nop
FOUND""",
    "unreachable_test": """# Two paths: x<10 hits UNREACHABLE
local.get 0
i32.const 10
i32.lt_s
br_if 5
HALT
unreachable""",
    "div_by_zero": """# Symbolic division — may trap on zero
local.get 0
local.get 1
i32.div_s
HALT""",
    "memory_oob": """# Load from unrestricted symbolic address
local.get 0
i32.load
HALT""",
    "complex": """# First check: a < 100
local.get 0
i32.const 100
i32.lt_s
br_if 5
HALT

# Second check: b > 50
i32.const 50
local.get 1
i32.lt_s
br_if 11
HALT
nop

# Compute: (a + b) * 2
local.get 0
local.get 1
i32.add
i32.const 2
i32.mul
local.set 3

# Check: (a + b) * 2 < 300
local.get 3
i32.const 300
i32.lt_s
br_if 22
HALT

# Memory operations
local.get 0
i32.const 42
i32.store
local.get 0
i32.load
local.set 4

# Bitwise operations
local.get 0
local.get 1
i32.xor
local.get 2
i32.and
i32.const 0
i32.eqz
br_if 37
HALT

# Shift operations
local.get 0
i32.const 3
i32.shl
local.get 1
i32.const 2
i32.shr_u
i32.add
local.set 5

# Complex condition: local[5] == local[3] + 10
local.get 5
local.get 3
i32.const 10
i32.add
i32.eq
br_if 52
HALT

# Final arithmetic check
local.get 0
local.get 1
i32.sub
i32.const 0
i32.lt_s
br_if 59
HALT

# Success path
nop
FOUND""",
}


def model_to_dict(model):
    if model is None:
        return None
    result = {}
    for decl in model.decls():
        val = model[decl]
        if val is not None:
            result[decl.name()] = str(val)
    return result if result else None


@app.get("/")
def root():
    return {
        "name": "WASM Symbolic Executor",
        "endpoints": {
            "GET /opcodes": "List all supported opcodes",
            "GET /examples": "List example programs",
            "POST /parse": "Parse code without executing",
            "POST /execute": "Run symbolic execution and return findings",
        },
    }


@app.get("/opcodes")
def get_opcodes():
    return OPCODES


@app.get("/examples")
def get_examples():
    return EXAMPLES


class ParseRequest(BaseModel):
    code: str


class ParseResponse(BaseModel):
    program: List
    instrCount: int


@app.post("/parse", response_model=ParseResponse)
def parse(request: ParseRequest):
    try:
        program = parse_code(request.code)
        return ParseResponse(program=program, instrCount=len(program))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/execute", response_model=ExecuteResponse)
def execute(request: ExecuteRequest):
    try:
        program = parse_code(request.code)
        if not program:
            raise HTTPException(status_code=400, detail="No valid instructions found")

        findings_raw, explored, state_records = explore(program)

        findings = []
        for f in findings_raw:
            findings.append(
                FindingResponse(
                    type=f["type"],
                    pc=f["pc"],
                    model=model_to_dict(f.get("model")),
                    constraints=[str(c) for c in f.get("constraints", [])],
                )
            )

        states = []
        for sr in state_records:
            sr_findings = []
            for sf in sr["findings"]:
                sr_findings.append(
                    FindingResponse(
                        type=sf["type"],
                        pc=sf["pc"],
                        model=model_to_dict(sf.get("model")),
                        constraints=[str(c) for c in sf.get("constraints", [])],
                    )
                )
            states.append(
                StateResponse(
                    id=sr["id"],
                    pc=sr["pc"],
                    label=sr["label"],
                    status=sr["status"],
                    parent_id=sr["parent_id"],
                    via_condition=sr["via_condition"],
                    findings=sr_findings,
                    constraints=[str(c) for c in sr.get("constraints", [])],
                )
            )

        return ExecuteResponse(
            findings=findings,
            statistics=StatisticsResponse(
                exploredStates=explored, totalFindings=len(findings)
            ),
            program=program,
            states=states,
        )
    except ExecutionLimitError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))



if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
