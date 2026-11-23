/**
 * Deterministic zero-dependency multi-resolution Windows .ico generator for
 * FURUNO FCV-588 Standalone Simulator (16, 32, 48, 64, 128, 256 px RGBA PNG-in-ICO).
 * Renders an authentic marine fish-finder icon: charcoal bezel, navy header bar,
 * deep-blue sonar field, red-orange seabed + white-line edge, and dual fish arches.
 */
import {deflateSync} from "node:zlib";
import {mkdir, readFile, writeFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";

const DEFAULT_OUT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "apps",
  "fcv588-electron-p30",
  "desktop",
  "fcv588.ico",
);

const ICON_SIZES = Object.freeze([16, 32, 48, 64, 128, 256]);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(typeAscii, data) {
  const typeBuf = Buffer.from(typeAscii, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, crcInput, crcBuf]);
}

export function encodeRgbaPng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter type 0 (None)
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const idat = deflateSync(raw, {level: 9});
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function roundedRectAlpha(nx, ny, x0, y0, x1, y1, radius, feather) {
  const cx = Math.max(x0 + radius, Math.min(x1 - radius, nx));
  const cy = Math.max(y0 + radius, Math.min(y1 - radius, ny));
  const dist = Math.hypot(nx - cx, ny - cy) - radius;
  if (nx >= x0 + radius && nx <= x1 - radius && ny >= y0 && ny <= y1) return 1;
  if (ny >= y0 + radius && ny <= y1 - radius && nx >= x0 && nx <= x1) return 1;
  return clamp01(1 - dist / feather);
}

export function renderFcv588IconRgba(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const feather = 1.15 / size;

  for (let py = 0; py < size; py++) {
    const ny = (py + 0.5) / size;
    for (let px = 0; px < size; px++) {
      const nx = (px + 0.5) / size;
      const idx = (py * size + px) * 4;

      // Outer rounded marine bezel
      const outerA = roundedRectAlpha(nx, ny, 0.04, 0.04, 0.96, 0.96, 0.18, feather);
      if (outerA <= 0) continue;

      let r = 34;
      let g = 43;
      let b = 50;

      // Subtle bezel highlight rim
      const rim = roundedRectAlpha(nx, ny, 0.055, 0.055, 0.945, 0.945, 0.165, feather);
      if (rim < 1) {
        r = 62;
        g = 78;
        b = 90;
      }

      // Inner LCD viewport (0.13..0.87)
      const inLcd = nx >= 0.13 && nx <= 0.87 && ny >= 0.13 && ny <= 0.87;
      if (inLcd) {
        const lx = (nx - 0.13) / 0.74;
        const ly = (ny - 0.13) / 0.74;

        // Deep-blue FCV-588 sonar background gradient
        r = Math.round(4 + ly * 6);
        g = Math.round(28 + ly * 34);
        b = Math.round(86 + ly * 56);

        // Authentic FURUNO solid blue status header bar at top of LCD
        if (ly <= 0.14) {
          r = 22;
          g = 76;
          b = 186;
          // Crisp cyan-white telemetry bar accent inside header
          if (ly >= 0.045 && ly <= 0.095 && lx >= 0.08 && lx <= 0.62) {
            r = 225;
            g = 246;
            b = 255;
          }
        } else {
          // Seabed profile curve across lx
          const bedY = 0.72 - 0.09 * Math.sin(lx * Math.PI * 1.35 + 0.25) + 0.04 * Math.cos(lx * Math.PI * 2.6);
          if (ly >= bedY - 0.032 && ly < bedY) {
            // White Line: Edge highlight
            r = 246;
            g = 252;
            b = 255;
          } else if (ly >= bedY && ly < bedY + 0.11) {
            // Hard-bottom reddish-brown echo tail
            r = 214;
            g = 62;
            b = 26;
          } else if (ly >= bedY + 0.11) {
            // Sub-bottom orange-gold decay
            r = 232;
            g = 148;
            b = 28;
          } else {
            // Dual fish arches in mid-water
            const arch1Y = 0.42 + 2.6 * (lx - 0.34) * (lx - 0.34);
            const arch2Y = 0.51 + 2.9 * (lx - 0.68) * (lx - 0.68);
            const d1 = Math.abs(ly - arch1Y);
            const d2 = Math.abs(ly - arch2Y);
            if ((Math.abs(lx - 0.34) <= 0.15 && d1 <= 0.045) ||
                (Math.abs(lx - 0.68) <= 0.14 && d2 <= 0.042)) {
              const core = (Math.abs(lx - 0.34) <= 0.09 && d1 <= 0.022) ||
                (Math.abs(lx - 0.68) <= 0.085 && d2 <= 0.02);
              r = core ? 245 : 88;
              g = core ? 92 : 232;
              b = core ? 34 : 118;
            }
          }
        }
      } else if (ny > 0.885 && nx >= 0.72 && nx <= 0.87) {
        // Signature blue BRILL power pill accent on lower-right bezel
        r = 46;
        g = 132;
        b = 224;
      }

      rgba[idx] = r;
      rgba[idx + 1] = g;
      rgba[idx + 2] = b;
      rgba[idx + 3] = Math.round(outerA * 255);
    }
  }
  return rgba;
}

export function buildFcv588IcoBuffer(sizes = ICON_SIZES) {
  const frames = sizes.map(size => ({
    size,
    png: encodeRgbaPng(size, size, renderFcv588IconRgba(size)),
  }));
  const count = frames.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);     // Reserved
  header.writeUInt16LE(1, 2);     // Type 1 = ICO
  header.writeUInt16LE(count, 4); // Image count

  const dirEntries = Buffer.alloc(16 * count);
  let offset = 6 + 16 * count;
  frames.forEach((frame, i) => {
    const base = i * 16;
    dirEntries[base] = frame.size === 256 ? 0 : frame.size;
    dirEntries[base + 1] = frame.size === 256 ? 0 : frame.size;
    dirEntries[base + 2] = 0; // palette count
    dirEntries[base + 3] = 0; // reserved
    dirEntries.writeUInt16LE(1, base + 4);  // color planes
    dirEntries.writeUInt16LE(32, base + 6); // bits per pixel
    dirEntries.writeUInt32LE(frame.png.length, base + 8);
    dirEntries.writeUInt32LE(offset, base + 12);
    offset += frame.png.length;
  });

  return Buffer.concat([header, dirEntries, ...frames.map(f => f.png)]);
}

export async function writeFcv588AppIcon({outFile = DEFAULT_OUT, check = false} = {}) {
  const ico = buildFcv588IcoBuffer();
  if (check) {
    const existing = await readFile(outFile);
    if (!existing.equals(ico)) {
      throw new Error(`fcv588.ico drift detected (${existing.length} vs ${ico.length} bytes)`);
    }
    return {status: "ICO_CHECK_PASS", bytes: ico.length, sizes: ICON_SIZES};
  }
  await mkdir(path.dirname(outFile), {recursive: true});
  await writeFile(outFile, ico);
  return {status: "ICO_WRITTEN", outFile, bytes: ico.length, sizes: ICON_SIZES};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const check = process.argv.includes("--check");
  const result = await writeFcv588AppIcon({check});
  console.log(JSON.stringify(result));
}
