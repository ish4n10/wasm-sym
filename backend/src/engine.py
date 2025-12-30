from helpers.solve import is_sat, solve_constraints
import z3
from state import State

program = [
    # First check: a < 100
    ("local.get", 0),       # 0: get a (automatically initialized as symbolic)
    ("i32.const", 100),     # 1: push 100
    ("i32.lt_s",),          # 2: a < 100
    ("br_if", 5),           # 3: if true, goto 5 (start of next block)
    ("HALT",),              # 4: dead end if a >= 100
    
    # Second check: b > 50
    ("i32.const", 50),      # 5: push 50
    ("local.get", 1),       # 6: get b (automatically initialized as symbolic)
    ("i32.lt_s",),          # 7: compares 50 < b (i.e., b > 50)
    ("br_if", 11),          # 8: if b > 50, goto 11 (continue)
    ("HALT",),              # 9: dead end if b <= 50
    ("nop",),               # 10: marker (unreachable)
    
    # Compute: (a + b) * 2
    ("local.get", 0),       # 11: get a
    ("local.get", 1),       # 12: get b
    ("i32.add",),           # 13: a + b
    ("i32.const", 2),       # 14: push 2
    ("i32.mul",),           # 15: (a + b) * 2
    ("local.set", 3),       # 16: store result in local 3
    
    # Check: (a + b) * 2 < 300
    ("local.get", 3),       # 17: get result
    ("i32.const", 300),     # 18: push 300
    ("i32.lt_s",),          # 19: result < 300
    ("br_if", 22),          # 20: if true, goto 22 (start of memory ops)
    ("HALT",),              # 21: dead end if result >= 300
    
    # Memory operations
    ("local.get", 0),       # 22: get a for address
    ("i32.const", 42),      # 23: value to store
    ("i32.store",),         # 24: store 42 at address a
    ("local.get", 0),       # 25: get a again
    ("i32.load",),          # 26: load from address a
    ("local.set", 4),       # 27: store loaded value in local 4
    
    # Bitwise operations
    ("local.get", 0),       # 28: get a
    ("local.get", 1),       # 29: get b
    ("i32.xor",),           # 30: a ^ b
    ("local.get", 2),       # 31: get c (automatically initialized as symbolic)
    ("i32.and",),           # 32: (a ^ b) & c
    ("i32.const", 0),       # 33: push 0
    ("i32.eqz",),           # 34: check if result == 0
    ("br_if", 37),          # 35: if zero, goto 37 (start of shift ops)
    ("HALT",),              # 36: dead end if not zero
    
    # Shift operations
    ("local.get", 0),       # 37: get a
    ("i32.const", 3),       # 38: shift amount
    ("i32.shl",),           # 39: a << 3
    ("local.get", 1),       # 40: get b
    ("i32.const", 2),       # 41: shift amount
    ("i32.shr_u",),         # 42: b >> 2
    ("i32.add",),           # 43: (a << 3) + (b >> 2)
    ("local.set", 5),       # 44: store in local 5
    
    # Complex condition: local[5] == local[3] + 10
    ("local.get", 5),       # 45: get local[5]
    ("local.get", 3),       # 46: get local[3]
    ("i32.const", 10),      # 47: push 10
    ("i32.add",),           # 48: local[3] + 10
    ("i32.eq",),            # 49: local[5] == (local[3] + 10)
    ("br_if", 52),          # 50: if equal, goto 52 (start of final check)
    ("HALT",),              # 51: dead end if not equal
    
    # Final arithmetic check
    ("local.get", 0),       # 52: get a
    ("local.get", 1),       # 53: get b
    ("i32.sub",),           # 54: a - b
    ("i32.const", 0),       # 55: push 0
    ("i32.lt_s",),          # 56: (a - b) < 0, i.e., a < b
    ("br_if", 59),          # 57: if a < b, goto 59
    ("HALT",),              # 58: dead end if a >= b
    
    # Success path
    ("nop",),               # 59: marker
    ("FOUND",),             # 60: SUCCESS!
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
    
    def to_json(self) -> dict:
        """Export graph data as JSON for React Flow"""
        import math
        
        nodes = []
        edges = []
        
        # Calculate positions using a simple layout
        node_ids = list(self.nodes.keys())
        num_nodes = len(node_ids)
        
        for idx, state_id in enumerate(node_ids):
            props = self.nodes[state_id]
            node_type = "found" if props['found'] else ("dead" if props['dead'] else "exploring")
            
            # Simple grid layout
            cols = math.ceil(math.sqrt(num_nodes))
            row = idx // cols
            col = idx % cols
            x = col * 200 + 100
            y = row * 150 + 100
            
            # Determine node type for React Flow
            react_flow_type = "foundNode" if props['found'] else ("deadNode" if props['dead'] else "defaultNode")
            
            # Determine color
            color = "#2ecc71" if props['found'] else ("#e74c3c" if props['dead'] else "#3498db")
            
            label = f"S{state_id}"
            if props['found']:
                label += " [FOUND]"
            elif props['dead']:
                label += " [DEAD]"
            
            nodes.append({
                "id": str(state_id),
                "type": react_flow_type,
                "data": {
                    "label": label,
                    "stateType": node_type
                },
                "position": {"x": x, "y": y},
                "style": {
                    "background": color,
                    "color": "#fff",
                    "border": "2px solid #333",
                    "borderRadius": "8px",
                    "padding": "10px",
                    "fontWeight": "bold"
                }
            })
        
        for parent_id, child_id, condition in self.edges:
            cond_str = str(condition).replace('\n', ' ')
            edges.append({
                "id": f"{parent_id}-{child_id}",
                "source": str(parent_id),
                "target": str(child_id),
                "label": cond_str,
                "type": "smoothstep",
                "style": {
                    "stroke": "#95a5a6",
                    "strokeWidth": 2
                },
                "labelStyle": {
                    "fill": "#333",
                    "fontSize": "10px",
                    "fontWeight": "normal"
                }
            })
        
        return {"nodes": nodes, "edges": edges}


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
            if avoid_pcs and state.pc in avoid_pcs:
                recorder.mark_dead(state.state_id)
                break

            if find_pcs and state.pc in find_pcs:
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
    explored_states, recorder = explore(program, find_pcs=[60], avoid_pcs=[4, 9, 21, 36, 51, 58])
    print(f"Explored {len(explored_states)} states that reached 'found' condition.")
    if explored_states:
        print(f"Constraints for first found state: {explored_states[0].constraints_collected}")
        print("\nSolved constraints:")
        print(solve_constraints(explored_states[0].constraints_collected))
    print("\nDOT graph:")
    print(recorder.to_dot())


