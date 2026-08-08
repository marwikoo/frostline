export type ContractParam = {
  name: string;
  type: "string" | "int" | "bool" | "address";
};

export type ContractMethod = {
  name: string;
  kind: "read" | "write";
  params: readonly ContractParam[];
  returns: string;
};

export const contractSurfaceIdentity = {
  "layout": "manifest",
  "kicker": "Frostline / custody control",
  "title": "Cold-chain command matrix",
  "description": "Operate shipment custody, evidence, holds, appeals and final disposition against the live release board.",
  "readLabel": "Telemetry reads",
  "writeLabel": "Custody commands",
  "searchPlaceholder": "Find a custody command",
  "readAction": "Query cold-chain state",
  "writeAction": "Transmit custody command",
  "resultLabel": "Control response",
  "emptyResult": "Telemetry and finalized custody receipts will appear in this control bay.",
  "colors": {
    "background": "#07152c",
    "panel": "#0e2241",
    "ink": "#f7fbff",
    "muted": "#b7c8de",
    "accent": "#20e2a8",
    "border": "#567195"
  }
} as const;

export const contractMethods = [
  {
    "name": "get_counts",
    "kind": "read",
    "params": [],
    "returns": "dict"
  },
  {
    "name": "get_custody_chain",
    "kind": "read",
    "params": [
      {
        "name": "shipment_id",
        "type": "string"
      }
    ],
    "returns": "dict"
  },
  {
    "name": "get_dashboard",
    "kind": "read",
    "params": [],
    "returns": "dict"
  },
  {
    "name": "get_protocol",
    "kind": "read",
    "params": [],
    "returns": "dict"
  },
  {
    "name": "get_quality_hold",
    "kind": "read",
    "params": [
      {
        "name": "hold_id",
        "type": "string"
      }
    ],
    "returns": "dict"
  },
  {
    "name": "get_recent_shipments",
    "kind": "read",
    "params": [
      {
        "name": "limit",
        "type": "int"
      }
    ],
    "returns": "array"
  },
  {
    "name": "get_release_appeal",
    "kind": "read",
    "params": [
      {
        "name": "appeal_id",
        "type": "string"
      }
    ],
    "returns": "dict"
  },
  {
    "name": "get_shipment",
    "kind": "read",
    "params": [
      {
        "name": "shipment_id",
        "type": "string"
      }
    ],
    "returns": "dict"
  },
  {
    "name": "get_shipment_timeline",
    "kind": "read",
    "params": [
      {
        "name": "shipment_id",
        "type": "string"
      }
    ],
    "returns": "array"
  },
  {
    "name": "acknowledge_receipt",
    "kind": "write",
    "params": [
      {
        "name": "shipment_id",
        "type": "string"
      },
      {
        "name": "receipt_url",
        "type": "string"
      },
      {
        "name": "receipt_note",
        "type": "string"
      }
    ],
    "returns": "null"
  },
  {
    "name": "attach_release_standard",
    "kind": "write",
    "params": [
      {
        "name": "evidence_id",
        "type": "string"
      },
      {
        "name": "shipment_id",
        "type": "string"
      },
      {
        "name": "source_url",
        "type": "string"
      },
      {
        "name": "authority",
        "type": "string"
      },
      {
        "name": "standard_title",
        "type": "string"
      },
      {
        "name": "summary",
        "type": "string"
      }
    ],
    "returns": "null"
  },
  {
    "name": "attach_sensor_manifest",
    "kind": "write",
    "params": [
      {
        "name": "evidence_id",
        "type": "string"
      },
      {
        "name": "shipment_id",
        "type": "string"
      },
      {
        "name": "source_url",
        "type": "string"
      },
      {
        "name": "sensor_count",
        "type": "int"
      },
      {
        "name": "sample_count",
        "type": "int"
      },
      {
        "name": "declared_min_milli_c",
        "type": "int"
      },
      {
        "name": "declared_max_milli_c",
        "type": "int"
      },
      {
        "name": "summary",
        "type": "string"
      }
    ],
    "returns": "null"
  },
  {
    "name": "close_appeal_window",
    "kind": "write",
    "params": [
      {
        "name": "shipment_id",
        "type": "string"
      }
    ],
    "returns": "null"
  },
  {
    "name": "close_uncontested_review",
    "kind": "write",
    "params": [
      {
        "name": "shipment_id",
        "type": "string"
      }
    ],
    "returns": "null"
  },
  {
    "name": "configure_protocol",
    "kind": "write",
    "params": [
      {
        "name": "protocol_label",
        "type": "string"
      },
      {
        "name": "release_policy",
        "type": "string"
      },
      {
        "name": "review_window_seconds",
        "type": "int"
      },
      {
        "name": "appeal_window_seconds",
        "type": "int"
      }
    ],
    "returns": "null"
  },
  {
    "name": "declare_excursion",
    "kind": "write",
    "params": [
      {
        "name": "evidence_id",
        "type": "string"
      },
      {
        "name": "shipment_id",
        "type": "string"
      },
      {
        "name": "source_url",
        "type": "string"
      },
      {
        "name": "peak_temp_milli_c",
        "type": "int"
      },
      {
        "name": "duration_minutes",
        "type": "int"
      },
      {
        "name": "summary",
        "type": "string"
      }
    ],
    "returns": "null"
  },
  {
    "name": "file_release_appeal",
    "kind": "write",
    "params": [
      {
        "name": "appeal_id",
        "type": "string"
      },
      {
        "name": "shipment_id",
        "type": "string"
      },
      {
        "name": "source_url",
        "type": "string"
      },
      {
        "name": "rationale",
        "type": "string"
      }
    ],
    "returns": "null"
  },
  {
    "name": "finalize_disposition",
    "kind": "write",
    "params": [
      {
        "name": "shipment_id",
        "type": "string"
      }
    ],
    "returns": "null"
  },
  {
    "name": "open_quality_hold",
    "kind": "write",
    "params": [
      {
        "name": "hold_id",
        "type": "string"
      },
      {
        "name": "shipment_id",
        "type": "string"
      },
      {
        "name": "source_url",
        "type": "string"
      },
      {
        "name": "rationale",
        "type": "string"
      }
    ],
    "returns": "null"
  },
  {
    "name": "record_custody_handoff",
    "kind": "write",
    "params": [
      {
        "name": "evidence_id",
        "type": "string"
      },
      {
        "name": "shipment_id",
        "type": "string"
      },
      {
        "name": "source_url",
        "type": "string"
      },
      {
        "name": "from_party",
        "type": "string"
      },
      {
        "name": "to_party",
        "type": "string"
      },
      {
        "name": "handoff_unix",
        "type": "int"
      },
      {
        "name": "summary",
        "type": "string"
      }
    ],
    "returns": "null"
  },
  {
    "name": "register_shipment",
    "kind": "write",
    "params": [
      {
        "name": "shipment_id",
        "type": "string"
      },
      {
        "name": "product_name",
        "type": "string"
      },
      {
        "name": "batch_code",
        "type": "string"
      },
      {
        "name": "origin",
        "type": "string"
      },
      {
        "name": "destination",
        "type": "string"
      },
      {
        "name": "transport_start",
        "type": "int"
      },
      {
        "name": "transport_end",
        "type": "int"
      },
      {
        "name": "min_temp_milli_c",
        "type": "int"
      },
      {
        "name": "max_temp_milli_c",
        "type": "int"
      },
      {
        "name": "primary_evidence_url",
        "type": "string"
      }
    ],
    "returns": "null"
  },
  {
    "name": "resolve_quality_hold",
    "kind": "write",
    "params": [
      {
        "name": "shipment_id",
        "type": "string"
      }
    ],
    "returns": "null"
  },
  {
    "name": "resolve_release_appeal",
    "kind": "write",
    "params": [
      {
        "name": "shipment_id",
        "type": "string"
      }
    ],
    "returns": "null"
  },
  {
    "name": "run_initial_assessment",
    "kind": "write",
    "params": [
      {
        "name": "shipment_id",
        "type": "string"
      }
    ],
    "returns": "null"
  },
  {
    "name": "seal_dossier",
    "kind": "write",
    "params": [
      {
        "name": "shipment_id",
        "type": "string"
      }
    ],
    "returns": "null"
  }
] as const satisfies readonly ContractMethod[];
