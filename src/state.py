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
            case "nop":
                return ("continue", self)
            case "LOCAL_READ":
                symbol = z3.BitVec(f"local_{arg}", 32)
                self.sym_locals[arg] = symbol
                return ('continue', self)
            
            case "local.get":
                value = self.sym_locals[arg]
                self.sym_stack.append(value)
                return ('continue', self)
            
            case "local.set":
                value = self.sym_stack.pop()
                self.sym_locals[arg] = value
                return ('continue', self)
            
            case "i32.const":
                value = z3.BitVecVal(arg, 32)
                if (isinstance(value, z3.BitVecNumRef) == False):
                    raise Exception("i32.const argument must be an integer")
                self.sym_stack.append(value)
                return ('continue', self)

            case "i32.add":
                val1 = self.sym_stack.pop()
                val2 = self.sym_stack.pop()

                if (not isinstance(val1, z3.BitVecRef) or not isinstance(val2, z3.BitVecRef)):
                    raise Exception("i32.add operands must be symbolic BitVecs")
                
                result = val1 + val2
                self.sym_stack.append(result)
                return ('continue', self)
            
            case "i32.sub":
                val1 = self.sym_stack.pop()
                val2 = self.sym_stack.pop()

                if (not isinstance(val1, z3.BitVecRef) or not isinstance(val2, z3.BitVecRef)):
                    raise Exception("i32.sub operands must be symbolic BitVecs")
                
                result = val1 - val2
                self.sym_stack.append(result)
                return ('continue', self)
            
            case "i32.mul": 
                val1 = self.sym_stack.pop()
                val2 = self.sym_stack.pop()

                if (not isinstance(val1, z3.BitVecRef) or not isinstance(val2, z3.BitVecRef)):
                    raise Exception("i32.mul operands must be symbolic BitVecs")
                
                result = val1 * val2
                self.sym_stack.append(result)
                return ('continue', self)
            
            case "i32.xor":
                val1 = self.sym_stack.pop()
                val2 = self.sym_stack.pop()

                if (not isinstance(val1, z3.BitVecRef) or not isinstance(val2, z3.BitVecRef)):
                    raise Exception("i32.xor operands must be symbolic BitVecs")
                
                result = val1 ^ val2
                self.sym_stack.append(result)
                return ('continue', self)
            
            case "i32.or":
                val1 = self.sym_stack.pop()
                val2 = self.sym_stack.pop()

                if (not isinstance(val1, z3.BitVecRef) or not isinstance(val2, z3.BitVecRef)):
                    raise Exception("i32.or operands must be symbolic BitVecs")

                result = val1 | val2
                self.sym_stack.append(result)
                return ('continue', self)
            
            case "i32.and":
                val1 = self.sym_stack.pop()
                val2 = self.sym_stack.pop()

                if (not isinstance(val1, z3.BitVecRef) or not isinstance(val2, z3.BitVecRef)):
                    raise Exception("i32.and operands must be symbolic BitVecs")

                result = val1 & val2
                self.sym_stack.append(result)
                return ('continue', self)
            
            case "i32.shl":
                val1 = self.sym_stack.pop()  # shift amount
                val2 = self.sym_stack.pop()  # value to shift

                if (not isinstance(val1, z3.BitVecRef) or not isinstance(val2, z3.BitVecRef)):
                    raise Exception("i32.shl operands must be symbolic BitVecs")

                shift_amount = val1 & 0x1F
                result = val2 << shift_amount
                self.sym_stack.append(result)
                return ('continue', self)
            
            case "i32.shr_u":
                val1 = self.sym_stack.pop()
                val2 = self.sym_stack.pop() 

                if (not isinstance(val1, z3.BitVecRef) or not isinstance(val2, z3.BitVecRef)):
                    raise Exception("i32.shr_u operands must be symbolic BitVecs")

                shift_amount = val1 & 0x1F
                result = val2 >> shift_amount
                self.sym_stack.append(result)
                return ('continue', self)
            
            case "i32.eqz":
                val = self.sym_stack.pop()

                if (not isinstance(val, z3.BitVecRef)):
                    raise Exception("i32.eqz operand must be a symbolic BitVec")

                result = (val == 0)
                self.sym_stack.append(result)
                return ('continue', self)
            
            case "i32.eq":
                val1 = self.sym_stack.pop()
                val2 = self.sym_stack.pop()

                if (not isinstance(val1, z3.BitVecRef) or not isinstance(val2, z3.BitVecRef)):
                    raise Exception("i32.eq operands must be symbolic BitVecs")

                result = (val1 == val2)
                self.sym_stack.append(result)
                return ('continue', self)
            

            case "i32.lt_s":
                val1 = self.sym_stack.pop()
                val2 = self.sym_stack.pop()

                if (not isinstance(val1, z3.BitVecRef) or not isinstance(val2, z3.BitVecRef)):
                    raise Exception("i32.lt_s operands must be symbolic BitVecs")

                result = val2 < val1
                self.sym_stack.append(result)
                return ("continue", self)
            
            case "i32.lt_u":
                val1 = self.sym_stack.pop()
                val2 = self.sym_stack.pop()

                if (not isinstance(val1, z3.BitVecRef) or not isinstance(val2, z3.BitVecRef)):
                    raise Exception("i32.lt_u operands must be symbolic BitVecs")

            
                result = val2 < val1
                self.sym_stack.append(result)
                return ("continue", self)
            
            case "br":
                if arg is None:
                    raise Exception("br requires a target address")
                self.pc = arg
                return ("continue", self)
            
            case "br_if":
                condition = self.sym_stack.pop()

                if not isinstance(condition, z3.BoolRef):
                    raise Exception("br_if condition must be a symbolic Bool")

                true_state = self.clone()
                false_state = self.clone()

                true_state.pc = arg
                true_state.constraints_collected.append(condition)

                false_state.constraints_collected.append(~condition)
                print("Constraints collected so far:", true_state.constraints_collected + false_state.constraints_collected)
                return ('branch', (condition, arg))

            case "i32.load":
                addr = self.sym_stack.pop()
                
                if (not isinstance(addr, z3.BitVecRef)):
                    raise Exception("i32.load address must be a symbolic BitVec")
                
                value = z3.Select(self.memory, addr)
                self.sym_stack.append(value)
                return ('continue', self)
            
            case "i32.store":
                value = self.sym_stack.pop()
                addr = self.sym_stack.pop()
                
                if (not isinstance(addr, z3.BitVecRef) or not isinstance(value, z3.BitVecRef)):
                    raise Exception("i32.store address and value must be symbolic BitVecs")
                
                self.memory = z3.Store(self.memory, addr, value)
                return ('continue', self)
            
            case "LABEL":
                return ("continue", self)
            
            case "call":
                if arg is None:
                    raise Exception("call requires a function address")
                self.call_stack.append(self.pc)
                self.pc = arg
                return ("continue", self)
            
            case "return":
                if not self.call_stack:
                    raise Exception("return called but call stack is empty")
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
