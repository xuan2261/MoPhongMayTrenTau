import test from "node:test";
import assert from "node:assert/strict";
import {shouldRouteFcvShortcut} from "../web/keyboard-shortcuts.mjs";

const target=(kind,id="")=>({
  closest:selector=>{
    if(selector.includes("button") && kind==="button")return {id};
    if(selector.includes("input") && ["input","select","textarea"].includes(kind))
      return {id};
    if(selector.includes("#gain-knob") && id==="gain-knob")return {id};
    if(selector.includes("#mode-knob") && id==="mode-knob")return {id};
    return null;
  },
});
const event=(key,kind,id="",repeat=false)=>({
  key,target:target(kind,id),repeat,
});

test("Escape works when a physical key retains keyboard focus",()=>{
  assert.equal(shouldRouteFcvShortcut(event("Escape","button","key-enter")),true);
  assert.equal(shouldRouteFcvShortcut(event("Escape","button","pad-right")),true);
  assert.equal(shouldRouteFcvShortcut(event("Escape","button","btn-score")),true);
  assert.equal(shouldRouteFcvShortcut(event("Escape","select","lesson-picker")),false);
});
test("Enter on a focused button is handled by its native click, not duplicated globally",()=>{
  assert.equal(shouldRouteFcvShortcut(event("Enter","button","key-enter")),false);
  assert.equal(shouldRouteFcvShortcut(event(" ","button","btn-reset")),false);
  assert.equal(shouldRouteFcvShortcut(event("Enter","body")),true);
  assert.equal(shouldRouteFcvShortcut(event("Enter","input")),false);
});
test("rotary arrows remain owned by focused knob and no key repeats are auto-dispatched",()=>{
  assert.equal(shouldRouteFcvShortcut(event("ArrowRight","button","mode-knob")),false);
  assert.equal(shouldRouteFcvShortcut(event("ArrowDown","button","gain-knob")),false);
  assert.equal(shouldRouteFcvShortcut(event("ArrowRight","button","key-menu")),true);
  assert.equal(shouldRouteFcvShortcut(event("Escape","button","key-menu",true)),false);
});
