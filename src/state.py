import z3

class State:
    def __init__(self):
        self.pc = 0
        self.sym_stack = []
        self.sym_locals = {}
        self.constraints_collected = []
        self.history = []


    def log_current_state(self) -> None:
        state_snapshot = {
            'pc': self.pc,
            'sym_stack': list(self.sym_stack),
            'sym_locals': dict(self.sym_locals),
            'constraints_collected': list(self.constraints_collected)
        }
        print("State Log:", state_snapshot)
        return 
    
    # state when the 2 branches are created 
    def clone(self) -> 'State':
        new_state = State()
        new_state.pc = self.pc
        new_state.sym_stack = list(self.sym_stack) # new copy because we don't want same memory
        new_state.sym_locals = dict(self.sym_locals)
        new_state.constraints_collected = list(self.constraints_collected)
        new_state.history = list(self.history)
        return new_state
    
    def step(self, program: list) -> tuple[str, 'State']:
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
            
            case "CONST_I32":
                value = z3.BitVecVal(arg, 32)
                if (isinstance(value, z3.BitVecNumRef) == False):
                    raise Exception("CONST_I32 argument must be an integer")
                self.sym_stack.append(value)
                return ('continue', self)

            case "I32_ADD":
                val1 = self.sym_stack.pop()
                val2 = self.sym_stack.pop()

                if (not isinstance(val1, z3.BitVecRef) or not isinstance(val2, z3.BitVecRef)):
                    raise Exception("I32_ADD operands must be symbolic BitVecs")
                
                result = val1 + val2
                self.sym_stack.append(result)
                return ('continue', self)
            
            case "I32_SUB":
                val1 = self.sym_stack.pop()
                val2 = self.sym_stack.pop()

                if (not isinstance(val1, z3.BitVecRef) or not isinstance(val2, z3.BitVecRef)):
                    raise Exception("I32_SUB operands must be symbolic BitVecs")
                
                result = val1 - val2
                self.sym_stack.append(result)
                return ('continue', self)
            
            case "I32_MULT": 
                val1 = self.sym_stack.pop()
                val2 = self.sym_stack.pop()

                if (not isinstance(val1, z3.BitVecRef) or not isinstance(val2, z3.BitVecRef)):
                    raise Exception("I32_MULT operands must be symbolic BitVecs")
                
                result = val1 * val2
                self.sym_stack.append(result)
                return ('continue', self)
            
            case "I32_XOR":
                val1 = self.sym_stack.pop()
                val2 = self.sym_stack.pop()

                if (not isinstance(val1, z3.BitVecRef) or not isinstance(val2, z3.BitVecRef)):
                    raise Exception("I32_XOR operands must be symbolic BitVecs")
                
                result = val1 ^ val2
                self.sym_stack.append(result)
                return ('continue', self)
            
            case "I32_OR":
                val1 = self.sym_stack.pop()
                val2 = self.sym_stack.pop()

                if (not isinstance(val1, z3.BitVecRef) or not isinstance(val2, z3.BitVecRef)):
                    raise Exception("I32_OR operands must be symbolic BitVecs")

                result = val1 | val2
                self.sym_stack.append(result)
                return ('continue', self)
            
            case "I32_AND":
                val1 = self.sym_stack.pop()
                val2 = self.sym_stack.pop()

                if (not isinstance(val1, z3.BitVecRef) or not isinstance(val2, z3.BitVecRef)):
                    raise Exception("I32_AND operands must be symbolic BitVecs")

                result = val1 & val2
                self.sym_stack.append(result)
                return ('continue', self)
            
            case "I32_EQZ":
                val = self.sym_stack.pop()

                if (not isinstance(val, z3.BitVecRef)):
                    raise Exception("I32_EQZ operand must be a symbolic BitVec")

                result = (val == 0)
                self.sym_stack.append(result)
                return ('continue', self)
            
            case "I32_EQ":
                val1 = self.sym_stack.pop()
                val2 = self.sym_stack.pop()

                if (not isinstance(val1, z3.BitVecRef) or not isinstance(val2, z3.BitVecRef)):
                    raise Exception("I32_EQ operands must be symbolic BitVecs")

                result = (val1 == val2)
                self.sym_stack.append(result)
                return ('continue', self)
            
            case "BR_IF":
                condition = self.sym_stack.pop()

                if not isinstance(condition, z3.BoolRef):
                    raise Exception("BR_IF condition must be a symbolic Bool")

                true_state = self.clone()
                false_state = self.clone()

                true_state.pc = arg
                true_state.constraints_collected.append(condition)

                false_state.constraints_collected.append(z3.Not(condition))

                print("Constraints collected so far:", true_state.constraints_collected + false_state.constraints_collected)
                return ("continue", self)
                return ('branch', (true_state, false_state))

            case _:
                raise Exception(f"Unknown instruction: {current_op}")
