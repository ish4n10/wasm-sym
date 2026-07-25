import z3
from registry import OpcodeRegistry

@OpcodeRegistry.register("nop")
def nop(state, _):
    return ("continue", state)

@OpcodeRegistry.register("HALT")
def halt(state, _):
    return ("halt", state)

@OpcodeRegistry.register("FOUND")
def found(state, _):
    model = state.solver.model() if state.solver.check() == z3.sat else None
    state.findings.append({
        "type": "success",
        "pc": state.pc - 1,
        "model": model,
        "constraints": list(state.constraints_collected),
    })
    return ("continue", state)

@OpcodeRegistry.register("LABEL")
def label(state, _):
    return ("continue", state)

@OpcodeRegistry.register("IF_TRUE")
def if_true(state, _):
    return ("continue", state)

@OpcodeRegistry.register("IF_FALSE")
def if_false(state, _):
    return ("continue", state)