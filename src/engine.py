from helpers.solve import is_sat
import z3
from state import State

program = [
    ("LOCAL_READ", 0),   # 0
    ("LOCAL_GET", 0),    # 1
    ("CONST_I32", 10),   # 2
    ("I32_LT_S",),       # 3
    ("BR_IF", 6),        # 4  if true -> pc = 6
    ("HALT",),           # 5  false path stops here
    ("FOUND",),          # 6  true path reaches FOUND
]





def explore(program, max_steps=1000):
    init = State()
    worklist = [init]
    found = []

    while worklist:
        state = worklist.pop()

        steps = 0
        while steps < max_steps:
            status, payload = state.step(program)
            steps += 1

            if status == "continue":
                continue

            if status == "branch":
                cond, target = payload

                t_state = state.clone()
                f_state = state.clone()

                t_state.pc = target
                t_state.constraints_collected.append(cond)

                f_state.constraints_collected.append(z3.Not(cond))

                if is_sat(t_state.constraints_collected):
                    worklist.append(t_state)

                if is_sat(f_state.constraints_collected):
                    worklist.append(f_state)

                break   

            if status == "halt":
                break

            if status == "found":
                found.append(state)
                break

    return found


if __name__ == "__main__":
    # initial_state = State()
    # while initial_state.pc < len(program):
    #     status, new_state = initial_state.step(program)
    #     print(f"PC: {initial_state.pc}, Stack: {initial_state.sym_stack}, Locals: {initial_state.sym_locals}")
    #     initial_state = new_state
    #     # if status == "continue":
    #     #     initial_state = new_state
    #     # else:
    #     #     raise Exception("Unknown status returned from step")
    
    # print("Final symbolic stack:", initial_state.sym_stack)
    # print("Final symbolic locals:", initial_state.sym_locals)
    explored_states: list[State] = explore(program)
    print(f"Explored {len(explored_states)} states that reached 'found' condition. they are : {explored_states[0].constraints_collected}")


