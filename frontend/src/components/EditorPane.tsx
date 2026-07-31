import { useQuery } from "@tanstack/react-query";
import { fetchExamples } from "../api";

interface EditorPaneProps {
  code: string;
  setCode: (s: string) => void;
  inputs: Record<string, number>;
  setInputs: (v: Record<string, number>) => void;
  loading: boolean;
  onRun: () => void;
}

function Dot({ className = "" }: { className?: string }) {
  return <span className={`h-1.5 w-1.5 rounded-full ${className}`} />;
}

export default function EditorPane({ code, setCode, inputs, setInputs, loading, onRun }: EditorPaneProps) {
  const lines = code.split("\n");

  const addInput = () => {
    let i = 0;
    const names = Object.keys(inputs);
    while (names.includes(`local_${i}`)) i++;
    setInputs({ ...inputs, [`local_${i}`]: 0 });
  };

  const removeInput = (name: string) => {
    const next = { ...inputs };
    delete next[name];
    setInputs(next);
  };

  const { data: examples } = useQuery({
    queryKey: ["examples"],
    queryFn: fetchExamples,
  });

  return (
    <section className="hairline-r flex min-h-0 flex-col bg-surface/40">
      <div className="hairline-b flex h-11 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Dot className="bg-live" />
          <span className="text-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            program.wasm
          </span>
        </div>
        {examples && (
          <select
            onChange={(e) => {
              const val = e.target.value;
              if (val && examples[val]) setCode(examples[val]);
            }}
            className="text-mono rounded border border-border bg-surface px-2 py-0.5 text-[11px] text-foreground outline-none"
            defaultValue=""
          >
            <option value="" disabled>
              examples
            </option>
            {Object.keys(examples).map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div
          aria-hidden
          className="text-mono pointer-events-none absolute inset-y-0 left-0 w-12 select-none py-4 text-right text-[12px] leading-[1.7] text-muted-foreground"
        >
          {lines.map((_, i) => (
            <div key={i} className="pr-3">
              {String(i).padStart(2, "0")}
            </div>
          ))}
        </div>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          placeholder="Enter your WAT program..."
          className="text-mono h-full w-full resize-none bg-transparent py-4 pl-14 pr-4 text-[13.5px] leading-[1.7] text-foreground caret-found outline-none placeholder:text-muted-foreground/50"
          style={{ fontFeatureSettings: '"zero", "ss01", "cv11"' }}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-surface/60 to-transparent" />
      </div>

      <div className="hairline-t p-4">
        <label className="text-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
          seed inputs
        </label>
        <div className="mt-2 space-y-1.5">
          {Object.keys(inputs)
            .sort()
            .map((name) => (
              <div key={name} className="flex items-center gap-1.5">
                <span className="text-mono w-16 text-[11px] text-foreground">{name}</span>
                <input
                  type="number"
                  value={inputs[name]}
                  onChange={(e) => setInputs({ ...inputs, [name]: Number(e.target.value) })}
                  className="text-mono w-full rounded border border-border bg-surface px-2 py-1 text-[12px] text-foreground outline-none focus:border-found"
                />
                <button
                  onClick={() => removeInput(name)}
                  title={`Remove ${name}`}
                  className="text-mono px-1 text-[13px] text-muted-foreground hover:text-dead"
                >
                  ×
                </button>
              </div>
            ))}
          {Object.keys(inputs).length === 0 && (
            <p className="text-mono text-[11px] text-muted-foreground">
              none — inputs fully symbolic
            </p>
          )}
        </div>
        <button
          onClick={addInput}
          className="text-mono mt-2 text-[11px] text-muted-foreground hover:text-found"
        >
          + add local input
        </button>

        <button
          onClick={onRun}
          disabled={loading || !code.trim()}
          className="text-mono mt-3 w-full rounded-md bg-found px-3 py-2 text-[12px] font-semibold text-background hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Running..." : "Run trace"}
        </button>
      </div>
    </section>
  );
}
