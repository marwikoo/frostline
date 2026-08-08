import {
  Activity,
  FileClock,
  PackageSearch,
} from "lucide-react";

export const frostlineConfig = {
  projectId: "02-frostline",
  name: "Frostline",
  chainId: 61999,
  routes: [
    { href: "/control", label: "Flight deck", icon: Activity, viewIndex: 0 },
    { href: "/shipments", label: "Shipments", icon: PackageSearch, viewIndex: 1 },
    { href: "/audit", label: "Chain log", icon: FileClock, viewIndex: 4 },
  ],
  evidenceTypes: [
    { value: "sensor", label: "Sensor manifest" },
    { value: "custody", label: "Custody handoff" },
    { value: "excursion", label: "Excursion report" },
    { value: "standard", label: "Release standard" },
  ],
  releaseStages: [
    "Dossier",
    "Receipt",
    "Consensus",
    "Hold",
    "Appeal",
    "Disposition",
  ],
} as const;
