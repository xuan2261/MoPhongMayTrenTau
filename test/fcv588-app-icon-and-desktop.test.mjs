import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {buildFcv588IcoBuffer, writeFcv588AppIcon} from "../tools/build_fcv588_app_icon.mjs";

test("fcv588.ico contains valid multi-resolution (16..256px) 32-bit RGBA PNG-in-ICO frames and matches disk", async () => {
  const checkRes = await writeFcv588AppIcon({check: true});
  assert.equal(checkRes.status, "ICO_CHECK_PASS");
  assert.deepEqual(checkRes.sizes, [16, 32, 48, 64, 128, 256]);

  const ico = buildFcv588IcoBuffer();
  assert.equal(ico.readUInt16LE(0), 0, "ICO reserved = 0");
  assert.equal(ico.readUInt16LE(2), 1, "ICO type = 1");
  const count = ico.readUInt16LE(4);
  assert.equal(count, 6, "ICO frame count = 6");

  const expectedSizes = [16, 32, 48, 64, 128, 256];
  for (let i = 0; i < count; i++) {
    const entryOffset = 6 + i * 16;
    const w = ico[entryOffset] === 0 ? 256 : ico[entryOffset];
    const h = ico[entryOffset + 1] === 0 ? 256 : ico[entryOffset + 1];
    const bpp = ico.readUInt16LE(entryOffset + 6);
    const byteLen = ico.readUInt32LE(entryOffset + 8);
    const imgOffset = ico.readUInt32LE(entryOffset + 12);
    assert.equal(w, expectedSizes[i]);
    assert.equal(h, expectedSizes[i]);
    assert.equal(bpp, 32);
    assert.ok(byteLen > 60);
    // Verify PNG magic signature and IEND trailer
    assert.deepEqual(
      [...ico.subarray(imgOffset, imgOffset + 8)],
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    );
    assert.equal(ico.subarray(imgOffset + byteLen - 8, imgOffset + byteLen - 4).toString("ascii"), "IEND");
  }
});

test("Electron desktop shell wires fcv588.ico, permits only fullscreen permission, and guards responsive heading padding", async () => {
  const [mainCjs, builderCjs, bundleMjs, css] = await Promise.all([
    readFile(new URL("../apps/fcv588-electron-p30/desktop/main.cjs", import.meta.url), "utf8"),
    readFile(new URL("../apps/fcv588-electron-p30/desktop/fcv588-builder.config.cjs", import.meta.url), "utf8"),
    readFile(new URL("../apps/fcv588-electron-p30/desktop/build-bundle.mjs", import.meta.url), "utf8"),
    readFile(new URL("../web/styles.css", import.meta.url), "utf8"),
  ]);
  assert.match(mainCjs, /permission==="fullscreen"/);
  assert.match(mainCjs, /icon:path\.join\(__dirname,"fcv588\.ico"\)/);
  assert.match(builderCjs, /icon:\s*path\.join\(__dirname,\s*"fcv588\.ico"\)/);
  assert.match(bundleMjs, /"desktop\/fcv588\.ico"/);
  assert.match(css, /\.heading\s*\{[^}]*padding-right:\s*430px;/);
  assert.match(css, /@media\s*\(max-width:\s*1240px\)\s*\{\s*\.heading\s*\{\s*padding-right:\s*260px;\s*\}/);
});
