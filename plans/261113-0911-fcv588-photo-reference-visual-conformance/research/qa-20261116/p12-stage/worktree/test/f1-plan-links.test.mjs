import test from "node:test";
import assert from "node:assert/strict";
import {readdir, readFile, stat} from "node:fs/promises";
import {basename, dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";

const root = fileURLToPath(new URL("../plans/", import.meta.url));
const name = (await readdir(root)).find(dir => dir.endsWith("-fcv588-full-fidelity-simulator"));
assert.ok(name, "expected one real CLI-generated F1 plan");
const planDir = resolve(root, name);
const files = (await readdir(planDir)).filter(file => file.endsWith(".md")).sort();

test("AgentKit F1 plan has seven non-empty planned phases and no fake completion", async () => {
  assert.equal(files.length, 8); // plan.md + seven phases
  assert.equal(files.filter(f => /^phase-\d{2}-/.test(f)).length, 7);
  const index = await readFile(resolve(planDir, "plan.md"), "utf8");
  assert.match(index, /^status: pending$/m);
  assert.match(index, /Manual Archive Gate/);
  assert.match(index, /SIMULATED_ONLY/);
  assert.match(index, /FidelityToleranceProfile/);
  for (const file of files.filter(f => f.startsWith("phase-"))) {
    const source = await readFile(resolve(planDir, file), "utf8");
    assert.match(source, /^status: todo$/m);
    assert.doesNotMatch(source, /_Describe what this phase accomplishes_|- \[ \] Task A/);
  }
});

test("all local markdown plan references resolve in the intended workspace", async () => {
  let localLinks = 0;
  for (const name of files) {
    const current = resolve(planDir, name);
    const content = await readFile(current, "utf8");
    for (const match of content.matchAll(/\]\((\.\.?\/[^)#]+)(?:#[^)]*)?\)/g)) {
      localLinks++;
      const link = match[1];
      const target = resolve(dirname(current), link);
      const targetInfo = await stat(target).catch(() => null);
      assert.ok(targetInfo?.isFile(), basename(current) + " -> missing link " + link);
    }
  }
  assert.ok(localLinks >= 12, "expected traceable links to the evidence/reference documents");
});
