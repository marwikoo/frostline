import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const deployment = JSON.parse(
  fs.readFileSync(path.resolve("deployment.json"), "utf8"),
);
const client = createClient({ chain: studionet });

async function read(functionName, args = []) {
  assert.match(deployment.contractAddress, /^0x[0-9a-fA-F]{40}$/);
  return client.readContract({
    address: deployment.contractAddress,
    functionName,
    args,
    jsonSafeReturn: true,
  });
}

test("deployed protocol exposes the cold-chain decision model", async () => {
  const protocol = await read("get_protocol");
  assert.equal(protocol.name, "Frostline");
  assert.equal(protocol.configured, true);
  assert.equal(protocol.owner.toLowerCase(), deployment.deployerAddress.toLowerCase());
  assert.equal(protocol.neutral_disposition, "inspection_required");
  assert.deepEqual(protocol.dispositions, [
    "release",
    "quarantine",
    "inspection_required",
  ]);
});

test("dashboard returns the verified lifecycle record", async () => {
  const dashboard = await read("get_dashboard");
  assert.ok(dashboard.counts.shipments >= 2);
  assert.ok(dashboard.counts.reviews >= 6);
  assert.ok(dashboard.counts.finalized >= 2);
  assert.ok(Array.isArray(dashboard.shipments));
  assert.ok(
    dashboard.shipments.some(
      (shipment) => shipment.id === deployment.smokeRecordId,
    ),
  );
});

test("hold and appeal changed the canonical disposition before release", async () => {
  const shipment = await read("get_shipment", [deployment.smokeRecordId]);
  assert.equal(shipment.finalized, true);
  assert.equal(shipment.status, "released");
  assert.equal(shipment.active_disposition, "release");
  assert.equal(shipment.review_count, 3);
  assert.equal(
    shipment.receiver.toLowerCase(),
    deployment.receiverAddress.toLowerCase(),
  );
  assert.equal(shipment.quality_hold.previous_disposition, "release");
  assert.equal(
    shipment.quality_hold.resolved_disposition,
    "inspection_required",
  );
  assert.equal(
    shipment.release_appeal.previous_disposition,
    "inspection_required",
  );
  assert.equal(shipment.release_appeal.resolved_disposition, "release");
});

test("the deployed shipment retains its complete immutable timeline", async () => {
  const timeline = await read("get_shipment_timeline", [
    deployment.smokeRecordId,
  ]);
  assert.equal(timeline.length, 12);
  assert.equal(timeline.at(0).action, "shipment_registered");
  assert.equal(timeline.at(-1).action, "disposition_finalized");
  assert.ok(timeline.every((event, index) => Number(event.sequence) > index));
});
