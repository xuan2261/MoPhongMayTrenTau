---
title: "Phase 4: Mode-specific DUAL, ZOOM and NAV rendering"
phase: 4
status: in-progress
priority: P1
dependencies: [2, 3]
---
# Phase 4 — Giao diện khác nhau theo từng chế độ

## Mục tiêu
Tái thiết 7 chế độ MODE + ba biến thể zoom BL/BZ/MZ đúng pane, status, độ sâu, thang chia và ô NAV. Không thay event, timing hoặc firmware behavior ngoài nguồn.

## Căn cứ
- `dual.jpg`: LF trái, HF phải; hai hình sonar khác nhau. Manual OME-23890-E mục 1.4.2.
- `zoom.jpg`, `zoom2.jpg`: zoom trái/normal phải; nhãn `BL-LF`, `BL-HF`, các thang khác nhau. Manual mục 1.4.3 có Bottom Lock/Bottom Zoom/Marker Zoom.
- `nav1.jpg`, `nav2.jpg`: số lớn và các ô dữ liệu bên trái, sonar ở dải phải. Các ô được tùy biến nên không coi các giá trị trong ảnh là mặc định OEM.
- `src/devices/fcv588/display-layout.mjs` đã có DUAL split, zoom left và NAV 320/160; tái dùng.

## Files dự kiến
| Action | Path | Phạm vi |
|---|---|---|
| Extend preferred | `src/devices/fcv588/display-layout.mjs`, `web/lcd-presentation.mjs` | owner pane duy nhất, mode-specific content; tạo helper mới khi thật cần |
| Modify | `web/app.mjs:399-504`, `web/styles.css:96-105` | page mode renderer, độ sâu NAV bên trái |
| Possibly modify | `src/devices/fcv588/display-layout.mjs`, `src/devices/fcv588/navigation.mjs` | chỉ view data, không mutate |
| Test new | `test/fcv588-photo-modes.test.mjs` | 7 mode và 3 zoom variants |
| Preserve | `src/devices/fcv588/model.mjs`, `src/core/session.mjs` | mode/replay protocol |

## Tests Before (RED)
- [ ] 7 mode + BL/BZ/MZ: pane clipping, order, width/height hợp lệ trên 480×640; NAV data 320, sonar 160, DUAL hai nửa.
- [ ] DUAL LF/HF hiển thị hai frame khác nhau và thang riêng, divider không đè chữ.
- [ ] Bottom Lock zoom hiển thị nền đáy phẳng ở pane trái chỉ khi BL; BZ/MZ khác logic, marker đủ bounds.
- [ ] NAV: số sâu nằm khung trái **chính xác một lần** (ưu tiên DEPTH NAV box nếu cấu hình); ẩn global depth overlay để tránh duplicate; sonar phải không bị overlay; thiếu receiver không bịa đo đạc.
- [ ] Kịch bản đổi MODE, popup, timeout, lưu và replay bảo toàn state hash.
- [ ] Source body và browser screenshot khi status header nhiều nhãn, battery/advance condition, window ratio khác.

## Implementation
1. Pure per-mode content spec **dùng lại pane rectangles** của `display-layout.mjs`, header/status projector P02, không tạo bảng geometry riêng.
2. Vẽ hai kênh clipping và layering rõ, không ép mọi mode dùng cùng nhãn `50 kHz`; metadata/teacher text chỉ D15.
3. NAV panel 2–4 ô có title nhỏ, value cỡ lớn và dấu trống khi thiếu typed observations; số sâu trong NAV left pane.
4. Tổ chức Zoom BL/BZ/MZ theo manual và ảnh tương ứng; test White Line, VRM, window size, range, startDepth.
5. Chụp source-bound browser theo đủ states và đối chiếu landmarks với atlas P01.

## Refactor
Chuyển toán hình học ra hàm thuần, không tăng state trùng lặp hoặc duplicate renderer; tránh thay các model contracts.

## Tests After / acceptance
- [x] Scoped GREEN sau RED thật, existing mode/manual tests PASS trong phạm vi P04 bounded.
- [ ] 8 ảnh photo mapped vào ít nhất một fixture/style tương ứng; ảnh máy không xuất hiện trong runtime.
- [ ] 7 mode + 3 zoom configurations không overlap hay clipping; real Chrome screenshot + source SHA.
- [x] Tất cả firmware-specific unknown hoặc menu locale chưa có oracle tiếp tục HOLD.

## P04 staging V1, NO-GO lịch sử đã được sửa — 2026-11-14

- Staging tách biệt tại `staging/fcv588-photo-modes-20261114` từ sealed P03 39/39; các tệp canonical P03 không đổi.
- TDD cho per-mode view: RED thiếu helper; targeted GREEN 4/4; reviewer-driven RED 15/17 do NAV depth duplicate và BL window chưa kết thúc tại typed bottom; sau sửa GREEN 21/21. Full staging Node 539/539, Python 13/13; Chrome chọn mẫu 7/7 (LF, DUAL, BL-LF, NAV1/NAV2, mobile/1920). Các original FAIL/harness issues được giữ lại.
- Independent reviewer xác nhận NAV không còn global DEPTH fallback; DUAL chỉ một global depth overlay ở giữa 50/50. B/L axis chuyển sang relative descending.
- **NO-GO tại thời điểm staging V1 (đã khắc phục sau đó):** Bottom Lock chưa căn phẳng đáy các cột lịch sử, ảnh V1 còn tường đáy nhảy bậc. Giữ nguyên original FAILED/NO-GO evidence để truy vết; không dùng lần Chrome V1 làm chứng nhận bản V2.
- Phạm vi thay đổi staging là 5 runtime: `display-layout.mjs`, `echo-projection.mjs`, `web/app.mjs`, `web/lcd-presentation.mjs`, `web/styles.css`; 4 test cũ sửa và 1 test P04 mới. Không sửa model/session/world/P03 rasterizer; rights/firmware/Phase6/65 claims/release HOLD.

## P04 V2 — bounded canonical post-apply QA đang thực hiện

- TDD bổ sung đúng lỗi BL-flat: RED `p04-bl-flat-red-attempt3.txt` 4/5, GREEN `p04-bl-flat-green-attempt3.txt` 22/22. `echo-projection.mjs` thêm remap đáy *theo từng cột lịch sử*, có giới hạn gần typed synthetic bottom và fail-closed theo tiêu chí đồng thuận; BZ/MZ giữ kết quả absolute trước đó. Không làm thay đổi thế giới/replay.
- Stage final Node 541/541, Python 13/13; Chrome strict staging V2 7/7 PASS, BL-flat tại vùng đáy 76/76 cột mẫu, NAV1/2 không còn global DEPTH giả, DUAL một global depth cắt qua divider theo window ratio, không có browser errors; 8/8 đường dẫn ảnh OEM HTTP 404. Phản biện độc lập kết luận GO cho **bounded** P04; nguy cơ MEDIUM còn lại: đàn cá giả định rộng sát typed bottom trong *kịch bản synthetic tương lai* có thể bị nhận nhầm là đáy khi không có đáy thật, không xảy ra ở `TRAINING_SCENARIO` hiện tại.
- Preimage canonical P03 39/39 và P04 10 paths đã qua guarded dry-run; đã áp dụng đúng 5 runtime + 5 test vào canonical, ZIP dự phòng SHA `bd0bfb24e720faf852c741a747330e74c7b3699c9f77f2320324014ede866d11`, guarded receipt SHA `8e8a222f1d1adaa851a026b4a1390ff11d853e6093699302f1fb382bf531d864`, runtime canonical 39/39 khớp stage.
- Canonical post-apply Node 541/541, Python 13/13, Chrome canonical 7/7 PASS (245/245 actually-loaded body SHA, 14/14 stage/canonical screenshot SHA, nguồn ổn định và cleanup PASS), 8 OEM JPEG URLs 404. Máy chủ người dùng cổng 4173 được giữ nguyên, HTTP 200.
- **Đã niêm phong bounded P04:** [final integrity](../../docs/qa/FCV588_VISUAL_P04_20261114/FCV588_VISUAL_P04_FINAL_INTEGRITY_20261114.json) SHA `c3a292dc213e660fa855c453eaf324fd9014ddb163e4723cea141a4050a1382b`; [independent postreceipt](../../docs/qa/FCV588_VISUAL_P04_20261114/FCV588_VISUAL_P04_INDEPENDENT_POSTRECEIPT_20261114.json) SHA `569e4b99a8e8de49502d74db30c0215eb61b238edf3ddaa4d93f6d7ed6b4ec90`. Thử nghiệm bounded này **không phải** nghiệm thu toàn bộ Phase 4: chưa có đầy đủ LF/HF×BL/BZ/MZ×3 viewport, accessibility/phần cứng và quyền media.

## P04 fish-only provenance v3 — canonical bounded PASS (2026-11-16)
- [x] Historical near-bottom fish-only false BL anchor corrected using authenticated-to-scenario synthetic display companion and raw-to-LCD row sampling (no pixel-intensity classification); BL raster art never invents phantom seabed. Stop Bottom Zone overlay uses frozen history-qualified frame metadata. TDD RED/NO-GO preserved; targeted52/52, stage/canonical Node563/563 and Python13/13, compatibility PASS.
- [x] Independent reviewer GO bound to frozen source; guarded canonical 8/8 paths with ZIP preimage/receipt, runtime39/39 exact, Chrome 6/6 per stage/canonical including Stop backing-bitmap diff 0, 216 actual source-body SHA each, 8 OEM JPG HTTP404. Final integrity SHA `94d9bf997408d8fb51140b723319ea59faefb8122f66233839ad5a8f39b243d2`; independent postreceipt SHA `132facb60daba96a7e7c0cfa38b3e8d8b414e3b852a98e79b14b390620303a9d`.
- [ ] Bounded fix is NOT full P04/P07 conformance: 7-mode x 3 zoom x 3 viewport, physical/photo ROI, firmware language, Narrator/NVDA and OEM/hardware/rights gates remain OPEN/HOLD. See `plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/reports/continuation-2026-11-16-photo-p04-provenance-postapply.md`.