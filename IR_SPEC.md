# SymVis IR Specification

A WASM-like intermediate representation for symbolic execution. Each line is one instruction. Blank lines and `#` comments are ignored.

## Conventions

- All values are `BitVec(32)` (i32).
- Stack machine: most ops pop operands and push results.
- Symbolic variables auto-initialize on first `local.get`.
- `br`/`br_if` targets are zero-indexed PC (line number in parsed program).
- `call`/`return` manage a frame stack: `call` saves `(locals, next_pc)`, clears locals; `return` restores them.

## Instructions

### Locals

| Opcode | Stack | Description |
|--------|-------|-------------|
| `local.get i` | → `[val]` | Push local `i`. Creates symbolic `local_i` if unset. |
| `local.set i` | `[val] → []` | Pop and store in local `i`. |

### Constants

| Opcode | Stack | Description |
|--------|-------|-------------|
| `i32.const n` | → `[n]` | Push 32-bit signed integer constant. |

### Arithmetic

All pop `b, a` (top = b), push `result`.

| Opcode | Stack | Description |
|--------|-------|-------------|
| `i32.add` | `[b, a] → [a+b]` | Addition. |
| `i32.sub` | `[b, a] → [b-a]` | Subtraction. |
| `i32.mul` | `[b, a] → [a*b]` | Multiplication. |
| `i32.div_s` | `[b, a] → [a/b]` | Signed division. Traps on zero or `INT32_MIN / -1`. |
| `i32.div_u` | `[b, a] → [a/b]` | Unsigned division. Traps on zero. |
| `i32.rem_s` | `[b, a] → [a%b]` | Signed remainder. Traps on zero. |
| `i32.rem_u` | `[b, a] → [a%b]` | Unsigned remainder. Traps on zero. |

### Bitwise

| Opcode | Stack | Description |
|--------|-------|-------------|
| `i32.xor` | `[b, a] → [a ^ b]` | XOR. |
| `i32.or` | `[b, a] → [a \| b]` | OR. |
| `i32.and` | `[b, a] → [a & b]` | AND. |
| `i32.shl` | `[b, a] → [a << b]` | Shift left (count masked to 5 bits). |
| `i32.shr_u` | `[b, a] → [a >> b]` | Logical shift right (count masked to 5 bits). |

### Comparison

| Opcode | Stack | Description |
|--------|-------|-------------|
| `i32.eqz` | `[a] → [a == 0]` | Equal to zero. |
| `i32.eq` | `[b, a] → [a == b]` | Equality. |
| `i32.lt_s` | `[b, a] → [a < b]` | Signed less-than. |
| `i32.lt_u` | `[b, a] → [a < b]` | Unsigned less-than. |

### Control Flow

| Opcode | Stack | Description |
|--------|-------|-------------|
| `br n` | — | Unconditional branch to PC `n`. |
| `br_if n` | `[cond] → []` | Pop `cond`; branch to PC `n` if true, else continue. |
| `call n` | — | Save frame `(locals, next_pc)`, clear locals, jump to PC `n`. |
| `return` | — | Pop frame, restore locals and PC. |
| `HALT` | — | Stop execution for this path. |
| `FOUND` | — | Record a success finding, then continue. |
| `unreachable` | — | Trap — records finding if path is SAT, then halts. |
| `nop` | — | No operation. |
| `LABEL` | — | Marker (no-op). |
| `IF_TRUE` | — | Marker (no-op). |
| `IF_FALSE` | — | Marker (no-op). |

### Memory

| Opcode | Stack | Description |
|--------|-------|-------------|
| `i32.load` | `[addr] → [val]` | Load 4 bytes LE from memory at `addr`. Traps on OOB. |
| `i32.store` | `[val, addr] → []` | Store 4 bytes LE to memory at `addr`. Traps on OOB. |
| `memory.grow` | `[pages] → [old_size \| -1]` | Grow memory. Traps on failure. |

## Example

```wasm
# Find inputs where a < 100 and (a & 1) == 0
local.get 0
i32.const 100
i32.lt_s
br_if 6
HALT

local.get 0
i32.const 1
i32.and
i32.eqz
br_if 10
HALT

FOUND
```
