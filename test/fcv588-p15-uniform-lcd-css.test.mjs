import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const css=await readFile(new URL("../web/styles.css",import.meta.url),"utf8");
const html=await readFile(new URL("../web/index.html",import.meta.url),"utf8");
function body(selector){const e=selector.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");return css.match(new RegExp(e+"\\s*\\{([^}]*)\\}","s"))?.[1]??"";}
test("P15 G1 keeps physical estimated 128:171 aperture but displays logical 480x640 pixels without anisotropic stretch",()=>{
 assert.match(html,/id="echo-canvas" width="480" height="640"/);
 const lcd=body(".lcd"),bitmap=body(".lcd canvas");
 assert.match(lcd,/aspect-ratio:\s*128\s*\/\s*171/);
 assert.match(bitmap,/width:\s*100%/);
 assert.match(bitmap,/height:\s*auto/);
 assert.match(bitmap,/position:\s*absolute/);
 assert.match(bitmap,/top:\s*50%/);
 assert.match(bitmap,/translateY\(-50%\)/);
 assert.doesNotMatch(bitmap,/height:\s*100%/);
});
test("P15 G2 ties header and depth typography to LCD inline container, not external page viewport",()=>{
 const lcd=body(".lcd");
 assert.match(lcd,/container-type:\s*inline-size/);
 for(const selector of [".screen-top",".demo-indicator",".depth-indicator strong", ".depth-indicator[data-size=\"Small\"] strong", ".depth-indicator[data-size=\"Medium\"] strong", ".depth-indicator[data-size=\"Large\"] strong"]){
  const fontRule=body(selector);
  assert.match(fontRule,/cqw/,selector+" must scale from LCD content width");
  assert.doesNotMatch(fontRule,/[0-9.]vw/,selector+" must not depend on unrelated outer viewport width");
 }
});