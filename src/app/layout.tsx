import type { Metadata } from "next";
import "@rainbow-me/rainbowkit/styles.css";
import "@fontsource-variable/ibm-plex-sans";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./globals.css";
import "./quality.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Frostline | GenLayer",
  description: "Release or quarantine cold-chain lots from public telemetry and custody evidence.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><Providers>{children}</Providers></body></html>;
}
