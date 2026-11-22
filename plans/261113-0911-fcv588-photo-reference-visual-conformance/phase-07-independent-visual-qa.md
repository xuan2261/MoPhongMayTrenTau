---
title: "Phase 7: Independent staged/canonical visual conformance QA"
phase: 7
status: todo
priority: P1
dependencies: [1, 2, 3, 4, 5, 6]
---
# Phase 7 — QA độc lập của visual work package

## Mục tiêu
Chứng minh sửa visual **không phá** reducer, replay, D15, menu, security và quyền nguồn; ghi rõ đối chiếu 8 ảnh ở cấp quan sát/đồ họa, không tuyên bố OEM 100%.

## Files / artifacts dự kiến
| Action | Paths | Mục đích |
|---|---|---|
| Create | `docs/qa/FCV588_VISUAL_<run-id>_FINAL_INTEGRITY.json` | exact runtime manifest (V57 hiện 38), test/QA manifest |
| Create | `docs/qa/FCV588_VISUAL_<run-id>_INDEPENDENT_POSTRECEIPT.json` | đọc lại final + source stage/canonical |
| Create | `docs/qa/screenshots/FCV588_VISUAL_<run-id>/*.png` | 7 display modes + zoom variants + menus, face |
| Create | `plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/reports/<run-id>-visual-reference.md` | link result vào plan thẩm quyền |
| Preserve | `FCV588_V56_*`, original V57 logs, all historical source/photo/manual files | write-once |

## Tests Before (risk-based)
- [x] **STOP trước apply** cho tới khi [V57 final/postreceipt SHA mismatch](./research/2026-11-13-v57-integrity-preflight.md) được đối chứng và giải thích bằng [reconciliation riêng](./research/qa-20261114/v57_reconciliation_20261114.json). Pin final V57 manifest + 38/38 runtime preimages, KHÔNG dùng first V57 guarded attempt làm authority.
- [ ] Source observation/session/replay golden: cùng seed/tick/profile 21 ra session hash và event order giống, dù palette/range/mode thay display projection.
- [ ] Operator workflows: LF→HF→DUAL→ZOOM→NAV; menu save/cancel, GAIN/MODE/BRILL, Battery On/Off, no receiver; D15 lesson/state/replay.
- [ ] HTTP security GET/HEAD mọi URL `/sources/FCV588_GiaoDienThucTeMay2016/*.jpg`, `/docs`, `/sources/manuals`, encoded traversal, POST, unknown root phải bị từ chối; server loopback-only `127.0.0.1`. Kiểm static+browser runtime không dùng WebSerial/WebUSB/WebHID/WebBluetooth/geolocation/outbound network. Duyệt SVG/CSS/JS exact allowlist + embedded data URI/provenance, không chỉ check extension.
- [ ] Browser **actually loaded response-body SHA** và screenshot SHA cùng browser session, viewport/dpr/console/DOM; so **exact expected loaded-URL set** (V57 36/36 mỗi viewport) riêng với **runtime manifest** (V57 38/38); không chỉ check len≥35, HEAD hoặc hash local.

## Test scenario matrix
| Severity | Scenario | Oracle |
|---|---|---|
| CRITICAL | Runtime hashes, photos held outside served roots, replay contracts | source manifest, network negatives |
| CRITICAL | Không ghi đè evidence V56/V57/FAIL; stage guarded apply | original vs post hashes |
| HIGH | LF/HF signal distinct, bottom profile, no fake receiver values | synthetic fixture + unit/browser |
| HIGH | Seven modes + 3 zoom modes + NAV depth anchor left | pure view geometry + screenshots |
| HIGH | Battery replaces picture-rate; menu/save/cancel/BRILL | manual + typed sample + operator browser |
| HIGH | D15 outside device, focus mode, a11y | DOM/keyboard/screenshots |
| MEDIUM | 375×812 / 1366×768 / 1920×1080 + no clipping | real browser dimensions and images |
| UNKNOWN | Exact OEM RGB/glyph/detents, installed firmware, Narrator/NVDA speech, physical reviewer | explicit HOLD / NOT_RUN |

## Execution protocol
1. Read-only source gate: snapshot preimages, hash image atlas and existing receipts; classify intentional vs unexplained drift. Browser/QA ports check ownership.
2. Isolated staging under new work-package name; original FAIL and RED logs stay immutable. Do not modify source before source-valid RED tests prove mismatch.
3. Implement minimal allowlisted changes P02–P06 only after RED→GREEN; targeted tests first, then `npm run check` and `python -m unittest discover -s test -p 'test_*.py' -v`, record exact counts from execution.
4. Stage Chrome at three viewports; record actual HTTP body SHA of every loaded JS/CSS/HTML, screenshots and scenario seeds; test 7 modes, 3 zoom submodes, menu, face and D15.
5. Compare project-generated screenshots with approved P01 landmarks, not raw camera JPEG RMSE; report where source inconclusive. Independent human reviewer may assess qualitative appearance, but not automatically OEM-certified.
6. Scoped GPT-6 GO/NO-GO trước canonical apply; **bắt buộc** reconcile V57 receipt mismatch, pin source allowlist & exact preimages, stage tests hợp lệ; no-new-asset-without-provenance rights gate. Quyền ảnh OEM/hardware/release vẫn HOLD kể cả khi software QA PASS. Chỉ guarded canonical apply và independently repeat tests khi blockers đã giải quyết; không là independent OEM reviewer.
7. Write final receipt once and independent postreceipt reread, using **new** unique filenames; close owned QA ports, leave unrelated processes unchanged; no git/commit/release/install/deploy.
8. Link report to authoritative existing F1 v2 plan Phase6 while keeping its `OPEN`/65 feature claims `HOLD` and `releaseApproval=HOLD` until genuine independent rights/hardware/firmware review.

## Acceptance (software-owned)
- [x] 8/8 original photos hashed and not copied into runtime/distributable.
- [ ] 7 MODE + zoom/menus have deterministic screenshots across 3 browser viewports.
- [x] No unexplained RED/GREEN/full-suite regression failure **for scoped P02**; original failed logs retained; source identity exact. Full P01–P07 still OPEN.
- [x] Actual browser loaded-source SHA and stage/canonical outputs verify **for P02 LF/HF/DUAL/NAV/MENU**, no network leak/security regression.
- [ ] Replay/clock/session/world observation unchanged except explicitly scoped visual presentation.
- [x] **New P02-scoped** independent final/postreceipt write-once verified; all V56/V57 receipts, corrections và original FAILED logs được bảo toàn, không cập nhật SHA cũ để tạo PASS.
- [x] Photo-source confidence and human review separated from software PASS; 65 claims/hardware/release HOLD preserved.

## STOP / NOT_RUN rules
If source SHA unknown, permission unclear or screenshot runner cannot capture an actual frame, mark `BLOCKED` / `NOT_YET_VERIFIED`, not PASS. If any test fails, preserve original log, diagnose fixture/harness/source and stop blind retries. Completion of this **visual work package** is not OEM/physical equivalence and never authorizes real maritime navigation.

## P07 bounded canonical QA milestone — 2026-11-16 (additive)
- [x] Canonical runtime 39/39 matches sealed P04 provenance v3; no P07 runtime edits. Pure LCD logical matrix 63/63 cases and 447/447 checks PASS (viewport names are labels, not physical viewport measurement).
- [x] Actual Chrome 375x812, 1366x768, 1920x1080: 39/39 selected states PASS, 108/108 browser-loaded HTTP source bodies match current canonical bytes, 39/39 screenshot PNG SHA; no external/browser errors. Port 4207 cleaned; user-owned 4173 preserved. Mobile PNG capture may be scrolled and is NOT whole-device framing proof.
- [x] Security/replay: 12/12 boundaries, 47/47 HTTP negatives, deterministic profile21/replay; 8/8 original reference photos preserved outside served runtime. Photo/a11y assessment `PASS_WITH_SOURCE_GAPS`, five D15 tabs verified statically and via Chrome keyboard.
- [x] Fresh full canonical Node 563/563 and Python 13/13. Independent worker-1 reviewed 39 PNG, 108 source bodies, 39 runtime and old P04 seals and issued bounded GO; reviewer SHA `ed6238165799e3094f0c7fa211b296cc7431fd4be3b302262ff6fcfeff5d6933`.
- [x] Write-once P07 [final integrity](../../docs/qa/FCV588_P07_BOUNDED_20261116/FCV588_P07_BOUNDED_FINAL_INTEGRITY_20261116.json) SHA `024dd1d75c7879fe0df88f939739d854a40aa819a459b6e1fbebd186aca91726` and [postreceipt](../../docs/qa/FCV588_P07_BOUNDED_20261116/FCV588_P07_BOUNDED_INDEPENDENT_POSTRECEIPT_20261116.json) SHA `22fc21b744ebedbd5ac4a5998411c3e01f665697fa7fbb2a3726998909775ea6`.
- [ ] Full P07 remains OPEN: native Narrator/NVDA utterances, real OS blur/refocus under POWER, forced-colors, calibrated photo LCD ROI/homography and lawful OEM firmware language oracle NOT_RUN/SOURCE_GAP. 65/65 claims, Phase6/hardware/rights/release HOLD/OPEN. No OEM fidelity percentage.

## P08 photo ROI hypotheses and native readiness — 2026-11-16 (additive, not new F1 phase)
- [x] Eight original 590x1280 JPEGs rehashed, image-space tentative four-corner metadata recorded for 8/8, independent image reviewer worker-1 GO **only for bounded LCD-plane normalized topology**, not OEM pixel/mm. No image copies/warped derivatives created.
- [x] Independent two-rater measurement comparison: 32 corners, five image sets contain at least one point discrepancy above initial 20px estimate, max **34.93px**. Original hypotheses preserved; precise ROI calibration **HOLD**, no averaged coordinates/CSS runtime apply.
- [x] Windows native a11y readiness reviewed independently: Narrator executable present but spoken output NOT_RUN, NVDA not found/installation BLOCKED, real OS blur NOT_RUN, High Contrast disabled and native forced-colors NOT_RUN; no OS setting/focus/browser altered.
- [x] Write-once P08 [final integrity](../../docs/qa/FCV588_P08_ROI_READINESS_20261116/FCV588_P08_ROI_READINESS_FINAL_INTEGRITY_20261116.json) SHA `3d1a05419617807b3f3ef24042725bf414d53257d5e7157155ca0a6b787bf16a` and [postreceipt](../../docs/qa/FCV588_P08_ROI_READINESS_20261116/FCV588_P08_ROI_READINESS_INDEPENDENT_POSTRECEIPT_20261116.json) SHA `82706f90bf424515abc0383d9eb8b5a7895755bf2de1a040c7890a35f8610dd7`.
- [ ] Next valid quantitative step is repeatable two-rater exact **active display vs aperture edge definition**, camera intrinsics/coplanar scale for physical claims, and genuine Windows native screenreader/blur run in a controlled session. Phase6/65/rights/hardware/release HOLD.

## P09 boundary-class discipline and geometry QA — 2026-11-16
- [x] Explicit pre-evidence contract distinguishes **active LCD content** (class A) from **visible rounded inner aperture virtual line intersections** (class B). Prior P08 annotations are not blind and are not averaged or rewritten.
- [x] Independent photo reviewer re-inspected 8 JPEG and conditionally accepted **only 2 restricted class-B quadrilaterals** (`dual.jpg`, `zoom.jpg`) using visible straight edge sections, repeat fits and source P08 uncertainty. The other 6 class-B and **all 8 class-A** exact ROIs remain HOLD; no physical/OEM calibration promoted.
- [x] Independent deterministic numerical homography QA: 16/16 base maps and 256/256 bounded corner perturbations valid mathematically. 5 photo-space divider locations trace to P07, not all 8; no exact 480x640 OEM pixel proof. No photo warp/crop saved.
- [x] P09 [final integrity](../../docs/qa/FCV588_P09_ROI_BOUNDARY_20261116/FCV588_P09_ROI_BOUNDARY_FINAL_INTEGRITY_20261116.json) SHA `759f146c349c2ad348fc5b98e21fbc79d1d857623253811f0a01d3b9408995b9` and [postreceipt](../../docs/qa/FCV588_P09_ROI_BOUNDARY_20261116/FCV588_P09_ROI_BOUNDARY_INDEPENDENT_POSTRECEIPT_20261116.json) SHA `cc3888a17c34271ba9163b86cfe4427442a1e6b5a847e4ac714661565657a26e`.
- [ ] Class-A active-display four-corner ROI for 8/8, lens and physical-scale calibration, firmware oracle, real native a11y/blur and F1 Phase6/65/rights/hardware/release remain OPEN/HOLD. No CSS/apply.

## P10 Windows accessibility boundaries — 2026-11-16
- [x] Fresh scoped Windows Node regression **17/17 PASS** for POWER hold, pad repeat and rotary adapters; exact-source Chrome **emulated** forced-colors at 1366x768 PASS for POWER focus outline (solid 3px), D15 5 tabs/5 panels and no page errors; one simulator screenshot SHA recorded.
- [x] Independent Narrator feasibility review: signed Windows Narrator executable/UIAutomation available but Narrator NOT_RUNNING, no trustworthy spoken-output capture, NVDA not installed/discovered. Spoken accessibility QA **BLOCKED/NOT_RUN**.
- [x] Real Win32 blur test attempts **FAILED_OR_BLOCKED twice**; evidence was preserved. The foreground remained Helium (HWND 5769834) in second attempt, not test-owned Chrome; therefore no native `window.blur` event provenance or POWER-hold cancellation can be accepted. This is an environment/harness blocker, not proof of a product bug.
- [x] Independent reviewer validated exact error/evidence classifications; [P10 final integrity](../../docs/qa/FCV588_P10_A11Y_BOUNDARIES_20261116/FCV588_P10_A11Y_BOUNDARIES_FINAL_INTEGRITY_20261116.json) SHA `414c0151053bec55271032170e0fba2139fd1627e5fee7524cdf6c1bcf490655`; [postreceipt](../../docs/qa/FCV588_P10_A11Y_BOUNDARIES_20261116/FCV588_P10_A11Y_BOUNDARIES_INDEPENDENT_POSTRECEIPT_20261116.json) SHA `df2cb60996da7f3f557642f329d794198aea9a85ac8fe5084429bee1931c12dc`.
- [ ] Actual interactive Narrator audio+verified transcript, user-desktop foreground ownership under held POWER, Windows native High Contrast and approved NVDA install remain BLOCKED/NOT_RUN. Full visual P07/Phase6/65 claims/hardware/firmware/rights/release remain OPEN/HOLD.

## P11 native Windows foreground ownership study — 2026-11-16 (bounded QA only)
- [x] Source-frozen P10 parent and 39/39 runtime SHA, 8/8 OEM reference-only JPEG verified. Four write-once P11 Win32 field-test attempts preserved, including every FAILED_OR_BLOCKED evidence receipt. First two exposed foreground setup/harness limits. In V3 (Playwright Chrome) and V4 (standalone Chrome isolated profile with Win32 key injection), **both Chrome foreground at POWER-down and the transfer to a test-owned Python witness foreground were proven by exact HWND/PID/executable**.
- [x] V3/V4 recorded POWER pressing true / event count initial+1 before transfer, but no post-transfer trusted `window.blur` and browser still reported `document.hasFocus() === true`; POWER remained pressing. **Native POWER cancellation NOT_VERIFIED**, not product FAILED or PASS. No source-valid simulator defect established because a Chrome window blur event was never delivered to the source's cancellation handler.
- [x] Independent Win32 method review SHA `b9d3586df5bbb1459ee68a478ce70652cd1a99e618edb5bc14c73161f4ef73b9`; independent baseline SHA `2474185023238fa8f707896f75783a0c11d2e8b1f92f0e36761f59f98e0a00d6`; independent final evidence reviewer SHA `33df2e66e63ee173a5fca9293da7f2d26e0ed7a96a8ae6280c857b5291658667`.
- [x] Write-once P11 [final integrity](../../docs/qa/FCV588_P11_NATIVE_FOCUS_BOUNDARIES_20261116/FCV588_P11_NATIVE_FOCUS_FINAL_INTEGRITY_20261116.json) SHA `845b4fe9cf9b184a74ddba91783362e9446c1219d38362c16166d4b3d6a44c87`; [postreceipt](../../docs/qa/FCV588_P11_NATIVE_FOCUS_BOUNDARIES_20261116/FCV588_P11_NATIVE_FOCUS_INDEPENDENT_POSTRECEIPT_20261116.json) SHA `392220f62ae29c2f1bf77b73c90d016b1a3a40e115a8c04612ce59a728b09f98`. QA-owned ports4211/4212/9225 closed; user server4173 PID1204 preserved.
- [ ] Do not rerun the same OS focus method blindly. Further native acceptance requires a **materially different independently justified focus-observation/interactive method**; Narrator/NVDA actual speech, native High Contrast, photo calibration, firmware/rights/hardware/release/Phase6/65 remain OPEN/HOLD.

## P12 public manual/2016 photographed menu source review — 2026-11-16
- [x] Direct manufacturer OME-23890-E **PDF p59 printed AP-1** and the distinct 2016-collection Vietnamese menu JPEG `giaoDien.jpg` support the same 13 Sounder item **semantic order**. 8 original photos SHA match; only one image contains legible actual menu-option rows. Firmly separate that bounded photograph from installed firmware version (UNKNOWN) and full Vietnamese phrase oracle (SOURCE_GAP).
- [x] Current source menu inventory: five categories, 67 items, including 7 synthetic menu paths and 2 firmware-dependent training previews. Independent manual audit 35 source rows (23 direct/4 extrapolation/8 gaps); targeted canonical menu Node25/25 PASS; photographic order crosswalk 12/13 differing positions and 21 inversions. Current White Line Off/On is not exact manual width/Edge; do not modify alongside menu order.
- [x] Source-valid RED on canonical **2/3**, isolated staging reorder **GREEN 3/3**, candidate modifies only order of 13 Sounder menu IDs (1/39 staged runtime paths); stage metadata/values unchanged. Full staging Node **499/526 PASS, 27 FAIL**, with 22 missing-fixture/cascade and 5 index-dependent behavior tests; preserve all RED/FAIL receipts.
- [x] Independent source review GO but **canonical APPLY NO_GO** SHA `26bbcef289bf1b3663ac7a79766b87ff6431684632f07414aca4537d3bd29c6d`; write-once [P12 final integrity](../../docs/qa/FCV588_P12_MENU_SOURCE_20261116/FCV588_P12_MENU_SOURCE_FINAL_INTEGRITY_20261116.json) SHA `5afe2663a1d0d3dff6e213fc537fad3b7dfe5817d7aa776ee4a769e580780855`, [postreceipt](../../docs/qa/FCV588_P12_MENU_SOURCE_20261116/FCV588_P12_MENU_SOURCE_INDEPENDENT_POSTRECEIPT_20261116.json) SHA `538ff2a5e518ed663274958c3a2c9c69e7458a7caa5317f868ae67fe4e184792`.
- [ ] P13 only after fixture-complete stage, strict source-authored semantic menu-navigation tests, full Node/Python/Chrome and independent GO/guarded backup/apply. Current canonical runtime39/39 unchanged, no release; full P07/Phase6/65/hardware/firmware/rights HOLD.

## P13 fixture-complete Sounder order and historical replay gate — 2026-11-16
- [x] Source-authored AP-1 13 Sounder order staged from P12 in a complete fixture mirror with reference-only `sources` junction and no OEM assets in served web. Full initial stage Node **RED 558/563**, exact 5 fixed-index failures, then 3 stricter semantic-ID test files: Node **563/563 GREEN**, Python **13/13 PASS**. One staged runtime file of 39 changed, canonical still exact 39/39 P07.
- [x] Real Chrome on test-owned loopback 4213 with two external viewports (375×812,1366×768), 13/13 AP-1 row/TrackPad traversal, **8 screenshots**, **72/72 real source HTTP body SHA**; independent browser rehash SHA `41a9a0e07c41b33d0d71dcd99ba6b7bb331f6539ddafd1de12bda857299b9ea0`. Chrome evidence GO is bounded and does not certify OEM pixels/locale.
- [x] New profile21 replay probe SHA `479909adb7475c8d9b02dd195b6abb1943593a78f575c2857b6585a1d4336f8c` proves unchanged 9-event replay/hash but **White Marker becomes Clutter** after proposed reorder, without checksum warning. Independent release reviewer SHA `c1a99846aff873ccfa28db81670f5904f966426b957e87e4542cece8fb4ae1d4` verdict: QA GO, **profile21 historical replay/canonical apply NO_GO**. No canonical runtime/test apply or backup/apply performed.
- [x] [P13 final](../../docs/qa/FCV588_P13_MENU_REPLAY_HOLD_20261116/FCV588_P13_MENU_REPLAY_HOLD_FINAL_INTEGRITY_20261116.json) SHA `5677a5db225e96e1412df4ea2776232081b050c3685b41b68bb2af89466b84db`; [independent postreceipt](../../docs/qa/FCV588_P13_MENU_REPLAY_HOLD_20261116/FCV588_P13_MENU_REPLAY_HOLD_INDEPENDENT_POSTRECEIPT_20261116.json) SHA `803f190098a38d8eb8607e22651f288c42ed2701b853bd3791256dbb41af5862`.
- [x] P14 menu-order profile22 / archived profile21 semantic replay gate independently approved and guarded-applied; canonical Node577/Python13/Chrome10 passed. Full P07/Phase6/65, firmware exact locale, native screenreader/focus, hardware, OEM rights and release remain OPEN/HOLD.

## P14 all-historical profile21 + AP-1 profile22 — canonical integrated 2026-11-16
- [x] Archived historical profile21 reducer/transitive device semantics and six byte-pinned original replay fixtures; active profile22 13-row Sounder AP-1 menu and ordered-ID replay hash; version-aware historical device-LCD menu and strict settings21/19 import.
- [x] Stage Node577/577, Python13/13, Chrome10/10 and 164/164 HTTP source SHA. Independent canonical apply GO SHA `45ae1cc5418e416ce868ee415eb4fec501f535e9fcaf71e8064df60a1b8937ad`; guarded 38-path apply receipt SHA `82b93e74b055491a3d02dc081ce13fb78f40a1d42fdcfb0b5e1d95d196dd0159`. Canonical runtime50/50, Node577/577, Python13/13, Chrome10/10 and 164/164 body SHA, server4173/PID1204 preserved.
- [ ] This P14 integration is bounded software evidence only: F1 Phase6 OPEN, 65/65 claims, installed firmware, OEM pixel geometry/rights/hardware validation, native speech/focus/high-contrast and release remain HOLD/NOT_VERIFIED. See F1 [P14 report](../261013-2359-fcv588-public-reference-deep-tdd-advice-v2/reports/continuation-2026-11-16-photo-p14-versioned-replay-profile22-postapply.md).
- [x] P14 FINAL integrity $finalsha; independent postreceipt PASS $postsha. Canonical 50/50 SHA, 577/577 Node, 13/13 Python, Chrome10/10 (164/164 HTTP), legacy21 six frozen fixtures, OEM JPEG8/8 preserved and not served; user server4173 PID1204 preserved. **RELEASE HOLD**; see docs/qa/FCV588_P14_VERSIONED_REPLAY_20261116/.

## P16 current Chrome/Edge CQW and native readiness (2026-11-17)
- [x] Windows current browser QA: installed Chrome 157.0.8103.79 and Edge 157.0.4341.60, real Playwright 82/82 checks; 6 viewport observations, 234/234 source HTTP body SHA, four screenshot SHA, Chrome/Edge 2/2 RGBA-pixel-identical screenshot pairs, 8 OEM JPEG HTTP404, zero external/JS errors. QA port4217 cleaned; user server4173/PID1204 retained.
- [x] Independent source/compatibility audit GO for current browsers and SOURCE_GAP for untested old Chromium/WebView (<105 lacks cqw); no browser minimum declared by project, so NO runtime fallback invented. Canonical50/50 runtime and OEM original8/8 unchanged vs P15; no staged or guarded apply required in P16.
- [ ] Windows native Narrator speech, NVDA, native High Contrast, target-window UIA semantics and actual POWER window.blur: NOT_RUN/BLOCKED/NOT_VERIFIED. Native inventory only. F1 Phase6 OPEN, 65/65 claims HOLD, firmware installed UNKNOWN, hardwareValidated=false and OEM rights/releaseApproval HOLD.
- [x] Final QA-only integrity: `docs/qa/FCV588_P16_BROWSER_BOUNDARY_20261117/FCV588_P16_BROWSER_BOUNDARY_FINAL_INTEGRITY_20261117.json` SHA `d40287d951c887581ce3a1d1776ed7707add77c7393c86362fc13ef03000ab90`; read source-based report SHA `3c37377e48b5c0f64e55e6cc9d678ee21e3d79ddce4be97e574cae822654f178`.