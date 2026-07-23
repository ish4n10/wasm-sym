from __future__ import annotations
from typing import Literal, TypedDict, Protocol, TypeAlias, Any
import z3

KnownOpcode: TypeAlias = Any 

Instruction: TypeAlias = tuple[str, ...] | tuple[str, int] | tuple[str, str] 
Program: TypeAlias = list[Instruction]


StepStatus: TypeAlias = Literal['continue', 'halt', 'branch']
StepResult: TypeAlias = tuple[StepStatus, Any]


class Findings(TypedDict):
    type: str
    pc: int
    model: z3.ModelRef | None
    constraints: list[z3.BoolRef]

class HandlerFunc(Protocol):
    def __call__(self, state: Any, arg: Any, program: Program) -> StepResult: ...

