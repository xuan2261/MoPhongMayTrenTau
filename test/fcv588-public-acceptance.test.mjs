import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {FCV588_ADAPTER} from "../src/devices/fcv588/adapter.mjs";
import {FCV588_TRAINING_LESSONS} from "../src/core/lessons.mjs";

const read=async file=>JSON.parse(await readFile(new URL(file,import.meta.url),"utf8"));

test("independent F1 implementation status accounts for all 64 operator rows plus D15",async()=>{
  const source=await read("../docs/evidence/fcv588-public-trace-matrix.json");
  const audit=await read("../docs/evidence/fcv588-public-implementation-status.json");
  assert.equal(audit.schemaVersion,1);
  assert.equal(audit.profileRevision,FCV588_ADAPTER.revision);
  assert.equal(audit.hardwareValidated,false);
  assert.equal(audit.firmwareInstalled,null);
  assert.equal(audit.releaseApproval,"HOLD");
  assert.equal(audit.operatorRows.length,64);
  assert.equal(audit.teacherRows.length,1);
  assert.equal(audit.teacherRows[0].featureId,"D15");
  const rows=[...audit.operatorRows,...audit.teacherRows];
  assert.equal(new Set(rows.map(x=>x.featureId)).size,65);
  assert.deepEqual(rows.map(x=>x.featureId).sort(),
    source.rows.map(x=>x.featureId).sort());
  assert.ok(rows.every(row=>["OPERABLE_SYNTHETIC_SUBSET","MENU_ONLY_PARTIAL",
    "NOT_IMPLEMENTED"].includes(row.checkpointStatus)));
  assert.ok(rows.every(row=>row.claimDecision==="HOLD"));
  assert.ok(rows.every(row=>row.manualRefs.length>0 || row.featureId==="D15"));
  assert.ok(rows.every(row=>Array.isArray(row.testReferences)));
  assert.ok(rows.some(row=>["MENU_ONLY_PARTIAL","NOT_IMPLEMENTED"]
    .includes(row.checkpointStatus)),
    "incomplete operator workflows must remain explicitly visible even when all have synthetic subsets");
});

test("derived D15 implementation note matches the seven actual versioned scored lessons without claiming OEM release",async()=>{
  const source=await read("../docs/evidence/fcv588-public-implementation-status.json");
  assert.equal(FCV588_TRAINING_LESSONS.length,7);
  assert.equal(new Set(FCV588_TRAINING_LESSONS.map(l=>l.id)).size,7);
  assert.ok(FCV588_TRAINING_LESSONS.every(l=>l.releaseApproved===false));
  assert.equal(source.teacherRows.length,1);
  assert.match(source.teacherRows[0].note,/Seven instructor-only lessons/);
  assert.equal(source.teacherRows[0].claimDecision,"HOLD");
  assert.equal(source.teacherRows[0].scope,"INSTRUCTOR_PLATFORM");
  assert.equal(source.releaseApproval,"HOLD");
});

test("C05/C13 synthetic navigation checkpoints cite actual targeted scenarios, without raising claims",async()=>{
  const audit=await read("../docs/evidence/fcv588-public-implementation-status.json");
  for(const [featureId,testFile] of [
    ["C05","test/fcv588-public-arrival.test.mjs"],
    ["C13","test/fcv588-public-trip.test.mjs"],
  ]){
    const row=audit.operatorRows.find(x=>x.featureId===featureId);
    assert.equal(row.checkpointStatus,"OPERABLE_SYNTHETIC_SUBSET",featureId);
    assert.ok(row.testReferences.includes(testFile),featureId);
    assert.match(row.note,/synthetic|training/i,featureId);
    assert.equal(row.claimDecision,"HOLD",featureId);
  }
  assert.equal(audit.hardwareValidated,false);
  assert.equal(audit.releaseApproval,"HOLD");
});

test("D10 trainer fault cues are a synthetic-only subset, not observed battery or error codes",async()=>{
  const audit=await read("../docs/evidence/fcv588-public-implementation-status.json");
  const d10=audit.operatorRows.find(row=>row.featureId==="D10");
  assert.equal(d10.checkpointStatus,"OPERABLE_SYNTHETIC_SUBSET");
  assert.deepEqual(d10.testReferences,["test/fcv588-public-fault-fixtures.test.mjs"]);
  assert.match(d10.note,/instructor|training|synthetic/i);
  assert.equal(d10.claimDecision,"HOLD");
  assert.equal(audit.hardwareValidated,false);
});

test("A17 key-beep choice and browser TrackPad auto-repeat are synthetic subset with source HOLD",async()=>{
  const audit=await read("../docs/evidence/fcv588-public-implementation-status.json");
  const a17=audit.operatorRows.find(row=>row.featureId==="A17");
  assert.equal(a17.checkpointStatus,"OPERABLE_SYNTHETIC_SUBSET");
  assert.deepEqual(a17.testReferences,[
    "test/fcv588-public-key-feedback.test.mjs",
    "test/fcv588-public-pad-repeat.test.mjs",
  ]);
  assert.match(a17.note,/training|synthetic/i);
  assert.equal(a17.claimDecision,"HOLD");
  assert.equal(audit.releaseApproval,"HOLD");
});

test("D02 eight-slot manual Range bank has targeted tests but no OEM conformance",async()=>{
  const audit=await read("../docs/evidence/fcv588-public-implementation-status.json");
  const d02=audit.operatorRows.find(row=>row.featureId==="D02");
  assert.equal(d02.checkpointStatus,"OPERABLE_SYNTHETIC_SUBSET");
  assert.deepEqual(d02.testReferences,["test/fcv588-public-range-bank.test.mjs"]);
  assert.match(d02.note,/synthetic|classroom/i);
  assert.equal(d02.claimDecision,"HOLD");
});

test("64+D15 classification fails closed instead of treating an unreviewed domain smoke as operable",async()=>{
  const audit=await read("../docs/evidence/fcv588-public-implementation-status.json");
  const byId=new Map([...audit.operatorRows,...audit.teacherRows]
    .map(row=>[row.featureId,row]));
  assert.equal(byId.get("D04").checkpointStatus,"NOT_IMPLEMENTED");
  assert.equal(byId.get("D14").checkpointStatus,"MENU_ONLY_PARTIAL");
  assert.equal(byId.get("C11").checkpointStatus,"MENU_ONLY_PARTIAL");
  assert.equal(byId.get("D06").checkpointStatus,"OPERABLE_SYNTHETIC_SUBSET");
  assert.deepEqual(byId.get("D06").testReferences,
    ["test/fcv588-public-calibration.test.mjs"]);
  assert.deepEqual(byId.get("B18").testReferences,
    ["test/fcv588-public-display-widgets.test.mjs"]);
  assert.equal(audit.checkpointPolicy,"EXPLICIT_REVIEWED_FEATURE_ALLOWLIST");
  assert.ok([...byId.values()].every(x=>x.claimDecision==="HOLD"));
  const generator=await readFile(new URL("../tools/build_fcv588_public_acceptance.mjs",
    import.meta.url),"utf8");
  assert.doesNotMatch(generator,/const open=new Set\(\[\]\)/,
    "implicit empty open set would promote unreviewed features");
});
