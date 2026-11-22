import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const css = await readFile(new URL("../web/styles.css", import.meta.url), "utf8");
const html = await readFile(new URL("../web/index.html", import.meta.url), "utf8");

function rule(selector) {
  const escaped=selector.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  return css.match(new RegExp(escaped+"\\s*\\{([^}]*)\\}","s"))?.[1] ?? "";
}

function percent(body, property) {
  const value=body.match(new RegExp(property+"\\s*:\\s*([0-9.]+)%"))?.[1];
  assert.ok(value, property+" must be expressed as a normalized percentage");
  return Number(value);
}

function px(body, property) {
  const value=body.match(new RegExp(property+"\\s*:\\s*([0-9.]+)px"))?.[1];
  assert.ok(value, property+" must be expressed in CSS pixels for the original training artwork");
  return Number(value);
}

test("P06 face keeps the observed LCD-left / narrow-control-right relationship",()=>{
  const display=rule(".display-housing");
  const controls=rule(".controls");
  const displayLeft=percent(display,"left");
  const displayWidth=percent(display,"width");
  const controlsLeft=percent(controls,"left");
  const controlsWidth=percent(controls,"width");
  assert.ok(displayLeft>=5 && displayLeft<=7,"LCD housing remains inset from the left edge");
  assert.equal(displayWidth,59,
    "preserve the existing browser-measured 59% LCD aperture allocation until a lawful ROI rebaseline exists");
  assert.ok(controlsLeft>=72.5 && controlsLeft<=74,"controls stay in the narrow right column");
  assert.ok(controlsWidth>=19.5 && controlsWidth<=22,"right control column remains narrow");
  assert.ok(displayLeft+displayWidth < controlsLeft,
    "LCD housing and control column retain a visible faceplate gutter");
});

test("P06 right-column pad, keys and rotary knobs use restrained photo-informed proportions",()=>{
  const pad=rule(".pad");
  const knob=rule(".knob");
  assert.ok(px(pad,"width")>=82 && px(pad,"width")<=90,"TrackPad diameter stays bounded");
  assert.equal(px(pad,"width"),px(pad,"height"),"TrackPad remains circular");
  assert.ok(px(knob,"width")>=56 && px(knob,"width")<=61,"rotary knob diameter stays bounded");
  assert.equal(px(knob,"width"),px(knob,"height"),"rotary knobs remain circular");
  assert.match(css,/\.key-row\s+\.hardware-key\s*\{[^}]*border-radius:\s*999px/s,
    "RANGE/MARK/FUNC use the observed pill-like silhouette");
  for(const id of ["key-menu","pad-up","pad-left","pad-right","pad-down","key-enter",
    "key-range","key-mark","key-func","gain-knob","mode-knob","key-power"]){
    assert.equal((html.match(new RegExp('id="'+id+'"',"g"))??[]).length,1,id+" remains a native unique control");
  }
});

test("P06 original reference photos remain reference-only and are not served artwork",()=>{
  // Text comments may name the evidence photo. What must never happen is a
  // served image reference or CSS background that copies the reference bytes.
  assert.doesNotMatch(css,/url\([^)]*(?:FCV588_GiaoDienThucTeMay2016|giaoDien\.jpg|(?:lf|hf|dual|zoom2?|nav1|nav2)\.jpg)/i);
  assert.doesNotMatch(html,/<(?:img|source)\b[^>]*(?:FCV588_GiaoDienThucTeMay2016|giaoDien\.jpg|(?:lf|hf|dual|zoom2?|nav1|nav2)\.jpg)/i);
  assert.match(html,/data-panel-reference="FCV588_PUBLIC_REFERENCE_ESTIMATE"/);
});
