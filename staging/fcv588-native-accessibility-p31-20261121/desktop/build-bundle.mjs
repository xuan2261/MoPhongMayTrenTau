/**
 * Copy only the approved static runtime and the tiny Electron shell.
 * Fail closed on parent P28 SHA drift, symlinks and unexpected file types.
 * The output bundle contains no tests, Node_modules, manuals or OEM JPEG.
 */
import {createHash} from "node:crypto";
import {readFile,mkdir,writeFile,readdir,rm,lstat} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

const stage=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const project=path.resolve(stage,"..","..");
const target=path.join(stage,"bundle");
const rootQA=path.join(project,"docs","qa","FCV588_P28_MODE_VISUAL_20261117");
const parent=JSON.parse(await readFile(path.join(rootQA,
  "FCV588_P28_MODE_VISUAL_FINAL_INTEGRITY_20261117.json"),"utf8"));
const expected=parent.P27Runtime54UnchangedSHA256;
const hash=data=>createHash("sha256").update(data).digest("hex");
const hashes={};
for(const tree of ["src","web"]){
  const basedir=path.join(stage,tree);
  async function visit(at){
    const files=await readdir(at,{withFileTypes:true});
    for(const entry of files){
      const full=path.join(at,entry.name);
      const rel=path.relative(stage,full).replaceAll(path.sep,"/");
      if(entry.isSymbolicLink())throw new Error("symlink denied: "+rel);
      if(entry.isDirectory()){await visit(full);continue;}
      if(!entry.isFile())throw new Error("unknown asset type: "+rel);
      if(!({
        web:new Set([".html",".mjs",".js",".css",".svg"]),
        src:new Set([".mjs",".js"]),
      })[tree].has(path.extname(full).toLowerCase()))
        throw new Error("unexpected public asset type: "+rel);
      const bytes=await readFile(full);
      if(bytes.length>4_000_000)throw new Error("oversize source: "+rel);
      const digest=hash(bytes);
      if(Object.hasOwn(expected,rel) && rel!=="web/index.html" &&
         expected[rel]!==digest)throw new Error("P28 inherited source drift: "+rel);
      if(!Object.hasOwn(expected,rel) &&
         !["web/desktop-settings.mjs","web/desktop-settings-core.mjs"].includes(rel))
        throw new Error("unexpected non-P28 runtime file: "+rel);
      hashes[rel]=digest;
    }
  }
  await visit(basedir);
}
for(const rel of Object.keys(expected)){
  if(!Object.hasOwn(hashes,rel))
    throw new Error("missing P28 runtime: "+rel);
}
if(Object.keys(hashes).length!==56)throw new Error("expected exactly 56 web/src files");
const source=(relativePath)=>path.join(stage,relativePath);
const objects=[
  ...Object.keys(hashes),
  "desktop/main.cjs",
  "package.json",
];
await rm(target,{recursive:true,force:true});
for(const rel of objects){
  const from=source(rel);
  const to=path.join(target,rel);
  if((await lstat(from)).isSymbolicLink())throw new Error("symlink: "+rel);
  const bytes=await readFile(from);
  const data=rel==="package.json"
    ?Buffer.from(JSON.stringify({
      name:"fcv588-synthetic-electron-poc",version:"0.0.3",
      private:true,description:"SYNTHETIC TRAINING POC NOT OEM",
      main:"desktop/main.cjs",
    },null,2)+"\n"):bytes;
  await mkdir(path.dirname(to),{recursive:true});
  await writeFile(to,data,{flag:"wx"});
}
console.log(JSON.stringify({
  status:"BUNDLE_ALLOWLIST_PASS",
  webSrcFiles:Object.keys(hashes).length,
  packageFiles:objects.length,
  runtime54BaselineCount:Object.keys(expected).length,
  changedP28RuntimePaths:["web/index.html"],
  addedDesktopUiPaths:["web/desktop-settings.mjs","web/desktop-settings-core.mjs"],
  forbiddenOEMFilesPacked:0,
  parentP28FinalSHA256:hash(await readFile(path.join(rootQA,
    "FCV588_P28_MODE_VISUAL_FINAL_INTEGRITY_20261117.json"))),
}));
