from helpers.types import HandlerFunc, KnownOpcode

class OpcodeRegistry:
    _handlers: dict[str, HandlerFunc] = {} 

    @classmethod
    def register(cls, opcode: str):
        def _(fn: HandlerFunc) -> HandlerFunc:
            cls._handlers[opcode] = fn
            return fn
        return _

    @classmethod
    def get(cls, opcode: str) -> HandlerFunc | None:
        return cls._handlers.get(opcode)

    