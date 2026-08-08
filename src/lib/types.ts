export type EvidenceType =
  | "sensor_manifest"
  | "custody_handoff"
  | "excursion_report"
  | "release_standard";

export type Disposition =
  | "release"
  | "quarantine"
  | "inspection_required"
  | "";

export type FrostlineEvidence = {
  id: string;
  shipment_id: string;
  type: EvidenceType;
  source_url: string;
  facts: Record<string, string | number>;
  author: string;
  created_at: number;
};

export type FrostlineAssessment = {
  id: string;
  shipment_id: string;
  phase: "initial_release" | "quality_hold" | "release_appeal";
  disposition: Disposition;
  risk_class: "low" | "medium" | "high" | "unknown";
  confidence_bps: number;
  excursion_minutes: number;
  summary: string;
  reason_codes: string[];
  source_findings: string[];
  created_at: number;
};

export type QualityHold = {
  id: string;
  shipment_id: string;
  opened_by: string;
  source_url: string;
  rationale: string;
  status: "open" | "resolved";
  previous_disposition: Disposition;
  resolved_disposition: Disposition;
  review_id: string;
  opened_at: number;
  resolved_at?: number;
};

export type ReleaseAppeal = {
  id: string;
  shipment_id: string;
  filed_by: string;
  source_url: string;
  rationale: string;
  status: "open" | "resolved";
  previous_disposition: Disposition;
  resolved_disposition: Disposition;
  review_id: string;
  filed_at: number;
  resolved_at?: number;
};

export type FrostlineShipment = {
  id: string;
  product_name: string;
  batch_code: string;
  origin: string;
  destination: string;
  transport_start: number;
  transport_end: number;
  min_temp_milli_c: number;
  max_temp_milli_c: number;
  primary_evidence_url: string;
  operator: string;
  receiver: string;
  receipt_url: string;
  receipt_note: string;
  status: string;
  evidence_ids: string[];
  evidence_counts: Record<EvidenceType, number>;
  active_review_id: string;
  active_disposition: Disposition;
  risk_class: "low" | "medium" | "high" | "unknown";
  confidence_bps: number;
  review_count: number;
  challenge_deadline: number;
  hold_id: string;
  appeal_deadline: number;
  appeal_id: string;
  finalized: boolean;
  finalized_at: number;
  event_ids: string[];
  evidence?: FrostlineEvidence[];
  active_review?: FrostlineAssessment;
  quality_hold?: QualityHold;
  release_appeal?: ReleaseAppeal;
};

export type FrostlineProtocol = {
  name: string;
  label: string;
  configured: boolean;
  owner: string;
  release_policy: string;
  review_window_seconds: number;
  appeal_window_seconds: number;
  dispositions: string[];
  neutral_disposition: "inspection_required";
  evidence_types: EvidenceType[];
  states: string[];
};

export type FrostlineCounts = {
  shipments: number;
  evidence: number;
  sensor_manifests: number;
  custody_handoffs: number;
  excursion_reports: number;
  release_standards: number;
  reviews: number;
  holds: number;
  appeals: number;
  finalized: number;
  released: number;
  quarantined: number;
  inspection_required: number;
};

export type FrostlineDashboard = {
  protocol: FrostlineProtocol;
  counts: FrostlineCounts;
  shipments: FrostlineShipment[];
  generated_at: number;
};

export type TimelineEvent = {
  id: string;
  shipment_id: string;
  action: string;
  actor: string;
  detail: string;
  timestamp: number;
  sequence: number;
};

export type TxStage =
  | "idle"
  | "network"
  | "wallet"
  | "submitted"
  | "consensus"
  | "finalized"
  | "failed";

export type TxState = {
  stage: TxStage;
  action: string;
  hash?: string;
  error?: string;
};
