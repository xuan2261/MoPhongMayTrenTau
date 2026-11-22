import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,mkdir,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {auditPublicRuntimeAssets} from "../tools/verify_public_runtime_assets.mjs";

test("Phase6 runtime packaging policy inspects all original JS/CSS/SVG assets in web and src",async()=>{
  const audited=await auditPublicRuntimeAssets();
  assert.equal(audited.status,"PASS");
  assert.ok(audited.filesReviewed>=25);
  assert.ok(audited.paths.includes("web/index.html"));
  assert.ok(audited.paths.includes("web/rotary-input.mjs"));
  assert.ok(audited.paths.includes("src/devices/fcv588/model.mjs"));
});

test("Phase6 recursive rights gate refuses a nested restricted-media file, not only top-level filenames",async()=>{
  const root=await mkdtemp(join(tmpdir(),"fcv588-public-asset-audit-"));
  try{
    await mkdir(join(root,"web","nested"),{recursive:true});
    await mkdir(join(root,"src"),{recursive:true});
    await writeFile(join(root,"web","index.html"),"<html>fake fixture</html>");
    await writeFile(join(root,"src","index.mjs"),"export const testOnly = true;");
    await writeFile(join(root,"web","nested","fixture-only.pdf"),
      "Dummy bytes, no OEM or restricted media");
    await assert.rejects(auditPublicRuntimeAssets(root),/RESTRICTED_RUNTIME_ASSET/,
      "an unserved nested PDF can still be copied into a distributable package");
  }finally{
    await rm(root,{recursive:true,force:true});
  }
});
