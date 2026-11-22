import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {
  projectFcvPhotoStatusHeader,projectFcvDepthTicks,
  shouldShowFcvGlobalDepth,
} from "../web/lcd-presentation.mjs";

const basic=()=>({
  power:"on",mode:"LF",gainMode:"off",manualGain:10,rangeMode:"manual",
  autoGainOffset:0,settings:{
    headerInfo:"On",pictureAdvance:"1x",battery:"Off",
    zoomMode:"Bottom Lock",units:"Metric",
  },
});

test("photo-reference header renders MAN.R and integer G:10 without inventing voltage",()=>{
  const state=basic();
  const before=structuredClone(state);
  const header=projectFcvPhotoStatusHeader(state);
  assert.equal(header.text,"MAN.R   G:10   LF   x1");
  assert.equal(header.batteryStatus,null);
  assert.deepEqual(state,before);
  assert.equal(projectFcvPhotoStatusHeader({...state,
    settings:{...state.settings,battery:"On"}}).text,"MAN.R   G:10   LF");
  assert.equal(projectFcvPhotoStatusHeader({...state,
    settings:{...state.settings,battery:"On"}}).batteryStatus,"NO_HARDWARE_DATA");
});

test("source-backed labels distinguish DUAL and zoom mode without changing selector state",()=>{
  for(const [mode,zoomMode,label] of [
    ["DUAL","Bottom Lock","LF/HF"],
    ["LF-ZOOM","Bottom Lock","BL-LF"],
    ["HF-ZOOM","Bottom Lock","BL-HF"],
    ["LF-ZOOM","Bottom Zoom","BZ-LF"],
    ["HF-ZOOM","Marker Zoom","MZ-HF"],
  ]){
    const s=basic();s.mode=mode;s.settings.zoomMode=zoomMode;
    assert.equal(projectFcvPhotoStatusHeader(s).modeLabel,label);
    assert.equal(s.mode,mode);
  }
});

test("NAV photo displays its data-region labels, not an invented global range/gain header",()=>{
  for(const mode of ["NAV1","NAV2"]){
    const state={...basic(),mode};
    const header=projectFcvPhotoStatusHeader(state);
    assert.equal(header.text,"");
    assert.equal(header.modeLabel,mode);
    assert.equal(projectFcvPhotoStatusHeader({...state,
      settings:{...state.settings,battery:"On"}}).batteryStatus,"NO_HARDWARE_DATA");
  }
  const state={...basic(),rangeMode:"auto"};
  assert.equal(projectFcvPhotoStatusHeader(state).text,"AUTO_R   G:10   LF   x1",
    "retain project/source-supported AUTO_R until a specific photo proves another label");
});

test("photo-body sonar canvas does not invent per-pane 50/200 kHz text or NAV title",async()=>{
  const app=await readFile(new URL("../web/app.mjs",import.meta.url),"utf8");
  const draw=app.slice(app.indexOf("function drawChannel("),app.indexOf("function sounderFrame("));
  assert.doesNotMatch(draw,/fillText\(String\(frame\.frequencyKhz\)/,
    "the eight photos identify channel in mode/status, not as a per-pane top overlay");
  assert.doesNotMatch(app,/ctx\.fillText\(state\.mode,15,70/,
    "NAV photo shows data boxes, not a global NAV1/NAV2 title within the LCD");
});

test("photo-like depth ticks include all 0/5/10/15/20 and respect viewport bounds",()=>{
  const ticks=projectFcvDepthTicks({startDepthM:0,rangeM:20},{height:640,units:"Metric"});
  assert.deepEqual(ticks.map(t=>t.depthM),[0,5,10,15,20]);
  assert.ok(ticks.every(t=>t.y>=66 && t.y<=628 && t.label.endsWith(" m")));
  assert.ok(ticks.every((t,i)=>i===0 || t.y>ticks[i-1].y));
  const shifted=projectFcvDepthTicks({startDepthM:5,rangeM:10},{height:640,units:"Metric"});
  assert.deepEqual(shifted.map(t=>t.depthM),[5,7.5,10,12.5,15]);
  assert.throws(()=>projectFcvDepthTicks({startDepthM:0,rangeM:0}),/range|depth/i);
});

test("NAV has exactly one large depth indicator in left pane, not duplicated over sonar",()=>{
  assert.equal(shouldShowFcvGlobalDepth("LF",[]),true);
  assert.equal(shouldShowFcvGlobalDepth("NAV1",[{label:"SPEED (STW)"},{label:"WIND"}]),false);
  assert.equal(shouldShowFcvGlobalDepth("NAV2",[{label:"DEPTH"},{label:"TRIP"}]),false);
  assert.equal(shouldShowFcvGlobalDepth("NAV1",[{label:"DEPTH"}]),false);
});

