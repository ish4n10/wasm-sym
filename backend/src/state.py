from helpers.types import *
from registry import OpcodeRegistry
import z3

counter = 0
def get_id():
    global counter
    counter += 1
    return counter 


class Frame: 
    def __init__(self, locals_: dict, return_pc: int):
        self.locals = locals_
        self.pc = return_pc


class State:
    def __init__(self, parent_id=None, via_condition=None):
        self.state_id = get_id()
        self.parent_id = parent_id
        self.via_condition = via_condition

        self.pc = 0
        self.sym_stack = []
        self.sym_locals = {}
        self.constraints_collected = []
        self.solver = z3.Solver()
        self.findings = []
        self.memory = None  
        self.call_stack = []
        self.history = []

    def add_constraint(self, c):
        self.constraints_collected.append(c)
        self.solver.add(c)

    def check_trap(self, extra_cond):
        self.solver.push()
        self.solver.add(extra_cond)
        result = self.solver.check()
        model = self.solver.model() if result == z3.sat else None
        self.solver.pop()
        return result == z3.sat, model

    def clone(self, parent_id=None, via_condition=None):
        new = State(parent_id=parent_id, via_condition=via_condition)
        new.pc = self.pc
        new.sym_stack = list(self.sym_stack)
        new.sym_locals = dict(self.sym_locals)
        new.call_stack = [Frame(f.locals.copy(), f.pc) for f in self.call_stack]
        new.constraints_collected = list(self.constraints_collected)
        new.findings = []
        for c in new.constraints_collected:
            new.solver.add(c)
        new.memory = self.memory
        new.call_stack = list(self.call_stack)
        new.history = list(self.history) 
        return new

    def step(self, program: Program):
        opcode, *rest = program[self.pc]
        arg = rest[0] if rest else None
        pc_before = self.pc
        self.pc += 1

        handler = OpcodeRegistry.get(opcode)
        if handler is None:
            raise Exception(f"Unknown opcode '{opcode}' at pc={pc_before}")

        status, payload = handler(self, arg)

        self.history.append({
            "state_id": self.state_id,
            "pc": pc_before,
            "opcode": opcode,
            "arg": arg,
            "event": "step",
            "condition": None,
            "constraint_added": None,
        })

        return status, payload

    def log_branch(self, condition, pc_before):
        self.history.append({
            "state_id": self.state_id,
            "pc": pc_before,
            "opcode": "branch",
            "arg": None,
            "event": "branch",
            "condition": str(condition),
            "constraint_added": str(condition),
        })

    def reconstruct_path(self):
        return list(self.history)
