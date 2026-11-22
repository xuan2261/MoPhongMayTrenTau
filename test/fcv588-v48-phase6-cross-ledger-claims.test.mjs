import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const load = async path => JSON.parse(await readFile(
  new URL("../" + path, import.meta.url), "utf8"));

const [trace, implementation, register, ledger, atlas] = await Promise.all([
  load("docs/evidence/fcv588-public-trace-matrix.json"),
  load("docs/evidence/fcv588-public-implementation-status.json"),
  load("docs/research/FCV588_FEATURE_REGISTER_DRAFT.json"),
  load("docs/evidence/fcv588-public-evidence-ledger.json"),
  load("docs/evidence/fcv588-public-menu-atlas.json"),
]);
const traceRows = trace.rows;
const implementationRows = [...implementation.operatorRows, ...implementation.teacherRows];
const index = rows => new Map(rows.map(row => [row.featureId, row]));
const byTrace = index(traceRows);
const byImplementation = index(implementationRows);
const byRegister = new Map(register.features.map(row=>[row.id,row]));
const sourceIds = new Set(ledger.sources.map(source => source.id));

test("V48 Phase6 total feature identity reconciles three ledgers without merging D15 into the OEM 64", () => {
  for(const [name,rows] of [
    ["trace",traceRows],["implementation",implementationRows],
    ["feature register",register.features]]) {
    assert.equal(rows.length,65,name + " feature total");
    assert.equal(new Set(rows.map(row=>
      name==="feature register"?row.id:row.featureId)).size,65,
      name + " duplicates");
  }
  assert.deepEqual([...byTrace.keys()].sort(),[...byImplementation.keys()].sort());
  assert.deepEqual([...byTrace.keys()].sort(),[...byRegister.keys()].sort());
  assert.equal(traceRows.filter(row=>row.scope==="FCV_OPERATOR").length,64);
  assert.deepEqual(traceRows.filter(row=>row.scope==="INSTRUCTOR_PLATFORM")
    .map(row=>row.featureId),["D15"]);
  assert.equal(implementation.operatorRows.length,64);
  assert.deepEqual(implementation.teacherRows.map(row=>row.featureId),["D15"]);
});

test("V48 Phase6 every implementation claim retains its matching trace source, rights and scope", () => {
  for(const row of traceRows) {
    const actual=byImplementation.get(row.featureId);
    const canonical=byRegister.get(row.featureId);
    assert.ok(actual && canonical,row.featureId + " missing ledger identity");
    for(const field of ["scope","domain","rightsDecision"]) {
      assert.equal(actual[field],row[field],row.featureId + " " + field);
    }
    assert.equal(canonical.scope,row.scope,row.featureId + " feature register scope");
    for(const field of ["manualRefs","publicSourceIds"]) {
      assert.deepEqual(actual[field],row[field],row.featureId + " " + field);
    }
    assert.ok(row.publicSourceIds.every(id=>sourceIds.has(id)),
      row.featureId + " unresolved source");
    assert.ok(row.guardExpression,row.featureId + " missing boundary guard");
    if(row.scope==="FCV_OPERATOR") {
      assert.ok(row.unknowns?.length > 0,
        row.featureId + " missing OEM-source uncertainty");
    }
  }
  const instructor=byTrace.get("D15");
  assert.deepEqual(instructor.manualRefs,[]);
  assert.deepEqual(instructor.publicSourceIds,[]);
  assert.equal(instructor.rightsDecision,"ORIGINAL_PLATFORM_CODE");
  assert.equal(byImplementation.get("D15").sourceStatus,"PLATFORM_ONLY");
});

test("V48 Phase6 no source grade, domain smoke, training palette or citation promotes a released claim", () => {
  assert.equal(trace.hardwareValidated,false);
  assert.equal(implementation.hardwareValidated,false);
  assert.equal(implementation.firmwareInstalled,null);
  assert.equal(implementation.releaseApproval,"HOLD");
  assert.equal(register.releaseApproval,"HOLD");
  assert.equal(traceRows.filter(row=>
    row.claimDecision!=="HOLD_UNTIL_IMPLEMENTED_AND_REVIEWED").length,0);
  assert.equal(implementationRows.filter(row=>row.claimDecision!=="HOLD").length,0);
  assert.equal(traceRows.filter(row=>row.courseReviewStatus!=="NOT_REVIEWED").length,0);
  assert.ok(implementationRows.every(row=>
    ["DOMAIN_SMOKE_NOT_PER_ROW_CONFORMANCE",
     "TARGETED_SCENARIO_TEST_NOT_OEM_CONFORMANCE"]
      .includes(row.testEvidenceMeaning)));
  assert.ok(ledger.sources.every(source=>
    source.simulatorAsset===false && source.verifiedTimestamps.length===0));
  const marker=atlas.entries.find(row=>row.id==="sounder.whiteMarker");
  const b07=byImplementation.get("B07");
  assert.equal(marker?.sourceStatus,
    "TRAINING_WHITE_MARKER_PREVIEW_FIRMWARE_UNKNOWN");
  assert.deepEqual(marker?.choices,["Off","White","Gray"]);
  assert.equal(b07.claimDecision,"HOLD");
  assert.match(b07.note,/White.Marker.*color.bar/i);
  assert.match(b07.note,/White\/Gray.*NOT verified OEM/i);
  assert.match(b07.note,/firmware.*UNKNOWN/i);
  assert.ok(byTrace.get("B07").unknowns.some(item=>/firmware/i.test(item)));
});
