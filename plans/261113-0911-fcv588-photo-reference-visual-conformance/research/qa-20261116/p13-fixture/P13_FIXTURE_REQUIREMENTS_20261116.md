# P13 — fixture-complete staging requirements

Status: **READ-ONLY DIAGNOSIS / NOT_YET_RUN**. No browser or test was run for P13 and no runtime/source was changed.

## Finding

P12's `499/526 PASS, 27 FAIL` is explained by two independent causes:

- **22 fixture ENOENT failures**. The P12 log has exactly 22 missing-path occurrences: `plans/` (3), `fcv588-public-trace-matrix.json` (3), `fcv588-public-implementation-status.json` (6), `FCV588_PUBLIC_CLAIM_POLICY.md` (1), `fcv588-public-evidence-ledger.json` (1), `fcv588-public-menu-atlas.json` (5), `fcv588-public-reference-profile.json` (1), `device-register.json` (1), and `FCV588_FULL_FUNCTION_INVENTORY_2026-10-13.md` (1).
- **5 ordinal/index-sensitive failures**: two in `test/fcv588-public-lcd-presentation.test.mjs` and three in `test/fcv588-v47-white-marker-firmware-boundary.test.mjs`. They assume the pre-P12 Sounder row indexes. Fixture copying cannot make those five GREEN.

The lower P12 test count does **not** mean test files were missing. Canonical and P12 worktree each contain 90 `*.test.mjs`; names and SHA-256 match **90/90**. `src/` is 23/23 with exactly one hash difference, `src/devices/fcv588/menu-atlas.mjs`: canonical `992d7a6e1f3a645680ea73f87ce2863a9e9f38eb16428a4581ad5e7e71a58aed`, P12 candidate `e2ba214cf81aa739452dc1ecd0ddfdcc7fad7814478a2d5e27e6925eda945aca`. `web/` is 16/16 exact and `tools/` 42/42 exact. Missing top-level fixtures prevent some modules from registering their subtests, producing 526 instead of the canonical 563.

Evidence: `p12-stage/P12_STAGING_FULL_NODE_20261116.txt`, SHA-256 `079419aa1dbca42a688f0e1644d487bcc276ed14fcf98dc220a26af45a581f85`. P12 final receipt SHA-256: `5afe2663a1d0d3dff6e213fc537fad3b7dfe5817d7aa776ee4a769e580780855`.

## Minimum safe staging tree

Recommended new root: `staging/fcv588-p13-fixture-complete-20261116/`. Seed it from the **P12 worktree** so the candidate menu SHA remains `e2ba214c...`: copy only `src/`, `test/`, `tools/`, `web/`, and `package.json`. Then add the following canonical fixture closure.

| Fixture group | Required files |
|---|---:|
| root | `.gitignore` — 1 |
| `docs/evidence/` | 7 |
| `docs/research/` | 16 |
| `docs/qa/` | 13 |
| `docs/reports/` | 1 |
| `docs/decisions/` | 1 |
| `docs/F0-AUDIT.md` | 1 |
| `sources/manuals/` metadata only | `MANIFEST.json`, `ARCHIVE_COVERAGE.json`, `README.md` — 3 |
| `plans/261013-1319-fcv588-full-fidelity-simulator/` | its 8 top-level Markdown files |
| `plans/261013-1428-fcv588-public-reference-complete-operator/` | its 8 top-level Markdown files |
| `plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/` | 8 top-level Markdown files plus the 47 `reports/*.md` files directly referenced by those files — 55 |

Total additions to the existing P12 worktree shape: **114 files** = 39 docs + 3 manual metadata + 71 plan Markdown files + `.gitignore`. Static closure is text/metadata only: 104 Markdown, 9 JSON, one `.gitignore`; the already-present `src/devices/fcv588/model.mjs` is the only additional link target outside that set. There are **zero PDF/JPG/PNG/ZIP/media files** in the required closure.

Do **not** recursively copy the entire deep-v2 plan directory: it currently contains 94 files including **3 ZIPs** and other non-required artifacts. Copy only the 55 Markdown files in the direct relative-link closure. Likewise, do not copy `sources/manuals/*.pdf` or any FCV-588 reference JPEGs; the tests only require the three source metadata files above.

The seven required `docs/evidence/` files are `FCV-588.md`, `device-register.json`, `fcv588-public-evidence-ledger.json`, `fcv588-public-implementation-status.json`, `fcv588-public-menu-atlas.json`, `fcv588-public-reference-profile.json`, and `fcv588-public-trace-matrix.json`. The remaining docs are the direct Markdown link targets of the three plan scaffolds plus the explicitly-read research files.

## Expected gate after fixture completion

From the stage root, a future `npm check` should be able to **register the full 563-test suite** because all import-time/read-time fixtures are present. Fixture completeness alone does not authorize expecting 563/563: the P12 reordered Sounder menu still leaves the five index-sensitive assertions to be explicitly rebaselined against stable entry IDs such as `sounder.clutter`, `sounder.shift`, and `sounder.whiteMarker`, rather than fixed row numbers. That rebaseline is a separate source/test decision and was not performed here.

Pre-run integrity gate for any future stage: candidate menu SHA must remain `e2ba214c...`; every other `src/`, all `test/`, `web/`, and `tools/` hashes must match canonical; fixture copy must reject binary extensions and contain no OEM PDF/JPG; canonical remains unchanged at menu SHA `992d7a6e...`.
