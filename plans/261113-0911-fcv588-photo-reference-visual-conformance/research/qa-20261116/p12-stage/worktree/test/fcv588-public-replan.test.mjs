import test from "node:test";
import assert from "node:assert/strict";
import {readFile, readdir, stat} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {resolve, dirname} from "node:path";

const ROOT = fileURLToPath(new URL("../plans/", import.meta.url));
const names = (await readdir(ROOT)).filter(name =>
  name.endsWith("-fcv588-public-reference-deep-tdd-advice-v2"));
assert.equal(names.length, 1, "v2 replan must be a unique AgentKit scaffold");
const PLAN_DIR = resolve(ROOT, names[0]);
const phaseNames = (await readdir(PLAN_DIR)).filter(name =>
  /^phase-\d{2}-.*\.md$/.test(name)).sort();
const files = ["plan.md", ...phaseNames];
const texts = await Promise.all(files.map(name =>
  readFile(resolve(PLAN_DIR, name), "utf8")));

test("v2 public reference replan is separately scaffolded with seven real phases", async () => {
  assert.equal(phaseNames.length, 7);
  // AgentKit legitimately transitions pending -> in-progress -> completed
  // without changing the plan identity. Never accept unknown/cancelled as an
  // active execution state, and never allow a false completed declaration.
  const status = texts[0].match(/^status: (.+)$/m)?.[1];
  assert.ok(["pending", "in-progress", "completed"].includes(status),
    "plan must use a valid execution lifecycle state");
  const unchecked = texts.slice(1).reduce((n, body) =>
    n + [...body.matchAll(/^- \[ \]/gm)].length, 0);
  const checked = texts.slice(1).reduce((n, body) =>
    n + [...body.matchAll(/^- \[[xX]\]/gm)].length, 0);
  assert.ok(checked + unchecked > 0, "plan must have tracked work");
  if (status === "pending") assert.equal(checked, 0, "pending cannot assert task completion");
  if (status === "completed") assert.equal(unchecked, 0, "completed must have no unfinished work");
  assert.match(texts[0], /Public Reference F1/i);
  assert.match(texts[0], /Previous plan preserved for audit/i);
  assert.match(texts[0], /Deep adaptation:/);
  assert.match(texts[0], /TDD adaptation:/);
  assert.match(texts[0], /Advice adaptation:/);
  assert.match(texts[0], /do not claim literal native \/ak-plan/i);
  const scout = resolve(PLAN_DIR, "reports/phase-01-scout.md");
  assert.ok((await stat(scout)).isFile(), "Deep Phase1 scout report must exist");
});

test("all seven phases provide future scout, inventory, scenario and stop gates", () => {
  for (let i = 1; i < texts.length; i++) {
    const phase = phaseNames[i - 1];
    const doc = texts[i];
    const phaseStatus = doc.match(/^status: (.+)$/m)?.[1];
    assert.ok(["todo", "in-progress", "completed"].includes(phaseStatus), phase + " phase lifecycle");
    const pendingItems = [...doc.matchAll(/^- \[ \]/gm)].length;
    // AgentKit check owns checkbox progress but does not necessarily rewrite
    // phase frontmatter in the same operation. A 'todo' frontmatter can have
    // checked work; only 'completed' is a strong assertion requiring zero open items.
    if (phaseStatus === "completed") assert.equal(pendingItems, 0, phase + " completed cannot have unchecked items");
    assert.match(doc, /Deep Pre-execution Scout Gate/i, phase);
    assert.match(doc, /file inventory/i, phase);
    assert.match(doc, /scenario matrix/i, phase);
    assert.match(doc, /Tests Before/i, phase);
    assert.match(doc, /Refactor.*Tests After|Refactor \/ Tests After/i, phase);
    assert.match(doc, /## Failure Protocol[\s\S]*?STOP this phase[\s\S]*?kongming[\s\S]*?STOP and report/i, phase);
    assert.doesNotMatch(doc, /_Describe what this phase|\[ \] Requirement A|\[ \] Task A|_Define done_/i, phase);
  }
});

test("all 22 executable tasks contain mechanical RED/GREEN/REFACTOR verification", () => {
  const counts = [5, 3, 3, 3, 3, 3, 2];
  for (let i = 1; i < texts.length; i++) {
    const chunks = texts[i].split(/^### Task \d+\.\d+ — /m).slice(1);
    assert.equal(chunks.length, counts[i - 1], phaseNames[i - 1] + " task count");
    for (const task of chunks) {
      for (const field of ["Goal", "Target", "Steps", "Success", "Verify"]) {
        assert.match(task, new RegExp("\\*\\*" + field + ":\\*\\*"), field);
      }
      assert.match(task, /- \*\*Verify:\*\* RED .*exits 1[\s\S]*?GREEN [\s\S]*?REFACTOR /,
        "RED assertion, GREEN and REFACTOR commands must be mechanical");
      assert.match(task, /npm run check exits? 0/,
        "final regression command required for each task");
    }
  }
});

test("all new plan relative Markdown citations resolve in workspace", async () => {
  let checked = 0;
  for (let i = 0; i < files.length; i++) {
    const file = resolve(PLAN_DIR, files[i]);
    for (const match of texts[i].matchAll(/\]\((\.\.?\/[^)#]+)(?:#[^)]*)?\)/g)) {
      const target = resolve(dirname(file), match[1]);
      assert.ok((await stat(target).catch(() => null))?.isFile(),
        file + " broken relative link: " + match[1]);
      checked++;
    }
  }
  assert.ok(checked >= 9, "must link archived plans, evidence and report");
});

test("critical source guards and rights ceiling remain explicit in new plan", () => {
  const joined = texts.join("\n");
  assert.match(joined, /hardwareValidated=false/);
  assert.match(joined, /firmwareInstalled=null/);
  assert.match(joined, /PUBLIC_REFERENCE_CONFORMANT/);
  assert.match(joined, /\[600W\].*\[1kW\]/s);
  assert.match(joined, /525STID-PWD/);
  assert.match(joined, /BDS.*5-100|5-100m.*BDS/s);
  assert.match(joined, /ALARM1-5.*AND/s);
  assert.match(joined, /64 FCV.*D15/s);
  assert.match(joined, /ui-tick/);
  assert.match(joined, /browser_navigate\(action=reload\)/);
  assert.match(joined, /NOT_RUN/);
  assert.match(joined, /no real.*I\/O|No real.*I\/O/i);
});
