import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const root = new URL("../", import.meta.url);
const load = async name => JSON.parse(await readFile(new URL(name, root), "utf8"));
const [matrix, canonical, ledger] = await Promise.all([
  load("docs/evidence/fcv588-public-trace-matrix.json"),
  load("docs/research/FCV588_FEATURE_REGISTER_DRAFT.json"),
  load("docs/evidence/fcv588-public-evidence-ledger.json"),
]);
const sourceIds = new Set(ledger.sources.map(source => source.id));

test("public trace accounts for 64 FCV operator features and separate teacher D15", () => {
  assert.equal(matrix.schemaVersion, 1);
  assert.equal(matrix.profileClass, "PUBLIC_REFERENCE");
  assert.equal(matrix.hardwareValidated, false);
  assert.equal(matrix.rows.length, 65, "all 64 FCV operator rows and D15 instructor row required");
  assert.deepEqual(matrix.rows.map(x => x.featureId).sort(), canonical.features.map(x => x.id).sort());
  assert.equal(new Set(matrix.rows.map(x => x.featureId)).size, 65);
  assert.equal(matrix.rows.filter(x => x.scope === "FCV_OPERATOR").length, 64);
  assert.deepEqual(matrix.rows.filter(x => x.scope === "INSTRUCTOR_PLATFORM").map(x => x.featureId), ["D15"]);
});

test("public feature claims never overwrite real-device approval and resolve evidence", () => {
  assert.equal(canonical.releaseApproval, "HOLD");
  for (const row of matrix.rows) {
    const original = canonical.features.find(feature => feature.id === row.featureId);
    assert.equal(row.scope, original.scope, row.featureId + " scope drift");
    assert.ok(Array.isArray(row.publicSourceIds), row.featureId + " source IDs");
    assert.ok(Array.isArray(row.manualRefs), row.featureId + " manual references");
    assert.ok(row.publicSourceIds.every(id => sourceIds.has(id)), row.featureId + " unresolved reference");
    assert.ok(row.rightsDecision && row.sourceStatus && row.guardExpression, row.featureId + " missing guards");
    assert.ok(row.implementationStatus && row.courseReviewStatus && row.claimDecision, row.featureId + " claims");
    assert.ok(Array.isArray(row.unknowns), row.featureId + " must expose unknowns");
    assert.equal(Object.hasOwn(row, "targetHardwareEvidenceIds"), false);
    assert.equal(Object.hasOwn(row, "operatorFidelityStatus"), false);
    assert.notEqual(row.claimDecision, "HARDWARE_VALIDATED", row.featureId);
    if (row.scope === "FCV_OPERATOR") {
      assert.ok(row.publicSourceIds.length > 0 || row.sourceStatus === "SOURCE_GAP");
    } else {
      assert.equal(row.featureId, "D15");
      assert.equal(row.publicSourceIds.length, 0, "teacher features not sourced to Furuno");
      assert.equal(row.platformQaStatus, "SIMULATED_ONLY");
      assert.equal(row.manualRefs.length, 0);
    }
  }
});

test("no untested operator behavior is promoted to public-reference conformance", () => {
  assert.ok(matrix.rows.filter(x => x.scope === "FCV_OPERATOR").every(x =>
    ["OPEN", "PARTIAL_F0", "SIMULATED_APPROXIMATION"].includes(x.implementationStatus)));
  assert.ok(matrix.rows.every(x => x.courseReviewStatus === "NOT_REVIEWED"));
  assert.ok(matrix.rows.every(x => x.claimDecision !== "PUBLIC_REFERENCE_CONFORMANT"));
});
