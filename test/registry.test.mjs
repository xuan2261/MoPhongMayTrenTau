import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {FCV588_ADAPTER} from "../src/devices/fcv588/adapter.mjs";
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
  const evidence = register.devices.find(d => d.profileId === FCV588_ADAPTER.id);
  assert.ok(evidence);
  assert.equal(evidence.profileRevision, FCV588_ADAPTER.revision);
  assert.equal(evidence.firmwareVersion, null);
  assert.match(evidence.evidenceStatus, /hardware-unverified/);
  // The source-backed MODE/UI clock reducer has a new replay contract while
  // the operator feature inventory is still incomplete and release remains HOLD.
  assert.equal(evidence.implementationStatus, "F1_PUBLIC_REFERENCE_PARTIAL");
  assert.match(fingerprint(FCV588_ADAPTER.profile), /^f0-fnv1a32-/);
});

test("other variants are held until model, hardware and version resolved", () => {
  const unverified = register.devices.filter(d => d.profileId !== FCV588_ADAPTER.id);
  assert.equal(unverified.length, 5);
  assert.ok(unverified.every(d => d.firmwareVersion === null && d.implementationStatus === "NOT_STARTED"));
  assert.ok(unverified.every(d => d.profileRevision === null && d.controllerVariant === null));
  assert.match(register.devices.find(d => d.profileId.includes("j2000")).evidenceStatus, /identity-HOLD/);
});
