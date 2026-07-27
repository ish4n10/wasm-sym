# SymVis - Symbolic Execution Visualiser

A symbolic execution engine for a WASM-like instruction set, paired with an interactive
graph visualiser that shows exactly how the solver explores a program's state space.

Most symbolic execution tools are either research-grade CLIs with no visual feedback
(you get a list of solved constraints and have to reconstruct the reasoning yourself),
or full-scale frameworks like angr/Manticore where understanding *why* a path was
pruned takes real effort. SymVis is a smaller, focused engine built to make that
reasoning visible: every branch, every trap, and every discovered bug is rendered as
a live, clickable graph, with the exact Z3 model that triggers it.

## How it works

Every `local.get` on an unseen index creates a fresh, unbounded `z3.BitVec` — the
program's inputs are symbolic from the first read, not concrete test values. From
there, the engine walks the program as a worklist of `State` objects. A `br_if` forks
execution into two states, one per branch, each carrying its own accumulated path
constraints. Anything that can fail — division, remainder, memory access,
`unreachable` — is checked automatically against an SMT query at the moment it's
reached: if the current path's constraints make the bad condition satisfiable, that's
a finding, with a concrete Z3 model attached. Nothing is manually tagged.

Memory is modeled as a real Z3 `Array(BitVecSort(32), BitVecSort(8))` — byte
addressable, matching actual WASM linear memory semantics, not a simplified
word-level approximation. `i32.load`/`i32.store` assemble/split values across four
byte cells in proper little-endian order, and every access is bounds-checked the
same way arithmetic traps are: forked, solved, recorded if reachable.

## Why these design choices

- **Registry + decorator dispatch for opcodes** (`opcodes/*.py`), instead of one large
  `match` block in the engine. Adding an instruction means adding a file, not editing
  a growing switch statement — this was a deliberate refactor after the engine's
  first version became a single file mixing dispatch logic and state management.
- **BFS worklist, not naive recursion**, for path exploration — recursion depth would
  tie the engine's exploration limit to Python's call stack, which is the wrong
  failure mode. A worklist lets exploration be capped explicitly (`MAX_STATES`,
  `MAX_STEPS_PER_STATE`) instead of crashing on deep or infinite recursion.
- **Z3 Arrays over word-indexed dicts for memory** — byte-level addressing is
  required for out-of-bounds detection to mean anything real; a word-level model
  would silently miss unaligned or sub-word memory bugs, which is most of what
  actually matters in practice.

## Known limitations

This is not a production fuzzer, and it's worth being direct about where it currently
falls short:

- **Input format is a custom text IR, not real compiled WebAssembly.** The engine's
  opcode semantics match the WASM spec, but there's no `.wasm` binary decoder yet —
  see Roadmap.
- **Path exploration is brute-force symbolic, with hard caps rather than smart
  bounding.** `MAX_STATES = 200` and `MAX_STEPS_PER_STATE = 10000` stop runaway
  exploration, but they're blunt limits, not a coverage-guided or concolic strategy —
  a sufficiently branchy program will just hit the cap and stop exploring, not
  intelligently prioritize which paths matter.
- **`call`/`return` support is a simple frame-based stack** (save locals + PC on
  `call`, restore on `return`) — it hasn't been tested against deep recursion or
  mutual recursion between functions.
- **No SIMD, threads, or GC instructions.** Scope is deliberately limited to core
  control flow, i32 arithmetic/comparison, and linear memory — the subset that
  covers the vast majority of what a small compiled function actually emits.

## Example

Given:

```
local.get 0
local.get 1
i32.div_s
HALT
```

The engine explores two paths from the single `i32.div_s`: one where `local_1 == 0`
(division by zero) and one where it doesn't. The first is reported as a finding:

```json
{
  "type": "division_by_zero",
  "pc": 2,
  "summary": "This path divides by zero.",
  "triggering_input": { "local_0": 0, "local_1": 0 },
  "constraints": ["local_1 == 0"]
}
```

No test case was written to find this — it fell out of the solver query attached to
`i32.div_s` automatically.

## Project Structure

```
wasm-sym/
├── backend/
│   ├── src/
│   │   ├── opcodes/        # @register-decorated opcode handlers
│   │   │   ├── arithmetic.py
│   │   │   ├── bitwise.py
│   │   │   ├── comparison.py
│   │   │   ├── control.py     # br, br_if, call, return, unreachable
│   │   │   ├── core.py        # nop, HALT, FOUND, LABEL, IF_TRUE/FALSE
│   │   │   ├── locals.py      # local.get, local.set
│   │   │   └── memory.py      # i32.load, i32.store, memory.grow
│   │   ├── engine.py          # BFS path explorer with limit guards
│   │   ├── state.py           # State, Frame, clone, constraint tracking
│   │   ├── registry.py        # Opcode decorator registry
│   │   ├── helpers/
│   │   │   ├── z3_helpers.py  # z3_to_readable, simplify, dedup
│   │   │   ├── types.py       # Type aliases
│   │   │   └── solve.py       # Constraint solving utils
│   │   └── test_oracles.py
│   ├── api.py                 # FastAPI server + Mangum Lambda handler
│   ├── parser.py
│   ├── requirements.txt
│   ├── Dockerfile             # Lambda-deployable container image
│   └── fly.toml
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── GraphPane.tsx      # Dagre layout, custom nodes/edges, highlight
│   │   │   ├── FindingsPane.tsx   # 3-tier findings cards
│   │   │   ├── EditorPane.tsx     # Code editor + examples + run
│   │   │   ├── InspectorPane.tsx  # State detail panel
│   │   │   └── OpcodesPane.tsx    # Full opcode reference
│   │   ├── App.tsx                # Tab navigation, 3-panel layout
│   │   ├── api.ts                 # API client + buildGraph
│   │   └── index.css              # Dark theme, React Flow overrides
│   ├── index.html
│   └── package.json
├── IR_SPEC.md
└── README.md
```

## Quick Start

### Backend

```bash
cd backend
pip install -r requirements.txt
python api.py            # http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev              # http://localhost:5173
```

Set `VITE_API_URL` to the backend URL (defaults to same origin for production).

### Docker (Lambda)

```bash
cd backend
docker build --provenance=false --sbom=false -t symvis-backend .
docker run -p 8000:8000 symvis-backend
```

The `--provenance=false --sbom=false` flags matter — modern `docker build` attaches
attestation data by default, producing a multi-manifest image that Lambda's container
image support can't parse.

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Health check (`{"status": "ok"}`) |
| `GET` | `/opcodes` | List all supported opcodes |
| `GET` | `/examples` | List example programs |
| `POST` | `/execute` | Run symbolic execution |

### POST /execute

```json
{ "code": "local.get 0\ni32.const 100\ni32.lt_s\nbr_if 4\nHALT\nnop\nFOUND" }
```

Returns findings, the full state tree (for graph rendering), and execution
statistics (states explored, cap hit or not).

## Deployment

- **Backend**: Docker container to AWS Lambda (ECR → Lambda, behind an API Gateway
  HTTP API with an `ANY /{proxy+}` route) or fly.io.
- **Frontend**: Static build (`npm run build`) to Vercel, or S3/CloudFront if staying
  fully within AWS.

## Roadmap

- **Real `.wasm` binary input.** Replace the custom text IR with an actual compiled
  WebAssembly decoder (`wasm-tob` — the same decoder Manticore uses for its own WASM
  symbolic execution support, or `wadze` for a smaller dependency-free option),
  feeding decoded instructions into the existing interpreter unchanged. This is the
  largest remaining gap between "demo engine" and "tool that analyzes code someone
  else actually wrote."
- **Concolic execution.** Bound path explosion properly instead of relying on hard
  caps — seed with one concrete input, track symbolic constraints alongside it, and
  negate one branch condition at a time to systematically discover new paths. This is
  the standard approach used by KLEE and angr for the same underlying problem.
- **Coverage-guided path prioritization**, once concolic execution is in place —
  explore branches more likely to reach new code first, rather than a flat BFS order.