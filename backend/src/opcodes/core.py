from registry import OpcodeRegistry

@OpcodeRegistry.register("nop")
def nop(state, _):
    return ("continue", state)

@OpcodeRegistry.register("HALT")
def halt(state, _):
    return ("halt", state)

@OpcodeRegistry.register("FOUND")
def found(state, _):
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