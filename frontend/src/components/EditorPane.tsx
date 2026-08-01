import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { fetchExamples } from "../api";
import { Panel } from "./ui/Panel";

interface EditorPaneProps {
  code: string;
  setCode: (s: string) => void;
  inputs: Record<string, number>;
  setInputs: (v: Record<string, number>) => void;
  highlightedLine: number | null;
}

const LINE_HEIGHT = 22;
const PAD_TOP = 16;

export default function EditorPane({
  code,
  setCode,
  inputs,
  setInputs,
  highlightedLine,
}: EditorPaneProps) {
  const lines = code.split("\n");
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const { data: examples } = useQuery({
    queryKey: ["examples"],
    queryFn: fetchExamples,
  });

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

  const hasHighlight = highlightedLine !== null && highlightedLine < lines.length;

  return (
    <Panel
      title="Source"
      subtitle="program.wasm"
      bodyClassName="flex min-h-0 flex-col"
      actions={
        examples ? (
          <select
            onChange={(e) => {
              const val = e.target.value;
              if (val && examples[val]) setCode(examples[val]);
            }}
            defaultValue=""
            className="field-input text-mono px-2.5 py-1.5 text-[12px]"
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
        ) : undefined
      }
    >
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {/* Current-instruction highlight (blue left indicator + soft band) */}
        <div className="pointer-events-none absolute bottom-0 left-12 right-0 top-0 overflow-hidden">
          {hasHighlight && (
            <div style={{ transform: `translate(${-scrollLeft}px, ${PAD_TOP + highlightedLine! * LINE_HEIGHT - scrollTop}px)` }}>
              <div className="absolute left-0 top-0 w-full" style={{ height: LINE_HEIGHT }}>
                <div className="absolute bottom-0 left-0 top-0 w-[3px] rounded-r-full bg-[#4b8dff]" />
                <div className="absolute inset-0 bg-[#4b8dff]/10" />
              </div>
            </div>
          )}
        </div>

        {/* Line numbers */}
        <div
          aria-hidden
          className="text-mono pointer-events-none absolute left-0 top-0 z-10 w-12 select-none text-right text-[12px] leading-[22px] text-muted-foreground/40"
          style={{ transform: `translateY(${-scrollTop}px)` }}
        >
          <div className="py-4">
            {lines.map((_, i) => (
              <div
                key={i}
                className={
                  hasHighlight && i === highlightedLine
                    ? "pr-4 font-medium text-[#4b8dff]"
                    : "pr-4"
                }
              >
                {String(i).padStart(2, "0")}
              </div>
            ))}
          </div>
        </div>

        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onScroll={(e) => {
            setScrollTop(e.currentTarget.scrollTop);
            setScrollLeft(e.currentTarget.scrollLeft);
          }}
          wrap="off"
          spellCheck={false}
          placeholder="Enter your WAT program..."
          className="text-mono h-full w-full resize-none overflow-auto bg-transparent py-4 pl-14 pr-5 text-[13.5px] leading-[22px] text-foreground caret-[#4b8dff] outline-none placeholder:text-muted-foreground/40"
          style={{ fontFeatureSettings: '"zero", "ss01", "cv11"' }}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#1b1b1d] to-transparent" />
      </div>

      {/* Seed inputs */}
      <div className="shrink-0 px-6 pb-6 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="section-label">Seed inputs</span>
          <button
            onClick={addInput}
            className="flex items-center gap-1 rounded-[10px] px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
          >
            <Plus size={12} strokeWidth={2} />
            Add
          </button>
        </div>

        <div className="space-y-2">
          {Object.keys(inputs)
            .sort()
            .map((name) => (
              <div key={name} className="flex items-center gap-2">
                <span className="text-mono w-16 shrink-0 text-[12px] text-muted-foreground">
                  {name}
                </span>
                <input
                  type="number"
                  value={inputs[name]}
                  onChange={(e) => setInputs({ ...inputs, [name]: Number(e.target.value) })}
                  className="field-input text-mono w-full px-2.5 py-1.5 text-[12px]"
                />
                <button
                  onClick={() => removeInput(name)}
                  title={`Remove ${name}`}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                >
                  <X size={13} strokeWidth={2} />
                </button>
              </div>
            ))}
          {Object.keys(inputs).length === 0 && (
            <p className="text-[12px] text-muted-foreground">
              None — inputs are fully symbolic.
            </p>
          )}
        </div>
      </div>
    </Panel>
  );
}
