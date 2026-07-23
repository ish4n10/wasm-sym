import z3
from state import State
from helpers.solve import is_sat
from helpers.types import Program


def explore(program: Program) -> list[dict]:
    import opcodes

    worklist = [State()]
    all_findings = []

    while worklist:
        state = worklist.pop()

        while state.pc < len(program):
            status, payload = state.step(program)

            if status == "continue":
                continue

            elif status == "halt":
                all_findings.extend(state.findings)
                break

            elif status == "branch":
                cond, target = payload

                for child_cond, child_pc in [
                    (cond, target),
                    (z3.Not(cond), state.pc),
                ]:
                    child = state.clone()
                    child.pc = child_pc
                    child.constraints_collected.append(child_cond)
                    if is_sat(child.constraints_collected):
                        worklist.append(child)

                all_findings.extend(state.findings)
                break

    return all_findings


if __name__ == "__main__":
    program: Program = [
        ("local.get", 0),
        ("i32.const", 100),
        ("i32.lt_s",),
        ("br_if", 5),
        ("HALT",),
        ("i32.const", 50),
        ("local.get", 1),
        ("i32.lt_s",),
        ("br_if", 11),
        ("HALT",),
        ("nop",),
        ("local.get", 0),
        ("local.get", 1),
        ("i32.add",),
        ("i32.const", 2),
        ("i32.mul",),
        ("local.set", 3),
        ("local.get", 3),
        ("i32.const", 300),
        ("i32.lt_s",),
        ("br_if", 22),
        ("HALT",),
        ("local.get", 0),
        ("i32.const", 42),
        ("i32.store",),
        ("local.get", 0),
        ("i32.load",),
        ("local.set", 4),
        ("local.get", 0),
        ("local.get", 1),
        ("i32.xor",),
        ("local.get", 2),
        ("i32.and",),
        ("i32.const", 0),
        ("i32.eqz",),
        ("br_if", 37),
        ("HALT",),
        ("local.get", 0),
        ("i32.const", 3),
        ("i32.shl",),
        ("local.get", 1),
        ("i32.const", 2),
        ("i32.shr_u",),
        ("i32.add",),
        ("local.set", 5),
        ("local.get", 5),
        ("local.get", 3),
        ("i32.const", 10),
        ("i32.add",),
        ("i32.eq",),
        ("br_if", 52),
        ("HALT",),
        ("local.get", 0),
        ("local.get", 1),
        ("i32.sub",),
        ("i32.const", 0),
        ("i32.lt_s",),
        ("br_if", 59),
        ("HALT",),
        ("nop",),
        ("FOUND",),
    ]

    findings = explore(program)
    print(f"Total findings: {len(findings)}")
    for f in findings:
        print(f)
