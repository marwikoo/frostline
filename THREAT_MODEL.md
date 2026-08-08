# Frostline Threat Model

| Threat | Control |
|---|---|
| Unauthorized configuration | owner-only guard |
| Operator impersonation | sender checked against shipment operator |
| Receiver self-acknowledgement by operator | predeclared different receiver wallet |
| SSRF through evidence URL | HTTPS allow rules and private-host rejection |
| Prompt injection in fetched page | evidence-only prompts and independent validator rerun |
| Hallucinated permissive result | strict normalization and fail-closed inspection |
| Validator drift | disposition, risk, confidence, duration, and reason comparison |
| Evidence changed after review starts | immutable sealed dossier |
| Duplicate IDs or replay | existence checks and state transitions |
| Premature finalization | hold and appeal windows plus explicit final state |
| Browser accepting failed write | finalized, majority, and execution checks |
| Key disclosure | encrypted actor vault; no secrets in project artifacts |

Residual risk: public source availability and semantic ambiguity can still force
`inspection_required`. That is intentional and safer than automatic release.
