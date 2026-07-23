from __future__ import annotations
from typing import Any
import z3

from registry import OpcodeRegistry
from state import State
from helpers.types import Program, StepResult


@OpcodeRegistry.register("i32.eqz")
def i32_eqz(state: State, arg: Any, program: Program) -> StepResult:
    val = state.sym_stack.pop()
    if not isinstance(val, z3.BitVecRef):
        raise Exception("i32.eqz operand must be a symbolic BitVec")
    state.sym_stack.append(val == 0)
    return ("continue", state)


@OpcodeRegistry.register("i32.eq")
def i32_eq(state: State, arg: Any, program: Program) -> StepResult:
    val1 = state.sym_stack.pop()
    val2 = state.sym_stack.pop()
    if not isinstance(val1, z3.BitVecRef) or not isinstance(val2, z3.BitVecRef):
        raise Exception("i32.eq operands must be symbolic BitVecs")
    state.sym_stack.append(val1 == val2)
    return ("continue", state)


@OpcodeRegistry.register("i32.lt_s")
def i32_lt_s(state: State, arg: Any, program: Program) -> StepResult:
    val1 = state.sym_stack.pop()
    val2 = state.sym_stack.pop()
    if not isinstance(val1, z3.BitVecRef) or not isinstance(val2, z3.BitVecRef):
        raise Exception("i32.lt_s operands must be symbolic BitVecs")
    state.sym_stack.append(val2 < val1)
    return ("continue", state)


@OpcodeRegistry.register("i32.lt_u")
def i32_lt_u(state: State, arg: Any, program: Program) -> StepResult:
    val1 = state.sym_stack.pop()
    val2 = state.sym_stack.pop()
    if not isinstance(val1, z3.BitVecRef) or not isinstance(val2, z3.BitVecRef):
        raise Exception("i32.lt_u operands must be symbolic BitVecs")
    state.sym_stack.append(z3.ULT(val2, val1))
    return ("continue", state)
