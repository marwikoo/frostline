"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { contractAddress } from "@/lib/deployment";
import { useContractWrite } from "@/lib/genlayer";
import {
  contractMethods,
  type ContractMethod,
  type ContractParam,
} from "@/lib/contract-surface";

const client = createClient({ chain: studionet });

export function contractLabel(value: string) {
  return value.replace(/^get_/, "").split("_").map((part) =>
    part.charAt(0).toUpperCase() + part.slice(1)
  ).join(" ");
}
export function initialContractValue(param: ContractParam) {
  if (param.type === "bool") return "false";
  if (param.type === "int" && param.name === "limit") return "25";
  if (param.type === "int") return "0";
  return "";
}
function parseContractValue(param: ContractParam, raw: string) {
  if (param.type === "bool") return raw === "true";
  if (param.type === "int") {
    const value = Number(raw);
    if (!Number.isFinite(value)) throw new Error(`${contractLabel(param.name)} must be numeric.`);
    return value;
  }
  const value = raw.trim();
  if (!value) throw new Error(`${contractLabel(param.name)} is required.`);
  if (param.name.endsWith("_json")) JSON.parse(value);
  return value;
}
export function longContractField(param: ContractParam) {
  return /(json|description|summary|policy|criteria|reason|grounds|note|brief|text|statement|purpose|answer)/.test(param.name);
}
export function stringifyContractValue(value: unknown) {
  return JSON.stringify(value, (_key, item) =>
    typeof item === "bigint" ? item.toString() : item, 2);
}

export function useContractWorkflow() {
  const methods: readonly ContractMethod[] = contractMethods;
  const [selectedName, setSelectedName] = useState(methods[0]!.name);
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const transaction = useContractWrite();
  const selected = useMemo(
    () => methods.find((method) => method.name === selectedName) ?? methods[0]!,
    [methods, selectedName],
  );
  function reset() {
    setResult(null);
    setError("");
    transaction.reset();
  }
  function choose(method: ContractMethod) {
    setSelectedName(method.name);
    setValues(Object.fromEntries(method.params.map((param) =>
      [param.name, initialContractValue(param)])));
    reset();
  }
  async function execute(event?: FormEvent) {
    event?.preventDefault();
    if (!contractAddress) return;
    setError("");
    setResult(null);
    const args = selected.params.map((param) =>
      parseContractValue(param, values[param.name] ?? initialContractValue(param)));
    try {
      if (selected.kind === "read") {
        setReading(true);
        setResult(await client.readContract({
          address: contractAddress,
          functionName: selected.name,
          args: args as never[],
          jsonSafeReturn: true,
        }));
      } else {
        const hash = await transaction.write(contractLabel(selected.name), selected.name, args);
        setResult({ operation: selected.name, transactionHash: hash, consensus: "finalized" });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The contract operation failed.");
    } finally {
      setReading(false);
    }
  }
  const busy = reading || ["wallet", "network", "submitted", "consensus", "finalizing"].includes(transaction.state.stage);
  return { methods, selected, values, setValues, choose, execute, reset, result, error, busy, transaction };
}
