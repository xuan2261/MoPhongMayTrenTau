# FCV-588 — P13 fixture-complete menu-order staging and profile21 replay gate (2026-11-16)

**Disposition:** P13 **fixture-complete Node/Python/Chrome QA PASS within the bounded staging scope**, but **canonical apply = NO_GO** because old `F1-public-reference-21` selection-only replay can silently select a different Sounder menu row without changing the event log or session hash. This is a verified compatibility defect in the *proposed same-revision change*, not a newly introduced defect in canonical. No production/runtime patch, deployment or release occurred.

## Source authority and immutable parent

- Canonical `C:\Work\MoPhongMayTrenTau`, no Git repository; user loopback server `127.0.0.1:4173` PID 1204 was kept untouched.
- P12 final source investigation SHA `5afe2663a1d0d3dff6e213fc537fad3b7dfe5817d7aa776ee4a769e580780855`; independent post SHA `538ff2a5e518ed663274958c3a2c9c69e7458a7caa5317f868ae67fe4e184792`.
- Manufacturer manual OME-23890-E (PDF page 59 / printed AP-1) and the separate original Vietnamese `giaoDien.jpg` reference prove the 13-item Sounder order in their bounded domains. No source confirms the photographed installed firmware version, entire Vietnamese locale, OEM exact fonts/RGB/pixels or redistribution rights.
- P12 staged order-only candidate `src/devices/fcv588/menu-atlas.mjs` SHA `e2ba214cf81aa739452dc1ecd0ddfdcc7fad7814478a2d5e27e6925eda945aca` vs current canonical `992d7a6e1f3a645680ea73f87ce2863a9e9f38eb16428a4581ad5e7e71a58aed`. No labels, values, source grades or other groups changed.

## Staging and exact implementation scope

- Isolated Windows staging at `C:\Work\MoPhongMayTrenTau\_p13_stage_20261116`, cloned complete `docs`/plan/test/src/web/tools fixture set; `sources` is a **Junction to canonical reference-only assets**, not a copy into the public web server. The test server remains limited to `web`/`src` allowed types. Worker-independent static fixture/source review SHA `3f3110bc0e4cfa4e55c09cc8beb1d1da0b80f1d3c5ad8af353132edce591d306`; fixture analysis SHA `ef700d07816f4d4b74cdb726f3ecec3a71140b65bdfe157b7fe67d47891d5423`.
- Candidate differs from canonical by **one runtime file of 39**, `menu-atlas.mjs` only. All **three** staging-only test changes replace obsolete numeric Sounder menu row positions with stable `getFcvMenuItems` entry ID resolution and *additional* exact row/status assertions. No existing assertion removed or weakened. Files: `fcv588-public-lcd-presentation.test.mjs`, `fcv588-v47-white-marker-firmware-boundary.test.mjs`, `fcv588-v49-a11y-boundary.test.mjs`. Independent semantic audit SHA `fbc3b8d9769613ab2d09d5cb73081788a1b0846f0e1c9002a0dc4cd527c8f0a8`.

## Actual measured tests (write-once)

| Gate | Observation | Immutable receipt/log SHA-256 |
|---|---|---|
| Fixture-complete staging before rebaseline | **RED 558/563**, five obsolete Sounder ordinal assumptions | `d5c502134a80c5cbea046befc3866674c0da857461c74d40e999ee650d856137` |
| Staging full Node after strict ID-based rebaseline | **563/563 PASS**, 0 FAIL | `bf85e4685e87607b89ff4c7c7612d0a1cad580d24172e9097dcd36c55b3d4873` |
| Staging complete Python | **13/13 PASS** | `746832750e3d5891c799514347539900311238c22d5a669e8af9963267c3df00` |
| One Chrome on staged, test-owned loopback server4213 | **2 viewports** 375×812/1366×768, 13/13 Sounder row order and real TrackPad selection, **8 PNG**, **72/72 actual loaded HTML/JS/CSS HTTP bodies exact SHA**; no external/console/network errors | `b6e9adfabcd7ed3d8104270df166346c5f2d50ce8101e87070a6a49097f38b08` |
| Same-profile historical replay semantic guard | **NO_GO**; old row `sounder.whiteMarker` becomes `sounder.clutter` after 5 down events, even though hash and event count match; old selection-only replay is accepted under candidate code | `479909adb7475c8d9b02dd195b6abb1943593a78f575c2857b6585a1d4336f8c` |

Historical replay detail: after power on, four ticks, MENU and five TrackPad down events (9 total events), both sources still report `F1-public-reference-21`, same `itemIndex=5`, identical `sessionHash` (`f0-fnv1a32-b7e35e70`) and an accepted old replay envelope; however **the selected semantic menu entry differs**. For an editing/ENTER envelope the final hash detects reducer drift and rejects it, but this does not protect *selection-only* replays. Because the adapter profile checksum does not bind the menu order, a source-only reorder under the same revision silently violates existing replay semantics. Merely rebaselining tests to source IDs cannot solve this.

Independent release-gate reviewer SHA `c1a99846aff873ccfa28db81670f5904f966426b957e87e4542cece8fb4ae1d4`: **unit/staging QA GO, historical replay NO_GO, canonical apply NO_GO, release HOLD**. All P12 RED/FAIL receipts and P13 source-RED evidence preserved.

Independent post-Chrome evidence reviewer SHA `41a9a0e07c41b33d0d71dcd99ba6b7bb331f6539ddafd1de12bda857299b9ea0` rehashed **8/8 PNG** and their 375×812 / 1366×768 dimensions, all **72/72** actual module response-body hashes against the stage source, zero reported external/console/request failures, test port4213 closed and canonical39 untouched. Verdict **GO for bounded browser evidence, NO_GO for canonical apply**. One static screenshot inspected in prime: the Sounder order appears inside the synthetic LCD with the instructor cue outside the LCD; not a calibrated OEM pixel claim.

### P13 write-once consolidated seals

- `docs/qa/FCV588_P13_MENU_REPLAY_HOLD_20261116/FCV588_P13_MENU_REPLAY_HOLD_FINAL_INTEGRITY_20261116.json` SHA-256 `5677a5db225e96e1412df4ea2776232081b050c3685b41b68bb2af89466b84db`.
- `docs/qa/FCV588_P13_MENU_REPLAY_HOLD_20261116/FCV588_P13_MENU_REPLAY_HOLD_INDEPENDENT_POSTRECEIPT_20261116.json` SHA-256 `803f190098a38d8eb8607e22651f288c42ed2701b853bd3791256dbb41af5862`.
- The final integrity receipt binds **13 independent evidence inputs, 8 screenshot SHA**, canonical **39/39** and 8 original source JPEG SHA; the separate local readback reproduces those checks. All other test-owned ports closed, original user server4173 PID1204 preserved. These receipts do **not** authorize source apply, product release or hardware acceptance.

## Next necessary bounded work

**P14 should establish an explicit menu-order/replay revision and backward-compatible profile21 support before any canonical apply.** A new menu-order profile must bind the expected menu order to its replay adapter/profile hash; old profile21 envelopes must continue to replay with their historical row order and setting semantics, rather than silently picking new labels or being discarded without an authorized migration policy. Define and test both the *selection-only* old replay case and the committed/editing old replay case, newly created revised-profile deterministic replay, stored settings and power-hold/priorOverlay migration, and fail-closed cross-profile use. Only then rerun source-valid RED/GREEN, full Node/Python/Chrome, independent review, guarded preimage backup/apply and fresh postreceipt. Do not simply change `profile-version.mjs` and claim profile21 is preserved.

F1 Phase6 stays **OPEN**, 65/65 feature claims **HOLD**, `hardwareValidated=false`, installed firmware **UNKNOWN**, complete Vietnamese firmware phrase oracle **SOURCE_GAP**, OEM original rights **REFERENCE_ONLY/HOLD**, native Narrator/NVDA speech and Chrome focus-blur acceptance **NOT_VERIFIED/NOT_RUN**, release **HOLD**. No OEM conformity percentage is inferred.
