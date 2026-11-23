/**
 * Independent, conservative implementation checkpoint over Phase1's 64+D15
 * research rows. Does not extract OEM media, grant content rights, or label
 * any training feature manufacturer-validated. File refs are category smoke
 * examples, not per-feature operator/hardware evidence.
 */
import {readFile,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
import {FCV588_ADAPTER} from "../src/devices/fcv588/adapter.mjs";

const source=fileURLToPath(new URL("../docs/evidence/fcv588-public-trace-matrix.json",
  import.meta.url));
export const IMPLEMENTATION_STATUS_DEST=fileURLToPath(
  new URL("../docs/evidence/fcv588-public-implementation-status.json",import.meta.url));
// Explicit, conservatively scouted training subsets. An unknown/new feature
// falls back to NOT_IMPLEMENTED; a passing domain smoke never auto-promotes it.
// This is not a per-feature OEM conformance or reviewer approval mapping.
const reviewedSubsetIds=new Set((
  "A01 A02 A03 A04 A05 A06 A07 A08 A09 A10 A11 A12 A13 A14 A15 A16 A17 " +
  "B01 B02 B03 B04 B05 B06 B07 B08 B09 B10 B11 B12 B13 B14 B15 B16 B17 B18 B19 B20 " +
  "C01 C02 C03 C04 C05 C06 C07 C08 C09 C10 C12 C13 " +
  "D01 D02 D03 D05 D06 D07 D08 D10 D11 D12 D13 D15"
).trim().split(/\s+/));
const menuOnly=new Set(["C11","D09","D14"]);
const open=new Set(["D04"]);
if(reviewedSubsetIds.size!==61 ||
    new Set([...reviewedSubsetIds,...menuOnly,...open]).size!==65){
  throw new Error("reviewed implementation subsets incomplete or conflicting");
}
const targetedScenarioTests={
  A09:["test/fcv588-public-manual-layout.test.mjs"],
  A17:["test/fcv588-public-key-feedback.test.mjs",
    "test/fcv588-public-pad-repeat.test.mjs"],
  C05:["test/fcv588-public-arrival.test.mjs"],
  C13:["test/fcv588-public-trip.test.mjs",
    "test/fcv588-public-data-source.test.mjs"],
  D10:["test/fcv588-public-fault-fixtures.test.mjs"],
  D02:["test/fcv588-public-range-bank.test.mjs"],
  B18:["test/fcv588-public-display-widgets.test.mjs"],
  B13:["test/fcv588-public-display-widgets.test.mjs"],
  C10:["test/fcv588-public-manual-layout.test.mjs"],
  C11:["test/fcv588-public-nav-box-config.test.mjs",
    "test/fcv588-public-data-source.test.mjs"],
  D05:["test/fcv588-public-units.test.mjs"],
  D06:["test/fcv588-public-calibration.test.mjs"],
  D14:["test/fcv588-public-receiver-status.test.mjs",
    "test/fcv588-public-data-source.test.mjs"],
};
const domainTests={
  panel_controls_basic:["test/fcv588-public-basic.test.mjs",
    "test/fcv588-public-panel.test.mjs","test/fcv588-public-keyboard.test.mjs"],
  sonar_display:["test/fcv588-public-display.test.mjs",
    "test/fcv588-public-advanced.test.mjs"],
  alarms_navigation:["test/fcv588-public-alarm-menu.test.mjs",
    "test/fcv588-public-alarms.test.mjs",
    "test/fcv588-public-navigation.test.mjs"],
  system_diagnostics:["test/fcv588-public-system.test.mjs",
    "test/fcv588-public-diagnostics.test.mjs"],
};
const exceptions={
  A17:"Manual §2.3 Key Beep On/Off and optional browser audio; pointer/keyboard TrackPad training auto-repeat 450/150 ms. Repeat cadence and audio timbre are synthetic approximations, not OEM-validated",
  A01:"Original face/LCD proportions use manufacturer-published 233×270 mm case and approximately 128×171 mm active LCD around a logical 480×640 pixel Canvas. Phone reflow warning is displayed before operator controls, and synthetic time/status telemetry stays in D15 instructor panel; no OEM pixels or measured hardware geometry are used",
  B07:"White Marker OEM §1.22 uses an echo-color bar, Up/Down and Off. Current Off/White/Gray choices are a simplified training preview: White/Gray are NOT verified OEM selection values. FURUNO v2.01 history changed White Marker settings, while actual installed firmware and colorimetry remain UNKNOWN; this is disclosed only in D15 outside LCD. Claim remains HOLD.",
  B18:"Training projections for Depth Size, Color Bar, Temp Graph, Nav Data, Window Size, Battery NO DATA, Header Info and Zoom Marker affect LCD; Temp Graph requires fresh typed in-range synthetic position, and supplementary NAV speed requires a nonnegative sample, honors selected §2.5 speed units and never substitutes unavailable NMEA; OEM geometry and hardware signals remain unverified",
  B19:"Training-only 8/16-color Blue/Black/White/Mono/Night palettes and original LCD text plus neutral VRM/Zoom/NAV Canvas overlays use light/dark derived ink rather than hard-coded pale marks on White. The operator-facing label Colors follows manufacturer v2.01 software history, while 8/16-color preview and firmware-unknown limitations are disclosed in D15, NOT OEM colorimetry or installed-firmware equivalence.",
  C05:"Training-only Arrival alarm/radius with typed moving synthetic ownship and active waypoint destination; radius choices and menu placement have no firmware conformance oracle",
  C11:"NAV training boxes and §1.21 Bearing True/Mag, Wind True/Apparent and Own/NMEA Trip/Temp/Speed Source selectors now have staged, persisted, replayable state; typed Own position/waypoint/speed projects TIME TO GO (SIM EST), with missing destination, stale/invalid position, negative/zero speed or unavailable NMEA => NO DATA. Course is angular-bounded; independent bearing/heading/SOG/pressure/XTE require explicit per-field synthetic provenance and bounded values, without inventing real ship observations. OEM ETA, Data Box and complete source availability remain partial",
  C04:"Synthetic ALARM4 speed Inside/Outside uses nonnegative finite source values only; negative speed never fires even an Outside cause. Multiple alarm conditions remain AND-combined, and physical POWER/FUNC down acknowledges audible ALARM causes immediately without deleting active visual causes; OEM timings/sound source HOLD",
  C13:"Training-only Trip/Odometer integrates explicit Own synthetic speed on world ticks and stops under NMEA selection with no external receiver; reset confirmation preserves odometer; no physical certified distance source",
  D02:"Eight editable classroom Range 1-8 preset slots affect manual RANGE display, persistent settings and replay; slot choices and exact bank UI remain synthetic/firmware-unverified",
  D04:"Only English public-reference screen labels are available; language switching/reboot and licensed alternate text are unimplemented (RIGHTS_HOLD/SOURCE_GAP)",
  D06:"Multi-field synthetic §2.6 calibration edit/cancel/persist/replay affects only classroom display readings and LF/HF processing; no measured transducer, installed gain bias or OEM adjustment assurance",
  D09:"Optional Tankenmaru is SOURCE_GAP/HOLD by default on unknown hardware. An explicitly enabled D15 virtual option permits On/Off and a read-only §2.9 reference panel for Output Off, Pic. Sync Yes and Sub Clutter 4, documented as manual defaults only. Virtual On suppresses NMEA setup in both System and Installation, and Off restores it; revocation restores MARK/NMEA. No editable OEM submenu/range, output, RF transport or partner display; real hardware/firmware behavior remains unimplemented",
  D10:"Instructor-only synthetic low-battery and system-error cues, bounded fixture toggles and simulated diagnostics; no observed voltage, fault code, measured hardware condition or OEM workflow claim",
  D14:"NMEA physical port remains Off; read-only status modal projects D15 synthetic fixture missing/fresh/stale with hemisphere-safe coordinates and rejects impossible/out-of-range fixes. Own Trip/Speed/Temperature availability requires a valid fresh typed synthetic position; negative Own speed and NMEA-selected speed cannot leak from internal sample, and Tankenmaru On suppresses receiver data. No real IEC/NMEA electrical port or vessel transport exists.",
  D15:"Seven instructor-only lessons cover RANGE, MODE, synthetic MARK, §1.21 Trip Source, §4.9 receiver absence, §2.3 Key Beep and §1.3 BRILL using semantic input sequences, per-attempt session hash, negative/cancel/retry and replay. Lesson05 rejects temporary NAV-fixture activation; 06 requires committed Off-to-On source control; 07 requires two short POWER/BRILL actions and ENTER; unrelated FUNC down/cancel is rejected rather than ignored. Scoring is not authenticated anti-cheat, OEM certification or independent course approval.",
};

export async function buildPublicAcceptancePayload(){
  const trace=JSON.parse(await readFile(source,"utf8"));
  if(trace.rows?.length!==65 ||
      new Set(trace.rows.map(row=>row.featureId)).size!==65 ||
      trace.rows.filter(row=>row.scope==="FCV_OPERATOR").length!==64 ||
      trace.rows.filter(row=>row.featureId==="D15" &&
        row.scope==="INSTRUCTOR_PLATFORM").length!==1){
    throw new Error("64+D15 source trace changed; no implementation audit written");
  }
  const rows=trace.rows.map(row=>{
    const checkpointStatus=open.has(row.featureId)?"NOT_IMPLEMENTED":
      menuOnly.has(row.featureId)?"MENU_ONLY_PARTIAL":
      reviewedSubsetIds.has(row.featureId)?"OPERABLE_SYNTHETIC_SUBSET":
      "NOT_IMPLEMENTED";
    return {
      featureId:row.featureId,
      scope:row.scope,
      domain:row.domain,
      checkpointStatus,
      sourceStatus:row.sourceStatus,
      manualRefs:row.manualRefs,
      publicSourceIds:row.publicSourceIds,
      rightsDecision:row.rightsDecision,
      testReferences:checkpointStatus==="NOT_IMPLEMENTED"?[]:
        targetedScenarioTests[row.featureId]
          ?[...targetedScenarioTests[row.featureId]]:
        row.featureId==="D15"
          ?["test/fcv588-public-course.test.mjs",
            "test/fcv588-public-training-fixtures.test.mjs"]
          :domainTests[row.domain]??[],
      testEvidenceMeaning:targetedScenarioTests[row.featureId]
        ?"TARGETED_SCENARIO_TEST_NOT_OEM_CONFORMANCE":
        "DOMAIN_SMOKE_NOT_PER_ROW_CONFORMANCE",
      note:exceptions[row.featureId]??
        "Training-only partial behavior; per-feature cancel, visual and manual oracle not fully reviewed",
      claimDecision:"HOLD",
    };
  });
  return {
    schemaVersion:1,
    profileClass:"PUBLIC_REFERENCE",
    profileRevision:FCV588_ADAPTER.revision,
    checkpointPolicy:"EXPLICIT_REVIEWED_FEATURE_ALLOWLIST",
    hardwareValidated:false,
    firmwareInstalled:null,
    rightsClearance:false,
    releaseApproval:"HOLD",
    sourceTrace:"docs/evidence/fcv588-public-trace-matrix.json",
    implementationCheckpointMeaning:
      "Operable synthetic subset does not mean complete/manual-conformant FCV behavior.",
    reviewerSignoff:"NOT_OBTAINED",
    realHardwareEquivalence:"OUT_OF_SCOPE_HOLD",
    operatorRows:rows.filter(row=>row.scope==="FCV_OPERATOR"),
    teacherRows:rows.filter(row=>row.scope==="INSTRUCTOR_PLATFORM"),
  };
}

if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const payload=await buildPublicAcceptancePayload();
  const content=JSON.stringify(payload,null,2)+"\n";
  if(process.argv.includes("--check")){
    if(await readFile(IMPLEMENTATION_STATUS_DEST,"utf8")!==content){
      console.error("FAIL: F1 implementation coverage checkpoint drift");
      process.exitCode=1;
    }else console.log("PASS: 64 FCV + D15 implementation checkpoint, claims HOLD");
  }else{
    await writeFile(IMPLEMENTATION_STATUS_DEST,content);
    const rows=[...payload.operatorRows,...payload.teacherRows];
    const counts=Object.groupBy(rows,row=>row.checkpointStatus);
    console.log("WROTE: 64+D15 coverage "+
      Object.entries(counts).map(([k,v])=>k+"="+v.length).join(", "));
  }
}
