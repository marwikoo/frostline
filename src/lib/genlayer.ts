"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import { useAccount, useSwitchChain, useWalletClient } from "wagmi";
import { frostlineConfig } from "@/lib/config";
import {
  contractAddress,
  explorerBaseUrl,
} from "@/lib/deployment";
import type {
  FrostlineDashboard,
  FrostlineShipment,
  TimelineEvent,
  TxState,
} from "@/lib/types";

export const dashboardQueryKey = ["frostline", "dashboard"] as const;
export const shipmentQueryKey = (id: string) =>
  ["frostline", "shipment", id] as const;
export const timelineQueryKey = (id: string) =>
  ["frostline", "timeline", id] as const;

const readClient = createClient({ chain: studionet });

export class DeploymentPendingError extends Error {
  constructor() {
    super("Frostline is awaiting its Studionet deployment.");
    this.name = "DeploymentPendingError";
  }
}

function requireContract() {
  if (!contractAddress) throw new DeploymentPendingError();
  return contractAddress;
}

export async function readDashboard(): Promise<FrostlineDashboard> {
  const result = await readClient.readContract({
    address: requireContract(),
    functionName: "get_dashboard",
    args: [],
    jsonSafeReturn: true,
  });
  return result as unknown as FrostlineDashboard;
}

export async function readShipment(id: string): Promise<FrostlineShipment> {
  const result = await readClient.readContract({
    address: requireContract(),
    functionName: "get_shipment",
    args: [id],
    jsonSafeReturn: true,
  });
  return result as unknown as FrostlineShipment;
}

export async function readTimeline(id: string): Promise<TimelineEvent[]> {
  const result = await readClient.readContract({
    address: requireContract(),
    functionName: "get_shipment_timeline",
    args: [id],
    jsonSafeReturn: true,
  });
  return result as unknown as TimelineEvent[];
}

type EthereumRequest = {
  method: string;
  params?: readonly unknown[] | object;
};

type GenLayerReceipt = {
  statusName?: string;
  status_name?: string;
  resultName?: string;
  result_name?: string;
  data?: {
    error?: unknown;
    execution_result?: unknown;
    consensus_data?: {
      leader_receipt?:
        | {
            error?: unknown;
            execution_result?: unknown;
            genvm_result?: unknown;
          }
        | Array<{
            error?: unknown;
            execution_result?: unknown;
            genvm_result?: unknown;
          }>;
    };
  };
};

function assertExecutionSucceeded(receipt: GenLayerReceipt) {
  const status = receipt.statusName ?? receipt.status_name;
  const result = receipt.resultName ?? receipt.result_name;
  const leaderRaw = receipt.data?.consensus_data?.leader_receipt;
  const leader = Array.isArray(leaderRaw) ? leaderRaw[0] : leaderRaw;
  const error = leader?.error ?? receipt.data?.error;
  const execution =
    leader?.execution_result ??
    leader?.genvm_result ??
    receipt.data?.execution_result;
  const executionText = JSON.stringify(execution ?? "").toLowerCase();

  if (status !== TransactionStatus.FINALIZED) {
    throw new Error(`Transaction stopped at ${status || "unknown status"}.`);
  }
  if (result !== "MAJORITY_AGREE") {
    throw new Error(
      `Consensus did not approve this state change (${result || "unknown result"}).`,
    );
  }
  if (
    error ||
    executionText.includes("contract_error") ||
    executionText.includes('"success":false') ||
    executionText.includes('"status":"error"')
  ) {
    throw new Error(
      `Contract execution failed: ${String(error || execution || "unknown error")}`,
    );
  }
}

export function useFrostlineWrite() {
  const [state, setState] = useState<TxState>({
    stage: "idle",
    action: "",
  });
  const { address, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();
  const queryClient = useQueryClient();

  const reset = useCallback(
    () => setState({ stage: "idle", action: "" }),
    [],
  );

  const write = useCallback(
    async (action: string, functionName: string, args: unknown[]) => {
      const target = requireContract();
      if (!address || !walletClient) {
        const error = "Connect a wallet to sign this Frostline action.";
        setState({ stage: "failed", action, error });
        throw new Error(error);
      }

      try {
        if (chainId !== frostlineConfig.chainId) {
          setState({ stage: "network", action });
          await switchChainAsync({ chainId: frostlineConfig.chainId });
        }
        const provider = {
          request: ({ method, params }: EthereumRequest) =>
            walletClient.request({
              method: method as never,
              params: params as never,
            }),
        };
        const client = createClient({
          chain: studionet,
          account: address,
          provider: provider as never,
        });
        setState({ stage: "wallet", action });
        const hash = await client.writeContract({
          address: target,
          functionName,
          args: args as never[],
          value: BigInt(0),
        });
        setState({ stage: "submitted", action, hash });
        setState({ stage: "consensus", action, hash });
        const receipt = (await readClient.waitForTransactionReceipt({
          hash,
          status: TransactionStatus.FINALIZED,
          interval: 3000,
          retries: 240,
        })) as unknown as GenLayerReceipt;
        assertExecutionSucceeded(receipt);
        setState({ stage: "finalized", action, hash });
        await queryClient.invalidateQueries({ queryKey: dashboardQueryKey });
        await queryClient.invalidateQueries({
          queryKey: ["frostline", "shipment"],
        });
        await queryClient.invalidateQueries({
          queryKey: ["frostline", "timeline"],
        });
        return hash;
      } catch (cause) {
        const error =
          cause instanceof Error
            ? cause.message
            : "The Frostline transaction did not complete.";
        setState((current) => ({
          stage: "failed",
          action,
          hash: current.hash,
          error,
        }));
        throw cause;
      }
    },
    [address, chainId, queryClient, switchChainAsync, walletClient],
  );

  return {
    state,
    write,
    reset,
    explorerBaseUrl,
    ready: Boolean(contractAddress),
  };
}

export { useFrostlineWrite as useContractWrite };
