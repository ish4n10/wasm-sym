from __future__ import annotations
from typing import Any
import z3

from registry import OpcodeRegistry
from state import State
from helpers.types import Program, StepResult

@OpcodeRegistry.register("i32.const") 
def i32_const(state: State, arg: Any, program: Program):
    value = z3.BitVecVal(arg, 32)
    if not isinstance(value, z3.BitVecNumRef):
        return Exception("i32.const argument must be an integer")
    state.sym_stack.append(value)
    return ("continue", state)

@OpcodeRegistry.register("local.get")
def local_get(state: State, arg: Any, program: Program) -> StepResult:
    if arg not in state.sym_locals:
        symbol = z3.BitVec(f"local_{arg}", 32)
        state.sym_locals[arg] = symbol
    value = state.sym_locals[arg]
    state.sym_stack.append(value)
    return ("continue", state)

@OpcodeRegistry.register("local.set")
def local_set(state: State, arg: Any, program: Program) -> StepResult:
    value = state.sym_stack.pop()
    state.sym_locals[arg] = value
    return ("continue", state) 
