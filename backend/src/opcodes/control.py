from __future__ import annotations
from typing import Any
import z3

from registry import OpcodeRegistry
from state import State
from helpers.types import Program, StepResult

@OpcodeRegistry.register("br") 
def br(state: State, arg: Any, program: Program):
    state.pc = arg 
    return ('continue', state)


@OpcodeRegistry.register("br_if")
def br_if(state: State, arg: Any, program: Program):
    condition = state.sym_stack.pop()
    if not isinstance(condition, z3.BoolRef):
        raise Exception("br_if condition must be a symbolic Bool")
    return ("branch", (condition, arg))

@OpcodeRegistry.register("unreachable")
def unreachable(state: State, arg: Any, program: Program):
    solver = z3.Solver()
    solver.add(state.constraints_collected)
    if solver.check() == z3.sat:
        model = solver.model()
        state.findings.append({
            "type": "unreachable",
            "pc": state.pc - 1,
            "model": model,
            "constraints" : list(state.constraints_collected)
        })

    return ("halt", state)


@OpcodeRegistry.register("call")
def call(state: State, arg: Any, program: Program):
    if arg is None:
        raise Exception("call requires a target address")
    state.call_stack.append(state.pc)
    state.pc = arg
    return ("continue", state)

@OpcodeRegistry.register("return")
def ret(state: State, arg: Any, program: Program):
    if not state.call_stack:
        raise Exception("return called but call stack is empty")
    state.pc = state.call_stack.pop()
    return ("continue", state)