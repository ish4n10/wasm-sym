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
        self.memory_pages = z3.BitVecVal(1, 32)
        self.call_stack = []
        self.history = []
        self.path_conditions = []

    def add_constraint(self, c):
        c_str = str(c)
        for existing in self.constraints_collected:
            if str(existing) == c_str:
                return
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
        new.memory_pages = self.memory_pages
        new.history = list(self.history)
        new.path_conditions = list(self.path_conditions)
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

    def step_concolic(self, program: Program):
        """Step, following only the feasible branch. Taken branch conditions
        are recorded in ``path_conditions`` (in the form actually taken)."""
        status, payload = self.step(program)

        if status == "branch":
            cond, target = payload
            self.solver.push()
            self.solver.add(cond)
            taken = self.solver.check() == z3.sat
            self.solver.pop()

            if taken:
                self.add_constraint(cond)
                self.path_conditions.append(cond)
                self.pc = target
            else:
                negated = z3.Not(cond)
                self.add_constraint(negated)
                self.path_conditions.append(negated)
            return "continue", None

        return status, payload

    def run_concolic(self, program: Program):
        while self.pc < len(program):
            status, _ = self.step_concolic(program)
            if status == "halt":
                break
        return self

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
