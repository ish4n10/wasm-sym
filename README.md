# SymVis — Symbolic Execution Visualiser

A symbolic execution engine for WASM-like programs with an interactive graph-based visualiser. Treats inputs as symbolic variables and explores all feasible execution paths using the Z3 SMT solver.

## Features

- **Symbolic execution** — `local.get 0` creates an unbounded symbolic variable; all paths through `br_if` branches are explored independently.
- **Interactive graph** — execution tree rendered with React Flow + dagre: click a node to highlight its ancestor–descendant path, dim the rest.
- **3-panel UI** — code editor (left), execution graph (center), state inspector (right). Tab navigation for Findings and Opcode Reference.
- **Findings panel** — deduplicated findings with plain-language summaries, triggering input values, and collapsible raw constraints (simplified via Z3).
- **Trap detection** — division by zero, remainder by zero, out-of-bounds memory access, `unreachable` — all reported with the violating constraint model.
- **Call/return** — simple frame-based call stack (`call` saves locals + PC, clears locals; `return` restores).
- **Safety limits** — `MAX_STATES = 200`, `MAX_STEPS_PER_STATE = 10000` prevent infinite loops/recursion from hanging the engine.

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
docker build -t symvis-backend .
docker run -p 8000:8000 symvis-backend
```

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

Returns findings, state tree, and execution statistics.

## Deployment

- **Backend**: Docker container to AWS Lambda (ECR → Lambda) or fly.io.
- **Frontend**: Static build (`npm run build`) to S3/CloudFront, Vercel, or served via nginx alongside the API.

## TODOs

- **Real WASM files** — Compile actual `.wasm` modules to this IR and execute symbolically. Requires a wasm-to-IR translator.
- **Concolic execution** — Mix concrete and symbolic values. Seed with concrete inputs, use symbolic exploration for uncovered branches (hybrid fuzzing).
- **Path bounding** — Configurable strategies: depth limit, coverage-guided prioritisation, random sampling of the state space. Prevent state explosion on deeply branching programs.
