import z3

_state_id_counter = 0

def _get_next_state_id():
    global _state_id_counter
    _state_id_counter += 1
    return _state_id_counter

class State:
    def __init__(self, parent_id=None, via_condition=None):
        self.state_id = _get_next_state_id()
        self.parent_id = parent_id
        self.via_condition = via_condition
        self.pc = 0
        self.sym_stack = []
        self.sym_locals = {}
        self.constraints_collected = []
        self.history = []
        self.memory = z3.Array('memory', z3.BitVecSort(32), z3.BitVecSort(32))
        self.call_stack = []


    def log_current_state(self) -> None:
        state_snapshot = {
            'pc': self.pc,
            'sym_stack': list(self.sym_stack),
            'sym_locals': dict(self.sym_locals),
            'constraints_collected': list(self.constraints_collected)
        }
        print("State Log:", state_snapshot)
        return 
    
    def clone(self, parent_id=None, via_condition=None) -> 'State':
        new_state = State(parent_id=parent_id, via_condition=via_condition)
        new_state.pc = self.pc
        new_state.sym_stack = list(self.sym_stack) # new copy because we don't want same memory
        new_state.sym_locals = dict(self.sym_locals)
        new_state.constraints_collected = list(self.constraints_collected)
        new_state.history = list(self.history)
        new_state.memory = self.memory  # Share memory array (Z3 arrays are immutable)
        new_state.call_stack = list(self.call_stack)
        return new_state
    
    def step(self, program: list) -> tuple[str, 'State']:
        current_addr = program[self.pc]
        current_op = current_addr[0]
        arg = current_addr[1] if len(current_addr) > 1 else None

        self.pc += 1
        if (self.pc >= len(program)):
            print("Finished execution: PC out of bounds")
            return ('halt', self)
        

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
            
            case "I32_SHL":
                val1 = self.sym_stack.pop()  # shift amount
                val2 = self.sym_stack.pop()  # value to shift

                if (not isinstance(val1, z3.BitVecRef) or not isinstance(val2, z3.BitVecRef)):
                    raise Exception("I32_SHL operands must be symbolic BitVecs")

                shift_amount = val1 & 0x1F
                result = val2 << shift_amount
                self.sym_stack.append(result)
                return ('continue', self)
            
            case "I32_SHR":
                val1 = self.sym_stack.pop()
                val2 = self.sym_stack.pop() 

                if (not isinstance(val1, z3.BitVecRef) or not isinstance(val2, z3.BitVecRef)):
                    raise Exception("I32_SHR operands must be symbolic BitVecs")

                shift_amount = val1 & 0x1F
                result = val2 >> shift_amount
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
            

            case "I32_LT_S":
                val1 = self.sym_stack.pop()
                val2 = self.sym_stack.pop()

                if (not isinstance(val1, z3.BitVecRef) or not isinstance(val2, z3.BitVecRef)):
                    raise Exception("I32_LT_S operands must be symbolic BitVecs")

                result = val2 < val1
                self.sym_stack.append(result)
                return ("continue", self)
            
            case "I32_LT_u":
                val1 = self.sym_stack.pop()
                val2 = self.sym_stack.pop()

                if (not isinstance(val1, z3.BitVecRef) or not isinstance(val2, z3.BitVecRef)):
                    raise Exception("I32_LT_u operands must be symbolic BitVecs")

            
                result = val2 < val1
                self.sym_stack.append(result)
                return ("continue", self)
            
            case "BR":
                if arg is None:
                    raise Exception("BR requires a target address")
                self.pc = arg
                return ("continue", self)
            
            case "BR_IF":
                condition = self.sym_stack.pop()

                if not isinstance(condition, z3.BoolRef):
                    raise Exception("BR_IF condition must be a symbolic Bool")

                true_state = self.clone()
                false_state = self.clone()

                true_state.pc = arg
                true_state.constraints_collected.append(condition)

                false_state.constraints_collected.append(~condition)
                print("Constraints collected so far:", true_state.constraints_collected + false_state.constraints_collected)
                return ('branch', (condition, arg))

            case "I32_LOAD":
                addr = self.sym_stack.pop()
                
                if (not isinstance(addr, z3.BitVecRef)):
                    raise Exception("I32_LOAD address must be a symbolic BitVec")
                
                value = z3.Select(self.memory, addr)
                self.sym_stack.append(value)
                return ('continue', self)
            
            case "I32_STORE":
                value = self.sym_stack.pop()
                addr = self.sym_stack.pop()
                
                if (not isinstance(addr, z3.BitVecRef) or not isinstance(value, z3.BitVecRef)):
                    raise Exception("I32_STORE address and value must be symbolic BitVecs")
                
                self.memory = z3.Store(self.memory, addr, value)
                return ('continue', self)
            
            case "LABEL":
                return ("continue", self)
            
            case "CALL":
                if arg is None:
                    raise Exception("CALL requires a function address")
                self.call_stack.append(self.pc)
                self.pc = arg
                return ("continue", self)
            
            case "RETURN":
                if not self.call_stack:
                    raise Exception("RETURN called but call stack is empty")
                return_pc = self.call_stack.pop()
                self.pc = return_pc
                return ("continue", self)
            
            case "IF_TRUE":
                return ("continue", self)
            
            case "IF_FALSE":
                return ("continue", self)
            
            case "HALT":
                return ('halt', self)
            case "FOUND":
                return ('found', self)
            case _:
                raise Exception(f"Unknown instruction: {current_op}")
