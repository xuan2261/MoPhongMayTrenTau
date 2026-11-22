import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {resolveFcvCapability} from "../src/devices/fcv588/capabilities.mjs";

const doc = JSON.parse(await readFile(new URL(
  "../docs/evidence/fcv588-public-reference-profile.json", import.meta.url), "utf8"));
const profiles = new Map(doc.profiles.map(p => [p.id, p]));
const safeBds = {depthM: 50, speedKn: 7, draftM: 1.2,
  rangeMode: "auto", mountCompatible: true, mountAligned: true};

test("public reference profiles explicitly identify Demo, generic and named virtual transducers", () => {
  assert.equal(doc.schemaVersion, 1);
  assert.equal(doc.profileClass, "PUBLIC_REFERENCE");
  assert.equal(doc.claimCeiling, "PUBLIC_REFERENCE_CONFORMANT");
  assert.equal(doc.defaultProfileId, "FCV588_PUBLIC_DEMO_UNKNOWN_FW");
  assert.deepEqual([...profiles.keys()].sort(), [
    "FCV588_PUBLIC_DEMO_UNKNOWN_FW",
    "FCV588_PUBLIC_FEATURE_525STID_PWD",
    "FCV588_PUBLIC_GENERIC1KW",
    "FCV588_PUBLIC_GENERIC600",
  ].sort());
  for (const profile of profiles.values()) {
    assert.equal(profile.firmwareInstalled, null);
    assert.equal(profile.hardwareValidated, false);
    assert.equal(profile.physicalTransducerPresent, false);
    assert.deepEqual(profile.realSensorOutputs, []);
    assert.ok(profile.manualSourceId && profile.manualRevision && profile.manualSha256);
    assert.equal(profile.trainingOnly, true);
  }
  assert.equal(profiles.get(doc.defaultProfileId).demoOn, true);
  assert.equal(profiles.get(doc.defaultProfileId).controlsOperativeInDemo, true);
});

test("generic Transducer Type 600W and 1kW never inherit named type advanced functions", () => {
  for (const id of ["FCV588_PUBLIC_DEMO_UNKNOWN_FW", "FCV588_PUBLIC_GENERIC600",
    "FCV588_PUBLIC_GENERIC1KW"]) {
    for (const feature of ["accuFish", "rezBoost", "bottomDiscrimination"]) {
      const result = resolveFcvCapability(profiles.get(id), feature, safeBds);
      assert.equal(result.enabled, false, id + " must disallow " + feature);
      assert.ok(result.reason, "disabled functions need a reason");
    }
  }
});

test("525STID-PWD virtual BDS availability respects operating limits, not physical cabling", () => {
  const named = profiles.get("FCV588_PUBLIC_FEATURE_525STID_PWD");
  assert.equal(resolveFcvCapability(named, "bottomDiscrimination", safeBds).enabled, true);
  for (const fields of [
    {depthM: 4.9}, {depthM: 100.1}, {speedKn: 10.1},
    {draftM: null}, {rangeMode: "manual"}, {mountCompatible: false},
    {mountAligned: false},
  ]) {
    const result = resolveFcvCapability(named, "bottomDiscrimination",
      {...safeBds, ...fields});
    assert.equal(result.enabled, false, JSON.stringify(fields));
  }
  for (const fields of [{depthM: 5}, {depthM: 100}, {speedKn: 10}]) {
    assert.equal(resolveFcvCapability(named, "bottomDiscrimination",
      {...safeBds, ...fields}).enabled, true);
  }
});

test("unknown features cannot silently become available even on named transducer", () => {
  assert.deepEqual(resolveFcvCapability(profiles.get("FCV588_PUBLIC_FEATURE_525STID_PWD"),
    "notRealFurunoFeature", safeBds), {enabled: false, reason: "UNKNOWN_FEATURE"});
});
