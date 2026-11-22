/**
 * Offline PUBLIC_REFERENCE packaging boundary. Restricted manuals, photos,
 * fonts and media must never appear anywhere under distributable web/src.
 * A localhost server refusing one extension does not clear packaged bytes.
 */
import {readdir} from "node:fs/promises";
import {extname,join,resolve,relative} from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";

const ALLOWED=Object.freeze({
  web:new Set([".html",".mjs",".js",".css",".svg"]),
  src:new Set([".mjs",".js"]),
});

export async function auditPublicRuntimeAssets(root=resolve(
  fileURLToPath(new URL("..",import.meta.url)))){
  const reviewed=[];
  async function visit(folder,base,extensions){
    for(const entry of await readdir(base,{withFileTypes:true})){
      const name=entry.name;
      const full=join(base,name);
      const relativePath=relative(root,full).replaceAll("\\","/");
      if(name.startsWith(".") || entry.isSymbolicLink()){
        throw new Error("RESTRICTED_RUNTIME_ASSET: hidden or symlink "+relativePath);
      }
      if(entry.isDirectory()){
        await visit(folder,full,extensions);
        continue;
      }
      if(!entry.isFile() || !extensions.has(extname(name).toLowerCase())){
        throw new Error("RESTRICTED_RUNTIME_ASSET: "+relativePath);
      }
      reviewed.push(relativePath);
    }
  }
  for(const [folder,extensions] of Object.entries(ALLOWED)){
    await visit(folder,join(root,folder),extensions);
  }
  return Object.freeze({status:"PASS",filesReviewed:reviewed.length,
    paths:Object.freeze(reviewed.sort())});
}

if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const receipt=await auditPublicRuntimeAssets();
  console.log("PUBLIC_RUNTIME_ASSET_POLICY_PASS:",receipt.filesReviewed,
    "recursive original source assets (no restricted media or symlinks)");
}
