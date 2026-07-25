import z3
from state import State
from helpers.types import Program
from helpers.z3_helpers import z3_to_readable


MAX_STATES = 200
MAX_STEPS_PER_STATE = 10000


class ExecutionLimitError(Exception):
    pass


def explore(program: Program) -> tuple[list[dict], int, list[dict]]:
    import opcodes

    worklist: list[State] = [State()]
    all_findings: list[dict] = []
    explored: int = 0
    state_records: list[dict] = []
    pending_ids: set[int] = set()

    def add_pending(state: State):
        pending_ids.add(state.state_id)

    def format_instruction(pc: int) -> str:
        if pc < len(program):
            instr = program[pc]
            opcode = instr[0]
            arg = instr[1] if len(instr) > 1 else None
            return f"{opcode} {arg}" if arg is not None else opcode
        return "<end>"

    def record_state(state: State, status: str, label: str | None = None):
        readable_constraints = [z3_to_readable(c) for c in state.constraints_collected]
        state_records.append({
            "id": state.state_id,
            "pc": state.pc,
            "label": label or format_instruction(state.pc),
            "status": status,
            "parent_id": state.parent_id,
            "via_condition": z3_to_readable(state.via_condition) if state.via_condition is not None else None,
            "findings": list(state.findings),
            "constraints": readable_constraints,
        })

    add_pending(State())
    pending_ids.clear()

    while worklist:
        state = worklist.pop()
        explored += 1

        if explored > MAX_STATES:
            raise ExecutionLimitError(
                f"Exceeded maximum of {MAX_STATES} explored states. "
                "Your program may contain an unbounded loop or recursion."
            )

        label = format_instruction(state.pc)

        if state.pc >= len(program):
            all_findings.extend(state.findings)
            status = "found" if state.findings else "dead"
            record_state(state, status, label)
            continue

        last_status = None
        last_payload = None
        steps = 0
        while state.pc < len(program):
            steps += 1
            if steps > MAX_STEPS_PER_STATE:
                raise ExecutionLimitError(
                    f"Exceeded maximum of {MAX_STEPS_PER_STATE} steps for a single state. "
                    "Your program may contain an unbounded loop."
                )
            last_status, last_payload = state.step(program)

            if last_status == "continue":
                continue

            elif last_status == "halt":
                all_findings.extend(state.findings)
                break

            elif last_status == "branch":
                cond, target = last_payload
                for child_cond, child_pc in [
                    (cond, target),
                    (z3.Not(cond), state.pc),
                ]:
                    child = state.clone(parent_id=state.state_id, via_condition=child_cond)
                    child.pc = child_pc
                    child.add_constraint(child_cond)
                    if child.solver.check() == z3.sat:
                        worklist.append(child)
                        add_pending(child)

                all_findings.extend(state.findings)
                break

        if last_status == "halt":
            status = "found" if state.findings else "dead"
            record_state(state, status, label)
        elif last_status == "branch":
            status = "live"
            record_state(state, status, label)
        else:
            all_findings.extend(state.findings)
            status = "found" if state.findings else "dead"
            record_state(state, status, label)

    return all_findings, explored, state_records
