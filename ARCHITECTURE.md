# Frostline Architecture

## Layers

1. `contracts/Frostline.py` owns all canonical domain state, permissions,
   lifecycle gates, AI assessments, deadlines, and audit events.
2. `src/lib/genlayer.ts` separates read and wallet-backed write clients, waits
   for final consensus, checks execution, and invalidates live queries.
3. `src/hooks/use-frostline.ts` exposes dashboard, shipment, and timeline reads.
4. `src/components/app-shell.tsx` provides five route-specific operational views
   over the same canonical contract.
5. `src/components/domain-visual.tsx` renders the declared temperature envelope
   with D3; it does not invent sensor samples.

## Trust Boundaries

- Connected wallet: authenticates the actor, but does not bypass contract roles.
- Contract storage: canonical state.
- Remote HTTPS pages: untrusted evidence.
- GenLayer validators: independent reasoning and deterministic comparison.
- Deployment JSON: public metadata only.

## Data Flow

Wallet action -> GenLayer transaction -> contract state gate -> optional
independent AI consensus -> ordered storage event -> finalized receipt -> query
invalidation -> live desktop view.
