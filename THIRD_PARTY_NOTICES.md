# Third-Party Notices (`MoPhongMayTrenTau`)

> **TRAINING ONLY / NOT FOR MARINE NAVIGATION / NOT AFFILIATED WITH OR ENDORSED BY FURUNO, KODEN, TRANSPONDERTECH, RAYMARINE, TRANSAS, OR WÄRTSILÄ.**

This document records third-party software components relevant to the two execution targets in this repository.

---

## 1. Core Web Simulator Runtime (`src/` + `web/` + `tools/server.mjs`)

- **Third-party runtime dependencies:** **Zero (`0`)**.
- The browser-based simulator (`src/` and `web/`) and local loopback static server (`tools/server.mjs`) use **0 third-party npm packages, 0 bundlers, 0 external fonts, and 0 CDN assets**.
- Execution relies exclusively on standard browser Web APIs (HTML5, CSS3, ES Modules, 2D Canvas, Web Audio API, `localStorage`) and Node.js built-in standard library modules (`node:http`, `node:fs/promises`, `node:path`, `node:url`, `node:crypto`).

---

## 2. Optional Desktop Shell (`apps/fcv588-electron-p30/` & Historical P29–P31 Bundles)

The optional Windows desktop wrapper under `apps/fcv588-electron-p30/` declares **0 runtime npm `dependencies`** in `package.json`, using `devDependencies` (`electron`, `electron-builder`, `@electron/fuses`, `@electron/packager`, `playwright-core`) only during build, packaging, and QA verification.

When packaged into a standalone desktop executable or installer (`.exe` / `win-unpacked`), the resulting binary distribution embeds the following third-party open-source runtime components:

### 2.1 Electron
- **License:** MIT License
- **Copyright:** Copyright (c) Electron contributors; Copyright (c) 2013–2020 GitHub Inc.
- **Role:** Desktop application shell (`app://fcv588` offline sandboxed container).

### 2.2 Chromium (and Bundled Third-Party Browser Components)
- **License:** BSD-3-Clause License (plus component-specific permissive licenses documented in Chromium's `LICENSES.chromium.html`, including Blink, V8, Skia, BoringSSL, HarfBuzz, FreeType, libpng, zlib, ICU, and ANGLE).
- **Copyright:** Copyright (c) The Chromium Authors. All rights reserved.
- **Redistribution requirement:** Any redistribution of compiled Electron/Chromium desktop binaries MUST preserve `LICENSE.electron.txt` and `LICENSES.chromium.html` generated in the unpacked application directory alongside the executable.

```text
Copyright (c) The Chromium Authors. All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are
met:

   * Redistributions of source code must retain the above copyright
notice, this list of conditions and the following disclaimer.
   * Redistributions in binary form must reproduce the above
copyright notice, this list of conditions and the following disclaimer
in the documentation and/or other materials provided with the
distribution.
   * Neither the name of Google Inc. nor the names of its
contributors may be used to endorse or promote products derived from
this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

### 2.3 Node.js Runtime (Embedded in Electron)
- **License:** MIT License (with bundled dependencies documented by the Node.js project).
- **Copyright:** Copyright Node.js contributors. All rights reserved.

### 2.4 Build & QA Tooling (Not Distributed in Web Runtime)
- **`electron-builder`** — MIT License (used only at build time to assemble Windows NSIS installers).
- **`@electron/fuses` / `@electron/packager`** — MIT License (used only at build time to apply Electron V1 security fuses and package bundles).
- **`playwright` / `playwright-core` / `Pillow`** — Apache-2.0 / HPND (used only in local developer/QA scripts, never shipped in runtime artifacts).

---

## 3. Reference Documentation & Trademarks Notice

Manufacturer reference PDFs/ZIPs under `sources/manuals/` and field reference photographs under `sources/FCV588_GiaoDienThucTeMay2016/` are **strictly excluded from all runtime distributions** (`simulator_asset = false`, `not_an_approval_to_redistribute = true`) and remain the property of their respective copyright holders.
