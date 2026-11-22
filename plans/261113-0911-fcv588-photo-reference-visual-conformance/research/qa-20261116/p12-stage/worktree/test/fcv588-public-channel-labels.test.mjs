import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {getFcvDisplayPalette,getFcvLcdContrastTheme} from "../src/devices/fcv588/display-palette.mjs";
import {formatFcvDepth} from "../src/devices/fcv588/units.mjs";
import {projectFcvDepthTicks} from "../web/lcd-presentation.mjs";
import {rasterizeFcvEcho} from "../web/fcv588-echo-rasterizer.mjs";

// Execute the actual existing painter with a recording Canvas context. This
// tests label placement, not an invented copy of the drawing implementation.
const app=await readFile(new URL("../web/app.mjs",import.meta.url),"utf8");
const painter=app.slice(app.indexOf("function drawChannel("),app.indexOf("function sounderFrame("));
const compile=new Function("ctx","displayCanvas","displayCtx","session",
  "getFcvDisplayPalette","getFcvLcdContrastTheme","formatFcvDepth","lcdRgb",
  "projectFcvDepthTicks","rasterizeFcvEcho",
  painter+"\nreturn drawChannel;");

test("each sonar pane has five scale labels below header without invented per-pane kHz text",()=>{
  for(const [x0,width] of [[0,480],[0,240],[240,240],[320,160]]){
    const labels=[];
    const ctx={drawImage(){},fillRect(){},
      fillText(text,x,y){labels.push({text,x,y});}};
    const surface={createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)};},putImageData(){}};
    const draw=compile(ctx,{},surface,{deviceState:{settings:{units:"Metric"}}},
      getFcvDisplayPalette,getFcvLcdContrastTheme,formatFcvDepth,
      c=>"rgb("+c.join(",")+")",projectFcvDepthTicks,rasterizeFcvEcho);
    draw({columns:2,rows:2,pixels:new Uint8Array(4),frequencyKhz:50,
      startDepthM:0,rangeM:80},x0,0,width,640);
    assert.equal(labels.length,5,
      "0/20/40/60/80 stepped reference axis must replace 3 coarse marks");
    const scale=labels;
    assert.deepEqual(scale.map(label=>label.text),
      ["0 m","20 m","40 m","60 m","80 m"]);
    assert.ok(scale[0].y>=58,
      `top scale collides with status region in pane ${x0}/${width}: ${JSON.stringify(labels)}`);
    assert.ok(scale.every((item,i)=>i===0||item.y>scale[i-1].y));
    assert.ok(labels.every(label=>label.x>=x0 && label.x<x0+width));
  }
});
