from helpers.solve import is_sat, solve_constraints
import z3
from state import State

program = [
    # Initialize symbolic inputs
    ("LOCAL_READ", 0),      # 0: input a
    ("LOCAL_READ", 1),      # 1: input b
    ("LOCAL_READ", 2),      # 2: input c
    
    # First check: a < 100
    ("local.get", 0),       # 3: get a
    ("i32.const", 100),     # 4: push 100
    ("i32.lt_s",),          # 5: a < 100
    ("br_if", 8),           # 6: if true, goto 8 (start of next block)
    ("HALT",),              # 7: dead end if a >= 100
    
    # Second check: b > 50
    ("i32.const", 50),      # 8: push 50
    ("local.get", 1),       # 9: get b
    ("i32.lt_s",),          # 10: compares 50 < b (i.e., b > 50)
    ("br_if", 14),          # 11: if b > 50, goto 14 (continue)
    ("HALT",),              # 12: dead end if b <= 50
    ("nop",),               # 13: marker (unreachable)
    
    # Compute: (a + b) * 2
    ("local.get", 0),       # 14: get a
    ("local.get", 1),       # 15: get b
    ("i32.add",),           # 16: a + b
    ("i32.const", 2),       # 17: push 2
    ("i32.mul",),           # 18: (a + b) * 2
    ("local.set", 3),       # 19: store result in local 3
    
    # Check: (a + b) * 2 < 300
    ("local.get", 3),       # 20: get result
    ("i32.const", 300),     # 21: push 300
    ("i32.lt_s",),          # 22: result < 300
    ("br_if", 25),          # 23: if true, goto 25 (start of memory ops)
    ("HALT",),              # 24: dead end if result >= 300
    
    # Memory operations
    ("local.get", 0),       # 25: get a for address
    ("i32.const", 42),      # 26: value to store
    ("i32.store",),         # 27: store 42 at address a
    ("local.get", 0),       # 28: get a again
    ("i32.load",),          # 29: load from address a
    ("local.set", 4),       # 30: store loaded value in local 4
    
    # Bitwise operations
    ("local.get", 0),       # 31: get a
    ("local.get", 1),       # 32: get b
    ("i32.xor",),           # 33: a ^ b
    ("local.get", 2),       # 34: get c
    ("i32.and",),           # 35: (a ^ b) & c
    ("i32.const", 0),       # 36: push 0
    ("i32.eqz",),           # 37: check if result == 0
    ("br_if", 40),          # 38: if zero, goto 40 (start of shift ops)
    ("HALT",),              # 39: dead end if not zero
    
    # Shift operations
    ("local.get", 0),       # 40: get a
    ("i32.const", 3),       # 41: shift amount
    ("i32.shl",),           # 42: a << 3
    ("local.get", 1),       # 43: get b
    ("i32.const", 2),       # 44: shift amount
    ("i32.shr_u",),         # 45: b >> 2
    ("i32.add",),           # 46: (a << 3) + (b >> 2)
    ("local.set", 5),       # 47: store in local 5
    
    # Complex condition: local[5] == local[3] + 10
    ("local.get", 5),       # 48: get local[5]
    ("local.get", 3),       # 49: get local[3]
    ("i32.const", 10),      # 50: push 10
    ("i32.add",),           # 51: local[3] + 10
    ("i32.eq",),            # 52: local[5] == (local[3] + 10)
    ("br_if", 55),          # 53: if equal, goto 55 (start of final check)
    ("HALT",),              # 54: dead end if not equal
    
    # Final arithmetic check
    ("local.get", 0),       # 55: get a
    ("local.get", 1),       # 56: get b
    ("i32.sub",),           # 57: a - b
    ("i32.const", 0),       # 58: push 0
    ("i32.lt_s",),          # 59: (a - b) < 0, i.e., a < b
    ("br_if", 63),          # 60: if a < b, goto 63
    ("HALT",),              # 61: dead end if a >= b
    
    # Success path
    ("nop",),               # 62: marker
    ("FOUND",),             # 63: SUCCESS!
]


class StateRecorder:
    def __init__(self):
        self.nodes = {}  # state_id -> {'found': bool, 'dead': bool}
        self.edges = []  # [(parent_id, child_id, condition)]
    
    def register_node(self, state_id):
        if state_id not in self.nodes:
            self.nodes[state_id] = {'found': False, 'dead': False}
    
    def record_edge(self, parent_id, child_id, condition):
        self.edges.append((parent_id, child_id, condition))
    
    def mark_found(self, state_id):
        if state_id in self.nodes:
            self.nodes[state_id]['found'] = True
    
    def mark_dead(self, state_id):
        if state_id in self.nodes:
            self.nodes[state_id]['dead'] = True
    
    def to_dot(self) -> str:
        lines = ["digraph G {"]
        
        for state_id, props in self.nodes.items():
            color = "green" if props['found'] else ("red" if props['dead'] else "blue")
            label = f"S{state_id}"
            if props['found']:
                label += " [FOUND]"
            elif props['dead']:
                label += " [DEAD]"
            lines.append(f'    {state_id} [label="{label}", color={color}];')
        
        for parent_id, child_id, condition in self.edges:
            cond_str = str(condition).replace('"', '\\"').replace('\n', ' ')
            lines.append(f'    {parent_id} -> {child_id} [label="{cond_str}"];')
        
        lines.append("}")
        return "\n".join(lines)


def explore(program, max_steps=1000, find_pcs=None, avoid_pcs=None):
    recorder = StateRecorder()
    
    init = State()
    recorder.register_node(init.state_id)
    worklist = [init]
    found = []

    while worklist:
        state = worklist.pop()

        steps = 0
        while steps < max_steps:
            if state.pc in avoid_pcs:
                recorder.mark_dead(state.state_id)
                break

            if state.pc in find_pcs:
                found.append(state)
                recorder.mark_found(state.state_id)
                print("FOUND at pc =", state.pc)
                print("Solved constraints:")
                print(solve_constraints(state.constraints_collected))
                break

            status, payload = state.step(program)
            steps += 1

            if status == "continue":
                continue

            if status == "branch":

                cond, target = payload

                t_state = state.clone(parent_id=state.state_id, via_condition=cond)
                f_state = state.clone(parent_id=state.state_id, via_condition=~cond)

                t_state.pc = target
                t_state.constraints_collected.append(cond)

                f_state.constraints_collected.append(~cond)

               
                recorder.register_node(t_state.state_id)
                recorder.record_edge(state.state_id, t_state.state_id, cond)
                if is_sat(t_state.constraints_collected):
                    worklist.append(t_state)
                else:
                    recorder.mark_dead(t_state.state_id)

                recorder.register_node(f_state.state_id)
                recorder.record_edge(state.state_id, f_state.state_id, ~cond)
                if is_sat(f_state.constraints_collected):
                    worklist.append(f_state)
                else:
                    recorder.mark_dead(f_state.state_id)
                break   

            if status == "halt":
                break

    return found, recorder


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
    explored_states, recorder = explore(program, find_pcs=[63], avoid_pcs=[7, 12, 24, 39, 54, 61])
    print(f"Explored {len(explored_states)} states that reached 'found' condition.")
    if explored_states:
        print(f"Constraints for first found state: {explored_states[0].constraints_collected}")
        print("\nSolved constraints:")
        print(solve_constraints(explored_states[0].constraints_collected))
    print("\nDOT graph:")
    print(recorder.to_dot())


