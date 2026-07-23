from __future__ import annotations
from typing import Any
import z3

from registry import OpcodeRegistry
from state import State
from helpers.types import Program, StepResult


@OpcodeRegistry.register("i32.add")
def i32_add(state: State, arg: Any, program: Program) -> StepResult:
    val1 = state.sym_stack.pop()
    val2 = state.sym_stack.pop()
    if not isinstance(val1, z3.BitVecRef) or not isinstance(val2, z3.BitVecRef):
        raise Exception("i32.add operands must be symbolic BitVecs")
    state.sym_stack.append(val1 + val2)
    return ("continue", state)


@OpcodeRegistry.register("i32.sub")
def i32_sub(state: State, arg: Any, program: Program) -> StepResult:
    val1 = state.sym_stack.pop()
    val2 = state.sym_stack.pop()
    if not isinstance(val1, z3.BitVecRef) or not isinstance(val2, z3.BitVecRef):
        raise Exception("i32.sub operands must be symbolic BitVecs")
    state.sym_stack.append(val1 - val2)
    return ("continue", state)


@OpcodeRegistry.register("i32.mul")
def i32_mul(state: State, arg: Any, program: Program) -> StepResult:
    val1 = state.sym_stack.pop()
    val2 = state.sym_stack.pop()
    if not isinstance(val1, z3.BitVecRef) or not isinstance(val2, z3.BitVecRef):
        raise Exception("i32.mul operands must be symbolic BitVecs")
    state.sym_stack.append(val1 * val2)
    return ("continue", state)


@OpcodeRegistry.register("i32.div_s")
def i32_div_s(state: State, arg: Any, program: Program) -> StepResult:
    divisor = state.sym_stack.pop()
    dividend = state.sym_stack.pop()
    if not isinstance(divisor, z3.BitVecRef) or not isinstance(dividend, z3.BitVecRef):
        raise Exception("i32.div_s operands must be symbolic BitVecs")

    bad = z3.Or(
        divisor == 0,
        z3.And(
            dividend == z3.BitVecVal(-2**31, 32),
            divisor == z3.BitVecVal(-1, 32),
        ),
    )

    trap = state.clone()
    trap.constraints_collected.append(bad)
    solver = z3.Solver()
    solver.add(trap.constraints_collected)
    if solver.check() == z3.sat:
        model = solver.model()
        state.findings.append({
            "type": "i32.div_s",
            "pc": state.pc - 1,
            "model": model,
            "constraints": list(trap.constraints_collected),
        })

    state.constraints_collected.append(z3.Not(bad))
    state.sym_stack.append(dividend / divisor)
    return ("continue", state)


@OpcodeRegistry.register("i32.rem_s")
def i32_rem_s(state: State, arg: Any, program: Program) -> StepResult:
    divisor = state.sym_stack.pop()
    dividend = state.sym_stack.pop()
    if not isinstance(divisor, z3.BitVecRef) or not isinstance(dividend, z3.BitVecRef):
        raise Exception("i32.rem_s operands must be symbolic BitVecs")

    bad = divisor == 0

    trap = state.clone()
    trap.constraints_collected.append(bad)
    solver = z3.Solver()
    solver.add(trap.constraints_collected)
    if solver.check() == z3.sat:
        model = solver.model()
        state.findings.append({
            "type": "i32.rem_s",
            "pc": state.pc - 1,
            "model": model,
            "constraints": list(trap.constraints_collected),
        })

    state.constraints_collected.append(z3.Not(bad))
    state.sym_stack.append(z3.SRem(dividend, divisor))
    return ("continue", state)


@OpcodeRegistry.register("i32.div_u")
def i32_div_u(state: State, arg: Any, program: Program) -> StepResult:
    divisor = state.sym_stack.pop()
    dividend = state.sym_stack.pop()
    if not isinstance(divisor, z3.BitVecRef) or not isinstance(dividend, z3.BitVecRef):
        raise Exception("i32.div_u operands must be symbolic BitVecs")

    bad = divisor == 0

    trap = state.clone()
    trap.constraints_collected.append(bad)
    solver = z3.Solver()
    solver.add(trap.constraints_collected)
    if solver.check() == z3.sat:
        model = solver.model()
        state.findings.append({
            "type": "i32.div_u",
            "pc": state.pc - 1,
            "model": model,
            "constraints": list(trap.constraints_collected),
        })

    state.constraints_collected.append(z3.Not(bad))
    state.sym_stack.append(z3.UDiv(dividend, divisor))
    return ("continue", state)


@OpcodeRegistry.register("i32.rem_u")
def i32_rem_u(state: State, arg: Any, program: Program) -> StepResult:
    divisor = state.sym_stack.pop()
    dividend = state.sym_stack.pop()
    if not isinstance(divisor, z3.BitVecRef) or not isinstance(dividend, z3.BitVecRef):
        raise Exception("i32.rem_u operands must be symbolic BitVecs")

    bad = divisor == 0

    trap = state.clone()
    trap.constraints_collected.append(bad)
    solver = z3.Solver()
    solver.add(trap.constraints_collected)
    if solver.check() == z3.sat:
        model = solver.model()
        state.findings.append({
            "type": "i32.rem_u",
            "pc": state.pc - 1,
            "model": model,
            "constraints": list(trap.constraints_collected),
        })

    state.constraints_collected.append(z3.Not(bad))
    state.sym_stack.append(z3.URem(dividend, divisor))
    return ("continue", state)
