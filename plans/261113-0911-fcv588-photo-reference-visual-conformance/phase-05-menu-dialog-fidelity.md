---
title: "Phase 5: Photo/manual bounded menu and dialog fidelity"
phase: 5
status: in-progress
priority: P1
dependencies: [1, 2, 4]
---
# Phase 5 — Menu 2 cột, hộp thoại và thao tác người vận hành

## Mục tiêu
Dựng menu gần `giaoDien.jpg` (cột nhóm trái, giá trị phải, thanh xanh, footer, phần sonar nền còn thấy), giữ hành vi commit/cancel, không phát minh option/firmware.

## Nguồn / contract
- `giaoDien.jpg` menu tiếng Việt, đã định danh trạng thái/ảnh nhưng chỉ một snapshot.
- FURUNO OME-23890-E mục 1.8, 1.22 và Appendix 1 xác nhận nhóm/menu; mục 2.4 và 4.10 có lựa chọn ngôn ngữ `Viet Nam`, nhưng không đủ xác nhận **bộ chuỗi dịch đầy đủ**.
- Giữ label operator `MENU/ESC`, `Pic. Advance`, `Interference`, `Colors`, `White Marker`, `MODE`; White Line `Off/On`; White Marker `Off/White/Gray` là training preview firmware unknown. D15 giải thích source/rights ngoài LCD.
- Menu phiên FURUNO 2025 chưa chắc là firmware trong ảnh: có nguồn conflict thì ghi `CONFLICT_HOLD`.

## Files dự kiến
| Action | Paths | Vùng |
|---|---|---|
| Modify | `web/lcd-presentation.mjs:108-140` | view model menu/choice |
| Modify | `web/app.mjs` chỉ đoạn `renderDialog()`, `web/styles.css:108-153` | panel/typography/overlay/footer |
| Modify if necessary | `web/lcd-config-presentation.mjs`, `web/lcd-control-presentation.mjs` | draft/committed view |
| Test create | `test/fcv588-photo-menu-layout.test.mjs`, `test/fcv588-photo-menu-actions.test.mjs` | TDD |
| Preserve | `src/devices/fcv588/model.mjs`, `src/devices/fcv588/menu-atlas.mjs` | unverified firmware choices |

## Tests Before (RED)
- [x] Menu 5 danh mục trái, right field/value rows, selection/current editor, footer; Chrome bounded 1366/375 không tràn.
- [x] Screenshot main-menu foreground giữ lại khoảng 21.46% LCD phía dưới, gồm sonar và số sâu; chưa phải phép đo ROI camera OEM.
- [x] MENU/ESC, ENTER, TrackPad và phím tắt keyboard thao tác draft/cancel/commit bảo toàn settings, replay.
- [x] Không tự đổi English atlas thành câu dịch Việt OEM chưa xác thực; `MENU_LOCALE_CONFORMANCE=HOLD` độc lập.
- [ ] Disabled/rights/firmware-gated menu entries không bị đưa vào như firmware tính năng thật; không cho trainer hint/`SOURCE_GAP` vào LCD.
- [ ] MODE/BRILL/RANGE/GAIN dialogs giữ keyboard/hold/timing/cancel thuộc contracts cũ.

## Implementation steps
1. Lấy landmark panel và spacing từ P01, dựng sidebar/title/value/help với styles OEM-like độc lập; CSS clipping/z-order ổn định.
2. Tách entry literal, committed setting, draft setting và source reason thành presentation fields rõ; teacher note chỉ D15.
3. Chỉ hỗ trợ Vietnamese operator locale khi bộ phrase đã được source-graded chính xác (ảnh + manual + reviewer), còn lại giữ public reference English.
4. Test palette White/Blue, manual battery header, menu subdialog và disabled option trong browser fixture có source-hash.
5. Kiểm input chuột/bàn phím/touch; đảm bảo menu không mất focus, không vô tình dispatch 2 lần.

## Refactor
Tách pure menu geometry/presentation khỏi DOM mutation, không sửa menu semantics nếu không có oracle, không đổi replay schema.

## Tests After / acceptance
- [x] RED 3/4 → GREEN 4/4, full Node canonical 551/551, Python 13/13; original FAIL được giữ riêng.
- [ ] 5 nhóm/menu save/cancel hiển thị và chạy được qua targeted stage browser; full 3 viewport + stage/canonical matrix chạy một lượt P07.
- [x] Translation chưa xác minh không bị mặc định hóa; firmware/rights HOLD giữ nguyên.
- [x] Screenshot/menu có đối chiếu `giaoDien.jpg` theo bố cục có nguồn; không công bố tỷ lệ giống OEM.

## Nghiệm thu P05 bounded trên canonical — 16/11/2026

- `web/app.mjs`, `web/lcd-presentation.mjs` và phần menu của `web/styles.css` đã được áp dụng trong một gói P05+P06 guarded, không thay `src/devices/fcv588/menu-atlas.mjs`, reducer/replay hay firmware.
- Stage/canonical menu Chrome mỗi bên **3/3 PASS**, Blue/White 1366×768 và Blue 375×812; mỗi case 35/35 JS/CSS response SHA matched, 8/8 original JPEG HTTP 404. Menu save/cancel, category left/right, footer, 5 categories đúng behavioral fixture.
- [Final P05+P06](../../docs/qa/FCV588_VISUAL_P05_P06_20261116/FCV588_VISUAL_P05_P06_FINAL_INTEGRITY_20261116.json) và [postreceipt](../../docs/qa/FCV588_VISUAL_P05_P06_20261116/FCV588_VISUAL_P05_P06_INDEPENDENT_POSTRECEIPT_20261116.json) xác nhận scoped runtime39, Node551/Python13; original RED/FAIL preserved.
- **Còn OPEN:** exact Vietnamese firmware phrase oracle, P05 dialog/mode full viewport coverage, disabled/rights menu visual matrix và P07 cross-mode accessibility; không đánh dấu toàn Phase 5 hoàn thành.
