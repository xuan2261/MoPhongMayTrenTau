import test from "node:test";
import assert from "node:assert/strict";
import {readdir} from "node:fs/promises";
import {extname,relative,resolve} from "node:path";
import {fileURLToPath} from "node:url";

const root=resolve(fileURLToPath(new URL("../",import.meta.url)));
const served=["web","src"];
// Original code and SVG/CSS Canvas artwork are allowed. Any binary image,
// reference PDF, archive, vendor font or video requires separately reviewed
// distribution provenance, and therefore must not silently enter served roots.
const prohibited=new Set([".pdf",".zip",".7z",".rar",".mp4",".mov",
  ".webm",".ttf",".woff",".woff2",".otf",".png",".jpg",".jpeg",
  ".gif",".webp",".bmp",".tif",".tiff"]);

async function scan(current,result=[]){
  for(const entry of await readdir(current,{withFileTypes:true})){
    const path=resolve(current,entry.name);
    if(entry.isSymbolicLink())throw new Error("symlink in browser-served source root: "+path);
    if(entry.isDirectory())await scan(path,result);
    else if(entry.isFile())result.push(relative(root,path).replaceAll("\\","/"));
  }
  return result;
}

test("Phase6 rights gate recursively enumerates browser roots, not only top-level HTML",async()=>{
  const files=(await Promise.all(served.map(dir=>scan(resolve(root,dir))))).flat();
  assert.ok(files.some(x=>x==="web/index.html"));
  assert.ok(files.some(x=>x==="src/devices/fcv588/model.mjs"));
  assert.deepEqual(files.filter(path=>prohibited.has(extname(path).toLowerCase())),[],
    "manufacturer reference PDFs/images/videos/fonts cannot silently ship in served roots");
  assert.ok(files.every(path=>!path.startsWith("sources/manuals/")));
});

test("Phase6 extension policy explicitly rejects nested restricted assets",()=>{
  for(const name of ["web/nested/manual.pdf","src/x/vendor-screenshot.png",
    "web/assets/firmware.zip","src/fonts/oem.woff2"]){
    assert.equal(prohibited.has(extname(name).toLowerCase()),true,name);
  }
  assert.equal(prohibited.has(".mjs"),false);
  assert.equal(prohibited.has(".svg"),false,
    "original SVG is source artwork; actual ownership must still be reviewed");
});
