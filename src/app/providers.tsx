"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { useState } from "react";
import { defineChain, http } from "viem";
import { WagmiProvider, createConfig } from "wagmi";
import { injected } from "wagmi/connectors";

export const studionetChain = defineChain({
  id: 61999,
  name: "GenLayer Studionet",
  nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
  rpcUrls: { default: { http: ["https://studio.genlayer.com/api"] } },
  blockExplorers: {
    default: {
      name: "GenLayer Explorer",
      url: "https://explorer-studio.genlayer.com",
    },
  },
  testnet: true,
});

const wagmiConfig = createConfig({
  chains: [studionetChain],
  connectors: [injected()],
  transports: {
    [studionetChain.id]: http(studionetChain.rpcUrls.default.http[0]),
  },
  ssr: true,
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 12_000,
            retry: 2,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider locale="en-US">{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
