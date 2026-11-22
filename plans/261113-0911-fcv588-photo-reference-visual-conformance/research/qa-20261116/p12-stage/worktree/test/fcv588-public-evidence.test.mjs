import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const ledger = JSON.parse(await readFile(
  new URL("../docs/evidence/fcv588-public-evidence-ledger.json", import.meta.url), "utf8"));
const expectedIds = Array.from({length: 11}, (_, i) =>
  `PUB-FCV-${String(i + 1).padStart(3, "0")}`);
const byId = new Map((ledger.sources ?? []).map(source => [source.id, source]));

test("public source ledger retains eleven canonical sources and permits extensions", () => {
  assert.equal(ledger.schemaVersion, 1);
  assert.ok(ledger.sources.length >= expectedIds.length);
  assert.equal(byId.size, ledger.sources.length, "source identifiers must be unique");
  assert.deepEqual(expectedIds.filter(id => !byId.has(id)), [],
    "PUB-FCV-001..011 baseline must remain present");
});

test("source authority, evidence modality and rights are independent dimensions", () => {
  for (const source of ledger.sources) {
    assert.ok(["MANUFACTURER_MANUAL", "MANUFACTURER_WEB", "MANUFACTURER_MEDIA",
      "SECONDARY_COMMUNITY", "THIRD_PARTY_VIDEO"].includes(source.authorityTier),
      source.id + " requires source authority independent of legacy E grade");
    assert.ok(["DOCUMENTED_RULE", "PHOTO_LAYOUT", "VIDEO_METADATA_ONLY",
      "SECONDARY_REPORT", "DOCUMENT_METADATA_ONLY"].includes(source.evidenceMode),
      source.id + " requires explicit evidence observation mode");
    assert.match(source.lastCheckedAt, /^2026-10-\d{2}$/, source.id + " source observation date");
    assert.ok(typeof source.accessStatus === "string" && source.accessStatus,
      source.id + " access status required");
    assert.ok(Object.hasOwn(source, "rightsBasisUrl"), source.id + " rights basis explicit");
    assert.ok(source.rightsState?.aiProcess && source.rightsState?.redistribute,
      source.id + " rights separate from evidence");
  }
  assert.equal(byId.get("PUB-FCV-002").authorityTier, "MANUFACTURER_WEB");
  assert.equal(byId.get("PUB-FCV-002").evidenceMode, "DOCUMENTED_RULE");
  assert.equal(byId.get("PUB-FCV-007").evidenceMode, "VIDEO_METADATA_ONLY");
  assert.equal(byId.get("PUB-FCV-006").evidenceMode, "PHOTO_LAYOUT");
  assert.ok(byId.get("PUB-FCV-001").relatedDocuments.some(s => s.archiveEntryId ===
    "FCV588_OPERATORS_GUIDE_MULTILINGUAL" && s.claimAuditStatus === "SOURCE_GAP"));
});

test("source metadata distinguishes observations, revisions, rights and runtime assets", () => {
  for (const id of expectedIds) {
    const source = byId.get(id);
    assert.ok(source, id + " source record missing");
    assert.match(source.url, /^https:\/\//, id + " needs a public source URL");
    assert.ok(typeof source.publisher === "string" && source.publisher.length > 0, id + " publisher");
    assert.ok(["E0", "E1", "E2", "E3", "E4"].includes(source.evidenceGrade), id + " grade");
    assert.ok(source.mediaKind, id + " media kind");
    assert.ok(source.observationStatus, id + " observation status");
    assert.ok(source.rightsState, id + " rights state");
    for (const operation of ["retain", "aiProcess", "reproduce", "redistribute"]) {
      assert.ok(source.rightsState[operation], id + " missing rights: " + operation);
    }
    assert.ok(Object.hasOwn(source, "sourceRevision"), id + " source revision explicit");
    assert.equal(source.installedFirmware, null, id + " must not infer classroom firmware");
    assert.equal(source.simulatorAsset, false, id + " may not embed raw source art");
    assert.ok(Array.isArray(source.verifiedTimestamps), id + " verified timestamps explicit");
  }
});

test("videos are metadata-only and no E2 audited frames are invented", () => {
  for (const id of ["PUB-FCV-007", "PUB-FCV-008"]) {
    const video = byId.get(id);
    assert.equal(video?.mediaKind, "VIDEO", id + " must be identified as video");
    assert.equal(video.evidenceGrade, "E4", id + " cannot claim frame audit");
    assert.equal(video.frameAuditStatus, "TO_REVIEW", id + " must remain pending");
    assert.deepEqual(video.verifiedTimestamps, [], id + " cannot invent timestamps");
  }
  assert.equal((ledger.sources ?? []).filter(s => s.evidenceGrade === "E2").length, 0,
    "no frame-observed E2 source exists yet");
});

test("manufacturer brochure is a nonmanual restricted reference pinned by SHA", () => {
  const brochure = byId.get("PUB-FCV-004");
  assert.equal(brochure?.archiveEntryId, "FCV588_BROCHURE_FURUNO_USA");
  assert.equal(brochure.mediaKind, "BROCHURE_PDF");
  assert.match(brochure.sha256, /^[a-f0-9]{64}$/);
  assert.equal(brochure.pages, 6);
  assert.equal(brochure.rightsState.retain, "RESTRICTED_LOCAL_REFERENCE");
  assert.equal(brochure.simulatorAsset, false);
  assert.equal(byId.get("PUB-FCV-005")?.observationStatus, "ACCESS_LIMITED_HTTP_403");
  assert.equal(byId.get("PUB-FCV-006")?.observationStatus, "INDEXED_IMAGE_HEAD_403");
});
