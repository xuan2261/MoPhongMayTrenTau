import test from "node:test";
import assert from "node:assert/strict";
import {readFile, readdir} from "node:fs/promises";
import {extname} from "node:path";
import {evaluateFcvPublicClaim} from "../src/devices/fcv588/claim-gate.mjs";

const root = new URL("../", import.meta.url);
const read = file => readFile(new URL(file, root), "utf8");
const [policy, html, profileData, traceData, ledger, deviceRegister] = await Promise.all([
  read("docs/research/FCV588_PUBLIC_CLAIM_POLICY.md"), read("web/index.html"),
  read("docs/evidence/fcv588-public-reference-profile.json"),
  read("docs/evidence/fcv588-public-trace-matrix.json"),
  read("docs/evidence/fcv588-public-evidence-ledger.json"),
  read("docs/evidence/device-register.json"),
]);
const profiles = JSON.parse(profileData).profiles;
const trace = JSON.parse(traceData).rows;
const sources = JSON.parse(ledger).sources;

test("student console explicitly displays the three-part public-reference disclaimer", () => {
  assert.match(html, /PUBLIC REFERENCE \/ NOT HARDWARE VALIDATED \/ TRAINING ONLY/);
  assert.match(html, /role="note"/);
  assert.match(policy, /PUBLIC_REFERENCE_CONFORMANT/);
  assert.match(policy, /NOT HARDWARE VALIDATED/);
  assert.match(policy, /project safety policy/i);
  assert.match(policy, /reproduction|redistribution/i);
});

test("no active profile or source asset asserts certified hardware or redistribution rights", async () => {
  assert.ok(profiles.every(p => !p.hardwareValidated && p.firmwareInstalled === null));
  assert.ok(sources.every(s => s.simulatorAsset === false && s.verifiedTimestamps.length === 0));
  assert.ok(trace.every(t => t.claimDecision !== "PUBLIC_REFERENCE_CONFORMANT"));
  assert.equal(JSON.parse(deviceRegister).devices[0].releaseApproval, "HOLD");
  const web = await readdir(new URL("../web/", import.meta.url));
  assert.ok(web.every(f => ![".pdf", ".zip", ".mp4", ".mov", ".woff", ".ttf"].includes(
    extname(f).toLowerCase())), "never place restricted reference binaries in served tree");
});

test("public lesson decisions require authoritative source, verified implementation and browser evidence", () => {
  const profile = profiles[0];
  const example = {...trace[0], implementationStatus: "PUBLIC_REFERENCE_TESTED",
    courseReviewStatus: "REFERENCE_REVIEWED", sourceStatus: "AUTHORITATIVE",
    rightsDecision: "CURATED_NOTES_ONLY"};
  const featureId=example.featureId;
  const verifiedTests=["positive","negative","cancel","replay"].map(kind=>({
    featureId,kind,status:"PASS",testId:"source-linked-"+kind,
    profileId:profile.id,
  }));
  const browserEvidence={featureId,status:"PASS",evidenceId:"live-ui-viewport-1"};
  const reviewerDecision={featureId,decision:"APPROVED",receiptId:"reviewer-source-1"};
  const ready = evaluateFcvPublicClaim({
    profile, trace: example, sources, verifiedTests,
    browserEvidence,reviewerDecision,
  });
  assert.equal(ready.eligible, true, "all feature-scoped hypothetical receipts are required");
  const unverified = evaluateFcvPublicClaim({profile, trace: trace[0], sources,
    verifiedTests: [], browserVerified: false, reviewerApproved: false});
  assert.equal(unverified.eligible, false, "actual F0 must not gain certification");
  const misleading = evaluateFcvPublicClaim({profile, trace: {...example,
    publicSourceIds: ["PUB-FCV-007"]}, sources,
    verifiedTests,browserEvidence,reviewerDecision});
  assert.equal(misleading.eligible, false, "E4 video metadata alone cannot pass");
  assert.equal(evaluateFcvPublicClaim({profile,trace:example,sources,
    verifiedTests:["fcv588-public-panel"],browserVerified:true,
    reviewerApproved:true}).eligible,false,
  "legacy booleans and arbitrary smoke names are not feature approval receipts");
  assert.equal(evaluateFcvPublicClaim({profile,trace:example,sources,
    verifiedTests:verifiedTests.filter(x=>x.kind!=="negative"),
    browserEvidence,reviewerDecision}).eligible,false,
  "negative/cancel/replay gates are mandatory before approval");
  assert.equal(evaluateFcvPublicClaim({profile,trace:example,sources,
    verifiedTests:verifiedTests.map(x=>({...x,featureId:"C13"})),
    browserEvidence,reviewerDecision}).eligible,false,
  "another feature's passing tests cannot approve this feature");
  assert.equal(evaluateFcvPublicClaim({profile,trace:example,sources,
    verifiedTests,browserEvidence:{...browserEvidence,featureId:"C05"},
    reviewerDecision}).eligible,false,
  "browser proof from another feature cannot satisfy the gate");
  assert.equal(evaluateFcvPublicClaim({profile,trace:example,sources,
    verifiedTests,browserEvidence,
    reviewerDecision:{...reviewerDecision,featureId:"D10"}}).eligible,false,
  "reviewer proof from another feature cannot satisfy the gate");
});
