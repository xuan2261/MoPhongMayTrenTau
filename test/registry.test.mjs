import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {FCV588_ADAPTER} from "../src/devices/fcv588/adapter.mjs";
import {MDC2060_ADAPTER} from "../src/devices/mdc2060/adapter.mjs";
import {fingerprint} from "../src/core/protocol.mjs";

const registerPath = fileURLToPath(new URL("../docs/evidence/device-register.json", import.meta.url));
const register = JSON.parse(await readFile(registerPath, "utf8"));

test("evidence register is explicit about 6 devices and rejects unsupported release", () => {
  assert.equal(register.schemaVersion, 1);
  assert.equal(register.devices.length, 6);
  assert.equal(new Set(register.devices.map(d => d.profileId)).size, 6);
  assert.ok(register.devices.every(d => d.releaseApproval === "HOLD"));
  assert.ok(register.devices.every(d => d.assetLicenseClearance === false));
});

test("model and evidence registration cannot drift silently", () => {
  for (const adapter of [FCV588_ADAPTER, MDC2060_ADAPTER]) {
    const evidence = register.devices.find(d => d.profileId === adapter.id);
    assert.ok(evidence, `missing register entry for ${adapter.id}`);
    assert.equal(evidence.profileRevision, adapter.revision);
    assert.equal(evidence.controllerVariant, adapter.profile.controller);
    assert.equal(evidence.firmwareVersion, null);
    assert.match(evidence.evidenceStatus, /hardware-unverified/);
    // Public-reference simulator profiles remain hardware-unverified and HOLD.
    assert.equal(evidence.implementationStatus, "F1_PUBLIC_REFERENCE_PARTIAL");
    assert.match(fingerprint(adapter.profile), /^f0-fnv1a32-/);
  }
  const mdcEvidence = register.devices[1];
  assert.equal(mdcEvidence.profileId, MDC2060_ADAPTER.id);
  assert.equal(mdcEvidence.controllerVariant, "mrd-104-integrated-panel");
  assert.equal(mdcEvidence.manualRevision, null);
  assert.equal(mdcEvidence.evidencePack, null);
  assert.match(mdcEvidence.manualRights, /RESTRICTED_REFERENCE_ONLY/);
  assert.match(mdcEvidence.manualRights, /PERMISSION_REQUIRED_FOR_AI_PROCESSING/);
});

test("other variants are held until model, hardware and version resolved", () => {
  const registeredIds = new Set([FCV588_ADAPTER.id, MDC2060_ADAPTER.id]);
  const unverified = register.devices.filter(d => !registeredIds.has(d.profileId));
  assert.equal(unverified.length, 4);
  assert.ok(unverified.every(d => d.firmwareVersion === null && d.implementationStatus === "NOT_STARTED"));
  assert.ok(unverified.every(d => d.profileRevision === null && d.controllerVariant === null));
  assert.match(register.devices.find(d => d.profileId.includes("j2000")).evidenceStatus, /identity-HOLD/);
});
