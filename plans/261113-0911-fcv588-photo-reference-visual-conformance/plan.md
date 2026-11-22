---
title: "FCV-588 — Visual conformance theo ảnh máy thật, Deep / TDD"
description: "Xây lại presentation LCD/sonar/menu/faceplate để bám 8 ảnh thực tế, bảo toàn core/replay và chứng cứ F1."
status: in-progress
priority: P1
effort: "TBD after photo/viewport baseline; not a promised schedule"
tags: [fcv588, public-reference, photo-atlas, visual, deep, tdd, offline]
created: 2026-11-13
blockedBy: []
blocks: []
---

# FCV-588 — Photo-reference visual conformance (Plan / Deep / TDD)

## Outcome / phạm vi
Nâng tính nhận diện và thực tế giao diện **FCV-588** trên phần mềm huấn luyện offline Windows: LCD 480×640; header/thang sâu/readout; LF/HF và đặc trưng hồi âm; DUAL/BL-BZ-MZ/NAV; menu/controls; vỏ/phím/núm; ưu tiên trình bày thiết bị thay vì workspace teacher. Chứng minh bằng fixtures tự sinh, phép đo landmark từ ảnh được quyền sử dụng và Chrome actual-loaded source, **không dùng điểm phần trăm giống OEM**.

**Kế hoạch này là work package trực thuộc** `plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/plan.md`, đóng góp phần visual cho **Phase 6**; không thay thế plan thẩm quyền hoặc đổi status Phase 6. Source/QA gốc và cả V56/V57 receipts giữ nguyên. **Tại thời điểm lập kế hoạch**, V57 có SHA final/postreceipt không khớp và là BLOCKED; đợt triển khai 14/11 đã đối chiếu byte chính xác và lập [reconciliation riêng](./research/qa-20261114/v57_reconciliation_20261114.json), không sửa receipt gốc.

## Nguồn bắt buộc
- 8 ảnh original `sources/FCV588_GiaoDienThucTeMay2016/{giaoDien,lf,hf,dual,zoom,zoom2,nav1,nav2}.jpg`; 590×1280 ảnh máy chụp lệch, năm/firmware **chưa xác minh**; xem [source audit có 8 SHA](./research/2026-11-13-photo-source-and-code-audit.md).
- [FURUNO product specification](https://www.furuno.com/en/products/fishfinder/fcv-588/index.html): LCD 480×640 / 8.4in; 233W×270H×158D overall, LCD 128.2×170.9mm theo brochure.
- [OME-23890-E Manual](https://www.furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/fcv628_fcv588_operators_manual.pdf): các mục 1.4, 1.22, 2.4 và 4.10. `Battery On` thay vị trí tốc độ ảnh ở header; lựa chọn ngôn ngữ `Viet Nam` có trong manual, nhưng exact translated strings và firmware ảnh vẫn chưa được xác minh.
- [Nguồn public UI matrix V14](../../docs/research/FCV588_PUBLIC_UI_REFERENCE_MATRIX_2026-10-14.md), [visual comparison V28](../../docs/research/FCV588_OFFICIAL_VISUAL_COMPARISON_V28.md), [Phase6 authority](../261013-2359-fcv588-public-reference-deep-tdd-advice-v2/phase-06-conformance-classroom-qa.md).

## Design contract & trade-offs
- **Chọn:** các view spec theo từng mode và shared Canvas painter primitives + CSS/SVG mặt máy; giữ `src/devices/fcv588/display-layout.mjs` làm **một nguồn sở hữu pane geometry**, `echo-projection.mjs` và `web/lcd-presentation.mjs` làm projection hiện hữu, mở module mới chỉ khi scout chứng minh không thể mở rộng chủ sở hữu cũ. Rendering deterministic từ typed observations, không mở side channel.
- **CSS-only patch:** chi phí thấp nhưng giả định renderer chung đủ đúng; thất bại ngay ở voltage slot, depth axis, LF/HF texture và NAV pane.
- **Full rewrite/firmware clone:** rủi ro lớn cho reducer/event/replay/D15 và rights, không có căn cứ cần thiết.
- **Load-bearing assumption:** source state hiện đủ cho phần hình học và echo; **chưa có typed voltage number** (chỉ có trạng thái Battery `NO_HARDWARE_DATA`). Khi `Battery On`, thay picture-rate slot theo manual nhưng **không hiển thị một con số giả**. Chỉ đưa điện áp synthetic vào UI sau khi có hợp đồng nguồn typed được phê duyệt và kiểm compatibility; nếu không thì giữ `BATTERY_VALUE=HOLD`.
- **Localization:** Vietnamese OEM-language option được manual nêu, nhưng chỉ triển khai label dịch khi có phrase oracle; không lấy câu nhắc giảng viên làm chữ OEM. Nếu thiếu atlas chuỗi Việt, `MENU_LOCALE_CONFORMANCE=HOLD` riêng, không đánh lận bằng menu tiếng Anh.

## Giai đoạn / dependencies
| # | Phase | Depends | Status |
|---|---|---|---|
| 01 | [Khóa ảnh gốc, atlas và baseline](./phase-01-start.md) | — | TODO |
| 02 | [LCD geometry, header, scale, depth](./phase-02-lcd-geometry-and-status.md) | 01 | TODO |
| 03 | [Hồi âm LF/HF động và tất định](./phase-03-echo-renderer-lf-hf.md) | 01,02 | TODO |
| 04 | [DUAL, 3 kiểu ZOOM, NAV1/NAV2](./phase-04-dual-zoom-nav-visuals.md) | 02,03 | TODO |
| 05 | [Menu/hộp thoại đúng source](./phase-05-menu-dialog-fidelity.md) | 01,02,04 | IN_PROGRESS (bounded canonical QA PASS) |
| 06 | [Vỏ/phím/núm và focus workspace](./phase-06-faceplate-workbench-focus.md) | 01,02,04,05 | IN_PROGRESS (bounded canonical QA PASS) |
| 07 | [QA độc lập stage/canonical](./phase-07-independent-visual-qa.md) | 01–06 | TODO |

## TDD & nghiệm thu có thể đo
- [ ] Khóa **8/8** ảnh + SHA + rights/source + ROI/landmarks/uncertainty, screenshot baseline riêng nguồn giả lập; không coi camera JPEG là LCD framebuffer.
- [ ] Mỗi phase: characterization existing GREEN trước; chỉ viết **source-valid RED cho hành vi thực sự còn thiếu**, rồi sửa hẹp → targeted GREEN + regression, không tạo RED giả cho LF/HF differentiation/determinism vốn đã có; scout lại stage/current files trước pha sau.
- [ ] Có test về `Battery On` thay picture-rate; đúng pane/header/scale khi LF/HF/DUAL/BL-BZ-MZ/NAV; NAV số sâu trong khối trái; LF/HF có hình thái khác trên cùng scene; không bịa real GNSS/voltage.
- [ ] Viewport thật và images cho 375×812, 1366×768, 1920×1080; code-generated golden và photo landmarks được review; không dùng SSIM% làm OEM claim.
- [ ] Session hash/replay/world sensor unchanged bởi chỉ đổi giao diện; D15 ngoài LCD/face; không nhập media OEM vào served roots hoặc HTTP leak.
- [x] Browser actually-loaded response SHA, screenshot SHA; stage+canonical Node/Python/browser độc lập **cho gói P02**, guarded allowlist apply; final+independent postreceipt **tên mới**; không ghi đè V56/V57/FAIL. Gói full P01–P07 chưa hoàn thành.
- [x] Phase6 nguyên bản vẫn `OPEN`, 65 claims/HW/firmware/OEM rights/release `HOLD` nếu không có chứng cứ độc lập và quyền hợp lệ.

## Failure protocol / next start
`SHA drift`, nguồn chưa xác minh, quyền chưa rõ, untested OS/browser prerequisite → `STOP/BLOCKED/NOT_YET_VERIFIED`, không restore/overwrite/blind retry. V57 historical scoped `aaa6c3...` khác postreceipt `8efde8...` đã được **giải thích bằng đúng hai metadata field** sau khi report nối 1.582 byte; phục dựng `8efde8...` trong bộ nhớ, reconciliation mới không rewrite lịch sử. Canonical hiện có gói P02 được guarded apply riêng; **trước khi triển khai P03/P04/P05/P06**, phải đo lại preimage canonical hiện tại, lập staging mới và theo TDD/Chrome đầy đủ. Không coi log 520/13 ngày 31/10 là bằng chứng current.

## Trạng thái quy trình
- `ak-brainstorm --ultra`: 5/5 usable candidate (slot 5 retry một lần), verifier retry một lần, chọn Candidate A; **same-tier** review, không có Kongming độc lập. [Cohort/receipt](./research/brainstorm-ultra-review.md).
- `ak-plan --deep --tdd`: 7 phase tạo bằng AgentKit CLI; **69 checklist được CLI đếm**, các bước đánh số là hướng dẫn thực hiện của checklist, không phải 37 task độc lập cần hydrate. Red-team và consistency review ở [báo cáo phản biện](./research/plan-red-team-review.md).
- **Current plan status**: `IN_PROGRESS`, tiến độ gói P02 đã được ghi receipt nhưng Phase 1–7 không được đánh dấu hoàn thành khi còn các mục chưa có evidence. **Implementation gate**: V57 metadata mismatch `RECONCILED`; chỉ source-bounded P02 `VERIFIED`; các phase còn lại `NOT_YET_VERIFIED`.
- Research chính: [photo source audit](./research/2026-11-13-photo-source-and-code-audit.md).

## Đợt thực thi source-bounded P02 — 14/11/2026
- [Ảnh/landmark atlas từ tám ảnh gốc](./research/2026-11-14-photo-mode-atlas.md), SHA 8/8 và quyền ảnh `HOLD`; không nhúng JPEG vào runtime.
- [V57 SHA metadata reconciliation write-once](./research/qa-20261114/v57_reconciliation_20261114.json), [guarded canonical apply 7 paths](./research/qa-20261114/visual_v2_canonical_apply_20261114.json), [ZIP preimage lưu riêng](./research/qa-20261114/visual_v2_before_apply_20261114.zip).
- [Final source/software QA](../../docs/qa/FCV588_VISUAL_P02_20261114/FCV588_VISUAL_P02_FINAL_INTEGRITY_20261114.json), [independent postreceipt](../../docs/qa/FCV588_VISUAL_P02_20261114/FCV588_VISUAL_P02_INDEPENDENT_POSTRECEIPT_20261114.json). Canonical Node 526/526 PASS; Python 13/13 PASS; stage/canonical Chrome 3/3 viewport mỗi môi trường, 18+18 ảnh, 34 actual-loaded bodies mỗi viewport; 38/38 runtime canonical=stage; chỉ 3 web runtime khác V57. Không có OEM/photo similarity score.
- [Bổ sung ZOOM desktop](../../docs/qa/FCV588_VISUAL_P02_20261114/FCV588_VISUAL_P02_ZOOM_ADDENDUM_20261114.json): LF-ZOOM/HF-ZOOM × Bottom Lock/Bottom Zoom/Marker Zoom 6/6 Chrome PASS, 6 PNG, 34 actual-loaded bodies mỗi case; original harness FAILED do `innerText` collapse whitespace giữ nguyên, retry mới mới PASS. [Biên bản nối tiếp trong F1 v2](../261013-2359-fcv588-public-reference-deep-tdd-advice-v2/reports/continuation-2026-11-14-photo-p02-visual-qa.md).
- **Vẫn còn:** P01 pixel-normalized ROI/homography, ZOOM đủ ba viewport và so trùng ảnh thật, P03 echo morphology, P04 renderer submode, P05 menu ngôn ngữ Việt theo oracle, P06 faceplate, full P07 matrix/physical & accessibility review. P02 Battery chỉ `NO_HARDWARE_DATA`, không bịa giá trị volt.

## P03 V2 source-bounded canonical integration — 14/11/2026
- [x] Staging P03 thêm synthetic deterministic LF/HF echo rasterizer, đánh dấu `SYNTHETIC_DISPLAY_ONLY`; TDD RED và provenance false-bottom RED→GREEN bảo toàn tại `research/qa-20261114/`. Independent worker-8 code re-review GO; 535/535 Node và 13/13 Python staging PASS.
- [x] Chrome stage V2 9/9 PASS, 35 actual-loaded JS/CSS bodies mỗi case khớp staging, nguồn 8 OEM photos đều HTTP 404, screenshots có hash.
- [x] Corrected guarded dry-run `P03_DRY_RC=0` và guarded canonical apply chính xác 4 tệp, ZIP preimage + journal + receipt write-once; 39/39 runtime canonical==stage. Không sửa core/world/replay/firmware hoặc sử dụng OEM JPEG.
- [x] Fresh canonical Node 535/535, Python 13/13; Chrome canonical 9/9 PASS, `sourceTreeStable=true`, `serverCleanup=PASS` tại `research/qa-20261114/p03-canonical-browser-v2/`.
- [x] Final P03 integrity SHA `1132a7d8eae167a9afa60e5271bfec282b53b848054f3637cb973467fcd67c6d`, independent postreceipt SHA `48abc24fecae4df657e79d4ed7ba6d365fb4a97a086fbf99792b9b8535da362e` đã ghi write-once và kiểm lại. Gói P03 source-bounded hoàn tất, nhưng Phase 1/2 và toàn bộ các mục khác chưa hoàn thành.
- [ ] P04/P05/P06/P07 vẫn còn phần OPEN: full zoom/mode matrix, menu Việt theo phrase oracle, faceplate, full accessibility, và review nguồn ảnh. Phase6/65 claims/rights/firmware/hardware/release vẫn OPEN/HOLD, không suy ra % giống OEM.

## P04 V2 bounded DUAL/BL/NAV — canonical post-apply QA ngày 14/11/2026
- [x] Stage tách từ P03 sealed runtime39; 5 runtime delta + 5 test delta đúng allowlist. Lỗi Bottom Lock không phẳng được reviewer phát hiện sau 539/539 Node PASS, lưu NO-GO/RED 4/5; sau sửa per-column remap có GREEN 22/22, full stage Node 541/541, Python 13/13, Chrome stage V2 7/7 PASS gồm phép đo BL-flat định lượng, 8 ảnh gốc HTTP 404. Independent reviewer GO **chỉ cho phạm vi bounded**.
- [x] Guarded P04 dry-run PASS với parent P03 final/post SHA; canonical guarded apply 10/10 paths sau backup SHA `bd0bfb24e720faf852c741a747330e74c7b3699c9f77f2320324014ede866d11`, receipt SHA `8e8a222f1d1adaa851a026b4a1390ff11d853e6093699302f1fb382bf531d864`, runtime39/39 stage=canonical.
- [x] Fresh canonical Node 541/541 PASS, Python 13/13 PASS; Chrome canonical 7/7 PASS, actual loaded JS/CSS 245/245, 7 screenshot SHA matched stage, no browser errors, 8 photo URLs HTTP 404. P04 [final integrity](../../docs/qa/FCV588_VISUAL_P04_20261114/FCV588_VISUAL_P04_FINAL_INTEGRITY_20261114.json) SHA `c3a292dc213e660fa855c453eaf324fd9014ddb163e4723cea141a4050a1382b` và [independent postreceipt](../../docs/qa/FCV588_VISUAL_P04_20261114/FCV588_VISUAL_P04_INDEPENDENT_POSTRECEIPT_20261114.json) SHA `569e4b99a8e8de49502d74db30c0215eb61b238edf3ddaa4d93f6d7ed6b4ec90` đã ghi write-once và kiểm đủ 39/39 runtime.
- [ ] Chưa có full 7-mode × 3-zoom × 3-viewport visual conformance; **đã có RED source-valid tái hiện near-bottom fish-only false Bottom Lock anchor** ngày 16/11, MEDIUM `NOT_FIXED` vì thiếu per-column typed seabed provenance. Không merge test RED chưa GREEN vào canonical. Quyền media, firmware, hardware, 65 claims, Phase6, release tiếp tục HOLD/OPEN.
- [Báo cáo nghiệm thu P04 bounded trong kế hoạch F1 v2](../261013-2359-fcv588-public-reference-deep-tdd-advice-v2/reports/continuation-2026-11-14-photo-p04-bounded-mode-qa.md). Biên bản final/postreceipt là write-once; review độc lập xác nhận đúng 39 tệp runtime và 245/245 actual-loaded response SHA ở mỗi môi trường, không tăng thẩm quyền OEM.

## P05 + P06 bounded canonical integration — 16/11/2026
- [x] P05 source-bounded menu: 5 categories, label/value 2-column, footer, main sonar/depth still visible, key/pad save/cancel/commit; `MENU_LOCALE_CONFORMANCE=HOLD` do thiếu phrase oracle, không phát minh bộ dịch OEM. P06 CSS faceplate/TrackPad/GAIN/MODE and external `Tập trung vào máy` with keyboard-focus D15 recovery; 59% LCD aperture remains accepted estimate.
- [x] RED→GREEN giữ original failures, exact 4 runtime changes (`web/app.mjs`, `web/lcd-presentation.mjs`, `web/styles.css`, `web/index.html`) + 4 NEW scoped tests, mọi `src/**` core/replay/echo unchanged. Staging final seal SHA `96225310c3614d0d4b64af038fca70bfbe4a3c8cb25b3910ab2154a88d71095c` re-read by independent reviewer `GO` after stale first integration receipt detected and fixed with NEW write-once receipt.
- [x] Guarded apply 8/8, backup ZIP SHA `555a8cc794f95a74bfe48c4df195e0e4c40759a0ac660d139670bffe67128404`, guarded apply receipt SHA `f0294580fdf64f0c8118fb50c577fc13d9ca02cd3943e219b0ce2f3c6cd28a7e`. Fresh Windows canonical Node **551/551** / Python **13/13**, Chrome P05 **3/3** + P06 **3/3**, all 35/35 local loaded source bodies matched in each case, no network/console errors; 6 canonical PNG hashes verified; eight source JPEG URLs HTTP 404; test servers cleaned, user 4173 HTTP 200 and PID1204 preserved.
- [x] [Final integrity](../../docs/qa/FCV588_VISUAL_P05_P06_20261116/FCV588_VISUAL_P05_P06_FINAL_INTEGRITY_20261116.json) SHA `ecdfb0bc680f35a6935bb11a4bbadd1f95e3441069b7074a0b68ab22506b4ee4` và [independent postreceipt](../../docs/qa/FCV588_VISUAL_P05_P06_20261116/FCV588_VISUAL_P05_P06_INDEPENDENT_POSTRECEIPT_20261116.json) SHA `9befe64829bf9c79fb7e0505fe1db83a5edf676ce1f4c22a7073ca3cd7a6160e`, stage+canonical 39/39 SHA và 12 screenshots reread.
- [x] [Addendum ảnh/nguồn độc lập](../../docs/qa/FCV588_VISUAL_P05_P06_20261116/FCV588_VISUAL_P05_P06_INDEPENDENT_SCREENSHOT_ADDENDUM_20261116.json) SHA `4893b870c34d50e990d034910f8ebab1883ed0dfada83bbc3b10dfc82388fa73`: thực sự rehash 12/12 PNG gốc stage/canonical, ZIP preimage, 39/39 source và 105/105 response-body canonical P06. Không overwrite final/postreceipt.
- [ ] P04 fish-only true false-BL anchor remains MEDIUM NOT_FIXED/HOLD; P05 firmware Việt exact locale, P06 physical ROI/Narrator native và P07 full visual/OS matrix OPEN. F1 parent Phase6 OPEN, 65 claims/HW/firmware/rights/release HOLD. [Báo cáo kết quả](../261013-2359-fcv588-public-reference-deep-tdd-advice-v2/reports/continuation-2026-11-16-photo-p05-p06-bounded.md).
<!-- slug: fcv588-photo-reference-visual-conformance -->

## P07 bounded independent canonical QA — 2026-11-16
- [x] P07 source-frozen from P04 provenance v3, runtime39/39; logical matrix 63 cases/447 checks, Chrome 39 states across 375/1366/1920, 108 actual source body hashes, 39 PNG hashes, security 12 boundaries/47 negative HTTP, reference images8, replay profile21, fresh Node563/Python13 all PASS.
- [x] Independent reviewer GO SHA `ed6238165799e3094f0c7fa211b296cc7431fd4be3b302262ff6fcfeff5d6933`; P07 write-once final SHA `024dd1d75c7879fe0df88f939739d854a40aa819a459b6e1fbebd186aca91726`, postreceipt SHA `22fc21b744ebedbd5ac4a5998411c3e01f665697fa7fbb2a3726998909775ea6`. No P07 runtime edit or Chrome rerun. See [F1 continuation report](../261013-2359-fcv588-public-reference-deep-tdd-advice-v2/reports/continuation-2026-11-16-photo-p07-bounded-independent-qa.md).
- [ ] Full visual P07 still OPEN: calibrated LCD ROI, native spoken a11y, real OS blur, exact firmware/language rights; 65/65 claims, Phase6, hardware, firmware, rights, release HOLD/OPEN. 375 mobile screenshots scrolled, not whole physical panel proof.

## P08 bounded photo-ROI/native readiness continuation — 2026-11-16
- [x] Source-only research: 8/8 original JPEGs hashed, two independent tentative corner selections; 32-point comparison found 5 photo sets exceed initial ±20px hypothesis, maximum gap 34.93px, so precision calibration HOLD. Independent reviewer allows qualitative LCD-only homography/topology normalization, **not** OEM dimensions or runtime change. No OEM media derivative saved.
- [x] Native readiness worker: Narrator available (speech NOT_RUN); NVDA missing, installation not authorized; OS true blur and forced-colors NOT_RUN. User server4173 unchanged and test port4207 closed. Write-once [P08 report](../261013-2359-fcv588-public-reference-deep-tdd-advice-v2/reports/continuation-2026-11-16-photo-p08-roi-readiness.md), final SHA `3d1a05419617807b3f3ef24042725bf414d53257d5e7157155ca0a6b787bf16a`, post SHA `82706f90bf424515abc0383d9eb8b5a7895755bf2de1a040c7890a35f8610dd7`.
- [ ] This preparatory P08 evidence is complete, but calibrated physical/firmware/native accessibility/full P07 and F1 Phase6 acceptance remain OPEN/HOLD. No 65-claim upgrade or release approval.

## P09 restricted photographic ROI boundary proof — 2026-11-16
- [x] Wrote source-pinned pre-review boundary protocol, class-A active LCD vs class-B rounded aperture; independent photo/geometry reviewer reports rehashed 8 originals and 16/16 +256/256 mathematically valid homographies/perturbations. Only `dual.jpg` and `zoom.jpg` class-B virtual quads accepted **for restricted in-memory geometric comparison**; 6 other class-B and all 8 class-A exact ROI HOLD.
- [x] Write-once P09 final SHA `759f146c349c2ad348fc5b98e21fbc79d1d857623253811f0a01d3b9408995b9`, post SHA `cc3888a17c34271ba9163b86cfe4427442a1e6b5a847e4ac714661565657a26e`. [F1 P09 continuation report](../261013-2359-fcv588-public-reference-deep-tdd-advice-v2/reports/continuation-2026-11-16-photo-p09-boundary-geometry.md).
- [ ] Still no calibrated active LCD ROI, physical source/camera scale, firmware phrases, native Narrator/NVDA or true OS blur acceptance. 65 claims/rights/release HOLD and Phase6 OPEN; no runtime edits.

## P10 bounded Windows a11y investigation — 2026-11-16
- [x] Targeted current-source input Node17/17; Chrome forced-colors media *emulation* bounded PASS (one viewport, 5 D15 tabs and POWER 3px focus outline), not real OS High Contrast. Narrator feasible but actual audio transcript blocked; NVDA not found.
- [x] Two write-once **FAILED_OR_BLOCKED** real-OS POWER blur attempts preserved; Win32 foreground remained Helium, so no valid native Chrome blur; do not infer app failure or PASS. Independent evidence reviewer receipt SHA `dc7a8d07f9002bb61a28c7528d2b29c0bd9bf194ed208dec8a50fd66d07dffee`.
- [x] P10 final SHA `414c0151053bec55271032170e0fba2139fd1627e5fee7524cdf6c1bcf490655`, post SHA `df2cb60996da7f3f557642f329d794198aea9a85ac8fe5084429bee1931c12dc`; [F1 report](../261013-2359-fcv588-public-reference-deep-tdd-advice-v2/reports/continuation-2026-11-16-photo-p10-native-a11y-boundaries.md). No product source or user server4173 change.
- [ ] Native spoken/OS blur/High Contrast, exact active LCD ROI, firmware and 65-claim Phase6 gates remain OPEN/HOLD; no release or OEM-compliance upgrade.

## P11 Windows native foreground investigation — 2026-11-16
- [x] P11 method/baseline independent source checks + 4 write-once OS focus attempts. V1/V2 FAIL setup, V3 Playwright and V4 standalone Chrome/Win32 keyboard verify **real Chrome HWND foreground -> test-owned Python witness HWND foreground**, but no corresponding trusted browser `window.blur`/cancel. Source-valid defect **NOT_ESTABLISHED**, native blur **NOT_VERIFIED**, no runtime changes.
- [x] Independent P11 review SHA `33df2e66e63ee173a5fca9293da7f2d26e0ed7a96a8ae6280c857b5291658667`, P11 final SHA `845b4fe9cf9b184a74ddba91783362e9446c1219d38362c16166d4b3d6a44c87`, independent postreceipt SHA `392220f62ae29c2f1bf77b73c90d016b1a3a40e115a8c04612ce59a728b09f98`. [F1 report](../261013-2359-fcv588-public-reference-deep-tdd-advice-v2/reports/continuation-2026-11-16-photo-p11-native-foreground-boundaries.md).
- [ ] Native spoken Narrator/NVDA, actual Chrome blur event, native High Contrast and exact LCD/firmware/OEM physical conformance remain OPEN/HOLD. No new F1 release, 65 claims still HOLD.

## P12 menu-source oracle and staged order-only candidate — 2026-11-16
- [x] Independently verified OME2025 p59 printed AP-1 and 2016-reference photo `giaoDien.jpg`: 13 Sounder order, photo 13 Vietnamese rows. Current English menu 67 items, 12/13 position differences (21 inversions). Manual 35 source facts (23 direct/4 extrapolation/8 gap). No complete Vietnamese firmware oracle; installed firmware UNKNOWN.
- [x] Targeted canonical menu Node25/25; source-valid manual-order RED2/3; staging order-only GREEN3/3 and metadata preservation. Stage full Node **499/526, 27 FAIL** with missing fixtures and 5 position-assumption regressions; no app apply or test weakening. Preserve RED/FAIL and staging code.
- [x] Independent evidence review GO but guarded canonical apply **NO_GO** SHA `26bbcef289bf1b3663ac7a79766b87ff6431684632f07414aca4537d3bd29c6d`; P12 final SHA `5afe2663a1d0d3dff6e213fc537fad3b7dfe5817d7aa776ee4a769e580780855`, post SHA `538ff2a5e518ed663274958c3a2c9c69e7458a7caa5317f868ae67fe4e184792`. [F1 P12 report](../261013-2359-fcv588-public-reference-deep-tdd-advice-v2/reports/continuation-2026-11-16-photo-p12-menu-source-order.md).
- [ ] Separate P13 fixture-complete staging and semantic rebaseline before independent GO/guarded apply; exact language/White Line values, full visual P07/Phase6/65/release remain OPEN/HOLD.

## P04 fish-only provenance v3 — canonical bounded PASS (2026-11-16)
- [x] Historical near-bottom fish-only false BL anchor corrected using authenticated-to-scenario synthetic display companion and raw-to-LCD row sampling (no pixel-intensity classification); BL raster art never invents phantom seabed. Stop Bottom Zone overlay uses frozen history-qualified frame metadata. TDD RED/NO-GO preserved; targeted52/52, stage/canonical Node563/563 and Python13/13, compatibility PASS.
- [x] Independent reviewer GO bound to frozen source; guarded canonical 8/8 paths with ZIP preimage/receipt, runtime39/39 exact, Chrome 6/6 per stage/canonical including Stop backing-bitmap diff 0, 216 actual source-body SHA each, 8 OEM JPG HTTP404. Final integrity SHA `94d9bf997408d8fb51140b723319ea59faefb8122f66233839ad5a8f39b243d2`; independent postreceipt SHA `132facb60daba96a7e7c0cfa38b3e8d8b414e3b852a98e79b14b390620303a9d`.
- [ ] Bounded fix is NOT full P04/P07 conformance: 7-mode x 3 zoom x 3 viewport, physical/photo ROI, firmware language, Narrator/NVDA and OEM/hardware/rights gates remain OPEN/HOLD. See `plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/reports/continuation-2026-11-16-photo-p04-provenance-postapply.md`.

## P13 fixture-complete staging menu-order QA and replay NO_GO — 2026-11-16
- [x] Reused source-valid P12 AP-1 order and independent photo oracle, constructed fixture-complete Windows stage; source freeze: 1/39 staged runtime menu module difference, 3 stricter semantic-ID test files, original OEM images not served. Stage Node RED558/563 -> GREEN563/563; Python13/13.
- [x] Stage Chrome real 375×812/1366×768 AP-1 menu and TrackPad workflow PASS, 8 PNG, 72/72 actual HTTP source-body SHA; independent Chrome reviewer SHA `41a9a0e07c41b33d0d71dcd99ba6b7bb331f6539ddafd1de12bda857299b9ea0`. User server4173 PID1204 untouched, test port4213 closed.
- [x] Independent replay guard exhibits **same profile21, same nine events and sessionHash but different selected row** (`sounder.whiteMarker` becomes `sounder.clutter`). Reviewer SHA `c1a99846aff873ccfa28db81670f5904f966426b957e87e4542cece8fb4ae1d4` blocks canonical apply. P13 final SHA `5677a5db225e96e1412df4ea2776232081b050c3685b41b68bb2af89466b84db`; post SHA `803f190098a38d8eb8607e22651f288c42ed2701b853bd3791256dbb41af5862`. [F1 report](../261013-2359-fcv588-public-reference-deep-tdd-advice-v2/reports/continuation-2026-11-16-photo-p13-fixture-profile21-replay-gate.md). **No canonical apply**, no backup ZIP was needed.
- [x] P14 source-version/profile menu-order binding and historical profile21 replay compatibility completed with independent GO and guarded canonical apply; P13 NO_GO record stays immutable. Phase6/65/OEM/firmware/hardware/release remain OPEN/HOLD.

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