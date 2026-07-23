from __future__ import annotations
from typing import Any
import z3

from registry import OpcodeRegistry
from state import State
from helpers.types import Program, StepResult

MEMORY_SIZE = 65536


@OpcodeRegistry.register("i32.load")
def i32_load(state: State, arg: Any) -> StepResult:
    if state.memory is None:
        state.memory = z3.Array("mem", z3.BitVecSort(32), z3.BitVecSort(8))

    address = state.sym_stack.pop()
    if not isinstance(address, z3.BitVecRef):
        raise Exception("i32.load address must be a symbolic BitVec")

    bad = z3.Or(z3.UGT(address + 4, MEMORY_SIZE))

    is_sat, model = state.check_trap(bad)
    if is_sat:
        state.findings.append({
            "type": "out_of_bounds_access",
            "pc": state.pc - 1,
            "model": model,
            "constraints": list(state.constraints_collected) + [bad],
        })

    state.add_constraint(z3.Not(bad))
    b0 = z3.Select(state.memory, address)
    b1 = z3.Select(state.memory, address + 1)
    b2 = z3.Select(state.memory, address + 2)
    b3 = z3.Select(state.memory, address + 3)
    state.sym_stack.append(z3.Concat(b3, b2, b1, b0))
    return ("continue", state)


@OpcodeRegistry.register("i32.store")
def i32_store(state: State, arg: Any) -> StepResult:
    if state.memory is None:
        state.memory = z3.Array("mem", z3.BitVecSort(32), z3.BitVecSort(8))

    value = state.sym_stack.pop()
    address = state.sym_stack.pop()
    if not isinstance(address, z3.BitVecRef) or not isinstance(value, z3.BitVecRef):
        raise Exception("i32.store address and value must be symbolic BitVecs")

    bad = z3.Or(z3.UGT(address + 4, MEMORY_SIZE))

    is_sat, model = state.check_trap(bad)
    if is_sat:
        state.findings.append({
            "type": "out_of_bounds_access",
            "pc": state.pc - 1,
            "model": model,
            "constraints": list(state.constraints_collected) + [bad],
        })

    state.add_constraint(z3.Not(bad))
    b0 = z3.Extract(7, 0, value)
    b1 = z3.Extract(15, 8, value)
    b2 = z3.Extract(23, 16, value)
    b3 = z3.Extract(31, 24, value)
    m = state.memory
    m = z3.Store(m, address, b0)
    m = z3.Store(m, address + 1, b1)
    m = z3.Store(m, address + 2, b2)
    m = z3.Store(m, address + 3, b3)
    state.memory = m
    return ("continue", state)
