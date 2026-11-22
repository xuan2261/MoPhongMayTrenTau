import test from "node:test";
import assert from "node:assert/strict";
import {bindRotaryDragControl} from "../web/rotary-input.mjs";

class RotaryButton extends EventTarget {
  captured=[];
  setPointerCapture(id){this.captured.push(id);}
}
function dispatch(target,type,values={}){
  const event=new Event(type,{cancelable:true});
  for(const [key,value] of Object.entries(values)){
    Object.defineProperty(event,key,{value});
  }
  target.dispatchEvent(event);
  return event;
}
function rig(control="mode"){
  const button=new RotaryButton();
  const windowTarget=new EventTarget();
  const inputs=[];
  const binding=bindRotaryDragControl({button,control,
    emit:value=>inputs.push(value),windowTarget,stepPixels:18});
  return {button,windowTarget,inputs,binding};
}
const move=(r,id,y)=>dispatch(r.button,"pointermove",{pointerId:id,clientY:y});
const down=(r,id,y)=>dispatch(r.button,"pointerdown",{
  button:0,isPrimary:true,pointerId:id,clientY:y});

test("touch/pen/mouse rotary drag emits bounded signed device detents, not UI-only paint",()=>{
  const r=rig("mode");
  down(r,5,150);
  assert.deepEqual(r.button.captured,[5]);
  move(r,5,140);
  assert.deepEqual(r.inputs,[],"below dead-zone must not change MODE");
  move(r,5,112);
  assert.deepEqual(r.inputs,[{kind:"rotate",control:"mode",steps:2}]);
  move(r,5,148);
  assert.deepEqual(r.inputs.at(-1),{kind:"rotate",control:"mode",steps:-1});
  dispatch(r.button,"pointerup",{pointerId:5});
  assert.equal(r.binding.suppressClick({detail:1}),true);
  assert.equal(r.binding.suppressClick({detail:0}),false);
  move(r,5,100);
  assert.equal(r.inputs.length,2);
  r.binding.dispose();
});

test("rotary capture cancel, blur and pointer identity never rotate an inactive knob",()=>{
  const r=rig("gain");
  down(r,2,90);
  down(r,3,90);
  move(r,3,30);
  assert.equal(r.inputs.length,0);
  dispatch(r.button,"pointercancel",{pointerId:2});
  move(r,2,20);
  assert.equal(r.inputs.length,0);
  down(r,4,110);
  dispatch(r.button,"lostpointercapture",{pointerId:4});
  move(r,4,45);
  assert.equal(r.inputs.length,0);
  down(r,5,110);
  dispatch(r.windowTarget,"blur");
  move(r,5,25);
  assert.equal(r.inputs.length,0);
  assert.equal(r.binding.cancel(),false);
  r.binding.dispose();
});

test("GAIN short tap retains push semantics; a dragged knob must not accidentally push",()=>{
  const r=rig("gain");
  down(r,3,100);
  dispatch(r.button,"pointerup",{pointerId:3});
  assert.equal(r.binding.suppressClick({detail:1}),false);
  down(r,4,100);
  move(r,4,55);
  dispatch(r.button,"pointerup",{pointerId:4});
  assert.equal(r.binding.suppressClick({detail:1}),true);
  assert.deepEqual(r.inputs,[{kind:"rotate",control:"gain",steps:2}]);
  assert.equal(r.binding.suppressClick({detail:0}),false,
    "keyboard/screen-reader activation remains available");
  r.binding.dispose();
});

test("GAIN rotation canceled by native lostpointercapture or pointercancel cannot leak a later click as push",()=>{
  const r=rig("gain");
  down(r,11,120);
  move(r,11,81);
  assert.deepEqual(r.inputs,[{kind:"rotate",control:"gain",steps:2}]);
  dispatch(r.button,"lostpointercapture",{pointerId:99});
  dispatch(r.button,"lostpointercapture",{pointerId:11});
  dispatch(r.button,"pointerup",{pointerId:11});
  assert.equal(r.binding.suppressClick({detail:1}),true,
    "capture loss cannot turn an already-performed rotation into a GAIN push");
  assert.equal(r.binding.suppressClick({detail:0}),false,
    "screen reader activation must remain independently available");
  down(r,12,100);
  move(r,12,70);
  dispatch(r.button,"pointercancel",{pointerId:12});
  assert.equal(r.binding.suppressClick({detail:1}),true,
    "touch cancellation after detents must not allow a synthetic push");
  down(r,13,100);
  dispatch(r.button,"pointerup",{pointerId:13});
  assert.equal(r.binding.suppressClick({detail:1}),false,
    "a new distinct short pointer tap still performs GAIN push");
  r.binding.dispose();
});

test("rotary capture rejection and disposal fail closed",()=>{
  const r=rig();
  r.button.setPointerCapture=()=>{throw new Error("capture denied");};
  down(r,9,110);
  move(r,9,0);
  assert.deepEqual(r.inputs,[]);
  r.button.setPointerCapture=()=>{};
  down(r,10,110);
  r.binding.dispose();
  move(r,10,0);
  assert.deepEqual(r.inputs,[]);
});
