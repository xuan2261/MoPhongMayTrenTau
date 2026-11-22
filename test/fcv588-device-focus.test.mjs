import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const html=await readFile(new URL("../web/index.html",import.meta.url),"utf8");
const css=await readFile(new URL("../web/styles.css",import.meta.url),"utf8");
const app=await readFile(new URL("../web/app.mjs",import.meta.url),"utf8");

test("P06 device-focus toggle is external presentation state only",()=>{
  const toggleAt=html.indexOf('id="device-focus-toggle"');
  const deviceAt=html.indexOf('<div class="device-frame"');
  const trainerAt=html.indexOf('<aside class="training-panel">');
  assert.ok(toggleAt>0 && toggleAt<deviceAt,"focus control is outside and before the device face");
  assert.ok(deviceAt<trainerAt,"device remains before D15 instructor workspace");
  assert.match(html,/id="device-focus-toggle"[^>]*type="checkbox"/);
  assert.match(css,/:has\(#device-focus-toggle:checked\)/,
    "native checkbox drives only workspace presentation CSS");
  assert.doesNotMatch(app,/device-focus-toggle/,
    "focus mode does not enter session events, replay or reducer code");
});

test("P06 focus mode de-emphasizes D15 without hiding its five accessible tabs",()=>{
  assert.equal((html.match(/class="d15-tab" role="tab"/g)??[]).length,5);
  assert.match(css,/\.device-focus-control\s*\{/);
  assert.match(css,/\.training-panel:focus-within\s*\{[^}]*opacity:\s*1/s,
    "keyboard focus restores full D15 emphasis");
  const focusRules=css.match(/@media\s*\(min-width:\s*1241px\)[\s\S]*?(?=@media|$)/)?.[0]??"";
  assert.doesNotMatch(focusRules,/\.training-panel\s*\{[^}]*display:\s*none/s,
    "focus mode must not remove D15 from accessibility or tab order");
});

test("P06 focused D15 restores full opacity even when device-focus toggle is checked",()=>{
  // The checked workspace selector is more specific than a standalone
  // .training-panel:focus-within rule. Verify the explicit cascade override;
  // real Chrome checks the computed opacity as well.
  assert.match(css,
    /\.workbench:has\(#device-focus-toggle:checked\)\s+\.training-panel:focus-within\s*\{[^}]*opacity:\s*1\s*;[^}]*filter:\s*none/s);
});
