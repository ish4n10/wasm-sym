from __future__ import annotations
from typing import Any
import z3

from registry import OpcodeRegistry
from state import State
from helpers.types import Program, StepResult


@OpcodeRegistry.register("i32.xor")
def i32_xor(state: State, arg: Any, program: Program) -> StepResult:
    val1 = state.sym_stack.pop()
    val2 = state.sym_stack.pop()
    if not isinstance(val1, z3.BitVecRef) or not isinstance(val2, z3.BitVecRef):
        raise Exception("i32.xor operands must be symbolic BitVecs")
    state.sym_stack.append(val1 ^ val2)
    return ("continue", state)


@OpcodeRegistry.register("i32.or")
def i32_or(state: State, arg: Any, program: Program) -> StepResult:
    val1 = state.sym_stack.pop()
    val2 = state.sym_stack.pop()
    if not isinstance(val1, z3.BitVecRef) or not isinstance(val2, z3.BitVecRef):
        raise Exception("i32.or operands must be symbolic BitVecs")
    state.sym_stack.append(val1 | val2)
    return ("continue", state)


@OpcodeRegistry.register("i32.and")
def i32_and(state: State, arg: Any, program: Program) -> StepResult:
    val1 = state.sym_stack.pop()
    val2 = state.sym_stack.pop()
    if not isinstance(val1, z3.BitVecRef) or not isinstance(val2, z3.BitVecRef):
        raise Exception("i32.and operands must be symbolic BitVecs")
    state.sym_stack.append(val1 & val2)
    return ("continue", state)


@OpcodeRegistry.register("i32.shl")
def i32_shl(state: State, arg: Any, program: Program) -> StepResult:
    val1 = state.sym_stack.pop()
    val2 = state.sym_stack.pop()
    if not isinstance(val1, z3.BitVecRef) or not isinstance(val2, z3.BitVecRef):
        raise Exception("i32.shl operands must be symbolic BitVecs")
    shift_amount = val1 & 0x1F
    state.sym_stack.append(val2 << shift_amount)
    return ("continue", state)


@OpcodeRegistry.register("i32.shr_u")
def i32_shr_u(state: State, arg: Any, program: Program) -> StepResult:
    val1 = state.sym_stack.pop()
    val2 = state.sym_stack.pop()
    if not isinstance(val1, z3.BitVecRef) or not isinstance(val2, z3.BitVecRef):
        raise Exception("i32.shr_u operands must be symbolic BitVecs")
    shift_amount = val1 & 0x1F
    state.sym_stack.append(z3.LShR(val2, shift_amount))
    return ("continue", state)
