import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createSession,dispatch} from "../src/core/session.mjs";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {TRAINING_SCENARIO as scenario} from "../src/core/scenario.mjs";
import {projectFcvMainMenu} from "../web/lcd-presentation.mjs";

const send=(s,e)=>dispatch(s,adapter,e,scenario);
function boot(){
  let s=createSession(adapter,scenario);
  for(const e of [{kind:"down",control:"power"},{kind:"up",control:"power",durationMs:100},
    {kind:"tick",steps:4}])s=send(s,e);
  return s;
}

test("P05 menu projection exposes two-column label/value data without changing atlas labels",()=>{
  const s=send(boot(),{kind:"press",control:"menu"});
  const view=projectFcvMainMenu(s.deviceState);
  assert.equal(view.localeConformance,"HOLD");
  assert.deepEqual(view.categories.map(x=>x.label),
    ["Sounder","Display","Alarm","Data","System"]);
  assert.equal(view.rows[0].label,"Pic. Advance");
  assert.equal(view.rows[0].valueText,"1x");
  assert.equal(view.rows[0].committedValue,"1x");
  assert.equal(view.rows[0].draftValue,null);
  assert.deepEqual(view.footerKeys,["▲/▼/◀/▶","ENTER","MENU/ESC"]);
});

test("P05 live renderer owns separate label/value cells and a bounded main-menu overlay",async()=>{
  const [app,css]=await Promise.all([
    readFile(new URL("../web/app.mjs",import.meta.url),"utf8"),
    readFile(new URL("../web/styles.css",import.meta.url),"utf8"),
  ]);
  const branch=app.slice(app.indexOf("function renderMainMenuChrome("),
    app.indexOf("function renderConfigurationChrome("));
  assert.match(branch,/lcd-menu-label/);
  assert.match(branch,/lcd-menu-value/);
  assert.match(branch,/displayOnlySyntheticValue\(item\.label\)/);
  assert.match(branch,/projected\.footerKeys/);
  assert.match(css,/\.lcd-overlay\[data-layout="main-menu"\][^{]*\{[^}]*height:\s*72%/s);
  assert.match(css,/\.lcd-overlay\[data-layout="main-menu"\]\s+\.lcd-menu-row[^{]*\{[^}]*grid-template-columns:/s);
  assert.match(css,/\.lcd-overlay\[data-layout="main-menu"\]\s+\.lcd-menu-value/);
});
