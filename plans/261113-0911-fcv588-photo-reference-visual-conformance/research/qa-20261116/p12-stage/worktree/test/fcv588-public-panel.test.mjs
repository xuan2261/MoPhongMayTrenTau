import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const html = await readFile(new URL("../web/index.html", import.meta.url), "utf8");
const css = await readFile(new URL("../web/styles.css", import.meta.url), "utf8");

test("training face is independently styled to a public-reference proportion", () => {
  assert.match(html, /data-panel-reference="FCV588_PUBLIC_REFERENCE_ESTIMATE"/);
  assert.match(css, /--reference-face-width-mm:\s*233/);
  assert.match(css, /--reference-face-height-mm:\s*270/);
  assert.match(html, /width="480" height="640"/);
  assert.match(html, /PUBLIC REFERENCE \/ NOT HARDWARE VALIDATED \/ TRAINING ONLY/);
});

test("student physical controls are separate keys and instructor helpers remain outside the device", () => {
  for (const id of ["key-menu", "key-enter", "key-range", "key-mark", "key-func",
    "key-power", "gain-knob", "mode-knob",
    "pad-up", "pad-down", "pad-left", "pad-right"]) {
    assert.match(html, new RegExp('id="' + id + '"'), id + " missing physical control");
  }
  const facade = html.match(/<div class="device-frame"[\s\S]*?<\/div>\s*<aside class="training-panel">/)?.[0];
  assert.ok(facade, "device facade and instructor region must be distinct");
  assert.doesNotMatch(facade.split('<aside class="training-panel">')[0],
    /id="mode-plus"|id="gain-minus"/, "trainer rotary buttons cannot be on FCV face");
  assert.match(css, /:focus-visible/);
});

test("public overall-envelope art has independent support contours, an inert TrackPad center and rotary indicators",()=>{
  assert.match(css,/\.device-frame::before/,
    "support contours must be independently drawn, not copied from OEM images");
  assert.match(css,/\.device-frame::after/);
  assert.match(css,/\.pad::after/,
    "the TrackPad's inert center is visual art, not an extra ENTER button");
  assert.match(css,/\.knob::before/,
    "original rotary detent mark must be visible against the gunmetal face");
  assert.doesNotMatch(css,/url\(\s*["']?https?:/i,
    "device styling must not request protected remote imagery");
});

test("wide training workbench centers the full-sized reference face in its device column without shifting instructor controls onto the bezel",()=>{
  assert.match(css,/\.device-frame\s*\{[^}]*justify-self:\s*center;/s,
    "wide 2-column training layout must not leave the illustrated face anchored against its far-left edge");
  assert.match(css,/\.device-frame\s*\{[^}]*width:\s*100%;/s,
    "centering must preserve face size rather than triggering CSS shrink-to-fit");
  assert.match(css,/\.device-frame\s*\{[^}]*aspect-ratio:\s*233\s*\/\s*270;/s);
  assert.match(css,/\.device-frame\s*\{[^}]*max-width:\s*680px;/s);
  assert.match(html,/class="training-panel"/);
});

test("original face bounds its portrait LCD to manufacturer-public 128×171 against 233×270 reference proportions",()=>{
  assert.match(css,/--reference-lcd-width-mm:\s*128;/,
    "use public physical display estimate, never copied device pixels");
  assert.match(css,/--reference-lcd-height-mm:\s*171;/);
  assert.match(css,/\.lcd\s*\{[^}]*aspect-ratio:\s*128\s*\/\s*171;/s,
    "physical LCD aperture ratio must track the published 128:171 rectangle");
  // The old 24px padding proxy was tied to a two-column card layout rather
  // than an actual LCD measurement. Chrome retains the same numeric 128/233,
  // 171/270 and 128/171 bounds after the independent head/support redraw.
  assert.match(css,/\.display-housing\s*\{[^}]*width:\s*59%;/s,
    "the authored aperture allocation must be explicit and browser-measured");
  assert.match(css,/@media \(max-width: 700px\)\s*\{[\s\S]*?\.equipment\s*\{[^}]*padding-inline:\s*0;/,
    "phone training reflow must retain a readable enlarged LCD independent of bezel geometry");
});

test("physical labels and unpowered screen exclude application instructions",()=>{
  const header=html.split('<div class="bezel-header">')[1].split('</div>')[0];
  assert.doesNotMatch(header,/TRAINING MOCK-UP|FISH FINDER/);
  assert.match(html,/<div class="off-screen" id="off-screen"[^>]*><\/div>/,
    "power-off LCD must not paint a classroom startup prompt");
  const func=html.match(/<button[^>]*id="key-func"[^>]*>([^<]+)<\/button>/);
  assert.equal(func?.[1],"FUNC");
  const trainer=html.split('<aside class="training-panel">')[1];
  assert.match(trainer,/Nhấn POWER\/BRILL để khởi động/,
    "moving instructions out of the instrument may not remove operator help");
});

test("physical dial transforms are state-derived while seven mode labels stay non-interactive",async()=>{
  const app=await readFile(new URL("../web/app.mjs",import.meta.url),"utf8");
  const renderer=app.split('function renderPhysicalDialState(state) {')[1]
    .split('\nfunction render() {')[0];
  assert.match(app,/renderPhysicalDialState\(s\);/);
  assert.match(renderer,/state\.overlay\.candidate/);
  assert.match(renderer,/state\.manualGain/);
  assert.match(renderer,/state\.autoGainOffset/);
  assert.doesNotMatch(renderer,/dispatch\(|send\(|Date\.now|setInterval|setTimeout/,
    "presentation cannot own a second world clock, rotary counter or input log");
  assert.match(css,/transform:\s*rotate\(var\(--dial-angle,\s*0deg\)\)/);
  for(const label of ["NAV1","LF-ZOOM","LF","DUAL","HF","HF-ZOOM","NAV2"]){
    assert.equal(html.split('data-mode="'+label+'"').length-1,1,label);
  }
  assert.match(html,/<div class="mode-scale" aria-hidden="true">/);
  assert.match(css,/\.mode-scale\s*\{[^}]*pointer-events:\s*none;/s,
    "printed labels must not intercept a real rotary gesture");
});

test("instructor clock and synthetic run notices remain outside the FCV hardware face",()=>{
  const face=html.split('<aside class="training-panel">')[0];
  const trainer=html.split('<aside class="training-panel">')[1];
  assert.doesNotMatch(face,/id="(?:clock-line|status-line)"/,
    "the shared-world clock and instructor telemetry are not physical FCV annunciators");
  for(const id of ["clock-line","status-line"]){
    assert.match(trainer,new RegExp('id="'+id+'"'),
      id+" must be visibly owned by D15 instructor rather than the faceplate");
    assert.equal(html.split('id="'+id+'"').length-1,1);
  }
});

test("phone-specific non-OEM face warning precedes first operator input and LCD reflow",()=>{
  const warning=html.indexOf('class="mobile-training-note"');
  const equipment=html.indexOf('class="equipment"');
  const power=html.indexOf('id="key-power"');
  assert.ok(warning>0 && warning<equipment && warning<power,
    "the student must see training-geometry disclosure before interacting");
  assert.match(css,/@media \(max-width: 700px\)[\s\S]*?\.mobile-training-note\s*\{[^}]*display:\s*block;/,
    "phone-only disclosure must remain visible on the affected viewport");
});
