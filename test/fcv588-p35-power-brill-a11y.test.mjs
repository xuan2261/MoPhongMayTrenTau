import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const html=readFileSync(new URL("../web/index.html",import.meta.url),"utf8");

test("P35 POWER/BRILL accessible name discloses both physical gestures",()=>{
  const face=html.split('<div class="device-frame"')[1]
    ?.split('<aside class="training-panel">')[0];
  assert.ok(face,"physical device face missing");
  const button=face.match(/<button\s+id="key-power"[^>]*>/i)?.[0];
  assert.ok(button,"physical POWER/BRILL missing");
  const name=button.match(/\baria-label="([^"]+)"/)?.[1];
  assert.ok(name,"POWER/BRILL requires accessible name");
  assert.match(name,/POWER\s*\/\s*BRILL/i,"announce the control identity");
  assert.match(name,/nhấn ngắn[^;.]*bật/i,"short press must disclose boot action");
  assert.match(name,/nhấn ngắn[^;.]*độ sáng/i,"short press must disclose BRILL action");
  assert.match(name,/nhấn giữ[^;.]*3 giây[^;.]*tắt/i,"long press must disclose power-off");
  assert.match(button,/type="button"/,"no form submission");
});