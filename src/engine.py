from helpers.solve import solve_constraints
from state import State

program = [
    ("LOCAL_READ", 0),
    ("LOCAL_GET", 0),
    ("CONST_I32", 10),
]


if __name__ == "__main__":
    initial_state = State()
    while initial_state.pc < len(program):
        status, new_state = initial_state.step(program)
        print(f"PC: {initial_state.pc}, Stack: {initial_state.sym_stack}, Locals: {initial_state.sym_locals}")
        if status == "continue":
            initial_state = new_state
        else:
            raise Exception("Unknown status returned from step")
    
    print("Final symbolic stack:", initial_state.sym_stack)
    print("Final symbolic locals:", initial_state.sym_locals)


