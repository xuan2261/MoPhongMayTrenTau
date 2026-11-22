import test from "node:test";
import assert from "node:assert/strict";
import {readFile, readdir, stat} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {dirname, resolve} from "node:path";

const planRoot = fileURLToPath(new URL("../plans/", import.meta.url));
const folders = (await readdir(planRoot)).filter(name =>
  name.endsWith("-fcv588-public-reference-complete-operator"));
assert.equal(folders.length, 1, "one public-reference plan should exist");
const planDir = resolve(planRoot, folders[0]);
const phaseFiles = (await readdir(planDir)).filter(n => /^phase-\d{2}-.*\.md$/.test(n)).sort();
const index = await readFile(resolve(planDir, "plan.md"), "utf8");
const evidence = await readFile(new URL("../docs/research/FCV588_PUBLIC_MEDIA_EVIDENCE_2026-10-13.md", import.meta.url), "utf8");
const uiAtlas = await readFile(new URL("../docs/research/FCV588_PUBLIC_UI_REFERENCE_MATRIX_2026-10-14.md", import.meta.url), "utf8");
const manifest = JSON.parse(await readFile(new URL("../sources/manuals/MANIFEST.json", import.meta.url), "utf8"));

test("new plan is separate from hardware-target plan and has seven executable phases", () => {
  assert.equal(phaseFiles.length, 7);
  assert.match(index, /status: pending/);
  assert.match(index, /prior hardware-target F1 plan/i);
  assert.match(index, /hardwareValidated=false/);
  assert.match(index, /firmwareInstalled=null/);
  assert.match(index, /PUBLIC_REFERENCE_CONFORMANT/);
  assert.match(index, /--deep/);
  assert.match(index, /--tdd/);
  assert.match(index, /--advice supervision cannot be claimed/);
  assert.doesNotMatch(index, /_Add a brief description|_TBD_|- \[ \] _TBD_/);
});

test("all phases carry deep scout, advice-compatible mechanical TDD and stop protocol", async () => {
  for (const file of phaseFiles) {
    const contents = await readFile(resolve(planDir, file), "utf8");
    assert.match(contents, /^status: todo$/m, file);
    assert.match(contents, /Deep Pre-execution Scout Gate/, file);
    assert.match(contents, /### Task \d+\.\d+/, file);
    assert.match(contents, /\*\*Goal:\*\*/, file);
    assert.match(contents, /\*\*Target:\*\*/, file);
    assert.match(contents, /\*\*Steps:\*\*/, file);
    assert.match(contents, /\*\*Success:\*\*/, file);
    assert.match(contents, /\*\*Verify:\*\*/, file);
    assert.match(contents, /RED/, file);
    assert.match(contents, /GREEN/, file);
    assert.match(contents, /REFACTOR/, file);
    assert.match(contents, /## Failure Protocol[\s\S]*?STOP this phase[\s\S]*?kongming[\s\S]*?STOP and report/, file);
    assert.match(contents, /npm run check/, file);
    assert.doesNotMatch(contents, /_Describe what this phase accomplishes_|- \[ \] Task A/, file);
  }
});

test("new plan has no broken local markdown relative references", async () => {
  const files = [resolve(planDir, "plan.md"), ...phaseFiles.map(f => resolve(planDir, f))];
  let checked = 0;
  for (const file of files) {
    const contents = await readFile(file, "utf8");
    for (const hit of contents.matchAll(/\]\((\.\.?\/[^)#]+)(?:#[^)]*)?\)/g)) {
      const destination = resolve(dirname(file), hit[1]);
      const result = await stat(destination).catch(() => null);
      assert.ok(result?.isFile(), file + " broken link: " + hit[1]);
      checked++;
    }
  }
  assert.ok(checked >= 10, "need real links to evidence and previous plan");
});

test("video/source research does not invent time-coded footage or installed firmware", () => {
  assert.match(evidence, /PUB-FCV-007/);
  assert.match(evidence, /PUB-FCV-008/);
  assert.match(evidence, /video.*TO_REVIEW|TO_REVIEW.*video/is);
  assert.match(evidence, /firmwareInstalled=null/);
  assert.match(evidence, /PUBLIC_DEMO_UNKNOWN_FW/);
  assert.match(evidence, /not.*hardware|hardware.*not/ig);
});

test("broken brochure links were replaced with a verified manufacturer PDF and honest source grades", () => {
  const brochure = manifest.entries.find(item => item.id === "FCV588_BROCHURE_FURUNO_USA");
  assert.equal(brochure?.pages, 6);
  assert.equal(brochure?.source_tier, "manufacturer");
  assert.equal(brochure?.type, "brochure_nonmanual_reference");
  assert.equal(brochure?.simulator_asset, false);
  assert.match(brochure?.sha256 || "", /^[a-f0-9]{64}$/);
  assert.match(evidence, /document_library\/documents\/brochures\/brochures\/fcv588_brochure\.pdf/);
  assert.doesNotMatch(evidence, /\]\(https:\/\/www\.furuno\.com\/files\/Brochure\/317\/upload\/FCV-588_E\.pdf\)/);
  assert.match(evidence, /NauticExpo.*403/s);
});

test("public-reference screen atlas distinguishes Demo controls from guarded features and video claims", async () => {
  const numbered = [...uiAtlas.matchAll(/^\| UI-\d{2}\s*\|/gm)];
  assert.equal(numbered.length, 14);
  assert.match(uiAtlas, /zero control-action frames|zero video frames|zero video frames have been authenticated/i);
  assert.match(uiAtlas, /all controls (?:remain )?operative/i);
  assert.match(uiAtlas, /virtual transducer/);
  const displayPhase = await readFile(resolve(planDir, "phase-04-sonar-views-and-advanced-functions.md"), "utf8");
  assert.match(displayPhase, /Demo.*controls remain operative|controls remain operative in Demo/s);
  // Match the actual reference rule, not a particular editorial phrase.
  // Demo keeps physical controls responsive; incompatible virtual types still
  // cannot activate advanced functions.
  assert.match(displayPhase, /controls remain operative in Demo; not every capability is enabled/i);
  assert.match(displayPhase, /Generic menu Type=\[600W\]\/\[1kW\] excludes all three/);
});
