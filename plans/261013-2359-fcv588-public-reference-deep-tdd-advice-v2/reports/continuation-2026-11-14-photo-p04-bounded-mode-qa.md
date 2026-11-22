# FCV-588 — P04 bounded DUAL / Bottom Lock / NAV integration, 2026-11-14

**Result:** `P04_BOUNDED_VISUAL_SOFTWARE_QA_PASS_RIGHTS_HARDWARE_RELEASE_HOLD` on Windows canonical `C:\Work\MoPhongMayTrenTau`. This is acceptance of a selected synthetic training-display scope, **not** closure of full P04, Phase 6 or an OEM 100% likeness claim.

## Source-grounded changes

- `src/devices/fcv588/display-layout.mjs`: derives the one global depth readout's DUAL overlay position from real split/window ratio; does not duplicate a depth DOM node.
- `src/devices/fcv588/echo-projection.mjs`: Bottom Lock presentation-only, descending relative 5→0 axis and synthetic historical-column bottom anchor/remap so the illustrative seabed approaches a consistent lower band. Bounds/consensus are constrained near typed synthetic `bottomDepthM`; Bottom Zoom/Marker Zoom remain absolute and independent regression fixture verified byte-equivalent to P03.
- `web/lcd-presentation.mjs`, `web/app.mjs`, `web/styles.css`: NAV1/NAV2 selected boxes own depth; no unselected global DEPTH fallback, NAV separators/hierarchy, DUAL readout intersects the center divider. No new invented GNSS/NMEA/voltage values or localized training disclaimers inside LCD.
- Exactly five changed runtime paths and five changed/new test paths, recorded in `plans/261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261114/p04-stage/P04_STAGE_IMPLEMENTATION_RECEIPT_20261114.json`. Source scenario/session/protocol/model/replay and P03 echo rasterizer were not edited; P04 staged/canonical runtime remains 39 files.

## TDD history and independent review

- First P04 RED failed because new view helpers did not exist. Scoped GREEN 4/4 and focused regression 23/23 followed. Initial full stage attempt failed 24/502 partly because staging lacked docs/plans/sources support junctions and partly due stale test expectations; original FAIL retained. After scaffold/test updates full stage reached 539/539.
- Read-only reviewer found that relative BL *axis alone* did not flatten historical bottom columns. Reviewer-induced RED 15/17 exposed NAV duplicate depth and wrong BL window, then GREEN 21/21. Further new BL-flat RED 4/5 failed because the historical bottom remained stepped; per-column bounded remap and test produced GREEN 22/22. These RED/FAIL files are preserved separately, not rewritten.
- Independent final reviewer verified actual per-column remap, relative BL axis, DUAL single centered readout, NAV no fallback, BZ/MZ compatibility, core/replay SHA boundary and no HIGH/CRITICAL blocker for bounded P04. MEDIUM residual: a broad *future* synthetic fish-only band within roughly 8m of typed seabed can still be mistaken for a BL anchor if true seabed returns are missing. The current `TRAINING_SCENARIO` does not trigger that condition; add a near-bottom fish-only negative fixture in future work, not a hardware/acoustic accuracy claim.

## Source-bound verification

- Final staging Node **541/541 PASS**, Python **13/13 PASS**, Chrome selected **7/7 PASS**. Test-owned strict local Chrome used LF, DUAL, BL-LF, NAV1/NAV2 at 1366×768, DUAL at 375×812, NAV2 at 1920×1080. BL quantitative screenshot proof: 76/76 bottom-band sample columns, coverage 1.0, strongest synthetic row 639/640; DUAL depth intersects split on desktop/mobile; NAV global depth hidden. No console/page/requestFailed/external/body errors and 8/8 OEM `/sources/...jpg` returned 404.
- Controlled dry-run verified sealed P03 source 39/39, P03 final/post SHA, exactly five runtime and five test delta paths. Apply copied **10/10** after preimage ZIP backup and wrote exclusive journal/receipt. Backup `P04_BEFORE_APPLY_20261114.zip` SHA `bd0bfb24e720faf852c741a747330e74c7b3699c9f77f2320324014ede866d11`; guarded receipt `P04_CANONICAL_GUARDED_APPLY_20261114.json` SHA `8e8a222f1d1adaa851a026b4a1390ff11d853e6093699302f1fb382bf531d864`.
- **Fresh canonical** Node **541/541 PASS**, Python **13/13 PASS**, Chrome **7/7 PASS**, 245/245 actual-loaded JS/CSS bodies matched canonical. Stable 37-file browser source manifest hash `35968e27f2c95406036a25155057283f38fac845bb3365f27da0f33d35a77808`; all seven canonical screenshot SHA matched staged image SHA, total 14/14 re-read; test server 4188 closed, user's 4173 remained listening (HTTP 200).
- Stage P04 Chrome receipt SHA `63d916faea9087bd6cc7c201d49c252c9b73a41dec3d69ac75285759bbafaa7f`; canonical P04 Chrome receipt SHA `8818e641a8a03317ab2057451fb65b52263df6dcc04c4d8d5885d99d99a93a56`. No photo source copied into served runtime.

## Write-once final + independent postreceipt

- `docs/qa/FCV588_VISUAL_P04_20261114/FCV588_VISUAL_P04_FINAL_INTEGRITY_20261114.json` SHA `c3a292dc213e660fa855c453eaf324fd9014ddb163e4723cea141a4050a1382b`.
- `docs/qa/FCV588_VISUAL_P04_20261114/FCV588_VISUAL_P04_INDEPENDENT_POSTRECEIPT_20261114.json` SHA `569e4b99a8e8de49502d74db30c0215eb61b238edf3ddaa4d93f6d7ed6b4ec90`.
- Independent post-seal script re-read source SHA 39/39, Node/Python logs, both Chrome receipt + 14 screenshot hashes, 8 original photo SHA, staging QA manifest including original RED/FAIL, P02/P03 parents, guarded ZIP/journal and implementation status ledger; exit code 0. No metadata was added to earlier immutable P02/P03 receipt artifacts.
- Independent read-only reviewer additionally enumerated *actual* runtime inventory (exactly 39, no extra/missing paths), re-read both browser **events** to confirm 245/245 loaded body SHA on each side, verified both ZIP preimage archives and the final/post seals. This closes two present-state verification gaps that the final/post scripts themselves do not fully assert: dynamic detection of future extra runtime paths and row-level revalidation of browser-events bodies. These are **non-blocking QA hardening TODOs** for a future additive audit; do not edit sealed P04 scripts/receipts in place.

## Remaining P04/P05/P06/P07 and authority gates

P04's selected 7-case browser matrix is **not** the complete seven-mode × three zoom variants × three viewports source/photo conformance matrix. Current Blue demonstration scene's bottom (around 49–55m) differs from the White-background, ~19–20m configuration seen in the user's camera JPEGs; do not rewrite scenario/replay truth to fake photo alignment. P05 menu Vietnamese exact phrase oracle remains incomplete; P06 faceplate/camera geometry, P07 Narrator/NVDA, native Windows focus/blur and full cross-mode QA remain OPEN. The original Phase 6 still `OPEN`; all 65 public feature claims `HOLD`, `hardwareValidated=false`, firmware `UNKNOWN`, media rights `HOLD`, `releaseApproval=HOLD`, OEM conformity **not claimed**.
