from __future__ import annotations
import z3

import opcodes
from state import State
from helpers.types import Program


class ConcolicState(State):

    def __init__(self, seed: dict[str, int] | None = None):
        super().__init__()
        for name, val in (seed or {}).items():
            if not name.startswith("local_"):
                raise ValueError(f"Unknown input name '{name}' (expected local_N)")
            idx = int(name.split("_")[1])
            sym = z3.BitVec(name, 32)
            self.sym_locals[idx] = sym
            self.add_constraint(sym == z3.BitVecVal(val & 0xFFFFFFFF, 32))


def concolic_run(
    program: Program, seed: dict[str, int], max_steps: int | None = None
) -> tuple[ConcolicState, list[z3.BoolRef]]:
    state = ConcolicState(seed)
    state.run_concolic(program, max_steps=max_steps)
    return state, state.path_conditions
