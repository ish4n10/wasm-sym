from registry import OpcodeRegistry

@OpcodeRegistry.register("nop")
def nop(state, arg, program):
    return ("continue", state)

@OpcodeRegistry.register("HALT")
def halt(state, arg, program):
    return ("halt", state)

@OpcodeRegistry.register("FOUND")
def found(state, arg, program):
    return ("continue", state)

@OpcodeRegistry.register("LABEL")
def label(state, arg, program):
    return ("continue", state)

@OpcodeRegistry.register("IF_TRUE")
def if_true(state, arg, program):
    return ("continue", state)

@OpcodeRegistry.register("IF_FALSE")
def if_false(state, arg, program):
    return ("continue", state)