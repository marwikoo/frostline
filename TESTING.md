# Frostline Testing

## Direct Mode

`tests/direct/test_frostline.py` contains 78 tests. They cover roles, state
transitions, URL safety, text and numeric bounds, evidence thresholds, immutable
sealing, independent receipt, deadline paths, hold and appeal logic, finality,
normalization, fail-closed behavior, and validator agreement/disagreement.

Run:

```powershell
npm run test:direct
```

## Static and Build Verification

```powershell
npm run test:lint
npm test
npm run typecheck
npm run build
```

## Studionet Integration

`tests/studionet.test.mjs` reads the live deployment and verifies protocol
configuration, dashboard counts, independent receiver, three assessments,
hold/appeal outcome changes, final release, and the 12-event timeline.

```powershell
npm run test:studionet
```

The public transaction hashes and verified disposition sequence are preserved
in `deployment.json`, so the deployed proof can be inspected without a local
machine artifact.
