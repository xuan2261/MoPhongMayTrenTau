# FCV-588 — P05 menu và P06 mặt máy, bounded Windows QA (16/11/2026)

**Trạng thái:** `P05_P06_BOUNDED_SOFTWARE_QA_PASS_RIGHTS_HARDWARE_RELEASE_HOLD`. Canonical Windows `C:\Work\MoPhongMayTrenTau` đã nhận bản sửa P05/P06, kiểm thử mới trên canonical và khóa source/QA. Không khẳng định 100% giống OEM, chưa đóng Phase 5/6/7 hay Phase 6 của F1 gốc.

## Mã nguồn đã triển khai

- P05: bố cục menu theo `giaoDien.jpg` — cột nhóm trái, cột label/value phải, thanh tiêu đề và footer; khoảng 21.46% LCD bên dưới còn hiện sonar/độ sâu. Tách `label`, `committedValue`, `draftValue`, `valueText` trong presentation, giữ MENU/ESC/ENTER/TrackPad save/cancel/commit và replay. Không sửa model, menu-atlas hay tạo bộ dịch firmware Việt chưa xác minh. `MENU_LOCALE_CONFORMANCE=HOLD`.
- P06: faceplate CSS gọn theo ảnh máy 2016, phím/TrackPad/núm; giữ tỷ lệ `.display-housing width:59%` có test legacy. Native checkbox **Tập trung vào máy** ngoài LCD điều chỉnh D15 chỉ ở desktop, giữ đủ 5 tab, khôi phục opacity khi D15 nhận keyboard focus; 375×812 dùng bố cục huấn luyện reflow, không mạo nhận mặt máy vật lý.
- Runtime sửa đúng **4** đường dẫn: `web/app.mjs`, `web/lcd-presentation.mjs`, `web/styles.css`, `web/index.html`. Thêm đúng **4** test: `fcv588-photo-menu-layout`, `fcv588-photo-menu-actions`, `fcv588-photo-face-geometry`, `fcv588-device-focus`. `src/**`, scenario, typed observations, protocol, reducer, session/replay/profile21, `web/hold-input.mjs`, `rotary-input.mjs`, `pad-repeat.mjs` không sửa. Runtime toàn bộ vẫn **39** files.

## TDD và Chrome

- P05 RED 3/4 FAIL → GREEN 4/4. P06 RED 0/5, 1/5 → scoped GREEN; full-stage ban đầu **532/537 FAIL** vì lỗi thực 59%→61% và scaffold thiếu junction nguồn manuals. Khôi phục 59%, tạo *stage-only* junction và chạy lại Node **546/546 PASS**; giữ toàn bộ original FAIL.
- P06 Chrome ban đầu thất bại do harness đòi checkbox desktop hiện ở viewport mobile, rồi `wait_for_function` bị strict CSP `script-src 'self'` chặn; đã sửa harness, không nới product test. Chrome phát hiện thêm lỗi thực: CSS selector `.training-panel:focus-within` có specificity thấp khiến D15 không phục hồi khi focused. Thêm RED 2/3 → GREEN 3/3, sửa hẹp CSS và xác minh Chrome lại.
- Staging tích hợp cuối và canonical post-apply: **Node 551/551 PASS, Python 13/13 PASS**, Chrome P05 **3/3 PASS** (Blue/White 1366×768, Blue 375×812) và P06 **3/3 PASS** (375×812, 1366×768, 1920×1080). Mỗi case có **35/35 loaded JS/CSS response SHA matched**, 0 console/page/external/request lỗi, 8 JPEG nguồn HTTP **404**. Chrome screenshots 6+6 rehashed, các test-owned servers dừng, cổng người dùng 4173 PID1204 vẫn HTTP200.

## Niêm phong và bằng chứng

- Independent reviewer ban đầu `NO-GO` do biên bản ghép cũ `INTEGRATION_P06_20261116.json` pin pre-focus-fix SHA; không overwrite. Tạo biên bản stage **mới** `research/qa-20261116/integrated/P05_P06_INTEGRATED_FINAL_STAGE_20261116.json` SHA **`96225310c3614d0d4b64af038fca70bfbe4a3c8cb25b3910ab2154a88d71095c`** và được reviewer đọc lại 39/39 source, 4 tests, QA/browser/screenshot, chuyển verdict **GO** cho bounded canonical apply.
- Guard dry-run gate parent P04 final/post SHA, exact 4 modified runtime+4 new tests, Node551/Python13, Chrome6, photo8; áp dụng **8/8** sau write-once ZIP backup SHA **`555a8cc794f95a74bfe48c4df195e0e4c40759a0ac660d139670bffe67128404`**. Guarded apply receipt SHA **`f0294580fdf64f0c8118fb50c577fc13d9ca02cd3943e219b0ce2f3c6cd28a7e`**. Source canonical 39/39 == integrated stage; prior P02/P03/P04 receipts, 8 photo originals, RED/FAIL untouched.
- **Final Integrity:** `docs/qa/FCV588_VISUAL_P05_P06_20261116/FCV588_VISUAL_P05_P06_FINAL_INTEGRITY_20261116.json` SHA **`ecdfb0bc680f35a6935bb11a4bbadd1f95e3441069b7074a0b68ab22506b4ee4`**.
- **Independent Postreceipt:** `docs/qa/FCV588_VISUAL_P05_P06_20261116/FCV588_VISUAL_P05_P06_INDEPENDENT_POSTRECEIPT_20261116.json` SHA **`9befe64829bf9c79fb7e0505fe1db83a5edf676ce1f4c22a7073ca3cd7a6160e`**. Cả source39 và 12 stage/canonical PNG đã re-read cùng logs/parent/photos; đây là scoped software integrity, không phải OEM reviewer.
- **Screenshot/source addendum (không sửa final/postreceipt gốc):** `docs/qa/FCV588_VISUAL_P05_P06_20261116/FCV588_VISUAL_P05_P06_INDEPENDENT_SCREENSHOT_ADDENDUM_20261116.json` SHA **`4893b870c34d50e990d034910f8ebab1883ed0dfada83bbc3b10dfc82388fa73`**. Lượt kiểm thực sự mở lại bytes **12/12 PNG** (6 staged + 6 canonical), 39/39 runtime, 8 ảnh nguồn, ZIP preimage, 105/105 actual-loaded canonical P06 response-body SHA; tách rõ P05 chỉ lưu 35/35 match-count/case, không có row SHA persisted.

## Vấn đề chưa giải quyết và bước kế tiếp

- **P04 MEDIUM NOT_FIXED:** source-valid RED mới xác nhận Bottom Lock có thể hiểu nhầm một dải cá rộng sát `bottomDepthM` là seabed nếu true bottom core/tail thiếu; test mới trong `staging/fcv588-photo-p04qa-20261116` **6/7 PASS, 1/7 FAIL** được giữ riêng, không merge vào canonical để không tạo một suite FAIL tại bản đang dùng. Runtime hiện chỉ có global typed bottom, thiếu per-column historical seabed provenance. Không ép GREEN bằng heuristic không có nguồn.
- Ưu tiên: thiết kế/kiểm hợp đồng per-column typed seabed (không phá scenario/replay), RED→GREEN P04; tiếp theo P05 phrase oracle Việt/firmware thật, P06 ROI/homography và native Narrator/NVDA/OS window.blur, P07 seven modes/three zoom × viewport QA. Chỉ làm source-grounded, không copy JPEG OEM.
- F1 PUBLIC_REFERENCE v2 vẫn offline synthetic, không transducer/GNSS/NMEA/USB/serial/network; F1 Phase6 `OPEN`, **65/65 claims HOLD**, hardwareValidated=false, firmware UNKNOWN, quyền ảnh/media HOLD, releaseApproval=HOLD. Mục tiêu “100% giống máy thật” là **mục tiêu thiết kế**, chưa phải tỷ lệ được chứng minh.
