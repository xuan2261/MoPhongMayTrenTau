import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createSession,dispatch,replay,createReplayEnvelope,sessionHash} from "../src/core/session.mjs";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {TRAINING_SCENARIO as scenario} from "../src/core/scenario.mjs";
import {getFcvDisplayPalette} from "../src/devices/fcv588/display-palette.mjs";
import {formatFcvPictureAdvance,projectFcvEchoLegend} from "../web/lcd-presentation.mjs";

const send=(s,e)=>dispatch(s,adapter,e,scenario);
const press=(s,control)=>send(s,{kind:"press",control});
const pad=(s,direction)=>send(s,{kind:"pad",control:"trackpad",direction});
function boot(){
  let s=createSession(adapter,scenario);
  for(const e of [{kind:"down",control:"power"},
    {kind:"up",control:"power",durationMs:100},{kind:"tick",steps:4}])s=send(s,e);
  return s;
}
const enabled=()=>{
  const state=boot().deviceState;
  return {...state,settings:{...state.settings,colorBar:"On"}};
};

test("reference-oriented echo legend uses original 8/16 colors strongest first, not copied image pixels",()=>{
  for(const colors of ["8","16"]){
    const state=enabled();
    state.settings={...state.settings,colors};
    const legend=projectFcvEchoLegend(state);
    const palette=getFcvDisplayPalette(state.settings);
    assert.equal(legend.sourceClass,"ORIGINAL_TRAINING_ARTWORK");
    assert.equal(legend.orientation,"vertical");
    assert.equal(legend.order,"strong-to-weak");
    assert.equal(legend.bands.length,Number(colors));
    assert.deepEqual(legend.bands.map(b=>b.rgb),[...palette].reverse());
    assert.equal(legend.bands[0].x,3);
    assert.equal(legend.bands[0].y,64);
    assert.equal(legend.bands.at(-1).y+legend.bands.at(-1).height,224);
    assert.ok(legend.bands.every((b,i)=>b.width===8 &&
      b.height===160/Number(colors) && b.y===64+i*b.height));
  }
});

test("legend honors palette and White Marker settings without owning or mutating source colors",()=>{
  const state=enabled();
  state.settings={...state.settings,palette:"White",whiteMarker:"White"};
  const before=structuredClone(state);
  const legend=projectFcvEchoLegend(state);
  assert.deepEqual(legend.bands[0].rgb,[246,248,246]);
  assert.deepEqual(legend.bands.at(-1).rgb,[241,245,240]);
  legend.bands[0].rgb[0]=0;
  assert.deepEqual(projectFcvEchoLegend(state).bands[0].rgb,[246,248,246]);
  assert.deepEqual(state,before);
});

test("legend is absent on power-off, diagnostic field, disabled color bar or unavailable sonar",()=>{
  const state=enabled();
  for(const candidate of [
    {...state,power:"off"}, {...state,power:"booting"},
    {...state,overlay:{kind:"lcd-test",colorIndex:1}},
    {...state,settings:{...state.settings,colorBar:"Off"}},
    {...state,demoOn:false},
  ])assert.equal(projectFcvEchoLegend(candidate),null);
  assert.ok(projectFcvEchoLegend({...state,demoOn:false,
    settings:{...state.settings,transducer:"525STID-PWD"},
    trainingFixture:{...state.trainingFixture,virtualMounting:true}}));
});

test("legend scales in the logical Canvas space and respects an explicit NAV sonar offset",()=>{
  const state=enabled();
  const normal=projectFcvEchoLegend(state);
  const scaled=projectFcvEchoLegend(state,{width:960,height:1280,xOffset:640});
  assert.equal(scaled.bands[0].x,646);
  assert.equal(scaled.bands[0].y,128);
  assert.equal(scaled.bands[0].height,normal.bands[0].height*2);
  assert.ok(scaled.bands.every(b=>b.x>=640 && b.x+b.width<=960 && b.y+b.height<=1280));
});

test("invalid legend bounds are rejected rather than drawing outside the screen",()=>{
  for(const bounds of [{width:0},{height:-1},{width:NaN},{height:Infinity},
    {xOffset:-1},{xOffset:480},{xOffset:NaN}]){
    assert.throws(()=>projectFcvEchoLegend(enabled(),bounds),/legend bounds/);
  }
});

test("picture-rate header covers the existing eight choices and does not fabricate an unknown rate",()=>{
  const pairs=[["4x","x4"],["2x","x2"],["1x","x1"],["1/2","1/2"],
    ["1/4","1/4"],["1/8","1/8"],["1/16","1/16"],["Stop","STOP"]];
  for(const [pictureAdvance,expected] of pairs)
    assert.equal(formatFcvPictureAdvance({pictureAdvance}),expected);
  for(const pictureAdvance of ["unknown","toString","__proto__"])
    assert.equal(formatFcvPictureAdvance({pictureAdvance}),"?");
});

test("picture-rate label follows commit and cancel without advancing the world or rewriting replay",()=>{
  let s=press(press(boot(),"menu"),"enter");
  const tick=s.worldState.simTick;
  s=pad(s,"right");
  assert.equal(s.deviceState.overlay.draftValue,"1/2");
  assert.equal(formatFcvPictureAdvance(s.deviceState.settings),"x1");
  s=press(s,"menu");
  assert.equal(formatFcvPictureAdvance(s.deviceState.settings),"x1");
  s=pad(press(s,"enter"),"right");
  s=press(s,"enter");
  assert.equal(formatFcvPictureAdvance(s.deviceState.settings),"1/2");
  const before=sessionHash(s);
  projectFcvEchoLegend(s.deviceState);
  assert.equal(sessionHash(s),before);
  assert.equal(s.worldState.simTick,tick);
  assert.equal(sessionHash(replay(adapter,scenario,createReplayEnvelope(s))),before);
});

test("the live renderer consumes one global legend and lifts depth only for a painted BDS panel",async()=>{
  const app=await readFile(new URL("../web/app.mjs",import.meta.url),"utf8");
  const channel=app.split("function drawChannel(")[1].split("function sounderFrame(")[0];
  assert.doesNotMatch(channel,/colorBar|projectFcvEchoLegend/,
    "per-channel rendering must not duplicate the single legend in DUAL");
  assert.match(app,/const legend=projectFcvEchoLegend\(state/);
  assert.match(app,/bottomDiscPainted=drawSourceGradedOverlays/);
  assert.match(app,/bottomDiscPainted\?"19%":"10px"/);
  // The live renderer now consumes the source-graded pure header projection.
  // Keep the rate formatter contract inside its presentation owner.
  assert.match(app,/projectFcvPhotoStatusHeader\(state\)\.text/);
  const projection=await readFile(new URL("../web/lcd-presentation.mjs",import.meta.url),"utf8");
  assert.match(projection,/formatFcvPictureAdvance\(settings\)/);
});
