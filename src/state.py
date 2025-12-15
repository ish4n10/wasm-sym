import z3

class State:
    def __init__(self):
        self.pc = 0
        self.sym_stack = []
        self.sym_locals = {}
        self.constraints_collected = []
        self.history = []

    # state when the 2 branches are created 
    def clone(self):
        new_state = State()
        new_state.pc = self.pc
        new_state.sym_stack = list(self.sym_stack) # new copy because we don't want same memory
        new_state.sym_locals = dict(self.sym_locals)
        new_state.constraints_collected = list(self.constraints_collected)
        new_state.history = list(self.history)
        return new_state
    
    def step(self, program: list):
        current_addr = program[self.pc]
        current_op = current_addr[0]
        arg = current_addr[1] if len(current_addr) > 1 else None

        self.pc += 1
        # let this be string for now 
        match(current_op):
            case "NOP":
                return ("continue", self)

            case "LOCAL_READ":
                symbol = z3.BitVec(f"local_{arg}", 32)
                self.sym_locals[arg] = symbol
                return ('continue', self)
            
            case "LOCAL_GET":
                value = self.sym_locals[arg]
                self.sym_stack.append(value)
                return ('continue', self)
            
            case "LOCAL_SET":
                value = self.sym_stack.pop()
                self.sym_locals[arg] = value
                return ('continue', self)
            
            case _:
                raise Exception(f"Unknown instruction: {current_op}")
