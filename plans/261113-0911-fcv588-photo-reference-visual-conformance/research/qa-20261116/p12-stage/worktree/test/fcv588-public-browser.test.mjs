import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const [html,css,app,server,presentation]=await Promise.all([
  readFile(new URL("../web/index.html",import.meta.url),"utf8"),
  readFile(new URL("../web/styles.css",import.meta.url),"utf8"),
  readFile(new URL("../web/app.mjs",import.meta.url),"utf8"),
  readFile(new URL("../tools/server.mjs",import.meta.url),"utf8"),
  readFile(new URL("../web/lcd-presentation.mjs",import.meta.url),"utf8"),
]);

test("lesson picker and score action are labeled and instructor-only",()=>{
  assert.match(html,/<label[^>]+for="lesson-picker"/);
  assert.match(html,/<select[^>]+id="lesson-picker"/);
  assert.match(html,/id="btn-score"/);
  assert.match(html,/id="btn-start-lesson"/);
  const panel=html.split('<aside class="training-panel">');
  assert.equal(panel.length,2);
  assert.doesNotMatch(panel[0],/id="lesson-picker"|id="btn-score"/);
  assert.match(app,/assessFcvLesson/);
  assert.match(app,/FCV588_TRAINING_LESSONS/);
  assert.match(app,/startSeq:/);
  assert.match(app,/lessonAttempt/);
});

test("physical keyboard, responsive portrait, focus and training warning are still explicit",()=>{
  assert.match(html,/PUBLIC REFERENCE \/ NOT HARDWARE VALIDATED \/ TRAINING ONLY/);
  assert.match(html,/<canvas id="echo-canvas" width="480" height="640"/);
  assert.match(css,/:focus-visible/);
  assert.match(css,/@media \(max-width: 700px\)/);
  assert.match(app,/Escape: \(\) => press\("menu"\)/);
  assert.match(app,/document\.addEventListener\("keydown"/);
});

test("BRILL changes the entire LCD luminance and depth units are display-only",()=>{
  assert.match(html,/id="depth-unit"/,"depth unit suffix must be separately updated");
  assert.match(app,/formatFcvDepth/,"depth annotation must follow System > Units");
  assert.match(app,/convertFcvDepth/,"LCD numeric indicator must follow units");
  assert.match(app,/\$\("lcd"\)\.style\.filter\s*=\s*"brightness\("/,
    "0–9 BRILL must change rendered LCD appearance, not only state text");
});

test("Demo Off never draws a fictitious live sonar trace without a virtual fixture",()=>{
  assert.match(app,/shouldRenderFcvSonar/);
  assert.match(app,/NO SONAR DATA/);
});

test("Depth Size has a real LCD readout-size projection instead of a saved-only menu choice",()=>{
  assert.match(app,/dataset\.size\s*=\s*state\.settings\.depthSize/);
  assert.match(css,/\.depth-indicator\[data-size="Small"\]\s+strong/);
  assert.match(css,/\.depth-indicator\[data-size="Medium"\]\s+strong/);
  assert.match(css,/\.depth-indicator\[data-size="Large"\]\s+strong/);
});

test("runtime remains localhost only and cannot statically expose documents",()=>{
  assert.match(server,/const HOST = "127\.0\.0\.1"/);
  assert.match(server,/connect-src 'none'/);
  assert.match(server,/decoded\.startsWith\("\/web\/"\)/);
  assert.match(server,/decoded\.startsWith\("\/src\/"\)/);
  assert.doesNotMatch(server,/decoded\.startsWith\("\/sources\/"\)/);
  assert.doesNotMatch(app,/(?:WebSocket|navigator\.serial|navigator\.usb|fetch\("https?:)/);
});

test("Chrome QA runner explicitly exercises native touchcancel and lostpointercapture during a real hold",async()=>{
  const runner=await readFile(new URL(
    "../tools/fcv588_chrome_viewport_acceptance.py",import.meta.url),"utf8");
  assert.match(runner,/dispatchTouchEvent/,
    "real Chrome CDP touch-start/cancel is needed; Node event simulation alone cannot claim browser PASS");
  assert.match(runner,/touchCancel/);
  assert.match(runner,/releasePointerCapture/,
    "release native pointer capture after an actual browser pointerdown");
  assert.match(runner,/ACTUAL_POINTER_CANCEL_AND_CAPTURE_RELEASE_PASS/);
});

test("Chrome acceptance refuses stale served source and attests clean isolated storage",async()=>{
  const runner=await readFile(new URL(
    "../tools/fcv588_chrome_viewport_acceptance.py",import.meta.url),"utf8");
  assert.match(runner,/def verify_served_source\(/,
    "browser PASS must be bound to the actual served source bytes");
  assert.match(runner,/verify_served_source\(args\.url\)/,
    "source verification must be mandatory, not an unused helper");
  assert.match(runner,/sha256\(/,
    "served bytes must match a digest of this workspace's source");
  assert.match(runner,/preScenarioStorageKeys/,
    "browser receipt must attest an empty initial isolated localStorage");
  assert.match(runner,/SOURCE_TREE_IDENTITY_PASS/,
    "the receipt should distinguish source identity from viewport layout");
  assert.match(runner,/SOURCE_TREE_STABLE_PASS/,
    "the receipt must fail if served JS/CSS changes during the Chrome run");
  assert.match(runner,/FAIL_SOURCE_TREE_IDENTITY/,
    "a preflight error must replace a stale prior PASS receipt with FAIL");
});

test("Chrome QA binds bytes actually loaded by the browser, not just pre/post HEAD checks",async()=>{
  const runner=await readFile(new URL(
    "../tools/fcv588_chrome_viewport_acceptance.py",import.meta.url),"utf8");
  assert.match(runner,/def verify_browser_loaded_source\(/,
    "each Chrome response body must match the preflight source manifest");
  assert.match(runner,/page\.on\("requestfinished",\s*record_request_finished\)/,
    "hash bytes while each actual browser request completes, before navigation or reload can discard them");
  assert.match(runner,/verify_browser_loaded_source\(\s*body_records/,
    "the body verification helper must run on actual captured Chrome bytes");
  assert.match(runner,/BROWSER_LOADED_SOURCE_BYTES_PASS/,
    "per-viewport PASS requires browser-loaded source integrity evidence");
});

test("long FCV menus expose the selected item and scroll within the LCD without unsafe HTML",()=>{
  assert.match(app,/className\s*=\s*"lcd-menu-row"/);
  assert.match(app,/setAttribute\("aria-current","true"\)/);
  assert.match(app,/content\.replaceChildren\(/,
    "menu rows must be rendered using safe original DOM nodes");
  assert.match(app,/content\.scrollTop\s*[+-]?=/,
    "operator cannot lose the cursor below a clipped Data/System menu");
  assert.doesNotMatch(app,/innerHTML\s*=/);
});

test("LCD modal stays bounded by its screen, so a long menu can scroll at narrow viewports",()=>{
  assert.match(css,/\.lcd-overlay\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;[^}]*max-height:\s*\d+%;/s,
    "LCD menu parent must be flex-bounded, not only its child scrollport");
  assert.match(css,/\.lcd-overlay-content\s*\{[^}]*min-height:\s*0;[^}]*overflow-y:\s*auto;/s,
    "dialog content must be allowed to shrink and scroll within the bounded parent");
  assert.match(css,/@media \(max-width: 700px\)\s*\{[\s\S]*?\.lcd-overlay\s*\{[^}]*max-height:\s*\d+%;/,
    "mobile layout cannot let the overlay escape the LCD bottom edge");
});

test("menu conveys source and rights HOLD separately from an unavailable capability",()=>{
  assert.doesNotMatch(presentation,/\[HOLD\]|\[N\/A\]/,
    "instructor-only status tags must not become invented OEM-facing pixels");
  assert.match(presentation,/disabledReason/,
    "source/capability reasons must stay available for the instructor");
  assert.match(presentation,/sourceStatus/,
    "a disabled row must retain its typed source classification");
  assert.match(app,/row\.setAttribute\("aria-disabled","true"\)/,
    "unavailable operator rows must retain semantic disabled state");
  assert.match(html,/id="source-cue"[^>]*role="note"/,
    "source and rights warnings must appear outside the device face");
  assert.match(app,/publishInstructorGuidance\(/,
    "source/capability help must be shown through the separate trainer UI");
  assert.match(app,/projectFcvMainMenu\(session\.deviceState\)/,
    "the source-graded projection must be consumed by the actual renderer");
});

test("phone training reflow explicitly avoids OEM geometry and protects large physical/D15 touch targets",async()=>{
  assert.match(html,/class="mobile-training-note"/,
    "narrow-viewport changes must be labeled as training layout, not real OEM geometry");
  assert.match(css,/\.device-frame\s*\{\s*aspect-ratio:\s*auto;/,
    "the phone training face must reflow without crushing its portrait LCD");
  assert.match(css,/\.pad\s*\{\s*width:\s*160px;\s*height:\s*160px;/);
  assert.match(css,/\.hardware-key\s*\{\s*min-height:\s*44px;/);
  assert.match(css,/\.lesson-panel select,\s*\.lesson-panel button\s*\{[^}]*min-height:\s*44px;/);
  assert.match(css,/\.trainer-rotate\s*\{[^}]*min-height:\s*44px;/,
    "teacher GAIN/MODE +/- hit targets must also meet the 44px mobile requirement");
  assert.match(css,/\.trainer-buttons button\s*\{[^}]*min-height:\s*44px;/,
    "D15 pause, step, reset and replay inputs must be >=44px on touch phones");
  assert.doesNotMatch(css,/\.training-panel h3,\s*\.device-roadmap\s*\{/,
    "a broad h3 selector can generate phantom columns in nested D15 forms");
  const runner=await readFile(new URL(
    "../tools/fcv588_mobile_viewport_acceptance.py",import.meta.url),"utf8");
  assert.match(runner,/SIZES\s*=\s*\(\(360, 800\), \(390, 844\)\)/);
  assert.match(runner,/is_mobile=True/);
  assert.match(runner,/touchMinCssPx/);
  assert.match(runner,/INSTRUCTOR_TOUCH_CONTROLS/,
    "phone acceptance must inspect every D15 teacher input, not only lesson controls");
  for(const id of ["gain-minus","gain-plus","mode-minus","mode-plus",
    "btn-pause","btn-step","btn-reset","btn-replay",
    "btn-nav-fixture","btn-mount-fixture","btn-tankenmaru-fixture",
    "btn-battery-fixture","btn-error-fixture",
    "lesson-picker","btn-start-lesson","btn-score"]){
    assert.ok(runner.includes(`"${id}"`),`phone QA must measure ${id}`);
  }
  assert.match(runner,/verify_browser_loaded_source\(/,
    "mobile Chrome must hash actual browser-loaded bodies like desktop Chrome");
});

test("Chrome covers long-menu cursor visibility and source-dependent §1.21 Data choices",async()=>{
  const runner=await readFile(new URL(
    "../tools/fcv588_chrome_viewport_acceptance.py",import.meta.url),"utf8");
  assert.match(runner,/ACTUAL_LONG_MENU_CURSOR_VISIBLE_PASS/);
  assert.match(runner,/ACTUAL_C11_DATA_SOURCE_SELECTION_PASS/);
  assert.match(runner,/ACTUAL_D15_C11_DATA_SOURCE_LESSON_PASS/);
  assert.match(runner,/cursor\.bounding_box\(\)/,
    "LCD menu selection must be visually inside its scrollport, not only saved state");
});

test("low-height desktop browser verifies every physical key is vertically scroll-reachable without squashing source-based face ratio",async()=>{
  const runner=await readFile(new URL(
    "../tools/fcv588_chrome_viewport_acceptance.py",import.meta.url),"utf8");
  assert.match(runner,/DESKTOP_ALL_PHYSICAL_CONTROLS_SCROLL_REACHABLE_PASS/);
  assert.match(runner,/scroll_into_view_if_needed\(/);
  assert.match(runner,/scrollHeight.*face|face.*scrollHeight/s);
  assert.match(runner,/SOURCE_GRADED_128x171_LCD_TO_233x270_FACE_RATIO_PASS/);
});

test("phone Chrome covers the optional D09 details and MENU/ESC return using native touch",async()=>{
  const runner=await readFile(new URL(
    "../tools/fcv588_mobile_viewport_acceptance.py",import.meta.url),"utf8");
  assert.match(runner,/ACTUAL_PHONE_D09_DETAILS_RETURN_AND_REVOKE_PASS/,
    "mobile QA must not PASS a trapped modal even when every hit target measures 44px");
  assert.match(runner,/"#btn-tankenmaru-fixture"\)\.tap\(\)/,
    "Tankenmaru option must be declared through real teacher touch");
  assert.match(runner,/"#key-menu"\)\.tap\(\)/,
    "the real MENU/ESC touch action must close the optional details overlay");
  assert.match(runner,/Tankenmaru Details/,
    "mobile test must select the actual optional menu row");
});

test("V22 real Chrome verifies D15 receiver-absence scoring, B19 light-palette readability and actual centered desktop bezel",async()=>{
  const desktop=await readFile(new URL(
    "../tools/fcv588_chrome_viewport_acceptance.py",import.meta.url),"utf8");
  assert.match(desktop,/ACTUAL_D15_D14_RECEIVER_ABSENCE_LESSON_PASS/,
    "lesson 05 must be scored through actual physical-key Chrome inputs");
  assert.match(desktop,/ACTUAL_B19_WHITE_PALETTE_LEGIBILITY_PASS/,
    "White palette must be visibly inspected under Chrome, not only unit-tested");
  assert.match(desktop,/desktop reference face not centered/i,
    "desktop browser must measure the face against its wide workbench column");
  const phone=await readFile(new URL(
    "../tools/fcv588_mobile_viewport_acceptance.py",import.meta.url),"utf8");
  assert.match(phone,/ACTUAL_PHONE_B19_WHITE_PALETTE_READABLE_PASS/,
    "mobile Chrome should verify light LCD ink after real touch selection");
});
