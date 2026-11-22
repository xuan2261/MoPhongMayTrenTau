import test from "node:test";
import assert from "node:assert/strict";
import {fingerprint} from "../src/core/protocol.mjs";
import {TRAINING_SCENARIO,initialWorldState,observeSounder,advanceWorld} from "../src/core/scenario.mjs";
import {initialFcv588State} from "../src/devices/fcv588/model.mjs";
import {projectFcvEcho,projectFcvZoom,shouldAdvancePicture} from
  "../src/devices/fcv588/echo-projection.mjs";
import * as Picture from "../src/devices/fcv588/echo-projection.mjs";
import {convertFcvDepth,formatFcvDepth} from "../src/devices/fcv588/units.mjs";
import {getFcvDisplayPalette} from "../src/devices/fcv588/display-palette.mjs";
import {getFcvMenuItems} from "../src/devices/fcv588/menu-atlas.mjs";
import {projectFcvSourceCue} from "../web/lcd-instructor-meta.mjs";
import * as Palette from "../src/devices/fcv588/display-palette.mjs";
import {readFile} from "node:fs/promises";

const world=initialWorldState(TRAINING_SCENARIO);
const raw=observeSounder(TRAINING_SCENARIO,world,{columns:48,rows:151});
const state=initialFcv588State();

test("B19 operator Colors label is OEM literal while D15 discloses synthetic firmware-unknown preview",()=>{
  const entry=getFcvMenuItems("Display",state).find(item=>item.id==="display.colors");
  assert.deepEqual(entry?.choices,["8","16"]);
  assert.equal(entry.label,"Colors","manual v2.01 literal may not carry a teacher suffix on LCD");
  assert.match(entry.sourceStatus,/FIRMWARE_UNKNOWN/);
  assert.notEqual(entry.sourceStatus,"CURATED_REFERENCE_NOT_HARDWARE_VERIFIED",
    "firmware-dependent colors must be clearly distinct from general manual entries");
  const instructor=projectFcvSourceCue({...state,power:"on",
    overlay:{kind:"menu",category:"Display",itemIndex:1,editing:false}},0);
  assert.equal(instructor.visible,true);
  assert.equal(instructor.status,entry.sourceStatus,
    "source provenance must remain in the external instructor cue");
  assert.match(instructor.detail,/giả lập|huấn luyện/i);
  assert.match(instructor.detail,/firmware/i);
  assert.equal(state.settings.colors,undefined,
    "an unknown firmware version must not be silently installed as a preference");
});

test("display palette 8/16 choices and Blue/Black/White backgrounds render original color entries",()=>{
  const baselineHash=fingerprint([...raw.channels[50]]);
  const eight=getFcvDisplayPalette({colors:"8",background:"Blue"});
  const sixteen=getFcvDisplayPalette({colors:"16",background:"Blue"});
  assert.equal(eight.length,8);
  assert.equal(sixteen.length,16);
  for(const color of [...eight,...sixteen]){
    assert.equal(color.length,3);
    assert.ok(color.every(v=>Number.isInteger(v)&&v>=0&&v<=255));
  }
  const black=getFcvDisplayPalette({colors:"8",background:"Black"});
  const white=getFcvDisplayPalette({colors:"8",background:"White"});
  assert.notDeepEqual(black[0],eight[0]);
  assert.notDeepEqual(white[0],eight[0]);
  assert.notDeepEqual(black[0],white[0]);
  assert.equal(fingerprint([...raw.channels[50]]),baselineHash);
});

test("B19 documented Palette White/Blue/Black/Mono/Night visibly changes original LCD color samples",()=>{
  const paletteMenu=state.settings;void paletteMenu;
  const blue=getFcvDisplayPalette({palette:"Blue",colors:"8"});
  const seen=new Set();
  for(const kind of ["White","Blue","Black","Mono","Night"]){
    const p=getFcvDisplayPalette({palette:kind,colors:"8"});
    assert.equal(p.length,8);
    assert.ok(p.every(rgb=>rgb.length===3 && rgb.every(x=>
      Number.isInteger(x)&&x>=0&&x<=255)));
    seen.add(JSON.stringify(p));
  }
  assert.equal(seen.size,5,
    "every palette must change pixels, not only a menu value");
  assert.deepEqual(getFcvDisplayPalette({palette:"Blue",colors:"8"}),blue);
  assert.equal(getFcvDisplayPalette({palette:"Night",colors:"16"}).length,16);
});

test("B19 VRM/ZOOM/NAV operator ink obeys original light/dark palette contrast without training footer",async()=>{
  const app=await readFile(new URL("../web/app.mjs",import.meta.url),"utf8");
  for(const [name,pattern] of [
    ["NAV field labels",/ctx\.fillStyle=lcdRgb\(contrast\.secondary\);[\s\S]*?ctx\.fillText\(row\.label/],
    ["NAV values",/ctx\.fillStyle=lcdRgb\(contrast\.navValue\);[\s\S]*?row\.valueFontPx/],
    ["NAV and DUAL dividers",/ctx\.fillStyle\s*=\s*lcdRgb\(contrast\.foreground\);\s*ctx\.fillRect\(navPane\.width-1/],
    ["zoom depth axis",/projectFcvDepthTicks\(frame,[\s\S]*?ctx\.fillStyle=lcdRgb\(contrast\.foreground\)/],
    ["VRM stroke",/ctx\.strokeStyle\s*=\s*lcdRgb\(contrast\.navHeading\);\s*ctx\.lineWidth\s*=\s*2;\s*ctx\.setLineDash\(\[8, 6\]\)/],
  ])assert.match(app,pattern,name+" cannot stay pale on White LCD");
  assert.doesNotMatch(app,/ctx\.fillText\("SYNTHETIC · NO LIVE RECEIVER"/,
    "training footer must remain in the separate instructor UI");
  assert.doesNotMatch(app,/ctx\.fillText\("ZOOM:/,
    "2016 BL photos carry BL-LF/BL-HF in the header and no invented bottom legend");
  const light=Palette.getFcvLcdContrastTheme({palette:"White"});
  const dark=Palette.getFcvLcdContrastTheme({palette:"Blue"});
  assert.notDeepEqual(light.foreground,dark.foreground);
  assert.notDeepEqual(light.navHeading,dark.navHeading);
});

test("B19 palettes retain legible annotated depth, frequency, and NAV LCD text on White and dark backgrounds",async()=>{
  assert.equal(typeof Palette.getFcvLcdContrastTheme,"function",
    "White mode cannot leave white-on-white frequency/depth annotations");
  const brightRatio=(a,b)=>{
    const linear=component=>{
      const s=component/255;
      return s<=0.04045?s/12.92:((s+0.055)/1.055)**2.4;
    };
    const lum=rgb=>rgb.reduce((total,x,i)=>total+
      [0.2126,0.7152,0.0722][i]*linear(x),0);
    const la=lum(a),lb=lum(b);
    return (Math.max(la,lb)+.05)/(Math.min(la,lb)+.05);
  };
  const modes=["White","Blue","Black","Mono","Night"];
  const backgroundHash=fingerprint([...raw.channels[50]]);
  for(const name of modes){
    for(const colors of ["8","16"]){
      const theme=Palette.getFcvLcdContrastTheme({palette:name,colors});
      assert.equal(theme.sourceClass,"ORIGINAL_TRAINING_ARTWORK");
      assert.deepEqual(theme.background,
        getFcvDisplayPalette({palette:name,colors})[0],
        "annotation colors must follow the actual selected echo palette");
      assert.ok(brightRatio(theme.background,theme.foreground)>=4.5,
        name+" requires at least WCAG-AA-like readability for LCD captions");
      assert.ok(brightRatio(theme.navPanel,theme.navValue)>=4.5,
        name+" must keep simulated NAV values legible");
      assert.ok(brightRatio(theme.navPanel,theme.navHeading)>=4.5,
        name+" must keep the source class/heading legible");
    }
  }
  const white=Palette.getFcvLcdContrastTheme({palette:"White"});
  const blue=Palette.getFcvLcdContrastTheme({palette:"Blue"});
  assert.notDeepEqual(white.foreground,blue.foreground);
  assert.notDeepEqual(white.navPanel,blue.navPanel);
  assert.equal(fingerprint([...raw.channels[50]]),backgroundHash,
    "brightness/contrast must never mutate synthetic sonar observations");
  const app=await readFile(new URL("../web/app.mjs",import.meta.url),"utf8");
  const css=await readFile(new URL("../web/styles.css",import.meta.url),"utf8");
  assert.match(app,/getFcvLcdContrastTheme/);
  assert.match(app,/--fcv-lcd-foreground/);
  assert.match(css,/var\(--fcv-lcd-foreground/,
    "header/depth DOM text must track the selected LCD palette too");
});

test("White Marker selections visibly alter only the independently authored color palette",()=>{
  const base=getFcvDisplayPalette({colors:"8",background:"Blue",whiteMarker:"Off"});
  const white=getFcvDisplayPalette({colors:"8",background:"Blue",whiteMarker:"White"});
  const gray=getFcvDisplayPalette({colors:"8",background:"Blue",whiteMarker:"Gray"});
  assert.notDeepEqual(white[7],base[7]);
  assert.notDeepEqual(gray[7],base[7]);
  assert.ok(white[7].every(v=>v>=230));
  assert.ok(gray[7].every(v=>v>=100&&v<=200));
  assert.deepEqual(white[0],base[0],"background color is independent");
});

test("Bottom Zone Narrow/Standard/Wide affects screen window only, not world or raw sensor",()=>{
  const rawHash=fingerprint([...raw.channels[50]]);
  const frame=projectFcvEcho(raw,{...state,rangeMode:"manual",rangeIndex:4},{rows:80});
  const narrow=Picture.projectFcvBottomZone(frame,raw.bottomDepthM,"Narrow");
  const medium=Picture.projectFcvBottomZone(frame,raw.bottomDepthM,"Standard");
  const wide=Picture.projectFcvBottomZone(frame,raw.bottomDepthM,"Wide");
  assert.ok(narrow && medium && wide);
  assert.ok(narrow.widthM<medium.widthM && medium.widthM<wide.widthM);
  assert.ok(medium.topFraction>=0 && medium.topFraction<=1);
  assert.ok(medium.bottomFraction>=medium.topFraction);
  assert.equal(Picture.projectFcvBottomZone(frame,200,"Narrow"),null,
    "unobserved depth must not draw a fictional highlight");
  assert.equal(fingerprint([...raw.channels[50]]),rawHash);
});

test("System Units projects display-only metric, feet and fathoms without altering meters",()=>{
  const worldHash=fingerprint(world);
  const observationHash=fingerprint([...raw.channels[50]]);
  assert.deepEqual(convertFcvDepth(50,"Metric"),{value:50,unit:"m"});
  assert.equal(formatFcvDepth(50,"Feet"),"164.0 ft");
  assert.equal(formatFcvDepth(50,"Fathom"),"27.3 fm");
  assert.equal(formatFcvDepth(null,"Metric"),"--");
  assert.throws(()=>convertFcvDepth(50,"Unknown"),/unit|unknown|invalid/i);
  assert.equal(fingerprint(world),worldHash);
  assert.equal(fingerprint([...raw.channels[50]]),observationHash);
});

test("Demo Off without a matching virtual sounder fixture does not claim live echoes",()=>{
  assert.equal(typeof Picture.shouldRenderFcvSonar,"function");
  assert.equal(Picture.shouldRenderFcvSonar(state),true,"Demo On is self-contained");
  assert.equal(Picture.shouldRenderFcvSonar({...state,demoOn:false}),false);
  assert.equal(Picture.shouldRenderFcvSonar({...state,demoOn:false,
    trainingFixture:{navigation:false,virtualMounting:true}}),false,
    "teacher fixture 525STID-PWD must match the selected virtual type");
  assert.equal(Picture.shouldRenderFcvSonar({...state,demoOn:false,
    settings:{...state.settings,transducer:"525STID-PWD"},
    trainingFixture:{navigation:false,virtualMounting:true}}),true);
});

test("LF/HF display projections are repeatable and never mutate sensor observations", () => {
  const hash=fingerprint([...raw.channels[50]]);
  const lf=projectFcvEcho(raw,state,{frequencyKhz:50,rows:80});
  const hf=projectFcvEcho(raw,state,{frequencyKhz:200,rows:80});
  assert.equal(lf.frequencyKhz,50);
  assert.equal(hf.frequencyKhz,200);
  assert.equal(lf.pixels.length,48*80);
  assert.notDeepEqual([...lf.pixels],[...hf.pixels]);
  assert.deepEqual(lf,projectFcvEcho(raw,state,{frequencyKhz:50,rows:80}));
  assert.equal(fingerprint([...raw.channels[50]]),hash);
});

test("sounder processing changes illustrative display, not raw LF data", () => {
  const base=projectFcvEcho(raw,state,{rows:80,frequencyKhz:50});
  const changed={...state,settings:{...state.settings,
    clutter:"80",colorErase:"20",interference:"High",tvg:"High",
    whiteLine:"On",aScope:"Normal"}};
  const processed=projectFcvEcho(raw,changed,{rows:80,frequencyKhz:50});
  assert.notDeepEqual([...processed.pixels],[...base.pixels]);
  assert.equal(processed.synthetic,true);
  assert.equal(processed.overlays.whiteLine,true);
  assert.equal(processed.overlays.aScope,true);
  assert.equal(raw.channels[50].length,48*151);
});

test("Sounder Shift moves only the manual-range display window, never sonar truth",()=>{
  const before=fingerprint([...raw.channels[50]]);
  const manual={...state,rangeMode:"manual",rangeIndex:4,
    settings:{...state.settings,shift:"15"}};
  const unchanged=projectFcvEcho(raw,{...manual,
    settings:{...manual.settings,shift:"0"}},{frequencyKhz:50,rows:80});
  const shifted=projectFcvEcho(raw,manual,{frequencyKhz:50,rows:80});
  assert.equal(shifted.startDepthM,15);
  assert.notDeepEqual([...shifted.pixels],[...unchanged.pixels]);
  const auto=projectFcvEcho(raw,{...manual,rangeMode:"auto"},
    {frequencyKhz:50,rows:80});
  assert.equal(auto.startDepthM,0,"Auto Range blocks effective manual Shift");
  assert.equal(fingerprint([...raw.channels[50]]),before);
});

test("VRM and White Line positions share the shifted/zoomed visible depth window",()=>{
  const frame={rangeM:80,startDepthM:15};
  assert.equal(Picture.depthFractionOnFcvFrame(frame,15),0);
  assert.equal(Picture.depthFractionOnFcvFrame(frame,55),0.5);
  assert.equal(Picture.depthFractionOnFcvFrame(frame,95),1);
  assert.ok(Picture.depthFractionOnFcvFrame(frame,5)<0);
  assert.ok(Picture.depthFractionOnFcvFrame(frame,100)>1);
});

test("Smoothing On applies a deterministic display filter, not a raw observation mutation",()=>{
  const before=fingerprint([...raw.channels[200]]);
  const off=projectFcvEcho(raw,{...state,settings:{
    ...state.settings,smoothing:"Off"}},{frequencyKhz:200,rows:80});
  const on=projectFcvEcho(raw,{...state,settings:{
    ...state.settings,smoothing:"On"}},{frequencyKhz:200,rows:80});
  assert.notDeepEqual([...on.pixels],[...off.pixels]);
  assert.deepEqual(on,projectFcvEcho(raw,{...state,settings:{
    ...state.settings,smoothing:"On"}},{frequencyKhz:200,rows:80}));
  assert.equal(fingerprint([...raw.channels[200]]),before);
});

test("TX Power changes synthetic presentation energy only, never actual transmitter state",()=>{
  const hash=fingerprint([...raw.channels[50]]);
  const normal=projectFcvEcho(raw,{...state,settings:{...state.settings,
    txPower:"Auto"}},{rows:80});
  const low=projectFcvEcho(raw,{...state,settings:{...state.settings,
    txPower:"20%"}},{rows:80});
  const off=projectFcvEcho(raw,{...state,settings:{...state.settings,
    txPower:"Off"}},{rows:80});
  assert.ok([...normal.pixels].some(v=>v>0));
  assert.ok([...low.pixels].reduce((a,b)=>a+b,0) <
    [...normal.pixels].reduce((a,b)=>a+b,0));
  assert.ok([...off.pixels].every(v=>v===0));
  assert.equal(off.physicalMeasurement,false);
  assert.equal(fingerprint([...raw.channels[50]]),hash);
});

test("TX Rate adjusts deterministic picture sampling cadence without advancing world",()=>{
  const original=fingerprint(world);
  const first=projectFcvEcho(raw,state,{rows:80});
  const second=projectFcvEcho(observeSounder(TRAINING_SCENARIO,
    advanceWorld(TRAINING_SCENARIO,world,5),{columns:48,rows:151}),
    state,{rows:80});
  const slow={...state,settings:{...state.settings,txRate:"1"}};
  const full={...state,settings:{...state.settings,txRate:"10"}};
  const initialSlow=Picture.advanceFcvPictureHistory(null,first,slow,0);
  const initialFull=Picture.advanceFcvPictureHistory(null,first,full,0);
  const afterSlow=Picture.advanceFcvPictureHistory(initialSlow,second,slow,5);
  const afterFull=Picture.advanceFcvPictureHistory(initialFull,second,full,5);
  assert.deepEqual([...afterSlow.pixels],[...initialSlow.pixels]);
  assert.notDeepEqual([...afterFull.pixels],[...initialFull.pixels]);
  assert.equal(fingerprint(world),original);
});

test("Display > A-Scope Off/Normal/Peak renders HF only when DUAL, retaining mode",()=>{
  const dual={...state,mode:"DUAL",settings:{...state.settings,aScope:"Normal"}};
  const lf=projectFcvEcho(raw,dual,{rows:80,frequencyKhz:50});
  const hf=projectFcvEcho(raw,dual,{rows:80,frequencyKhz:200});
  assert.equal(lf.overlays.aScope,false,
    "in DUAL the A-Scope belongs to the high-frequency panel");
  assert.equal(hf.overlays.aScope,true);
  assert.equal(hf.overlays.aScopeMode,"Normal");
  const peak=projectFcvEcho(raw,{...dual,settings:{...dual.settings,aScope:"Peak"}},
    {rows:80,frequencyKhz:200});
  assert.equal(peak.overlays.aScopeMode,"Peak");
  const off=projectFcvEcho(raw,{...dual,settings:{...dual.settings,aScope:"Off"}},
    {rows:80,frequencyKhz:200});
  assert.equal(off.overlays.aScope,false);
});

test("A-Scope Peak retains strongest recent synthetic return, while Normal tracks latest column",()=>{
  const pixels=new Uint8Array([100,220,80,10,60,30]);
  const frame={columns:3,rows:2,pixels,
    overlays:{aScope:true,aScopeMode:"Normal"}};
  const normal=Picture.projectFcvAScope(frame);
  assert.deepEqual([...normal],[80,30]);
  const peak=Picture.projectFcvAScope({...frame,overlays:{
    aScope:true,aScopeMode:"Peak"}});
  assert.deepEqual([...peak],[220,60]);
  assert.equal(Picture.projectFcvAScope({...frame,overlays:{
    aScope:false,aScopeMode:"Off"}}),null);
  assert.deepEqual([...pixels],[100,220,80,10,60,30]);
});

test("Bottom Discrimination Graphic/Probability only visualize explicit typed synthetic class fixture",()=>{
  const base={overlays:{bottomDiscrimination:true,
    bottomDiscriminationMode:"Graphic",bottomClassification:{
      sourceClass:"SYNTHETIC_FIXTURE",
      classes:{Mud:0.1,Sand:0.1,Gravel:0.2,Rock:0.6},
    }}};
  const graphic=Picture.projectFcvBottomDiscrimination(base);
  assert.equal(graphic.mode,"Graphic");
  assert.equal(graphic.dominantType,"Rock");
  assert.equal(graphic.status,"SYNTHETIC_ONLY");
  const prob=Picture.projectFcvBottomDiscrimination({...base,overlays:{
    ...base.overlays,bottomDiscriminationMode:"Probability"}});
  assert.equal(prob.mode,"Probability");
  assert.deepEqual(prob.values,graphic.values);
  assert.equal(prob.values.length,4);
  assert.ok(Math.abs(prob.values.reduce((sum,row)=>sum+row.weight,0)-1)<1e-9);
  assert.equal(Picture.projectFcvBottomDiscrimination({overlays:{
    ...base.overlays,bottomDiscrimination:false}}),null);
  assert.equal(Picture.projectFcvBottomDiscrimination({overlays:{
    ...base.overlays,bottomClassification:null}}).status,"NO_SYNTHETIC_CLASSIFICATION");
});

test("ACCU-FISH synthetic size annotations track authored targets, never derive real sonar sizes",()=>{
  const o=observeSounder(TRAINING_SCENARIO,
    advanceWorld(TRAINING_SCENARIO,world,24),{columns:48,rows:151});
  assert.equal(o.syntheticTargets?.every(t=>t.sourceClass==="SYNTHETIC_FIXTURE"),
    true);
  assert.ok(o.syntheticTargets.length>=3);
  assert.ok(o.syntheticTargets.every(t=>Number.isFinite(t.sizeCm)&&t.sizeCm>0));
  const stateWithNamed={...state,settings:{...state.settings,
    transducer:"525STID-PWD",draft:"1",accuFish:"On",fishSymbol:"Fish"},
    syntheticConditions:{depthM:50,speedKn:7,mountCompatible:true,mountAligned:true}};
  const frame=projectFcvEcho(o,stateWithNamed,{rows:80});
  assert.equal(frame.overlays.accuFish,true);
  const labels=Picture.projectFcvFishAnnotations(o,frame,true);
  assert.ok(labels.length>0);
  assert.ok(labels.every(p=>p.xFraction>=0&&p.xFraction<=1 &&
    p.yFraction>=0&&p.yFraction<=1 && p.sourceClass==="SYNTHETIC_FIXTURE"));
  assert.deepEqual(Picture.projectFcvFishAnnotations(o,frame,false),[]);
  assert.ok(labels.every(p=>o.syntheticTargets.some(t=>t.sizeCm===p.sizeCm)));
});

test("Picture Advance Stop freezes synthetic fish markers with history pixels",()=>{
  const baseFrame={columns:4,rows:2,frequencyKhz:200,projectionKey:"fixture",
    pixels:new Uint8Array([1,2,3,4,5,6,7,8]),
    syntheticFish:[{xFraction:0.5,yFraction:0.4,sizeCm:32,
      sourceClass:"SYNTHETIC_FIXTURE"}]};
  const newerFrame={...baseFrame,pixels:new Uint8Array([8,7,6,5,4,3,2,1]),
    syntheticFish:[{xFraction:0.9,yFraction:0.6,sizeCm:41,
      sourceClass:"SYNTHETIC_FIXTURE"}]};
  const stopped={...state,settings:{...state.settings,pictureAdvance:"Stop"}};
  const begin=Picture.advanceFcvPictureHistory(null,baseFrame,stopped,0);
  const next=Picture.advanceFcvPictureHistory(begin,newerFrame,stopped,10);
  assert.deepEqual([...next.pixels],[...begin.pixels]);
  assert.deepEqual(next.syntheticFish,begin.syntheticFish);
  assert.equal(next.sourceTick,10);
});

test("Bottom Lock/Zoom/Marker Zoom resamples the visual depth window", () => {
  for(const zoomMode of ["Bottom Lock","Bottom Zoom","Marker Zoom"]) {
    const zoom=projectFcvZoom(raw,{...state,settings:{...state.settings,zoomMode}},
      {frequencyKhz:50,rows:80});
    assert.equal(zoom.pixels.length,48*80,zoomMode);
    assert.ok(zoom.windowDepthM>0 && zoom.windowDepthM<raw.maxDepthM);
    assert.equal(zoom.synthetic,true);
    assert.equal(zoom.zoomMode,zoomMode);
  }
});

test("Picture Advance Stop freezes displayed history but never the shared world", () => {
  assert.equal(shouldAdvancePicture({...state,settings:{...state.settings,
    pictureAdvance:"Stop"}}),false);
  for(const speed of ["4x","2x","1x","1/2","1/4","1/8","1/16"]) {
    assert.equal(shouldAdvancePicture({...state,settings:{...state.settings,
      pictureAdvance:speed}}),true);
  }
  assert.equal(advanceWorld(TRAINING_SCENARIO,world,10).simTick,10);
});

test("Picture Advance rate changes temporal cadence, not spatial shape of a single ping frame", () => {
  const baseline=projectFcvEcho(raw,state,{rows:80});
  for(const speed of ["4x","1/2","1/16","Stop"]){
    const candidate=projectFcvEcho(raw,{...state,settings:{
      ...state.settings,pictureAdvance:speed}},{rows:80});
    assert.deepEqual([...candidate.pixels],[...baseline.pixels],
      speed+" must not stretch/shrink a single historical sonar image");
  }
});

test("picture scroll integrates fractional speeds over world ticks and stops without freezing world", () => {
  assert.equal(typeof Picture.advanceFcvPictureHistory,"function",
    "temporal picture history projector is required");
  const first=projectFcvEcho(raw,state,{rows:80});
  const atTick=t=>projectFcvEcho(observeSounder(TRAINING_SCENARIO,
    advanceWorld(TRAINING_SCENARIO,world,t),{columns:48,rows:151}),
    state,{rows:80});
  const quarter={...state,settings:{...state.settings,pictureAdvance:"1/4"}};
  let history=Picture.advanceFcvPictureHistory(null,first,quarter,0);
  const initial=Uint8Array.from(history.pixels);
  for(let t=1;t<=3;t++){
    history=Picture.advanceFcvPictureHistory(history,atTick(t),quarter,t);
    assert.deepEqual([...history.pixels],[...initial],"no premature pixel advance at tick "+t);
  }
  history=Picture.advanceFcvPictureHistory(history,atTick(4),quarter,4);
  assert.deepEqual([...history.pixels.slice(0,47)],[...initial.slice(1,48)],
    "one column shifts after four synthetic seconds");
  const beforeStop=Uint8Array.from(history.pixels);
  const stop={...state,settings:{...state.settings,pictureAdvance:"Stop"}};
  history=Picture.advanceFcvPictureHistory(history,atTick(10),stop,10);
  assert.deepEqual([...history.pixels],[...beforeStop]);
  assert.equal(history.sourceTick,10,"world time keeps progressing");
});
