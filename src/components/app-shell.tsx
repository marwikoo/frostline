"use client";

import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Boxes,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  ExternalLink,
  FileCheck2,
  FileWarning,
  Fingerprint,
  Gauge,
  ClipboardList,
  Link2,
  LoaderCircle,
  LockKeyhole,
  PackageCheck,
  Plus,
  Radio,
  RefreshCw,
  RotateCcw,
  Scale,
  Send,
  ShieldAlert,
  ShieldCheck,
  Snowflake,
  ThermometerSnowflake,
  Truck,
  UserCheck,
  Wallet,
  X,
} from "lucide-react";
import { frostlineConfig } from "@/lib/config";
import {
  contractAddress,
  contractExplorerUrl,
  explorerBaseUrl,
} from "@/lib/deployment";
import { useFrostlineWrite } from "@/lib/genlayer";
import {
  useFrostlineDashboard,
  useFrostlineShipment,
  useFrostlineTimeline,
} from "@/hooks/use-frostline";
import { TemperatureEnvelope } from "@/components/domain-visual";
import { DomainContractActions } from "@/components/domain-contract-actions";
import type {
  Disposition,
  EvidenceType,
  FrostlineDashboard,
  FrostlineShipment,
  TimelineEvent,
  TxState,
} from "@/lib/types";

type AppShellProps = {
  routeIndex: number;
};

const shortAddress = (value: string) =>
  value ? `${value.slice(0, 6)}...${value.slice(-4)}` : "pending";

const formatTemp = (value: number) => `${(value / 1000).toFixed(1)} C`;

const formatTime = (value: number) =>
  value
    ? new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value * 1000))
    : "not set";

const titleCase = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function dispositionTone(value: string) {
  if (["release", "released", "ready_for_disposition"].includes(value)) {
    return "release";
  }
  if (["quarantine", "quarantined", "quality_hold"].includes(value)) {
    return "quarantine";
  }
  return "inspection";
}

function quiet(promise: Promise<unknown>) {
  promise.catch(() => undefined);
}

function ChainIdentity() {
  return (
    <a
      className="chain-identity"
      href={contractExplorerUrl}
      target="_blank"
      rel="noreferrer"
      title="Open Frostline contract in the Studionet explorer"
    >
      <Radio size={14} />
      <span>STUDIONET / 61999</span>
      <strong>{shortAddress(contractAddress)}</strong>
      <ExternalLink size={13} />
    </a>
  );
}

function WalletControl() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        mounted,
        openAccountModal,
        openChainModal,
        openConnectModal,
      }) => {
        const connected = mounted && account && chain;
        if (!connected) {
          return (
            <button className="wallet-control" onClick={openConnectModal}>
              <Wallet size={15} />
              Connect wallet
            </button>
          );
        }
        if (chain.unsupported) {
          return (
            <button className="wallet-control wrong" onClick={openChainModal}>
              <AlertTriangle size={15} />
              Switch network
            </button>
          );
        }
        return (
          <button className="wallet-control connected" onClick={openAccountModal}>
            <span className="wallet-led" />
            {account.displayName}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}

function FrostlineMark() {
  return (
    <div className="frostline-mark">
      <div className="crystal-mark" aria-hidden="true">
        <Snowflake size={22} />
      </div>
      <div>
        <strong>FROSTLINE</strong>
        <span>Release authority / FL-01</span>
      </div>
      <div className="system-temperature">
        <span>CHAMBER</span>
        <strong>+4.2 C</strong>
      </div>
    </div>
  );
}

function RailTelemetry() {
  const channels = [
    ["EVAP-A", "04.1", "nominal"],
    ["EVAP-B", "04.3", "nominal"],
    ["DOOR", "LOCK", "sealed"],
    ["POWER", "A/B", "redundant"],
  ];
  return (
    <div className="rail-telemetry" aria-label="Cold room telemetry">
      <span className="rail-label">Machine channels</span>
      {channels.map(([name, value, state], index) => (
        <div key={name}>
          <i className={index === 2 ? "amber" : ""} />
          <span>{name}</span>
          <strong>{value}</strong>
          <small>{state}</small>
        </div>
      ))}
    </div>
  );
}

function TopNavigation({ routeIndex }: AppShellProps) {
  return (
    <nav className="top-navigation" aria-label="Frostline sections">
      {frostlineConfig.routes.map((route) => {
        const Icon = route.icon;
        return (
          <Link
            key={route.href}
            href={route.href}
            className={route.viewIndex === routeIndex ? "active" : ""}
          >
            <Icon size={15} />
            <span>{route.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function ShipmentTools({
  routeIndex,
  onChange,
}: {
  routeIndex: number;
  onChange: (value: number) => void;
}) {
  const tools = [
    { index: 1, label: "Registry", icon: Boxes },
    { index: 2, label: "Evidence", icon: ThermometerSnowflake },
    { index: 3, label: "Release", icon: ClipboardList },
  ];
  return (
    <div className="shipment-tools" aria-label="Selected shipment tools">
      {tools.map(({ index, label, icon: Icon }) => (
        <button
          key={label}
          type="button"
          className={routeIndex === index ? "active" : ""}
          onClick={() => onChange(index)}
        >
          <Icon size={14} />
          {label}
        </button>
      ))}
    </div>
  );
}

function TxMonitor({
  state,
  reset,
}: {
  state: TxState;
  reset: () => void;
}) {
  if (state.stage === "idle") return null;
  const pending = ["network", "wallet", "submitted", "consensus"].includes(
    state.stage,
  );
  const Icon = pending
    ? LoaderCircle
    : state.stage === "finalized"
      ? CheckCircle2
      : AlertOctagon;
  return (
    <div className={`tx-monitor ${state.stage}`}>
      <Icon className={pending ? "spin" : ""} size={17} />
      <div>
        <strong>{state.action}</strong>
        <span>{state.error || titleCase(state.stage)}</span>
      </div>
      {state.hash && (
        <a
          href={`${explorerBaseUrl}/transactions/${state.hash}`}
          target="_blank"
          rel="noreferrer"
        >
          {shortAddress(state.hash)}
          <ExternalLink size={12} />
        </a>
      )}
      {!pending && (
        <button className="icon-command" onClick={reset} title="Dismiss status">
          <RotateCcw size={15} />
        </button>
      )}
    </div>
  );
}

function StatusFlag({ status }: { status: string }) {
  return (
    <span className={`status-flag ${dispositionTone(status)}`}>
      <i />
      {titleCase(status)}
    </span>
  );
}

function MetricStrip({ data }: { data?: FrostlineDashboard }) {
  const metrics = [
    {
      label: "Lots",
      value: data?.counts?.shipments ?? 0,
      icon: Boxes,
    },
    {
      label: "Evidence",
      value: data?.counts?.evidence ?? 0,
      icon: FileCheck2,
    },
    {
      label: "Consensus runs",
      value: data?.counts?.reviews ?? 0,
      icon: Scale,
    },
    {
      label: "Quality holds",
      value: data?.counts?.holds ?? 0,
      icon: ShieldAlert,
    },
    {
      label: "Finalized",
      value: data?.counts?.finalized ?? 0,
      icon: PackageCheck,
    },
  ];
  return (
    <div className="metric-strip">
      {metrics.map(({ label, value, icon: Icon }) => (
        <div key={label}>
          <Icon size={15} />
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function ViewTitle({ routeIndex }: AppShellProps) {
  const copy = [
    [
      "Flight deck",
      "Cold-chain release at instrument level",
      "Live lots, declared temperature envelopes and consensus queues.",
    ],
    [
      "Lot registry",
      "Register the physical movement",
      "Bind product, route, time window and permitted temperature before evidence collection.",
    ],
    [
      "Evidence bay",
      "Assemble an attributable dossier",
      "Sensor manifests, custody handoffs, release standards and independent receipt.",
    ],
    [
      "Release board",
      "Resolve the operational disposition",
      "Consensus assessment, quality hold, appeal and canonical release decision.",
    ],
    [
      "Chain log",
      "Inspect every state transition",
      "A source-linked timeline with actors, assessments and finality.",
    ],
  ][routeIndex] ?? ["Frostline", "Release board", ""];
  return (
    <div className="view-title">
      <span>
        FL-01 / {copy[0]}
      </span>
      <h1>{copy[1]}</h1>
      <p>{copy[2]}</p>
    </div>
  );
}

function LoadingBar() {
  return (
    <div className="loading-bar">
      <LoaderCircle className="spin" size={15} />
      Reading canonical Frostline state
    </div>
  );
}

function ReadError({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) {
  return (
    <div className="read-error">
      <AlertOctagon size={18} />
      <div>
        <strong>Studionet read failed</strong>
        <span>{message}</span>
      </div>
      <button className="icon-command" onClick={retry} title="Retry live read">
        <RefreshCw size={15} />
      </button>
    </div>
  );
}

function ShipmentSelector({
  shipments,
  value,
  onChange,
}: {
  shipments: FrostlineShipment[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <label className="lot-selector">
      <span>Active lot</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select a shipment</option>
        {shipments.map((shipment) => (
          <option value={shipment.id} key={shipment.id}>
            {shipment.batch_code} / {shipment.product_name}
          </option>
        ))}
      </select>
    </label>
  );
}

function ShipmentTable({
  shipments,
  selectedId,
  onSelect,
}: {
  shipments: FrostlineShipment[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  if (!shipments.length) {
    return (
      <div className="empty-register">
        <Snowflake size={25} />
        <strong>No shipment dossier</strong>
        <span>The contract is live and the lot register is empty.</span>
      </div>
    );
  }
  return (
    <div className="shipment-table">
      <div className="table-head">
        <span>Batch / product</span>
        <span>Route</span>
        <span>Envelope</span>
        <span>Status</span>
        <span>Score</span>
        <span />
      </div>
      {shipments.map((shipment) => (
        <button
          key={shipment.id}
          className={shipment.id === selectedId ? "selected" : ""}
          onClick={() => onSelect(shipment.id)}
        >
          <span>
            <strong>{shipment.batch_code}</strong>
            <small>{shipment.product_name}</small>
          </span>
          <span>
            <strong>{shipment.origin}</strong>
            <small>{shipment.destination}</small>
          </span>
          <span className="mono">
            {formatTemp(shipment.min_temp_milli_c)} /{" "}
            {formatTemp(shipment.max_temp_milli_c)}
          </span>
          <StatusFlag status={shipment.status} />
          <span className="score-cell">
            {Math.round(shipment.confidence_bps / 100)}%
          </span>
          <ChevronRight size={16} />
        </button>
      ))}
    </div>
  );
}

function DossierChecklist({ shipment }: { shipment?: FrostlineShipment }) {
  const rows = [
    {
      label: "Sensor manifest",
      ready: Boolean(shipment?.evidence_counts?.sensor_manifest),
    },
    {
      label: "Custody handoff",
      ready: Boolean(shipment?.evidence_counts?.custody_handoff),
    },
    {
      label: "Release standard",
      ready: Boolean(shipment?.evidence_counts?.release_standard),
    },
    {
      label: "Independent receipt",
      ready: Boolean(shipment?.receiver),
    },
    {
      label: "Consensus assessment",
      ready: Boolean(shipment?.active_review_id),
    },
  ];
  return (
    <div className="dossier-checklist">
      <header>
        <Fingerprint size={17} />
        <strong>Dossier integrity</strong>
      </header>
      {rows.map((row) => (
        <div className={row.ready ? "ready" : ""} key={row.label}>
          {row.ready ? <Check size={14} /> : <CircleDot size={14} />}
          <span>{row.label}</span>
          <small>{row.ready ? "bound" : "pending"}</small>
        </div>
      ))}
    </div>
  );
}

function DecisionReadout({ shipment }: { shipment?: FrostlineShipment }) {
  const disposition = shipment?.active_disposition || "inspection_required";
  return (
    <div className={`decision-readout ${dispositionTone(disposition)}`}>
      <span>Canonical disposition</span>
      <strong>{titleCase(disposition)}</strong>
      <div>
        <Gauge size={15} />
        {shipment ? Math.round(shipment.confidence_bps / 100) : 0}% confidence
      </div>
      <p>
        {shipment?.active_review?.summary ||
          "No validator assessment has been committed for this lot."}
      </p>
    </div>
  );
}

function CreateShipmentForm() {
  const tx = useFrostlineWrite();
  const [fields, setFields] = useState({
    id: "",
    product: "",
    batch: "",
    origin: "",
    destination: "",
    start: "",
    end: "",
    minimum: "2000",
    maximum: "8000",
    url: "",
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    const start = Math.floor(new Date(fields.start).getTime() / 1000);
    const end = Math.floor(new Date(fields.end).getTime() / 1000);
    quiet(
      tx
        .write("Register shipment dossier", "register_shipment", [
          fields.id,
          fields.product,
          fields.batch,
          fields.origin,
          fields.destination,
          start,
          end,
          Number(fields.minimum),
          Number(fields.maximum),
          fields.url,
        ])
        .then(() =>
          setFields({
            id: "",
            product: "",
            batch: "",
            origin: "",
            destination: "",
            start: "",
            end: "",
            minimum: "2000",
            maximum: "8000",
            url: "",
          }),
        ),
    );
  }

  return (
    <form className="instrument-form register-form" onSubmit={submit}>
      <header>
        <div className="form-code">REG-01</div>
        <div>
          <strong>New transport lot</strong>
          <span>Creates the immutable shipment envelope.</span>
        </div>
      </header>
      <div className="field-pair">
        <label>
          Shipment ID
          <input
            required
            pattern="[a-z0-9_-]{3,64}"
            value={fields.id}
            onChange={(event) =>
              setFields({ ...fields, id: event.target.value })
            }
            placeholder="lot-arctic-17"
          />
        </label>
        <label>
          Batch code
          <input
            required
            minLength={2}
            value={fields.batch}
            onChange={(event) =>
              setFields({ ...fields, batch: event.target.value })
            }
            placeholder="BATCH-ARCTIC-17"
          />
        </label>
      </div>
      <label>
        Product
        <input
          required
          minLength={3}
          value={fields.product}
          onChange={(event) =>
            setFields({ ...fields, product: event.target.value })
          }
          placeholder="Temperature-sensitive biologic"
        />
      </label>
      <div className="field-pair">
        <label>
          Origin
          <input
            required
            minLength={3}
            value={fields.origin}
            onChange={(event) =>
              setFields({ ...fields, origin: event.target.value })
            }
          />
        </label>
        <label>
          Destination
          <input
            required
            minLength={3}
            value={fields.destination}
            onChange={(event) =>
              setFields({ ...fields, destination: event.target.value })
            }
          />
        </label>
      </div>
      <div className="field-pair">
        <label>
          Transport start
          <input
            required
            type="datetime-local"
            value={fields.start}
            onChange={(event) =>
              setFields({ ...fields, start: event.target.value })
            }
          />
        </label>
        <label>
          Transport end
          <input
            required
            type="datetime-local"
            value={fields.end}
            onChange={(event) =>
              setFields({ ...fields, end: event.target.value })
            }
          />
        </label>
      </div>
      <div className="field-pair">
        <label>
          Minimum milli-C
          <input
            required
            type="number"
            value={fields.minimum}
            onChange={(event) =>
              setFields({ ...fields, minimum: event.target.value })
            }
          />
        </label>
        <label>
          Maximum milli-C
          <input
            required
            type="number"
            value={fields.maximum}
            onChange={(event) =>
              setFields({ ...fields, maximum: event.target.value })
            }
          />
        </label>
      </div>
      <label>
        Primary manifest URL
        <input
          required
          type="url"
          value={fields.url}
          onChange={(event) =>
            setFields({ ...fields, url: event.target.value })
          }
          placeholder="https://..."
        />
      </label>
      <button className="command-button" type="submit">
        <Plus size={16} />
        Register lot
      </button>
      <TxMonitor state={tx.state} reset={tx.reset} />
    </form>
  );
}

type EvidenceMode = "sensor" | "custody" | "excursion" | "standard";

function EvidenceForm({
  shipment,
}: {
  shipment?: FrostlineShipment;
}) {
  const tx = useFrostlineWrite();
  const [mode, setMode] = useState<EvidenceMode>("sensor");
  const [fields, setFields] = useState({
    id: "",
    url: "",
    summary: "",
    sensorCount: "1",
    sampleCount: "24",
    minimum: "2000",
    maximum: "8000",
    fromParty: "",
    toParty: "",
    handoff: "",
    peak: "9000",
    duration: "15",
    authority: "",
    standardTitle: "",
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!shipment) return;
    let functionName = "attach_sensor_manifest";
    let args: unknown[] = [
      fields.id,
      shipment.id,
      fields.url,
      Number(fields.sensorCount),
      Number(fields.sampleCount),
      Number(fields.minimum),
      Number(fields.maximum),
      fields.summary,
    ];
    if (mode === "custody") {
      functionName = "record_custody_handoff";
      args = [
        fields.id,
        shipment.id,
        fields.url,
        fields.fromParty,
        fields.toParty,
        Math.floor(new Date(fields.handoff).getTime() / 1000),
        fields.summary,
      ];
    }
    if (mode === "excursion") {
      functionName = "declare_excursion";
      args = [
        fields.id,
        shipment.id,
        fields.url,
        Number(fields.peak),
        Number(fields.duration),
        fields.summary,
      ];
    }
    if (mode === "standard") {
      functionName = "attach_release_standard";
      args = [
        fields.id,
        shipment.id,
        fields.url,
        fields.authority,
        fields.standardTitle,
        fields.summary,
      ];
    }
    quiet(
      tx
        .write(`Attach ${mode} evidence`, functionName, args)
        .then(() =>
          setFields({ ...fields, id: "", url: "", summary: "" }),
        ),
    );
  }

  return (
    <form className="instrument-form evidence-form" onSubmit={submit}>
      <header>
        <div className="form-code">EVD-02</div>
        <div>
          <strong>Evidence intake</strong>
          <span>Each attachment keeps source, author and structured facts.</span>
        </div>
      </header>
      <div className="segmented-control" aria-label="Evidence type">
        {frostlineConfig.evidenceTypes.map((item) => (
          <button
            type="button"
            key={item.value}
            className={mode === item.value ? "active" : ""}
            onClick={() => setMode(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="field-pair">
        <label>
          Evidence ID
          <input
            required
            pattern="[a-z0-9_-]{3,64}"
            value={fields.id}
            onChange={(event) =>
              setFields({ ...fields, id: event.target.value })
            }
          />
        </label>
        <label>
          Public source URL
          <input
            required
            type="url"
            value={fields.url}
            onChange={(event) =>
              setFields({ ...fields, url: event.target.value })
            }
          />
        </label>
      </div>
      {mode === "sensor" && (
        <>
          <div className="field-pair">
            <label>
              Sensors
              <input
                required
                type="number"
                min={1}
                max={256}
                value={fields.sensorCount}
                onChange={(event) =>
                  setFields({ ...fields, sensorCount: event.target.value })
                }
              />
            </label>
            <label>
              Samples
              <input
                required
                type="number"
                min={2}
                value={fields.sampleCount}
                onChange={(event) =>
                  setFields({ ...fields, sampleCount: event.target.value })
                }
              />
            </label>
          </div>
          <div className="field-pair">
            <label>
              Declared minimum
              <input
                required
                type="number"
                value={fields.minimum}
                onChange={(event) =>
                  setFields({ ...fields, minimum: event.target.value })
                }
              />
            </label>
            <label>
              Declared maximum
              <input
                required
                type="number"
                value={fields.maximum}
                onChange={(event) =>
                  setFields({ ...fields, maximum: event.target.value })
                }
              />
            </label>
          </div>
        </>
      )}
      {mode === "custody" && (
        <>
          <div className="field-pair">
            <label>
              From party
              <input
                required
                value={fields.fromParty}
                onChange={(event) =>
                  setFields({ ...fields, fromParty: event.target.value })
                }
              />
            </label>
            <label>
              To party
              <input
                required
                value={fields.toParty}
                onChange={(event) =>
                  setFields({ ...fields, toParty: event.target.value })
                }
              />
            </label>
          </div>
          <label>
            Handoff time
            <input
              required
              type="datetime-local"
              value={fields.handoff}
              onChange={(event) =>
                setFields({ ...fields, handoff: event.target.value })
              }
            />
          </label>
        </>
      )}
      {mode === "excursion" && (
        <div className="field-pair">
          <label>
            Peak milli-C
            <input
              required
              type="number"
              value={fields.peak}
              onChange={(event) =>
                setFields({ ...fields, peak: event.target.value })
              }
            />
          </label>
          <label>
            Duration minutes
            <input
              required
              type="number"
              min={1}
              value={fields.duration}
              onChange={(event) =>
                setFields({ ...fields, duration: event.target.value })
              }
            />
          </label>
        </div>
      )}
      {mode === "standard" && (
        <div className="field-pair">
          <label>
            Authority
            <input
              required
              value={fields.authority}
              onChange={(event) =>
                setFields({ ...fields, authority: event.target.value })
              }
            />
          </label>
          <label>
            Standard title
            <input
              required
              value={fields.standardTitle}
              onChange={(event) =>
                setFields({ ...fields, standardTitle: event.target.value })
              }
            />
          </label>
        </div>
      )}
      <label>
        Structured summary
        <textarea
          required
          minLength={20}
          maxLength={1200}
          value={fields.summary}
          onChange={(event) =>
            setFields({ ...fields, summary: event.target.value })
          }
        />
      </label>
      <button
        className="command-button"
        type="submit"
        disabled={!shipment || shipment.status !== "draft"}
      >
        <Link2 size={16} />
        Bind evidence
      </button>
      <TxMonitor state={tx.state} reset={tx.reset} />
    </form>
  );
}

function ReceiptAndSeal({ shipment }: { shipment?: FrostlineShipment }) {
  const tx = useFrostlineWrite();
  const { address } = useAccount();
  const [receipt, setReceipt] = useState({ url: "", note: "" });
  const connected = address?.toLowerCase();
  const operator = shipment?.operator?.toLowerCase();
  const canAcknowledge =
    shipment?.status === "draft" &&
    !shipment.receiver &&
    connected &&
    connected !== operator;
  const canSeal =
    shipment?.status === "draft" &&
    connected === operator &&
    Boolean(shipment.receiver) &&
    Boolean(shipment.evidence_counts.sensor_manifest) &&
    Boolean(shipment.evidence_counts.custody_handoff) &&
    Boolean(shipment.evidence_counts.release_standard);

  function acknowledge(event: FormEvent) {
    event.preventDefault();
    if (!shipment) return;
    quiet(
      tx
        .write("Acknowledge independent receipt", "acknowledge_receipt", [
          shipment.id,
          receipt.url,
          receipt.note,
        ])
        .then(() => setReceipt({ url: "", note: "" })),
    );
  }

  return (
    <div className="receipt-module">
      <header>
        <UserCheck size={18} />
        <div>
          <strong>Independent receipt</strong>
          <span>A second address must sign before dossier sealing.</span>
        </div>
      </header>
      {shipment?.receiver ? (
        <div className="signed-receipt">
          <BadgeCheck size={19} />
          <div>
            <strong>{shortAddress(shipment.receiver)}</strong>
            <span>{shipment.receipt_note}</span>
          </div>
        </div>
      ) : (
        <form onSubmit={acknowledge}>
          <label>
            Receipt source URL
            <input
              required
              type="url"
              value={receipt.url}
              onChange={(event) =>
                setReceipt({ ...receipt, url: event.target.value })
              }
            />
          </label>
          <label>
            Receiver note
            <textarea
              required
              minLength={20}
              value={receipt.note}
              onChange={(event) =>
                setReceipt({ ...receipt, note: event.target.value })
              }
            />
          </label>
          <button
            className="secondary-command"
            disabled={!canAcknowledge}
            type="submit"
          >
            <Fingerprint size={15} />
            Sign receipt
          </button>
        </form>
      )}
      <div className="seal-row">
        <div>
          <LockKeyhole size={16} />
          <span>Dossier status</span>
          <strong>{shipment ? titleCase(shipment.status) : "No lot"}</strong>
        </div>
        <button
          className="command-button"
          disabled={!canSeal}
          onClick={() =>
            shipment &&
            quiet(
              tx.write("Seal release dossier", "seal_dossier", [shipment.id]),
            )
          }
        >
          <LockKeyhole size={15} />
          Seal dossier
        </button>
      </div>
      <TxMonitor state={tx.state} reset={tx.reset} />
    </div>
  );
}

function EvidenceLedger({ shipment }: { shipment?: FrostlineShipment }) {
  const items = shipment?.evidence ?? [];
  if (!items.length) {
    return (
      <div className="empty-ledger">
        <FileWarning size={22} />
        <strong>No bound evidence</strong>
        <span>Attach the required dossier sources before sealing.</span>
      </div>
    );
  }
  return (
    <div className="evidence-ledger">
      {items.map((item, index) => (
        <article key={item.id}>
          <span className="ledger-index">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div>
            <strong>{titleCase(item.type)}</strong>
            <span>{item.id}</span>
          </div>
          <div className="fact-line">
            {Object.entries(item.facts)
              .slice(0, 3)
              .map(([key, value]) => (
                <span key={key}>
                  {titleCase(key)} <strong>{String(value)}</strong>
                </span>
              ))}
          </div>
          <a href={item.source_url} target="_blank" rel="noreferrer">
            Source <ExternalLink size={12} />
          </a>
        </article>
      ))}
    </div>
  );
}

function LifecycleBoard({ shipment }: { shipment?: FrostlineShipment }) {
  const tx = useFrostlineWrite();
  const { address } = useAccount();
  const [filing, setFiling] = useState({ id: "", url: "", rationale: "" });
  if (!shipment) {
    return (
      <div className="empty-release">
        <Scale size={24} />
        <strong>Select a lot</strong>
        <span>The release controls follow the selected onchain state.</span>
      </div>
    );
  }

  const shipmentId = shipment.id;
  const actor = address?.toLowerCase() ?? "";
  const isOperator = actor === shipment.operator.toLowerCase();
  const state = shipment.status;
  const deadline =
    state === "review_window"
      ? shipment.challenge_deadline
      : shipment.appeal_deadline;
  const deadlinePassed = deadline > 0 && Date.now() / 1000 > deadline;

  function filingSubmit(event: FormEvent) {
    event.preventDefault();
    const appeal = state === "appeal_window";
    quiet(
      tx
        .write(
          appeal ? "File release appeal" : "Open quality hold",
          appeal ? "file_release_appeal" : "open_quality_hold",
          [filing.id, shipmentId, filing.url, filing.rationale],
        )
        .then(() => setFiling({ id: "", url: "", rationale: "" })),
    );
  }

  return (
    <div className="lifecycle-board">
      <div className="lifecycle-track">
        {frostlineConfig.releaseStages.map((label, index) => {
          const activeIndex = {
            draft: 0,
            sealed: 1,
            review_window: 2,
            quality_hold: 3,
            appeal_window: 4,
            release_appeal: 4,
            ready_for_disposition: 5,
            released: 5,
            quarantined: 5,
            inspection_required: 5,
          }[state] ?? 0;
          return (
            <div
              key={label}
              className={
                index < activeIndex
                  ? "complete"
                  : index === activeIndex
                    ? "active"
                    : ""
              }
            >
              <span>{index < activeIndex ? <Check size={13} /> : index + 1}</span>
              <strong>{label}</strong>
              {index < frostlineConfig.releaseStages.length - 1 && (
                <ArrowRight size={14} />
              )}
            </div>
          );
        })}
      </div>

      <div className="release-command-panel">
        <div>
          <span>Current state</span>
          <StatusFlag status={state} />
        </div>
        {deadline > 0 && ["review_window", "appeal_window"].includes(state) && (
          <div className="deadline-readout">
            <Clock3 size={15} />
            <span>{deadlinePassed ? "Window elapsed" : "Window closes"}</span>
            <strong>{formatTime(deadline)}</strong>
          </div>
        )}

        {state === "sealed" && (
          <button
            className="command-button"
            onClick={() =>
              quiet(
                tx.write(
                  "Run consensus release assessment",
                  "run_initial_assessment",
                  [shipment.id],
                ),
              )
            }
          >
            <Scale size={16} />
            Run consensus assessment
          </button>
        )}
        {state === "quality_hold" && (
          <button
            className="command-button danger"
            onClick={() =>
              quiet(
                tx.write("Resolve quality hold", "resolve_quality_hold", [
                  shipment.id,
                ]),
              )
            }
          >
            <ShieldAlert size={16} />
            Resolve hold by consensus
          </button>
        )}
        {state === "release_appeal" && (
          <button
            className="command-button"
            onClick={() =>
              quiet(
                tx.write("Resolve release appeal", "resolve_release_appeal", [
                  shipment.id,
                ]),
              )
            }
          >
            <Scale size={16} />
            Resolve appeal by consensus
          </button>
        )}
        {state === "ready_for_disposition" && (
          <button
            className="command-button final"
            onClick={() =>
              quiet(
                tx.write("Finalize shipment disposition", "finalize_disposition", [
                  shipment.id,
                ]),
              )
            }
          >
            <PackageCheck size={16} />
            Finalize disposition
          </button>
        )}

        {state === "review_window" && deadlinePassed && (
          <button
            className="secondary-command"
            onClick={() =>
              quiet(
                tx.write(
                  "Close uncontested review",
                  "close_uncontested_review",
                  [shipment.id],
                ),
              )
            }
          >
            <CheckCircle2 size={15} />
            Close uncontested review
          </button>
        )}
        {state === "appeal_window" && deadlinePassed && (
          <button
            className="secondary-command"
            onClick={() =>
              quiet(
                tx.write("Close unappealed window", "close_appeal_window", [
                  shipment.id,
                ]),
              )
            }
          >
            <CheckCircle2 size={15} />
            Close appeal window
          </button>
        )}
      </div>

      {["review_window", "appeal_window"].includes(state) &&
        !deadlinePassed &&
        ((state === "review_window" && !isOperator) ||
          state === "appeal_window") && (
          <form className="filing-console" onSubmit={filingSubmit}>
            <header>
              {state === "review_window" ? (
                <ShieldAlert size={17} />
              ) : (
                <Scale size={17} />
              )}
              <div>
                <strong>
                  {state === "review_window"
                    ? "Open quality hold"
                    : "File release appeal"}
                </strong>
                <span>Counter-evidence can replace the active disposition.</span>
              </div>
            </header>
            <div className="field-pair">
              <label>
                Filing ID
                <input
                  required
                  pattern="[a-z0-9_-]{3,64}"
                  value={filing.id}
                  onChange={(event) =>
                    setFiling({ ...filing, id: event.target.value })
                  }
                />
              </label>
              <label>
                Counter-evidence URL
                <input
                  required
                  type="url"
                  value={filing.url}
                  onChange={(event) =>
                    setFiling({ ...filing, url: event.target.value })
                  }
                />
              </label>
            </div>
            <label>
              Rationale
              <textarea
                required
                minLength={30}
                value={filing.rationale}
                onChange={(event) =>
                  setFiling({ ...filing, rationale: event.target.value })
                }
              />
            </label>
            <button className="secondary-command" type="submit">
              <Send size={15} />
              Submit filing
            </button>
          </form>
        )}
      <TxMonitor state={tx.state} reset={tx.reset} />
    </div>
  );
}

function AssessmentPanel({ shipment }: { shipment?: FrostlineShipment }) {
  const review = shipment?.active_review;
  if (!review) {
    return (
      <div className="assessment-empty">
        <Scale size={24} />
        <strong>No consensus assessment</strong>
        <span>Seal the dossier before invoking validator reasoning.</span>
      </div>
    );
  }
  return (
    <article className="assessment-panel">
      <header>
        <div>
          <span>Active assessment / {titleCase(review.phase)}</span>
          <StatusFlag status={review.disposition} />
        </div>
        <strong>{Math.round(review.confidence_bps / 100)}%</strong>
      </header>
      <p>{review.summary}</p>
      <div className="assessment-grid">
        <span>
          Risk class <strong>{review.risk_class}</strong>
        </span>
        <span>
          Excursion <strong>{review.excursion_minutes} min</strong>
        </span>
        <span>
          Revision <strong>{shipment.review_count}</strong>
        </span>
      </div>
      <div className="reason-codes">
        {review.reason_codes.map((code) => (
          <span key={code}>{titleCase(code)}</span>
        ))}
      </div>
      <ul>
        {review.source_findings.map((finding) => (
          <li key={finding}>{finding}</li>
        ))}
      </ul>
    </article>
  );
}

function Timeline({ events }: { events: TimelineEvent[] }) {
  if (!events.length) {
    return (
      <div className="timeline-empty">
        <Clock3 size={22} />
        No timeline for the selected lot.
      </div>
    );
  }
  return (
    <div className="timeline">
      {events.map((event) => (
        <article key={event.id}>
          <div className="timeline-sequence">{event.sequence}</div>
          <i />
          <div>
            <span>{formatTime(event.timestamp)}</span>
            <strong>{titleCase(event.action)}</strong>
            <p>{event.detail}</p>
          </div>
          <code>{shortAddress(event.actor)}</code>
        </article>
      ))}
    </div>
  );
}

function RouteContent({
  routeIndex,
  data,
  shipments,
  selectedId,
  setSelectedId,
  shipment,
  timeline,
}: AppShellProps & {
  data?: FrostlineDashboard;
  shipments: FrostlineShipment[];
  selectedId: string;
  setSelectedId: (value: string) => void;
  shipment?: FrostlineShipment;
  timeline: TimelineEvent[];
}) {
  if (routeIndex === 0) {
    const queue = shipments.filter(
      (item) =>
        !item.finalized &&
        !["draft", "sealed"].includes(item.status),
    );
    return (
      <>
        <TemperatureEnvelope shipment={shipment} />
        <div className="flight-grid">
          <section className="registry-section">
            <div className="section-label">
              <div>
                <span>Live lot register</span>
                <h2>Cold-chain movements</h2>
              </div>
              <strong>{shipments.length} tracked</strong>
            </div>
            <ShipmentTable
              shipments={shipments}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </section>
          <section className="queue-section">
            <div className="section-label">
              <div>
                <span>Consensus queue</span>
                <h2>Attention</h2>
              </div>
              <AlertTriangle size={19} />
            </div>
            {queue.length ? (
              queue.slice(0, 5).map((item) => (
                <button key={item.id} onClick={() => setSelectedId(item.id)}>
                  <StatusFlag status={item.status} />
                  <strong>{item.batch_code}</strong>
                  <span>{titleCase(item.active_disposition || item.status)}</span>
                  <ChevronRight size={15} />
                </button>
              ))
            ) : (
              <div className="queue-clear">
                <ShieldCheck size={21} />
                <strong>No contested lot</strong>
                <span>The active queue has no hold or appeal.</span>
              </div>
            )}
          </section>
        </div>
      </>
    );
  }

  if (routeIndex === 1) {
    return (
      <div className="registry-workspace">
        <section>
          <div className="section-label">
            <div>
              <span>Onchain inventory</span>
              <h2>Registered lots</h2>
            </div>
            <span>{data?.counts?.finalized ?? 0} finalized</span>
          </div>
          <ShipmentTable
            shipments={shipments}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </section>
        <CreateShipmentForm />
      </div>
    );
  }

  if (routeIndex === 2) {
    return (
      <div className="evidence-workspace">
        <div>
          <TemperatureEnvelope shipment={shipment} />
          <EvidenceLedger shipment={shipment} />
        </div>
        <div>
          <EvidenceForm shipment={shipment} />
          <ReceiptAndSeal shipment={shipment} />
        </div>
      </div>
    );
  }

  if (routeIndex === 3) {
    return (
      <div className="release-workspace">
        <div>
          <TemperatureEnvelope shipment={shipment} />
          <AssessmentPanel shipment={shipment} />
        </div>
        <LifecycleBoard shipment={shipment} />
      </div>
    );
  }

  return (
    <div className="audit-workspace">
      <section>
        <div className="section-label">
          <div>
            <span>Immutable state transitions</span>
            <h2>Shipment timeline</h2>
          </div>
          <span>{timeline.length} events</span>
        </div>
        <Timeline events={timeline} />
      </section>
      <aside>
        <AssessmentPanel shipment={shipment} />
        <EvidenceLedger shipment={shipment} />
      </aside>
    </div>
  );
}

function ReleaseRail({
  shipments,
  selectedId,
  setSelectedId,
  shipment,
}: {
  shipments: FrostlineShipment[];
  selectedId: string;
  setSelectedId: (value: string) => void;
  shipment?: FrostlineShipment;
}) {
  return (
    <aside className="release-rail">
      <ShipmentSelector
        shipments={shipments}
        value={selectedId}
        onChange={setSelectedId}
      />
      {shipment && (
        <div className="lot-card">
          <span>{shipment.id}</span>
          <strong>{shipment.batch_code}</strong>
          <p>{shipment.product_name}</p>
          <div>
            <Truck size={14} />
            <span>
              {shipment.origin}
              <ChevronRight size={12} />
              {shipment.destination}
            </span>
          </div>
          <StatusFlag status={shipment.status} />
        </div>
      )}
      <DossierChecklist shipment={shipment} />
      <DecisionReadout shipment={shipment} />
      <div className="contract-anchor">
        <span>Contract anchor</span>
        <code>{contractAddress || "deployment pending"}</code>
        <a href={contractExplorerUrl} target="_blank" rel="noreferrer">
          Explorer record <ExternalLink size={12} />
        </a>
      </div>
    </aside>
  );
}

export function AppShell({ routeIndex: initialRouteIndex }: AppShellProps) {
  const [routeIndex, setRouteIndex] = useState(initialRouteIndex);
  const dashboard = useFrostlineDashboard();
  const shipments = useMemo(
    () => dashboard.data?.shipments ?? [],
    [dashboard.data?.shipments],
  );
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    if (!selectedId && shipments[0]?.id) setSelectedId(shipments[0].id);
  }, [selectedId, shipments]);

  useEffect(() => {
    document.documentElement.dataset.appHydrated = frostlineConfig.projectId;
  }, []);

  const shipmentQuery = useFrostlineShipment(selectedId);
  const timelineQuery = useFrostlineTimeline(selectedId);
  const shipment =
    shipmentQuery.data ?? shipments.find((item) => item.id === selectedId);

  return (
    <main className="frostline-shell">
      <header className="system-header">
        <FrostlineMark />
        <TopNavigation routeIndex={routeIndex} />
        <RailTelemetry />
        <div className="system-actions">
          <ChainIdentity />
          <WalletControl />
        </div>
      </header>

      <section className="signal-strip">
        <div className="signal-label">
          <ThermometerSnowflake size={18} />
          <span>Cold-chain register</span>
        </div>
        <MetricStrip data={dashboard.data} />
        <div className="signal-live">
          <i />
          <span>LIVE READ</span>
        </div>
      </section>

      <section className="view-stage">
        {[1, 2, 3].includes(routeIndex) && (
          <ShipmentTools routeIndex={routeIndex} onChange={setRouteIndex} />
        )}
        <ViewTitle routeIndex={routeIndex} />
        {dashboard.isLoading && <LoadingBar />}
        {dashboard.error && (
          <ReadError
            message={dashboard.error.message}
            retry={() => dashboard.refetch()}
          />
        )}
        <RouteContent
          routeIndex={routeIndex}
          data={dashboard.data}
          shipments={shipments}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          shipment={shipment}
          timeline={timelineQuery.data ?? []}
        />
        <DomainContractActions />
      </section>

      <ReleaseRail
        shipments={shipments}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
        shipment={shipment}
      />

      <footer className="system-footer">
        <span>
          <Snowflake size={13} />
          Frostline Release Authority
        </span>
        <span>Runner pinned / independent validator comparison</span>
        <a href={contractExplorerUrl} target="_blank" rel="noreferrer">
          {shortAddress(contractAddress)}
          <ExternalLink size={11} />
        </a>
      </footer>
    </main>
  );
}
