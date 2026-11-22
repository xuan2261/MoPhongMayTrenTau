import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {
  planFcvScreenLayout,
  planFcvDepthReadout,
  planFcvNavRows,
} from "../src/devices/fcv588/display-layout.mjs";
import {projectFcvZoom} from "../src/devices/fcv588/echo-projection.mjs";
import {initialFcv588State} from "../src/devices/fcv588/model.mjs";
import {projectFcvDepthTicks} from "../web/lcd-presentation.mjs";
import {bottomDepthAt,projectSyntheticSeabedProvenance,
  projectSyntheticSounderSourceIdentity,SENSOR_MODEL_VERSION} from "../src/core/scenario.mjs";

test("P04 photo BL axis is relative 5-to-0 while normal panel remains absolute",()=>{
  const frame={
    startDepthM:50,rangeM:5,windowDepthM:5,zoomMode:"Bottom Lock",
    frequencyKhz:50,
  };
  const before=structuredClone(frame);
  const bl=projectFcvDepthTicks(frame,{
    height:640,top:66,bottom:12,units:"Metric",axis:"bottom-lock",
  });
  assert.deepEqual(bl.map(t=>t.depthM),[5,4,3,2,1,0],
    "zoom.jpg/zoom2.jpg show Bottom Lock distance above bottom, not absolute 50m depth");
  assert.equal(bl[0].y,66);
  assert.equal(bl.at(-1).y,628);
  assert.ok(bl.every((tick,i)=>i===0 || tick.y>bl[i-1].y));
  assert.deepEqual(frame,before,"presentation axis must not rewrite the zoom frame");

  const normal=projectFcvDepthTicks({startDepthM:0,rangeM:20},{
    height:640,top:66,bottom:12,units:"Metric",
  });
  assert.deepEqual(normal.map(t=>t.depthM),[0,5,10,15,20],
    "normal pane keeps its absolute depth scale");
});

test("P04 Bottom Lock flattens different historical synthetic bottoms without promoting a mid-water band",()=>{
  const columns=2,rows=81,maxDepthM=80;
  const scenario={id:"p04-positive-bottom",version:1,seed:588,bottomDepthM:50,
    bottomVariationM:20,syntheticBottomReturnPresent:true,fish:Object.freeze([])};
  const world={simTick:1,bottomDepthM:bottomDepthAt(scenario,1)};
  const provenance=projectSyntheticSeabedProvenance(scenario,world,{columns});
  const sourceIdentity=projectSyntheticSounderSourceIdentity(scenario,world,{columns});
  const channel=new Uint8Array(columns*rows);
  // Two source-authored historical columns with different seabed positions.
  for(const [x,column] of provenance.columnBottoms.entries()){
    const bottomRow=Math.max(0,Math.min(rows-2,Math.round(column.depthM/maxDepthM*(rows-1))));
    channel[bottomRow*columns+x]=255;
    channel[(bottomRow+1)*columns+x]=190;
  }
  // A broad strong mid-water band must never become the Bottom Lock anchor.
  for(let x=0;x<columns;x++)channel[30*columns+x]=255;
  const observation={
    modelVersion:SENSOR_MODEL_VERSION,simTick:world.simTick,bottomDepthM:world.bottomDepthM,
    recommendedAutoRangeM:80,maxDepthM,syntheticTargets:[],
    columns,rows,channels:{50:channel,200:Uint8Array.from(channel)},
  };
  const state=initialFcv588State();
  state.settings={...state.settings,zoomMode:"Bottom Lock",blRange:"5",
    smoothing:"Off",clutter:"0",colorErase:"0",interference:"Off",tvg:"Low"};
  const before=Uint8Array.from(channel);
  const zoom=projectFcvZoom(observation,state,{frequencyKhz:50,rows,
    seabedProvenance:provenance,seabedSourceIdentity:sourceIdentity});
  const anchors=[];
  for(let x=0;x<columns;x++){
    let deepest=-1;
    for(let y=0;y<rows;y++)
      if(zoom.pixels[y*columns+x]>=150)deepest=y;
    anchors.push(deepest);
  }
  assert.ok(anchors.every(y=>y>=rows-2),
    "each historical bottom core must land in the same lower band");
  assert.ok(Math.max(...anchors)-Math.min(...anchors)<=1,
    "Bottom Lock must remove historical seabed slope between columns");
  assert.deepEqual(channel,before,"Bottom Lock remains a view-only remap");

  const midwaterOnly=Uint8Array.from(channel);
  for(let y=40;y<rows;y++)
    for(let x=0;x<columns;x++)midwaterOnly[y*columns+x]=0;
  const noBottom={...observation,channels:{50:midwaterOnly,200:midwaterOnly}};
  const absentProvenance=projectSyntheticSeabedProvenance(
    {...scenario,syntheticBottomReturnPresent:false},world,{columns});
  const absentIdentity=projectSyntheticSounderSourceIdentity(
    {...scenario,syntheticBottomReturnPresent:false},world,{columns});
  const rejected=projectFcvZoom(noBottom,state,{frequencyKhz:50,rows,
    seabedProvenance:absentProvenance,seabedSourceIdentity:absentIdentity});
  assert.equal([...rejected.pixels].filter(value=>value>=150).length,0,
    "mid-water coherence outside the typed-bottom tolerance must not be flattened into a seabed");
});

test("P04 Bottom Zoom and Marker Zoom retain the pre-P04 absolute centered window contract",()=>{
  const columns=2,rows=81;
  const channel=new Uint8Array(columns*rows);
  const observation={
    modelVersion:"P04_ABSOLUTE_TEST",simTick:0,bottomDepthM:50,
    recommendedAutoRangeM:80,maxDepthM:80,syntheticTargets:[],
    columns,rows,channels:{50:channel,200:Uint8Array.from(channel)},
  };
  const state=initialFcv588State();
  state.settings={...state.settings,zoomRange:"8",smoothing:"Off"};
  const before=structuredClone(observation);
  const bottomZoom=projectFcvZoom(observation,{
    ...state,settings:{...state.settings,zoomMode:"Bottom Zoom"},
  },{frequencyKhz:50,rows});
  assert.equal(bottomZoom.startDepthM,46);
  assert.equal(bottomZoom.windowDepthM,8);
  const markerZoom=projectFcvZoom(observation,{
    ...state,vrmDepthM:30,
    settings:{...state.settings,zoomMode:"Marker Zoom"},
  },{frequencyKhz:50,rows});
  assert.equal(markerZoom.startDepthM,26);
  assert.equal(markerZoom.windowDepthM,8);
  assert.deepEqual(observation,before,
    "absolute zoom projections must stay view-only and replay-neutral");
});

test("P04 DUAL depth readout is anchored on the real split divider for all supported window ratios",()=>{
  for(const ratio of ["25","50","75"]){
    const state={mode:"DUAL",settings:{windowRatio:ratio}};
    const layout=planFcvScreenLayout(state,{width:480,height:640});
    const readout=planFcvDepthReadout(state,layout,{width:480,height:640});
    assert.equal(readout.kind,"dual-divider");
    assert.equal(readout.anchorX,layout.panes.hf.x);
    assert.equal(readout.anchorFraction,layout.panes.hf.x/480);
    assert.ok(readout.anchorFraction>=0.25 && readout.anchorFraction<=0.75);
  }
  const lf=planFcvScreenLayout({mode:"LF",settings:{}},{width:480,height:640});
  assert.equal(planFcvDepthReadout({mode:"LF"},lf,{width:480,height:640}).kind,"left");
});

test("P04 NAV row plan preserves source boxes but adds photo-grounded separators and value hierarchy",()=>{
  const boxes=[
    {label:"SPEED (STW)",value:"0.0 kn (SIM)"},
    {label:"SPEED (SOG)",value:"NO DATA"},
    {label:"POSITION",value:"SIM 10.5000°N 106.7500°E"},
    {label:"DEPTH",value:"19.7 m (SIM)"},
  ];
  const before=structuredClone(boxes);
  const rows=planFcvNavRows(boxes,{x:0,y:0,width:320,height:640});
  assert.deepEqual(boxes,before,"NAV presentation must not rewrite typed values");
  assert.deepEqual(rows.map(row=>row.label),boxes.map(box=>box.label));
  assert.equal(rows.length,4);
  assert.equal(rows.filter(row=>row.separatorY!==null).length,3);
  assert.ok(rows.every((row,i)=>i===0 || row.y>=rows[i-1].y+rows[i-1].height-1e-9));
  assert.ok(rows.at(-1).y+rows.at(-1).height<=640);

  const speed=rows.find(row=>row.label==="SPEED (STW)");
  const position=rows.find(row=>row.label==="POSITION");
  const depth=rows.find(row=>row.label==="DEPTH");
  assert.ok(speed.valueFontPx>position.valueFontPx,
    "nav2.jpg shows numeric speed larger than coordinate text");
  assert.ok(depth.valueFontPx>speed.valueFontPx,
    "nav1/nav2 photos make DEPTH the dominant value");
  assert.deepEqual(position.valueLines,["SIM 10.5000°N","106.7500°E"]);
  assert.deepEqual(
    planFcvNavRows([{label:"POSITION",value:"NO DATA"}],{width:320,height:640})[0].valueLines,
    ["NO DATA"],
    "missing receiver data remains a single explicit NO DATA line",
  );
});

test("P04 web renderer consumes presentation plans and removes the invented zoom legend",async()=>{
  const app=await readFile(new URL("../web/app.mjs",import.meta.url),"utf8");
  const css=await readFile(new URL("../web/styles.css",import.meta.url),"utf8");
  assert.match(app,/planFcvDepthReadout/);
  assert.match(app,/planFcvNavRows/);
  assert.doesNotMatch(app,/fillText\("ZOOM: /,
    "2016 BL photos already identify BL-LF/BL-HF in the header and show no bottom legend");
  assert.match(css,/depth-indicator\[data-view="DUAL"\]/);
  assert.match(css,/--dual-depth-anchor/);
});
