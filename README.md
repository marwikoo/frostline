# Frostline

> Cold-chain release control backed by an attributable GenLayer dossier.

Frostline helps logistics and quality teams decide whether a temperature-sensitive shipment can be released, must be quarantined, or needs physical inspection. Sensor declarations, custody evidence, receiver acknowledgement, quality holds, appeals, and final disposition remain attached to the same lot.

## Operations Snapshot

| Item | Current record |
| --- | --- |
| Protocol | Frostline Release Board |
| Network | GenLayer Studionet, chain `61999` |
| Contract | [`0x14CeeB8affdFefd69Ad1f6Db9472Ea72fED1ff5B`](https://explorer-studio.genlayer.com/address/0x14CeeB8affdFefd69Ad1f6Db9472Ea72fED1ff5B) |
| Live app: | https://marwikoo.github.io/frostline/ |
| Contract methods | 25 |
| Neutral outcome | `inspection_required` |
| Deployment state | `configured_verified` |

## Release Runbook

1. **Register the lot.** Record its route, transport window, receiver, and permitted temperature envelope.
2. **Build the dossier.** Attach sensor, custody, excursion, and release-standard evidence.
3. **Confirm receipt.** A wallet different from the shipper acknowledges the physical handoff.
4. **Seal and assess.** Validators evaluate the attributable evidence against the declared release standard.
5. **Handle counter-evidence.** Quality teams may open a hold and record its resolution.
6. **Appeal with new material.** An appeal must add attributable evidence rather than repeat the original claim.
7. **Finalize disposition.** The lot becomes released, quarantined, or inspection-required.

## Console Surfaces

Frostline uses a compact control-room model rather than a collection of artificial pages.

- `/` introduces the product.
- `/control` is the active cold-chain flight deck.
- `/shipments` handles lot registration and the complete evidence-to-release sequence.
- `/audit` exposes the immutable lot timeline.

The shipment workspace changes operational stages in place; it does not encode each stage as a separate route.

## Trust Model

The intelligent contract evaluates contextual evidence, but it does not invent sensor readings or silently resolve missing custody. The UI distinguishes declared facts, public evidence, independent acknowledgement, consensus results, and final operator actions.

Important boundaries:

- evidence URLs are public and treated as untrusted input;
- write actions require explicit wallet confirmation;
- receiver acknowledgement is independent from the registering wallet;
- a neutral result preserves uncertainty instead of forcing release or rejection;
- contract history remains readable after final disposition.

See `SECURITY.md` and `THREAT_MODEL.md` for the complete model.

## Start A Local Shift

```powershell
npm run dev
```

Quality checks:

```powershell
npm run test:lint
npm run test:direct
npm test
npm run typecheck
npm run test:studionet
npm run build
npm run verify
```
