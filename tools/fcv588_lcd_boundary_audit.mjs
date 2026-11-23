/**
 * Independent FCV-588 PUBLIC_REFERENCE evidence audit.
 * This tool NEVER imports or executes product reducers, starts a browser/server,
 * runs Phase 2 Verify, modifies V31 source, or promotes release claims.
 *
 * Usage:
 *   node tools/fcv588_lcd_boundary_audit.mjs --self-test
 *   node tools/fcv588_lcd_boundary_audit.mjs
 *   node tools/fcv588_lcd_boundary_audit.mjs --write-baseline
 *
 * The only allowed write is a once-only independent QA evidence artifact under
 * docs/qa. Source-reference descriptions are NOT OEM copyright permission.
 */
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFile,writeFile} from "node:fs/promises";
import {fileURLToPath,pathToFileURL} from "node:url";
import path from "node:path";

const root=path.resolve(fileURLToPath(new URL("../",import.meta.url)));
const locator="docs/research/FCV588_V31_LCD_BOUNDARY_ORACLE.json";
const vectors="docs/research/FCV588_V31_C11_D09_D14_D04_ACCEPTANCE_VECTORS.json";
const implementation="docs/evidence/fcv588-public-implementation-status.json";
const manifest="docs/qa/FCV588_V31_EVIDENCE_SUMMARY.json";
const output="docs/qa/FCV588_V31_INDEPENDENT_BOUNDARY_BASELINE_2026-10-17.json";
const phaseDir="plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2";
const phases=[
 "phase-01-start.md","phase-02-physical-panel-and-controls.md",
 "phase-03-menu-atlas-and-configuration.md",
 "phase-04-sonar-views-and-advanced.md",
 "phase-05-alarms-nav-demo-diagnostics.md",
 "phase-06-conformance-classroom-qa.md",
 "phase-07-shared-world-and-future-devices.md"
];
const hex=bytes=>createHash("sha256").update(bytes).digest("hex");
const profileNumber=revision=>{
  const m=/^F1-public-reference-(\d+)$/.exec(String(revision));
  assert.ok(m,"invalid FCV588 public profile revision: "+revision);
  return Number(m[1]);
};
export function local(relativePath){
  assert.equal(typeof relativePath,"string","path must be a string");
  assert.ok(
    !path.isAbsolute(relativePath) &&
    !path.win32.isAbsolute(relativePath) &&
    !relativePath.includes("\0"),
    "absolute/NUL paths forbidden"
  );
  const result=path.resolve(root,...relativePath.split("/"));
  assert.ok(result.startsWith(root+path.sep),"path must stay inside project");
  return result;
}
async function readJson(relativePath){
  const bytes=await readFile(local(relativePath));
  return {value:JSON.parse(bytes.toString("utf8")),sha256:hex(bytes)};
}
function findLines(source,needle){
  assert.ok(typeof needle==="string" && needle.trim().length>0);
  const rows=source.split(/\r?\n/);
  const hit=[];
  for(let i=0;i<rows.length;i++)if(rows[i].includes(needle))hit.push(i+1);
  return hit;
}
export function selfTest(){
  assert.deepEqual(findLines("x\nHELLO\nHELLO 2\nz","HELLO"),[2,3]);
  assert.deepEqual(findLines("x\nHELLO\nz","NO_MATCH"),[]);
  assert.match(hex("fixed-input"),/^[0-9a-f]{64}$/);
  assert.throws(()=>local("../outside"),/inside project/);
  assert.throws(()=>local("C:/outside"),/inside project|absolute/);
  const sample=[
    {id:"a",policy:"RELOCATE_TRAINING_COPY"},
    {id:"b",policy:"PRESERVE_MANUAL_INDICATOR"}
  ];
  assert.equal(sample.filter(x=>x.policy==="RELOCATE_TRAINING_COPY").length,1);
  return {tool:"fcv588_lcd_boundary_audit",scope:"PURE_SCANNER_SELF_TEST_ONLY",
    assertions:6,productVerify:"NOT_EXECUTED",result:"SELF_TEST_PASS"};
}
function statChecklist(data){
  return {total:(data.match(/^\s*-\s*\[[ xX]\]/gm)??[]).length,
    checked:(data.match(/^\s*-\s*\[[xX]\]/gm)??[]).length};
}
export async function runAudit(){
  const [lcd,feature,impl,legacy]=await Promise.all([
    readJson(locator),readJson(vectors),readJson(implementation),readJson(manifest)
  ]);
  assert.equal(lcd.value.schemaVersion,1);
  assert.equal(feature.value.schemaVersion,1);
  const implRev=profileNumber(impl.value.profileRevision);
  const lcdRev=profileNumber(lcd.value.sourceProfile);
  const featRev=profileNumber(feature.value.profileRevision);
  assert.ok(lcdRev>=22 && lcdRev<=implRev,
    `LCD boundary oracle revision ${lcd.value.sourceProfile} out of range for ${impl.value.profileRevision}`);
  assert.ok(featRev>=22 && featRev<=implRev,
    `Acceptance vectors revision ${feature.value.profileRevision} out of range for ${impl.value.profileRevision}`);
  assert.equal(impl.value.hardwareValidated,false);
  assert.equal(impl.value.rightsClearance,false);
  assert.equal(impl.value.releaseApproval,"HOLD");
  assert.equal(impl.value.operatorRows.length,64);
  assert.equal(impl.value.teacherRows.length,1);
  assert.equal(impl.value.teacherRows[0].featureId,"D15");
  assert.equal(
    [...impl.value.operatorRows,...impl.value.teacherRows].filter(x=>
      x.claimDecision==="HOLD").length,65);
  assert.equal(feature.value.allCurrentClaims,"HOLD");
  assert.equal(feature.value.currentPhase2Verify,"STOP_V31_QA_01");
  const observationIds=new Set();
  const fileContent=new Map(),fileDigests=new Map();
  const observed=[];
  for(const anchor of lcd.value.observations){
    assert.ok(/^(LCD-[0-9]{3})$/.test(anchor.id),"unexpected anchor ID");
    assert.ok(!observationIds.has(anchor.id),"duplicate audit anchor");
    observationIds.add(anchor.id);
    if(!fileContent.has(anchor.file)){
      const buf=await readFile(local(anchor.file));
      fileContent.set(anchor.file,buf.toString("utf8"));
      fileDigests.set(anchor.file,hex(buf));
    }
    const matchedLines=findLines(fileContent.get(anchor.file),anchor.needle);
    observed.push({id:anchor.id,file:anchor.file,lines:matchedLines,
      surface:anchor.surface,policy:anchor.policy,authority:anchor.authority,
      anchorPresent:matchedLines.length>0});
  }
  const missing=observed.filter(a=>!a.anchorPresent);
  const expectedIds=["C11","D09","D14","D04"];
  assert.deepEqual(feature.value.fields.map(x=>x.featureId),expectedIds);
  const featureReview=feature.value.fields.map(f=>{
    const row=impl.value.operatorRows.find(x=>x.featureId===f.featureId);
    assert.ok(row,"missing implementation row for "+f.featureId);
    assert.equal(row.checkpointStatus,f.expectedImplementation);
    assert.equal(row.claimDecision,"HOLD");
    assert.equal(f.currentReleaseDecision,"HOLD");
    assert.ok(Array.isArray(f.vectors) && f.vectors.length>=4);
    assert.ok(f.vectors.every(v=>v.execution==="NOT_EXECUTED"));
    assert.ok(f.sourceIds.every(id=>row.publicSourceIds.includes(id)),
      "source trace drift for "+f.featureId);
    return {featureId:f.featureId,implementationStatus:row.checkpointStatus,
      releaseDecision:row.claimDecision,plannedVectors:f.vectors.length,
      sourceIds:f.sourceIds,productTestsRun:"NONE_IN_THIS_AUDIT"};
  });
  const runtimeMismatches=[];
  for(const f of legacy.value.liveSource.fileDigests){
    const data=await readFile(local(f.path));
    if(hex(data)!==f.sha256)runtimeMismatches.push(f.path);
  }
  const counts=[];
  for(const name of phases){
    const data=(await readFile(local(phaseDir+"/"+name))).toString("utf8");
    counts.push({phase:name,...statChecklist(data)});
  }
  const checked=counts.reduce((sum,x)=>sum+x.checked,0);
  const total=counts.reduce((sum,x)=>sum+x.total,0);
  assert.equal(checked,14,"existing phase accepted checkboxes changed");
  assert.equal(total,50,"existing phase checklist count changed");
  const reviewOnly=observed.filter(x=>x.policy.startsWith("REVIEW_"));
  const relocate=observed.filter(x=>x.policy.startsWith("RELOCATE_"));
  const preserve=observed.filter(x=>x.policy==="PRESERVE_MANUAL_INDICATOR");
  return {
    collectedAtUtc:new Date().toISOString(),
    scope:"INDEPENDENT_STATIC_SOURCE_AND_CONTRACT_AUDIT_NO_V31_PHASE2_VERIFY",
    toolFile:"tools/fcv588_lcd_boundary_audit.mjs",
    toolSha256:hex(await readFile(local("tools/fcv588_lcd_boundary_audit.mjs"))),
    contracts:{lcdBoundary:{path:locator,sha256:lcd.sha256},
      featureVectors:{path:vectors,sha256:feature.sha256}},
    originalCheckpoint:{
      profileRevision:impl.value.profileRevision,
      runtimeExpectedSha256:legacy.value.liveSource.sourceManifestSha256,
      runtimeFilesChecked:legacy.value.liveSource.fileDigests.length,
      mismatchedRuntimeFiles:runtimeMismatches,
      checklist:{checked,total,byPhase:counts},
      operatorFunctions:impl.value.operatorRows.length,
      instructorFunctions:impl.value.teacherRows.length,
      claimsHold:65,releaseDecision:"HOLD"
    },
    lcdBoundary:{
      anchorCount:observed.length,
      sourceFiles:[...fileDigests].map(([file,sha256])=>({file,sha256})),
      relocationCandidates:relocate.length,
      reviewRequired:reviewOnly.length,
      sourceBackedDemoExceptions:preserve.length,
      unresolvedAnchors:missing.map(x=>x.id),
      sourceObservations:observed,
      interpretation:"Substring source locator, not live DOM or pixel Verify"
    },
    featureReview,
    plannedFutureVectors:featureReview.reduce((sum,f)=>sum+f.plannedVectors,0),
    outcome:missing.length||runtimeMismatches.length
      ?"STATIC_CONTRACT_OR_SOURCE_DRIFT_REVIEW_REQUIRED"
      :"BASELINE_RECORDED_LCD_REPAIRS_PENDING",
    productTestResults:"NOT_EXECUTED_BY_THIS_TOOL",
    phase2V31QA01:"STOP_KONGMING_COUNSEL_NOT_VERIFIED",
    releaseApproval:"HOLD",
    fidelityPercent:"UNMEASURED_HARDWARE_NOT_VALIDATED"
  };
}
async function main(){
  const args=process.argv.slice(2);
  const allowed=new Set(["--self-test","--write-baseline"]);
  for(const arg of args)if(!allowed.has(arg))throw new Error("Unknown argument: "+arg);
  if(args.includes("--self-test")){
    assert.equal(args.length,1,"self-test cannot write source baseline");
    console.log(JSON.stringify(selfTest(),null,2));
    return;
  }
  const audit=await runAudit();
  if(args.includes("--write-baseline")){
    assert.deepEqual(audit.originalCheckpoint.mismatchedRuntimeFiles,[],
      "V31 runtime drift: refuse to write baseline");
    assert.deepEqual(audit.lcdBoundary.unresolvedAnchors,[],
      "audit contract missing source anchor: review before recording");
    const content=JSON.stringify(audit,null,2)+"\n";
    await writeFile(local(output),content,{flag:"wx"});
    console.log(JSON.stringify({recorded:true,path:output,
      receiptSha256:hex(content),sourceManifestSha256:
      audit.originalCheckpoint.runtimeExpectedSha256,
      classification:audit.outcome,productVerify:"NOT_EXECUTED"},null,2));
  }else{
    console.log(JSON.stringify(audit,null,2));
  }
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  main().catch(error=>{
    console.error("Independent audit error:",error.message);
    process.exitCode=2;
  });
}
