import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {createSession,dispatch,createReplayEnvelope,sessionHash} from "../src/core/session.mjs";
import {TRAINING_SCENARIO as scenario,observeSounder} from "../src/core/scenario.mjs";
import {getFcvReplayAdapter} from "../src/devices/fcv588/replay-compat.mjs";
import {createFcv588ArchiveSidecar} from "../src/devices/fcv588/archive-compat.mjs";
import {createFcv588ArchiveTimeline} from "../web/fcv588-archive-timeline.mjs";
import {planFcvScreenLayout} from "../src/devices/fcv588/display-layout.mjs";
import {projectFcvEcho} from "../src/devices/fcv588/echo-projection.mjs";

// P28 is a source-backed classroom QA matrix, NOT a recovered OEM LCD movie.
// Manual OME23890-E: PDF p10 §1.4.1 single LF(50)/HF(200);
// p11 §1.4.2 DUAL=LF left, HF right; p12 §1.4.3 BZ left,
// normal right, bottom echo remains in LOWER PART, no OEM pixel ratio given.
const revisions=["F1-public-reference-21","F1-public-reference-22","F1-public-reference-23"];
const contracts=["P04_HISTORIC","P23_LOWER_BOTTOM"];
const sha=bytes=>createHash("sha256").update(bytes).digest("hex");
const scenarioInputs=(steps,zoomMode="Bottom Zoom")=>[
  {kind:"restore-settings",settings:{zoomMode,zoomRange:"10"}},
  {kind:"down",control:"power"},{kind:"up",control:"power"},
  {kind:"tick",steps:4},
  ...(steps===0?[]:[{kind:"rotate",control:"mode",steps},
    {kind:"ui-tick",elapsedMs:6000}]),
];
function makeSession(revision,steps,zoomMode){
  const adapter=getFcvReplayAdapter(revision);
  let session=createSession(adapter,scenario);
  for(const input of scenarioInputs(steps,zoomMode))
    session=dispatch(session,adapter,input,scenario);
  return session;
}
function archive(session,contract){
  // One full synthetic session only; no derived prefix archive or sidecar.
  const original=createReplayEnvelope(session);
  const originalText=JSON.stringify(original);
  const sidecar=createFcv588ArchiveSidecar(original,{presentationContract:contract});
  return {originalText,sidecarText:JSON.stringify(sidecar)};
}
function timeline(session,contract){
  const {originalText,sidecarText}=archive(session,contract);
  return {model:createFcv588ArchiveTimeline(originalText,sidecarText),
    originalText,sidecarText};
}

test("P28 all 12 full profile21/22 LF/DUAL/HF pairs replay but do not invent historical BZ pixels",()=>{
  for(const revision of revisions)for(const [mode,steps] of
    [["LF",0],["DUAL",1],["HF",2]])
    for(const contract of contracts){
      const session=makeSession(revision,steps);
      assert.equal(session.deviceState.mode,mode);
      assert.equal(session.deviceState.power,"on");
      assert.equal(session.deviceState.settings.zoomMode,"Bottom Zoom");
      const beforeHash=sessionHash(session);
      const {model,originalText,sidecarText}=timeline(session,contract);
      const final=model.select(model.eventCount);
      assert.equal(model.profileRevision,revision);
      assert.equal(model.presentationContract,contract);
      assert.equal(final.activeMode,mode);
      assert.equal(final.power,"on");
      assert.equal(final.fullSessionHash,beforeHash);
      assert.equal(final.prefixSessionHash,beforeHash);
      assert.equal(final.visual.renderable,false);
      assert.equal(final.visual.reason,"ARCHIVE_NOT_BOTTOM_ZOOM");
      assert.equal(final.sourceClass,"SYNTHETIC_TIMELINE_PREVIEW_NOT_ARCHIVED_PIXELS");
      assert.equal(final.derivedPrefixOnly,false);
      const before=JSON.stringify([originalText,sidecarText]);
      const initial=model.select(0);
      assert.equal(initial.activeMode,"LF");
      assert.equal(initial.worldTick,0);
      assert.equal(initial.visual.renderable,false);
      const prior=model.select(model.eventCount-1);
      assert.equal(prior.activeMode,"LF",`${revision} ${mode} transient MODE should not commit prematurely`);
      const again=model.select(model.eventCount);
      assert.equal(again.prefixSessionHash,beforeHash);
      assert.equal(again.activeMode,mode);
      assert.equal(JSON.stringify([originalText,sidecarText]),before);
      assert.equal(sessionHash(session),beforeHash);
    }
});

test("P28 LF-ZOOM and HF-ZOOM use channel 50/200 and P04/P23 only change left synthetic BZ pane",()=>{
  for(const revision of revisions){
    const rasters={};
    for(const [mode,steps,khz] of [["LF-ZOOM",-1,50],["HF-ZOOM",3,200]]){
      const session=makeSession(revision,steps);
      assert.equal(session.deviceState.mode,mode);
      const legacy=timeline(session,"P04_HISTORIC").model;
      const classroom=timeline(session,"P23_LOWER_BOTTOM").model;
      const a=legacy.select(legacy.eventCount),b=classroom.select(classroom.eventCount);
      assert.equal(a.prefixSessionHash,b.prefixSessionHash);
      assert.equal(a.fullSessionHash,sessionHash(session));
      assert.equal(b.fullSessionHash,sessionHash(session));
      for(const frame of [a,b]){
        assert.equal(frame.activeMode,mode);
        assert.equal(frame.visual.renderable,true);
        assert.equal(frame.visual.frequencyKhz,khz);
        assert.equal(frame.visual.sourceClass,"SYNTHETIC_TRAINING_ONLY");
        assert.ok(frame.visual.zoomRaster.data.length>0);
        assert.ok(frame.visual.normalRaster.data.length>0);
        assert.equal(frame.visual.zoomRaster.hardwareValidated,false);
      }
      assert.equal(a.visual.geometry.bottomFraction,.5,"P04 retained *archive contract*, not OEM calibration");
      assert.ok(b.visual.geometry.bottomFraction>.5 && b.visual.geometry.bottomFraction<=1,
        "manual §1.4.3 supports ONLY lower-portion bottom echo");
      assert.equal(b.visual.geometry.bottomFraction,.75,"P23 classroom-specific position, not OEM pixel fraction");
      assert.notEqual(sha(a.visual.zoomRaster.data),sha(b.visual.zoomRaster.data));
      assert.equal(sha(a.visual.normalRaster.data),sha(b.visual.normalRaster.data));
      const first=classroom.select(classroom.eventCount);
      const before=classroom.select(classroom.eventCount-1);
      assert.equal(before.visual.renderable,false,"precommit MODE overlay is not an active zoom LCD");
      const again=classroom.select(classroom.eventCount);
      assert.equal(sha(first.visual.zoomRaster.data),sha(again.visual.zoomRaster.data));
      assert.equal(sha(first.visual.normalRaster.data),sha(again.visual.normalRaster.data));
      rasters[khz]=sha(b.visual.normalRaster.data);
    }
    assert.notEqual(rasters[50],rasters[200],
      "LF and HF may not quietly share an identical synthetic normal-pane channel");
  }
});

test("P28 POWER OFF, saved preference without active zoom, and wrong zoom setting fail closed",()=>{
  for(const revision of revisions){
    const initial=makeSession(revision,-1);
    const adapter=getFcvReplayAdapter(revision);
    let off=dispatch(initial,adapter,{kind:"down",control:"power"},scenario);
    off=dispatch(off,adapter,{kind:"up",control:"power",durationMs:3100},scenario);
    assert.equal(off.deviceState.power,"off");
    const offFrame=timeline(off,"P23_LOWER_BOTTOM").model;
    assert.equal(offFrame.select(offFrame.eventCount).visual.renderable,false);
    assert.equal(offFrame.select(offFrame.eventCount).visual.reason,"ARCHIVE_NOT_BOTTOM_ZOOM");
    const wrongSetting=makeSession(revision,-1,"Bottom Lock");
    assert.equal(wrongSetting.deviceState.mode,"LF-ZOOM");
    assert.equal(timeline(wrongSetting,"P23_LOWER_BOTTOM").model
      .select(wrongSetting.events.length).visual.renderable,false);
  }
});

test("P28 manual qualitative layouts preserve left/right channel ownership but claim no OEM pixels",()=>{
  const singleLF=planFcvScreenLayout({mode:"LF",settings:{}},{width:480,height:640});
  const singleHF=planFcvScreenLayout({mode:"HF",settings:{}},{width:480,height:640});
  assert.equal(singleLF.panes.normal.width,480);
  assert.equal(singleHF.panes.normal.width,480);
  const dual=planFcvScreenLayout({mode:"DUAL",settings:{windowRatio:"50"}},
    {width:480,height:640});
  assert.equal(dual.panes.lf.x,0);
  assert.equal(dual.panes.hf.x,dual.panes.lf.width);
  assert.equal(dual.panes.lf.width+dual.panes.hf.width,480);
  for(const mode of ["LF-ZOOM","HF-ZOOM"]){
    const view=planFcvScreenLayout({mode,settings:{windowRatio:"50"}},
      {width:480,height:640});
    assert.equal(view.panes.zoom.x,0);
    assert.equal(view.panes.normal.x,view.panes.zoom.width);
    assert.equal(view.panes.zoom.width+view.panes.normal.width,480);
  }
  const probe=makeSession(revisions[1],0);
  const source=observeSounder(scenario,probe.worldState,{columns:16,rows:64});
  const sourceCopy=structuredClone(source);
  const low=projectFcvEcho(source,probe.deviceState,{frequencyKhz:50,rows:64});
  const high=projectFcvEcho(source,probe.deviceState,{frequencyKhz:200,rows:64});
  assert.equal(low.frequencyKhz,50);
  assert.equal(high.frequencyKhz,200);
  assert.notDeepEqual(low.pixels,high.pixels);
  assert.deepEqual(source,sourceCopy,"display projection must not mutate source echo samples");
  const app=readFileSync(new URL("../web/app.mjs",import.meta.url),"utf8");
  assert.match(app,/const lf = sounderFrame\(o,state,50\);\s*const hf = sounderFrame\(o,state,200\)/,
    "DUAL's left/right painter must use LF50/HF200, not reversed");
  assert.match(app,/const frequencyKhz = state\.mode\.includes\("HF"\) \? 200 : 50/,
    "the single/zoom painter must select the active channel");
  assert.doesNotMatch(app,/drawImage\([^\n]*\.jpg/);
});
