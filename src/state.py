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
    



