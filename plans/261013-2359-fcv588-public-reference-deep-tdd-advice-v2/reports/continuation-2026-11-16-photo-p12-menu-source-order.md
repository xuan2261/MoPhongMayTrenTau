# FCV-588 — P12 direct-source menu audit and staging decision (2026-11-16)

**Bounded scope:** F1 PUBLIC_REFERENCE v2 offline synthetic training software, canonical `C:\Work\MoPhongMayTrenTau`. P11 final parent SHA `845b4fe9cf9b184a74ddba91783362e9446c1219d38362c16166d4b3d6a44c87`, independent post SHA `392220f62ae29c2f1bf77b73c90d016b1a3a40e115a8c04612ce59a728b09f98`. No physical instrument, installed firmware or licensed image assets were available for acceptance.

## Actual independent sources

1. Manufacturer operator manual, `sources/manuals/FCV-588/FURUNO_FCV628_FCV588_Operators_Manual_OME23890E_2025.pdf` SHA `3003e23b9d1eda509ceb968130249fe02aa279c2efb3cf900dde54ab9d709cd3`, PDF page **59**, printed **AP-1**, defines Sounder menu order: **Pic. Advance → Zoom Mode → Shift → Interference → Color Erase → Clutter → White Line → White Marker → TVG → Smoothing → Bottom Zone → TX Power → TX Rate**. PDF page15, printed7, establishes five menu categories; PDF page30 printed22 describes White Line width and Edge; AP-1 gives `0–50%` for White Line, unlike current binary training choices. This is documentary source evidence for the cited manual edition, *not a captured installed firmware dump*.
2. Original restricted-reference standalone photo `sources/FCV588_GiaoDienThucTeMay2016/giaoDien.jpg` SHA `e7b78466fa582dc0cc50aec8e2fc264f8b3ee187d93a53cace1e88d1e156c99c` visibly shows five **Vietnamese** menu categories and 13 Sounder-option rows in the same semantic order. The other seven JPEGs show LF/HF/DUAL/ZOOM/NAV views but no readable menu-option list; NAV photos show some Vietnamese labels. The year 2016 is a project collection label, not independently date-authenticated. Photo's firmware version is UNKNOWN.
3. Independent manufacturer manual audit SHA `c28b618cceca8380fa0be4cfdf514a2b12801b08dbccbea1b45255be0bf1c5b5`: **35 traced rows, 23 DIRECT_SOURCE, 4 EXTRAPOLATION, 8 SOURCE_GAP**, including official manual, multilingual guide, firmware history. Sounder AP-1 supplement SHA `be84cf98525de66f4005550cf7c6bd381bf916b45c32d5e079c62a69c442b812`. Independent all-8-photo lexicon SHA `9c8c7397a42610005a9fed7535a722f951ab708273068301c44f49faf81b2e83`, no copied/warped OEM art.

## Current product, exact photo/manual comparison

- Current runtime menu module `src/devices/fcv588/menu-atlas.mjs` SHA `992d7a6e1f3a645680ea73f87ce2863a9e9f38eb16428a4581ad5e7e71a58aed` implements **five categories, 67 entries**. Source grades: 58 curated but not hardware-verified, 7 synthetic training menu paths, one training color-palette preview, one training White Marker preview. Current locale gate exposes English only, and Language remains disabled; this does **not** establish real FCV-588 English-only capabilities. Immutable source traceability SHA `7c44ea82784a64c08fbf05ac81d59b79da46816e0283d99a49205ae45c56fc9c`.
- Photo-specific **analyst-semantic** crosswalk (not approved Vietnamese firmware translation dictionary) finds **12/13 row positions different** and **21 pairwise order inversions** between photographed Sounder presentation and current Sounder atlas. Crosswalk SHA `994290762fa2d19c0b491007af559a4c9a437701c4f7e4de71732e582fab2e9f`. The same target ordering has *independent direct manual AP-1 support*, so an ordering-only source-valid test can be written without claiming the complete installed firmware.
- Other direct-source/value discrepancies are separately acknowledged and **not patched** in P12: White Line width/Edge vs binary choices; photo percentage-unit presentation vs current plain numeric choice strings; manufacturer software-history versioned Colors choices vs a firmware version UNKNOWN in the simulated/reference unit. These require their own source-valid behavior/replay/visual contracts, not simultaneous guessed changes.

## Executed TDD and guarded apply decision

| Verification | Actual result | Artifact SHA-256 |
|---|---|---|
| Six original menu tests, unmodified canonical | **25/25 PASS** | `30e79694fa8f83f4b21f2d2db1bda9f344849d28fdfb8cbbd2ebf51f4fd1ef43` |
| P12 new manual/AP-1 Sounder order oracle on canonical | **RED 2/3**, one source-valid order FAIL | `c228a4ea0f5d8c4feceedf57f9ea740d5a86164034654466b8a97f2fc141163e` |
| Staging isolated source-order-only candidate | **GREEN 3/3** | `ed1fcf5cdac606cfa3350a92d4742dfcfc7f1622c9ba140982cfe972bed406e6` |
| Exact staged module metadata/choice/source-grade equivalence | **PASS**, only 13 Sounder IDs reordered, unrelated categories unchanged | `5996df27237b43f92044c602127c88394db7b01df3a28dbcabe9c0cc9cbbcfb6` |
| Full Node on *incomplete* staging worktree | **499/526 PASS, 27 FAIL** | `079419aa1dbca42a688f0e1644d487bcc276ed14fcf98dc220a26af45a581f85` |

Staging source module SHA `e2ba214cf81aa739452dc1ecd0ddfdcc7fad7814478a2d5e27e6925eda945aca` versus untouched canonical SHA `992d7a6e1f3a645680ea73f87ce2863a9e9f38eb16428a4581ad5e7e71a58aed`; **only 1 of 39 staged runtime files differs**. The 27 full-stage failures include missing snapshot fixtures `docs/evidence` and `plans` (so 526 is *not* a complete canonical-equivalent full suite), plus at least five index-sensitive tests for staged Sounder Clutter/Shift/White Marker selection. Historical RED and FAIL logs remain intact; no tests were weakened to force GREEN. P12 staging NO-GO integrity SHA `eb51e3bf3c9e4bf2b60ab62f81e4f72136bf55458aee43b8ce0d9799ca91a0cc`.

**Apply verdict: NO_GO.** Independent reviewer SHA `26bbcef289bf1b3663ac7a79766b87ff6431684632f07414aca4537d3bd29c6d` confirmed **source/order evidence integrity GO**, **canonical apply NO_GO**, identifying 22 missing-fixture/cascade failures and five visible index-sensitive behavior assertions. No product runtime change/guarded canonical copy, no new firmware or package distribution. Source-valid partial test GREEN cannot replace successful complete staging regression and independent approval. Current P07 runtime 39/39 SHA, eight OEM/reference-only JPEG SHA and user server `127.0.0.1:4173` PID1204 remain preserved.

### Write-once sealed P12 disposition

- `docs/qa/FCV588_P12_MENU_SOURCE_20261116/FCV588_P12_MENU_SOURCE_FINAL_INTEGRITY_20261116.json`: SHA-256 `5afe2663a1d0d3dff6e213fc537fad3b7dfe5817d7aa776ee4a769e580780855`.
- `docs/qa/FCV588_P12_MENU_SOURCE_20261116/FCV588_P12_MENU_SOURCE_INDEPENDENT_POSTRECEIPT_20261116.json`: SHA-256 `538ff2a5e518ed663274958c3a2c9c69e7458a7caa5317f868ae67fe4e184792`.
- The independent reviewer validates exact evidence and the source-valid candidate **only**. The postreceipt is a separate local byte readback and does not provide GO to patch canonical, deploy or accept OEM menu/firmware language conformance.

## Next narrow bounded work

P13 should focus on precisely *one source-valid menu-order patch*: construct a fixture-complete isolated staging root, replace obsolete index-based expectations with **strict source-grounded semantic-entry IDs and identical behavioral assertions**, then rerun all current Node563/Python13 and targeted Chrome menu interaction/source-body SHA. Preserve old FAIL, require independent GO, preimage ZIP and guarded one-change apply with postreceipt. Source-valid White Line width, exact percentage formatting and 2016 Vietnamese localization should be separate constrained work after sufficient firmware/version/original licensing/oracle data is available.

Actual Narrator/NVDA speech, native Chrome blur/POWER cancel, active LCD camera calibration, firmware installed version, OEM photo rights, F1 Phase6 and 65/65 feature claims remain **NOT_RUN/SOURCE_GAP/OPEN/HOLD**. No OEM fidelity percent or certification is claimed.
