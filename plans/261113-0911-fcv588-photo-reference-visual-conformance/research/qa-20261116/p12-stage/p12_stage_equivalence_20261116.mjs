import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFile} from "node:fs/promises";
import {join} from "node:path";
import {pathToFileURL} from "node:url";

const canonical="C:\\Work\\MoPhongMayTrenTau";
const stage=join(canonical,"plans","261113-0911-fcv588-photo-reference-visual-conformance",
  "research","qa-20261116","p12-stage","worktree");
const file="src/devices/fcv588/menu-atlas.mjs";
const hash=async p=>createHash("sha256").update(await readFile(p)).digest("hex");
const original=await import(pathToFileURL(join(canonical,file)).href);
const candidate=await import(pathToFileURL(join(stage,file)).href);
const norm=e=>JSON.stringify([...e].sort((a,b)=>a.id.localeCompare(b.id)));
assert.equal(candidate.FCV_MENU_ENTRIES.length,67);
assert.equal(norm(candidate.FCV_MENU_ENTRIES),norm(original.FCV_MENU_ENTRIES),
  "P12 staging unexpectedly changed a label, option, source grade or value");
assert.deepEqual(candidate.FCV_MENU_CATEGORIES,original.FCV_MENU_CATEGORIES);
assert.deepEqual(candidate.FCV_FUNC_TARGETS,original.FCV_FUNC_TARGETS);
assert.deepEqual(candidate.FCV_NAV_BOX_OPTIONS,original.FCV_NAV_BOX_OPTIONS);
assert.deepEqual(candidate.FCV_FISH_ALARM_FIELDS,original.FCV_FISH_ALARM_FIELDS);
assert.deepEqual(candidate.FCV_RANGE_BANK_FIELDS,original.FCV_RANGE_BANK_FIELDS);
const originalOrder=original.FCV_MENU_ENTRIES.filter(e=>e.category==="Sounder").map(x=>x.id);
const newOrder=candidate.FCV_MENU_ENTRIES.filter(e=>e.category==="Sounder").map(x=>x.id);
assert.notDeepEqual(originalOrder,newOrder);
for(const category of candidate.FCV_MENU_CATEGORIES.filter(x=>x!=="Sounder")){
  assert.deepEqual(candidate.FCV_MENU_ENTRIES.filter(x=>x.category===category),
    original.FCV_MENU_ENTRIES.filter(x=>x.category===category),
    "unrelated category changed "+category);
}
console.log(JSON.stringify({status:"PASS_ORDER_ONLY_STAGING_METADATA_EQUIVALENCE",
  canonicalMenuSHA256:await hash(join(canonical,file)),
  stagingMenuSHA256:await hash(join(stage,file)),
  currentSounderOrder:originalOrder,proposedSounderOrder:newOrder,
  changedMenuEntryMetadataCount:0,unrelatedCategoryDiffCount:0}));
