---
title: "Phase 6: Faceplate geometry and device-focus workspace"
phase: 6
status: in-progress
priority: P1
dependencies: [1, 2, 4, 5]
---
# Phase 6 — Vỏ máy, phím, núm và cách tổ chức giao diện

## Mục tiêu
Mặt máy thuyết phục hơn về tỷ lệ/chi tiết/ergonomics và D15 không cạnh tranh thị giác. Giữ điều khiển thật bằng phím/núm trong app, giáo viên đứng ngoài LCD.

## Evidence/limits
- 8 ảnh cho silhouette, tỷ lệ LCD-vỏ và vị trí phím (một số ảnh bị crop phần phải), không đủ đo mm/tactility.
- FURUNO specification 233(W)×270(H)×158(D) mm **toàn bộ đơn vị**; effective LCD 128.2×170.9 mm. Không coi đầu máy cao chính xác 270mm.
- `web/styles.css:52-105,210-245` head/pedestal/pad/knob đang CSS ước lượng; `web/index.html:37-105` có HTML native buttons.
- Vẫn phải giữ các key MENU/ESC, TrackPad, ENTER, RANGE, MARK, FUNC, GAIN, MODE, POWER/BRILL đúng workflow đã có.

## Files dự kiến
| Action | Path | Mục đích |
|---|---|---|
| Modify | `web/styles.css:52-105,210-245`, `web/index.html:37-105` | head contours, LCD/key anchors |
| Modify hẹp | `web/app.mjs` / `web/instructor-tabs.mjs` | optional external device-focus mode, không mất session |
| Test new | `test/fcv588-photo-face-geometry.test.mjs`, `test/fcv588-device-focus.test.mjs` | geometry & app state |
| Preserve | `web/hold-input.mjs`, `web/rotary-input.mjs`, `web/pad-repeat.mjs` | existing input handling |

## Tests Before (RED)
- [ ] Từ P01, landmarks cho LCD, phím, núm GAIN/MODE, BRILL, bezel có sai số/confidence; homography **chỉ áp dụng LCD phẳng**, không suy độ chính xác mm của vỏ/núm 3D không đồng phẳng.
- [ ] Browser keyboard/pointer/drag/hold send single event, no overlay click occlusion; focus-visible.
- [x] Desktop checkbox `Tập trung vào máy` điều chỉnh visual only; D15 5 tab luôn nằm ngoài LCD và trở lại opacity 1 khi nhận keyboard focus; không thêm session/replay event.
- [x] Chrome 375×812 mobile reflow và 1366×768/1920×1080 desktop không tràn ngang; ngoài LCD có thông báo đây là bố cục điện thoại cho huấn luyện.
- [ ] Native Narrator/NVDA và genuine OS window.blur chỉ đạt khi có thử thật, không dùng synthetic event để claim PASS.

## Implementation steps
1. Vẽ lại CSS head/vỏ/bezel/outer border theo normalized landmarks; bỏ hiệu ứng trang trí làm lệch photo evidence.
2. Căn phím hình hạt và cần TrackPad trong control column; giữ semantic HTML button và ARIA.
3. Vẽ GAIN/MODE độc lập (không lấy mẫu logo/font/hardware art có quyền OEM), cập nhật ring positions khi state đổi mà không giả detent vật lý.
4. Đưa LCD và phần điều khiển lên vị trí chính tại desktop, tạo nút workspace `Tập trung vào máy` ngoài face để thu gọn/hiện D15.
5. Kiểm screenshot, tab order, pointer, rotary/hold, CSS clipping trên Windows browser.

## Refactor
Không đổi reducer, timer, keyboard shortcuts, session event IDs. Không tạo engine 3D/WebGL hoặc screenshot giả tĩnh.

## Tests After / acceptance
- [ ] Geometry measured error nằm trong uncertainty đã chốt ở P01; thiết bị thật vẫn `NOT_YET_VERIFIED` về physical dimensions/tactile.
- [x] Input/keyboard/rotary/hold không regress trong full Node551; focus toggle dùng CSS native checkbox, không viết vào replay.
- [x] Scoped P06 Chrome stage/canonical mỗi bên 3/3 (375/1366/1920), 35/35 actually loaded body SHA mỗi case; chưa phải full P07 control/OS audit.
- [x] Logo/ảnh JPEG OEM không copy vào served runtime; mọi training warnings và instructor giữ ngoài face/LCD.

## Nghiệm thu P06 bounded trên canonical — 16/11/2026

- Thay đổi only `web/index.html` và phần mặt máy/focus của `web/styles.css`; giữ nguyên control identity, model, keyboard/hold/rotary, 39 runtime. Browser P06 xác minh focus mode keyboard accessibility và D15 năm tab; CSS không ẩn D15 khỏi accessibility tree.
- Original RED 0/5, RED 1/5 và real full-suite FAIL 532/537 được giữ nguyên. Legacy 59%-LCD aperture regression được sửa, scaffold `sources` junction stage được thêm; sau đó Node 546/546 PASS. Chrome phát hiện lỗi selector focus D15: RED 2/3 → GREEN 3/3, final combined Node **551/551 PASS** / Python **13/13 PASS**.
- [Biên bản final](../../docs/qa/FCV588_VISUAL_P05_P06_20261116/FCV588_VISUAL_P05_P06_FINAL_INTEGRITY_20261116.json) và [postreceipt](../../docs/qa/FCV588_VISUAL_P05_P06_20261116/FCV588_VISUAL_P05_P06_INDEPENDENT_POSTRECEIPT_20261116.json). Không thay thế manual/rights/source oracle.
- **Còn OPEN:** đo ROI/homography/landmarks tin cậy, tactile/phần cứng thật, native Narrator/NVDA và OS window.blur thật, đầy đủ single-event pointer/hold/drag Chrome; đây không phải chứng nhận hình học mm của OEM hoặc đóng toàn Phase 6.
