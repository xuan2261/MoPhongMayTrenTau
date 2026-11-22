import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFile} from "node:fs/promises";
import {getFcvDisplayPalette} from "../src/devices/fcv588/display-palette.mjs";
import {advanceFcvPictureHistory} from "../src/devices/fcv588/echo-projection.mjs";
import {rasterizeFcvEcho} from "../web/fcv588-echo-rasterizer.mjs";

const digest=a=>createHash("sha256").update(a).digest("hex");
const white=getFcvDisplayPalette({palette:"White",colors:"8"});
const mk=(frequencyKhz=50,columns=48,rows=80)=>{
  const pixels=new Uint8Array(columns*rows);
  for(let x=0;x<columns;x++){
    const at=47+Math.round(2*Math.sin(x/5));
    pixels[at*columns+x]=230;
    pixels[(at+1)*columns+x]=160;
    pixels[(at+2)*columns+x]=80;
  }
  return {frequencyKhz,columns,rows,pixels,rangeM:80,startDepthM:0,
    bottomDepthM:47/79*80,synthetic:true,overlays:{},
    projectionKey:"photo-training"};
};
const countZone=(out,lo,hi,palette=white)=>{
  const bg=palette[0].join(",");
  let n=0;
  for(let y=Math.floor(out.height*lo);y<Math.floor(out.height*hi);y++)
    for(let x=0;x<out.width;x++){
      const i=(y*out.width+x)*4;
      if([out.data[i],out.data[i+1],out.data[i+2]].join(",")!==bg)n++;
    }
  return n;
};

test("P03 raster must be display-only, deterministic, bounded and leave source untouched",()=>{
  const frame=mk();
  const before=digest(frame.pixels);
  const first=rasterizeFcvEcho(frame,white);
  const second=rasterizeFcvEcho(frame,white);
  assert.equal(first.width,frame.columns*2);
  assert.equal(first.height,frame.rows*4);
  assert.equal(first.data.length,first.width*first.height*4);
  assert.ok(first.data instanceof Uint8ClampedArray);
  assert.equal(digest(first.data),digest(second.data));
  assert.equal(digest(frame.pixels),before);
  assert.equal(first.sourceClass,"SYNTHETIC_DISPLAY_ONLY");
  assert.equal(first.hardwareValidated,false);
  assert.ok(first.data.every((v,i)=>i%4!==3||v===255));
});

test("P03 LF surface clutter comes from explicit synthetic display-art profile, not a fake receiver",()=>{
  const lf=mk(50),hf=mk(200);
  const a=rasterizeFcvEcho(lf,white,{clutterPct:0});
  const b=rasterizeFcvEcho(hf,white,{clutterPct:0});
  const lfTop=countZone(a,0,.16),hfTop=countZone(b,0,.16);
  assert.ok(lfTop>a.width*12,`LF near-surface texture absent: ${lfTop}`);
  assert.ok(lfTop>hfTop*4,`frequency surface imagery indistinct: LF=${lfTop}, HF=${hfTop}`);
  const cleaned=rasterizeFcvEcho(lf,white,{clutterPct:100});
  assert.ok(countZone(cleaned,0,.16)<lfTop/5);
  assert.equal(countZone(a,.25,.4),0,"do not add fish away from typed echo/bottom");
});

test("P03 seabed has contiguous strong core and graded tail below each typed bottom column",()=>{
  const input=mk();
  const out=rasterizeFcvEcho(input,white,{clutterPct:100});
  // Full-width colored bottom core but no fabricated water-column fish.
  assert.ok(countZone(out,.55,.7)>out.width*9);
  assert.equal(countZone(out,.25,.4),0);
  const x=Math.floor(out.width/2);
  const line=[];
  for(let y=Math.floor(out.height*.56);y<out.height*.72;y++){
    const i=(y*out.width+x)*4;
    line.push([out.data[i],out.data[i+1],out.data[i+2]].join(","));
  }
  assert.ok(new Set(line.filter(color=>color!==white[0].join(","))).size>=3,
    "the echo bottom needs multilayer colored leading edge and trailing tail");
});

test("P03 blank input, TX Off and fish-only input must not invent surface or bottom signal",()=>{
  for(const frame of [mk(50),mk(200)]){
    frame.pixels.fill(0);
    const out=rasterizeFcvEcho(frame,white);
    assert.equal(countZone(out,0,1),0);
  }
  const fish=mk(50);fish.pixels.fill(0);
  fish.pixels[24*fish.columns+24]=250;
  const out=rasterizeFcvEcho(fish,white);
  assert.equal(countZone(out,0,.2),0);
  assert.ok(countZone(out,.2,.4)>0);
  assert.equal(countZone(out,.6,.8),0);
});

test("P03 a coherent midwater return must not be mistaken for seabed without matching typed bottom depth",()=>{
  const f=mk(50);
  f.pixels.fill(0);
  for(let x=0;x<f.columns;x++){
    f.pixels[35*f.columns+x]=230;
    f.pixels[36*f.columns+x]=160;
  }
  f.bottomDepthM=72; // typed training bottom is much deeper than the mid-water band
  const out=rasterizeFcvEcho(f,white);
  assert.equal(countZone(out,0,.16),0,
    "do not invent near-surface clutter merely because fish-like returns cross most columns");
  assert.equal(countZone(out,.52,.72),0,
    "do not append an invented bottom tail below a mid-water return");
});

test("P03 without typed bottom depth never adds a synthetic seabed or near-surface layer",()=>{
  const f=mk(50);
  delete f.bottomDepthM;
  const out=rasterizeFcvEcho(f,white);
  assert.equal(countZone(out,0,.16),0);
  assert.ok(countZone(out,.55,.7)>0,
    "real source echo samples must remain drawable without an art overlay");
});

test("P03 stops hold byte-stable raster, drawing not tied to advancing sourceTick",()=>{
  const src=mk();
  const stop={settings:{pictureAdvance:"Stop",txRate:"10"}};
  const first=advanceFcvPictureHistory(null,src,stop,10);
  const later=advanceFcvPictureHistory(first,src,stop,30);
  assert.equal(digest(first.pixels),digest(later.pixels));
  assert.equal(digest(rasterizeFcvEcho(first,white).data),
    digest(rasterizeFcvEcho(later,white).data));
});

test("P03 white/blue and 8/16 entries remain bounded, and invalid buffers fail closed",()=>{
  const src=mk();
  for(const name of ["White","Blue","Black","Mono","Night"]){
    for(const colors of ["8","16"]){
      const pal=getFcvDisplayPalette({palette:name,colors});
      const out=rasterizeFcvEcho(src,pal);
      assert.ok(out.data.length>src.pixels.length);
      assert.ok(out.data.every((n,i)=>i%4===3||n>=0&&n<=255));
    }
  }
  assert.throws(()=>rasterizeFcvEcho({...src,rangeM:0},white),/range|depth/i);
  assert.throws(()=>rasterizeFcvEcho({...src,columns:10000},white),/columns|buffer/i);
  assert.throws(()=>rasterizeFcvEcho(src,[]),/palette/i);
});

test("P03 live canvas uses the owned view-only raster, preserving screen annotation path",async()=>{
  const app=await readFile(new URL("../web/app.mjs",import.meta.url),"utf8");
  assert.match(app,/rasterizeFcvEcho\(/);
  assert.match(app,/displayCanvas\.width\s*=\s*raster\.width/);
  assert.match(app,/displayCanvas\.height\s*=\s*raster\.height/);
  assert.match(app,/displayCtx\.putImageData/);
  assert.doesNotMatch(app,/drawImage\([^\n]*\.jpg/);
  assert.match(app,/bottomDepthM\s*:\s*observation\.bottomDepthM/,
    "the raster must receive actual typed synthetic bottom provenance, not guess it from any wide return");
});

