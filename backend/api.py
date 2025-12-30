"""
FastAPI server for WASM Symbolic Executor
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict
import sys
from pathlib import Path

# Add src directory to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from parser import parse_code
from engine import explore
from helpers.solve import solve_constraints

app = FastAPI(title="WASM ")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ExecuteRequest(BaseModel):
    code: str
    max_steps: int = 1000
    find_pcs: Optional[List[int]] = None
    avoid_pcs: Optional[List[int]] = None

class ExecuteResponse(BaseModel):
    graphData: dict
    foundStates: List[dict]
    statistics: dict

# Opcodes documentation
OPCODES = {
    "Control Flow": {
        "nop": "No operation - does nothing",
        "br": "Unconditional branch to target address (requires target address)",
        "br_if": "Conditional branch - branches to target if condition is true, otherwise continues",
        "HALT": "Stops execution at this point (dead end)",
        "FOUND": "Marks this state as a found/success state",
        "call": "Calls a function at the given address",
        "return": "Returns from the current function",
        "LABEL": "Label marker (no operation)",
        "IF_TRUE": "If-true marker (no operation)",
        "IF_FALSE": "If-false marker (no operation)",
    },
    "Local Variables": {
        "local.get": "Gets a local variable and pushes it onto the stack (auto-initializes if not exists)",
        "local.set": "Pops a value from stack and stores it in a local variable",
    },
    "Constants": {
        "i32.const": "Pushes a 32-bit integer constant onto the stack (requires integer value)",
    },
    "Arithmetic Operations": {
        "i32.add": "Pops two values, adds them, pushes result (a + b)",
        "i32.sub": "Pops two values, subtracts them, pushes result (a - b)",
        "i32.mul": "Pops two values, multiplies them, pushes result (a * b)",
    },
    "Bitwise Operations": {
        "i32.and": "Pops two values, bitwise AND, pushes result (a & b)",
        "i32.or": "Pops two values, bitwise OR, pushes result (a | b)",
        "i32.xor": "Pops two values, bitwise XOR, pushes result (a ^ b)",
        "i32.shl": "Pops shift amount and value, left shifts, pushes result (value << shift)",
        "i32.shr_u": "Pops shift amount and value, unsigned right shifts, pushes result (value >> shift)",
    },
    "Comparison Operations": {
        "i32.eqz": "Pops a value, checks if equal to zero, pushes boolean result",
        "i32.eq": "Pops two values, checks if equal, pushes boolean result (a == b)",
        "i32.lt_s": "Pops two values, signed less-than comparison, pushes boolean (a < b)",
        "i32.lt_u": "Pops two values, unsigned less-than comparison, pushes boolean (a < b)",
    },
    "Memory Operations": {
        "i32.load": "Pops an address, loads 32-bit value from memory, pushes result",
        "i32.store": "Pops value and address, stores value at address in memory",
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
FOUND"""
}

@app.get("/")
def root():
    return {"message": "WASM Symbolic Executor API"}

@app.get("/examples")
def get_examples():
    return EXAMPLES

@app.get("/get-codes")
def get_codes():
    """Returns all opcodes organized by category with descriptions"""
    return OPCODES

@app.post("/execute", response_model=ExecuteResponse)
def execute(request: ExecuteRequest):
    try:
        program = parse_code(request.code)
        
        if not program:
            raise HTTPException(status_code=400, detail="No valid instructions found")
        
        find_pcs = request.find_pcs if request.find_pcs is not None else []
        avoid_pcs = request.avoid_pcs if request.avoid_pcs is not None else []
        
        if not find_pcs:
            for i, instr in enumerate(program):
                if instr[0] == "FOUND":
                    find_pcs.append(i)
        
        if not avoid_pcs:
            for i, instr in enumerate(program):
                if instr[0] == "HALT":
                    avoid_pcs.append(i)
        
        found_states, recorder = explore(
            program,
            max_steps=request.max_steps,
            find_pcs=find_pcs if find_pcs else None,
            avoid_pcs=avoid_pcs if avoid_pcs else None
        )
        
        graph_data = recorder.to_json()
        
        found_states_data = []
        for state in found_states:
            solution = solve_constraints(state.constraints_collected)
            solution_dict = {}
            if solution:
                for decl in solution.decls():
                    solution_dict[decl.name()] = str(solution[decl])
            
            found_states_data.append({
                "stateId": state.state_id,
                "pc": state.pc,
                "constraints": [str(c) for c in state.constraints_collected],
                "solution": solution_dict
            })
        
        statistics = {
            "nodesExplored": len(recorder.nodes),
            "edges": len(recorder.edges),
            "foundStates": len(found_states),
            "deadEnds": sum(1 for n in recorder.nodes.values() if n['dead'])
        }
        
        return ExecuteResponse(
            graphData=graph_data,
            foundStates=found_states_data,
            statistics=statistics
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
