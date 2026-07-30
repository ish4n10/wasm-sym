from helpers.types import *
from registry import OpcodeRegistry
import z3


class ConcreteState:
    pc: int
    stack: list[int]
    locals: dict[int, int]
    call_stack: list[tuple[dict[int, int], int]]
    path_conditions: list[tuple[z3.BoolRef, bool]] 