import z3

import opcodes
from concrete_state import concolic_run
from engine import ExecutionLimitError
from helpers.types import Program
from helpers.solve import solve_constraints
from helpers.z3_helpers import z3_to_readable


MAX_CONCOLIC_RUNS = 200
MAX_STEPS_PER_RUN = 10000


def extract_inputs(model) -> dict[str, int]:
    inputs = {}
    for decl in model.decls():
        if decl.name().startswith("local_"):
            inputs[decl.name()] = int(str(model[decl]))
    return inputs


def concolic_explore(program: Program, seed: dict[str, int]) -> tuple[list[dict], int, list[dict]]:
    all_findings: list[dict] = []
    state_records: list[dict] = []
    explored: int = 0

    seen: set[tuple] = {tuple(sorted(seed.items()))}
    worklist: list[tuple[dict, int | None, z3.BoolRef | None]] = [
        (dict(seed), None, None)
    ]

    while worklist:
        values, parent_id, via = worklist.pop()
        explored += 1

        if explored > MAX_CONCOLIC_RUNS:
            raise ExecutionLimitError(
                f"Exceeded maximum of {MAX_CONCOLIC_RUNS} concolic runs. "
                "The program may contain too many distinct paths."
            )

        state, path = concolic_run(program, values, max_steps=MAX_STEPS_PER_RUN)

        all_findings.extend(state.findings)

        state_records.append({
            "id": state.state_id,
            "pc": state.pc,
            "label": ", ".join(f"{k}={v}" for k, v in sorted(values.items())),
            "status": "found" if state.findings else "dead",
            "parent_id": parent_id,
            "via_condition": z3_to_readable(via) if via is not None else None,
            "findings": list(state.findings),
            "constraints": [z3_to_readable(c) for c in state.constraints_collected],
        })

        for i, cond in enumerate(path):
            flipped = z3.Not(cond)
            model = solve_constraints(list(path[:i]) + [flipped])
            if model is None:
                continue
            new_input = extract_inputs(model)
            if not new_input:
                continue
            merged = dict(values)
            merged.update(new_input)
            key = tuple(sorted(merged.items()))
            if key in seen:
                continue
            seen.add(key)
            worklist.append((merged, state.state_id, flipped))

    return all_findings, explored, state_records
