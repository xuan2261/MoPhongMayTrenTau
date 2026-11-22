import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const inventory = await readFile(
  new URL("../docs/research/FCV588_FULL_FUNCTION_INVENTORY_2026-10-13.md", import.meta.url),
  "utf8",
);
const manifest = JSON.parse(await readFile(
  new URL("../sources/manuals/MANIFEST.json", import.meta.url),
  "utf8",
));
const archiveCoverage = JSON.parse(await readFile(
  new URL("../sources/manuals/ARCHIVE_COVERAGE.json", import.meta.url),
  "utf8",
));
const researchRegister = JSON.parse(await readFile(
  new URL("../docs/research/FCV588_FEATURE_REGISTER_DRAFT.json", import.meta.url),
  "utf8",
));
const gitignore = await readFile(new URL("../.gitignore", import.meta.url), "utf8");

test("FCV-588 research inventory tracks all 65 unique tasks by domain", () => {
  const items = [...inventory.matchAll(/^\|\s*([ABCD]\d{2})\s*\|/gm)].map(x => x[1]);
  assert.equal(items.length, 65);
  assert.equal(new Set(items).size, 65);
  for (const [domain, expected] of Object.entries({A: 17, B: 20, C: 13, D: 15})) {
    assert.equal(items.filter(item => item.startsWith(domain)).length, expected);
    for (let i = 1; i <= expected; i++) {
      assert.ok(items.includes(domain + String(i).padStart(2, "0")));
    }
  }
});

test("feature register explicitly keeps all research behaviors unapproved", () => {
  assert.equal(researchRegister.schemaVersion, 1);
  assert.equal(researchRegister.targetEquipmentProfile, null);
  assert.equal(researchRegister.releaseApproval, "HOLD");
  assert.equal(researchRegister.features.length, 65);
  assert.equal(new Set(researchRegister.features.map(f => f.id)).size, 65);
  const operator = researchRegister.features.filter(f => f.scope === "FCV_OPERATOR");
  const instructor = researchRegister.features.filter(f => f.scope === "INSTRUCTOR_PLATFORM");
  assert.equal(operator.length, 64);
  assert.equal(instructor.length, 1);
  assert.equal(instructor[0].id, "D15");
  assert.equal(instructor[0].operatorFidelityStatus, null);
  assert.equal(instructor[0].platformQaStatus, "SIMULATED_ONLY");
  assert.ok(operator.every(f =>
    ["OPEN", "SIMULATED_ONLY"].includes(f.operatorFidelityStatus)));
  assert.ok(researchRegister.features.every(f =>
    f.operatorApproval === null && f.validatedProfileRevision === null));
  assert.equal(operator.filter(f =>
    f.operatorFidelityStatus === "SIMULATED_ONLY").length, 11);
  assert.equal(operator.filter(f =>
    f.operatorFidelityStatus === "OPEN").length, 53);
});

test("research does not label provisional device behavior as validated", () => {
  assert.match(inventory, /Research draft \/ NOT IMPLEMENTED/);
  assert.match(inventory, /firmware/i);
  assert.match(inventory, /transducer|đầu dò/i);
  assert.match(inventory, /hình ảnh|ảnh/i);
  assert.match(inventory, /OPEN/);
  assert.match(inventory, /SIMULATED_ONLY/);
  assert.match(inventory, /VERIFIED_IMPLEMENTED/);
  assert.match(inventory, /NOT_APPLICABLE_WITH_EVIDENCE/);
});

test("manual references retain provenance in full-workspace Git mode", () => {
  const verified = manifest.entries.filter(entry => ["downloaded", "already_present"].includes(entry.status));
  assert.ok(verified.length >= 9);
  assert.ok(verified.every(entry => entry.simulator_asset === false));
  assert.ok(verified.every(entry => String(entry.rights_status).includes("RESTRICTED_REFERENCE_ONLY")));
  assert.ok(verified.every(entry => /^[a-f0-9]{64}$/.test(entry.sha256)));
  assert.ok(verified.every(entry => entry.local?.startsWith("sources/manuals/")));
  const fcv = verified.find(entry => entry.id === "FCV588_OME23890E_2025");
  assert.equal(fcv?.pages, 88);
  assert.equal(fcv?.model_text_found, true);
  const j2000 = manifest.not_obtained.find(item => item.model === "KODEN J2000");
  assert.ok(j2000, "ambiguous J2000 identity must not be silently assigned");
  assert.match(gitignore, /FULL-WORKSPACE MODE/);
  // Full-workspace upload keeps all surviving physical paths. Former NTFS
  // junction aliases are recoverable from the archived stage manifest.
  const activeIgnoreRules = gitignore.split(/\r?\n/).map(line=>line.trim())
    .filter(line=>line && !line.startsWith("#"));
  assert.deepEqual(activeIgnoreRules, []);
});

test("manual archive accounts for every named device without inventing missing versions", () => {
  assert.equal(archiveCoverage.schemaVersion, 1);
  assert.equal(archiveCoverage.allRequestedManualsDownloaded, false);
  assert.equal(archiveCoverage.coverageState, "ACCOUNTED_WITH_HOLDS");
  const records = archiveCoverage.devices;
  assert.equal(records.length, 8);
  assert.equal(new Set(records.map(r => r.id)).size, records.length);
  const ids = new Set(manifest.entries.map(e => e.id));
  for (const record of records) {
    assert.ok(archiveCoverage.allowedArchiveStatus.includes(record.archiveStatus));
    assert.ok(record.rights && record.openGap && record.sourceTier);
    if (record.archiveStatus === "ARCHIVED_VERIFIED") {
      assert.ok(record.manifestIds.length > 0);
      assert.ok(record.manifestIds.every(id => ids.has(id) &&
        manifest.entries.find(e => e.id === id)?.sha256));
    } else {
      assert.equal(record.manifestIds.length, 0);
    }
  }
  assert.equal(records.find(r => r.id === "koden-j2000")?.archiveStatus, "IDENTITY_HOLD");
  assert.equal(records.find(r => r.id === "ns4000-v3")?.archiveStatus, "RIGHTS_OR_ACCESS_HOLD");
  assert.ok(records.some(r => r.id === "ais-r5-supreme"));
  assert.ok(records.some(r => r.id === "ais-r5-solid"));
});
