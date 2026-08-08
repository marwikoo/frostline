"use client";

import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Eye,
  LoaderCircle,
  RotateCcw,
  Send,
} from "lucide-react";
import {
  contractLabel,
  initialContractValue,
  longContractField,
  stringifyContractValue,
  useContractWorkflow,
} from "@/lib/contract-workflow";
import type { ContractParam } from "@/lib/contract-surface";

function ChannelInput({
  param,
  value,
  onChange,
}: {
  param: ContractParam;
  value: string;
  onChange: (value: string) => void;
}) {
  if (param.type === "bool") {
    return (
      <input
        type="checkbox"
        checked={value === "true"}
        onChange={(event) => onChange(String(event.target.checked))}
      />
    );
  }
  if (longContractField(param)) {
    return (
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }
  return (
    <input
      type={param.type === "int" ? "number" : "text"}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function DomainContractActions() {
  const flow = useContractWorkflow();
  const position = Math.max(
    0,
    flow.methods.findIndex((method) => method.name === flow.selected.name),
  );
  const move = (offset: number) => {
    const next =
      (position + offset + flow.methods.length) % flow.methods.length;
    flow.choose(flow.methods[next]!);
  };

  return (
    <section className="fl-domain-actions" data-domain-control="custody-channel">
      <header>
        <Activity />
        <div>
          <small>CUSTODY CHANNEL {String(position + 1).padStart(2, "0")}</small>
          <strong>{contractLabel(flow.selected.name)}</strong>
        </div>
        <progress value={position + 1} max={flow.methods.length} />
      </header>

      <nav aria-label="Cycle cold-chain instructions">
        <button type="button" onClick={() => move(-1)} aria-label="Previous instruction">
          <ChevronLeft />
        </button>
        <code>{flow.selected.kind === "read" ? "TELEMETRY" : "COMMAND"}</code>
        <button type="button" onClick={() => move(1)} aria-label="Next instruction">
          <ChevronRight />
        </button>
      </nav>

      <div className="fl-channel-grid">
        {flow.selected.params.map((param, index) => (
          <fieldset key={param.name}>
            <legend>CH {String(index + 1).padStart(2, "0")}</legend>
            <label>
              <span>{contractLabel(param.name)}</span>
              <ChannelInput
                param={param}
                value={
                  flow.values[param.name] ?? initialContractValue(param)
                }
                onChange={(value) =>
                  flow.setValues((current) => ({
                    ...current,
                    [param.name]: value,
                  }))
                }
              />
            </label>
          </fieldset>
        ))}
      </div>

      <button
        className="fl-transmit"
        type="button"
        disabled={flow.busy}
        onClick={() => void flow.execute()}
      >
        {flow.busy ? (
          <LoaderCircle className="spin" />
        ) : flow.selected.kind === "read" ? (
          <Eye />
        ) : (
          <Send />
        )}
        {flow.selected.kind === "read" ? "Sample instrument" : "Transmit custody command"}
      </button>

      <output aria-live="polite">
        <span>INSTRUMENT RETURN</span>
        {(flow.result || flow.error) && (
          <button type="button" onClick={flow.reset} aria-label="Clear instrument return">
            <RotateCcw />
          </button>
        )}
        {flow.error ? (
          <p>{flow.error}</p>
        ) : flow.result ? (
          <pre>{stringifyContractValue(flow.result)}</pre>
        ) : (
          <code>standing by</code>
        )}
      </output>

      <style jsx>{`
        .fl-domain-actions{border:1px solid #567195;background:#0e2241;color:#f7fbff;padding:14px;font-family:var(--font-ibm-plex-mono),monospace}
        header{display:grid;grid-template-columns:auto 1fr minmax(100px,220px);gap:10px;align-items:center;border-bottom:1px solid #567195;padding-bottom:10px}header div{display:grid}header small{font-size:8px;color:#20e2a8}progress{width:100%;accent-color:#20e2a8}
        nav{display:grid;grid-template-columns:42px 1fr 42px;margin:10px 0;border:1px solid #567195}nav button{border:0;background:#07152c;color:#20e2a8}nav code{text-align:center;padding:10px;color:#b7c8de}
        .fl-channel-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.fl-channel-grid fieldset{border:1px solid #567195;padding:9px}.fl-channel-grid legend{color:#20e2a8;font-size:8px}.fl-channel-grid label{display:grid;gap:5px}.fl-channel-grid span{font-size:9px}
        input:not([type="checkbox"]),textarea{width:100%;min-height:38px;border:1px solid #567195;border-radius:0;background:#07152c;color:#f7fbff;padding:7px;font:inherit}input[type="checkbox"]{width:22px;height:22px;accent-color:#20e2a8}textarea{min-height:70px}
        .fl-transmit{width:100%;min-height:42px;margin-top:10px;border:1px solid #20e2a8;background:#20e2a8;color:#07152c;display:flex;align-items:center;justify-content:center;gap:8px}
        output{display:block;position:relative;min-height:54px;margin-top:10px;border-top:1px solid #567195;padding-top:9px}output>span{font-size:8px;color:#20e2a8}output button{position:absolute;right:0}pre{white-space:pre-wrap;overflow-wrap:anywhere}
        @media(max-width:700px){header,.fl-channel-grid{grid-template-columns:1fr}}
      `}</style>
    </section>
  );
}
