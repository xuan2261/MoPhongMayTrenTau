# ak-plan --deep --tdd — read-only adversarial review (2026-11-13)

## Phạm vi và kết quả
Bốn reviewers độc lập đã đọc `plan.md`, bảy phase và source: (1) rights/security; (2) evidence/assumptions; (3) regression/flow/integrity; (4) scope/complexity. Tất cả chỉ đọc, không sửa sản phẩm hoặc QA receipts. Tổng phát hiện 20 raw (mỗi người 5), nhóm và hợp nhất thành 11 chủ đề; nhận 11 chủ đề cho **plan-only** corrections, không thay đổi tiêu chí phần mềm để làm PASS.

### Findings đã xét, có bằng chứng
| Chủ đề | Mức | Evidence | Hướng xử lý trong plan |
|---|---|---|---|
| V57 milestone authority sai | **HIGH** | `docs/qa/FCV588_V57_HEADER_COMPACT_20261031/V57_HEADER_COMPACT_INDEPENDENT_POSTRECEIPT_20261031.json:3-16`; `phase-01-start.md:16` (before) | Sửa toàn plan: V57 final+postreceipt đã tồn tại. Preflight mới runtime 38/38 MATCH nhưng **scoped integrity hash MISMATCH** vs postreceipt. Gating STOP và reconciliation |
| RED LF/HF giả | HIGH | `test/fcv588-public-display.test.mjs:186-195`, `phase-03-echo-renderer-lf-hf.md:27-32` (before) | Characterize existing GREEN; chỉ RED texture/geometry còn thiếu |
| Typed voltage chưa có | HIGH | `src/devices/fcv588/display-widgets.mjs:39-43`; `web/app.mjs:551-555` | No numeric voltage until approved typed source; `BATTERY_VALUE=HOLD` |
| Scenario/morphology ownership conflict | HIGH | `src/core/scenario.mjs:59-72,153-185`, `phase-03-echo-renderer-lf-hf.md:35-36` (before) | Renderer-only texture; don't double-apply frequency or alter world/schema |
| NAV duplicated depth | HIGH | `web/app.mjs:354-355,531-533`; `web/styles.css:96-99` | One depth owner within NAV pane; suppress global depth overlay |
| Source rights/derivative leakage | HIGH | `tools/server.mjs:24-27,64-71`, `tools/verify_public_runtime_assets.mjs:10-13` | Per-asset rights ledger, no OEM photos/font derivatives in source/served roots, audit SVG/CSS/JS and hashes |
| Image perspective and measurement | MEDIUM | `phase-01-start.md:37-39`; `phase-06-faceplate-workbench-focus.md:27-28` (before) | Homography only planar LCD; outer 3D enclosure needs uncertainty, cannot infer mm |
| Browser integrity sets conflated | MEDIUM | V57 scoped receipt runtime 38 vs browser bodies 36; `phase-07-independent-visual-qa.md:22-27` (before) | Exact manifest and loaded URL set checked separately, same captured session |
| Missing photo/real I/O negative tests | HIGH | `tools/server.mjs:10-13,46-67`; `phase-07-independent-visual-qa.md:26` (before) | Block all 8 photo URL paths incl encoding, assert loopback only, browser+static forbids real I/O/outbound |
| Duplicate module owners & repeated broad QA | MEDIUM | `src/devices/fcv588/display-layout.mjs:6-24`, `phase-02-lcd-geometry-and-status.md:22` (before) | Reuse existing owners; targeted phase smoke, full stage/canonical matrix only P07 |
| Vietnamese menu locale/source and D15 replay scope | MEDIUM | `phase-05-menu-dialog-fidelity.md:32-39`; `src/core/session.mjs:161-173` | Separate `MENU_LOCALE_CONFORMANCE=HOLD` if untranslated source; only D15 UI toggle is replay-neutral |

### Disposition và remaining blockers
- Review: **4/4 reviews delivered**, 11 topics accepted as plan constraints, 0 source-runtime mutations. Findings overlap consolidated; reviewer results may cite **before-correction** line numbers. Report is a planning self-review, not external FURUNO acceptance.
- **BLOCKED for implementation**: V57 scoped-integrity SHA mismatch with independent postreceipt; source runtime pins themselves currently 38/38 matched. [Exact readback receipt](./2026-11-13-v57-integrity-preflight.md). **No code work or new checkpoint until reconciled.**
- **HOLD**: installed firmware, rights for derivatives/distribution, physical OEM exact font/RGB/geometry and independent reviewer. Battery numeric value and Vietnamese exact full menu keep source-specific HOLD.

## Whole-plan consistency sweep
- Re-read/checked `plan.md` and phases 01–07, research + V57 preflight.
- Major superseded terms checked: `V57 unsealed`, `Battery 13.7V` hardcoding, `homography for enclosure`, forced LF/HF RED, extra pane geometry owners, "all D15 replay neutral".
- Checklist is **69 user-visible items** in 7 phases. Numbered instructions in each phase are **substeps of the checklist**, not separately hydrated tasks; do not present them as extra completed actions.
- The **remaining implementation gate** is V57 integrity reconciliation and own-source rights mapping; no contradiction requiring runtime modifications to finalize the plan.

## Verification vs acceptance
`ak plan validate` checks structure/paths/frontmatter, NOT OEM realism or V57 receipt integrity. All tasks remain PENDING. Next operation if authorized: Phase1 read-only reconciliation; **not** `ak-cook` on product until integrity gate clears.

