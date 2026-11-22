---
title: "Phase 2: LCD geometry, status header, depth/scale"
phase: 2
status: todo
priority: P1
dependencies: [1]
---
# Phase 2 — Khóa hình học LCD, header, thang độ sâu và typography

## Mục tiêu
Tạo một hợp đồng viewport **480×640** dùng chung cho các mode, hình học khác biệt theo mode, nhãn/độ sâu/đơn vị đúng source và không vỡ khi CSS responsive. Bắt đầu từ atlas P01, không đoán OEM RGB/font.

## Phạm vi/kiến trúc
- Mở rộng `src/devices/fcv588/display-layout.mjs` (owner pane geometry) và `web/lcd-presentation.mjs` (owner LCD/status) bằng pure projector test được; không tạo chủ geometry thứ hai nếu chưa chứng minh cần.
- Header trong ảnh: `MAN.R`, `G: 10`, `LF/HF` hoặc `BL-LF/BL-HF`, giá trị `13.5–13.7V`. Manual mục 1.22: `Battery On` **thay picture advance indicator**, không chèn thêm cạnh `x1`. Runtime hiện chỉ có `NO_HARDWARE_DATA`/lowBattery boolean, KHÔNG có voltage number typed; thiếu mẫu phải không hiển thị số. Giá trị điện áp synthetic là `HOLD` chờ contract/compatibility riêng, không hardcode 13.7.
- Khóa hệ tọa độ normalized logical; body rectangle bên dưới header, range ticks theo `startDepthM`/`rangeM`; serif/sans/bitmap font chỉ là original approximate, có đánh dấu mức nguồn.
- Nền White cho **fixture đối chứng**, giữ lựa chọn Blue/Black/Mono/Night và settings persistence cũ. Không tự chuyển `model.mjs` default Blue → White khi chưa có migration/approval.

## File inventory
| Action | File | Điều chỉnh |
|---|---|---|
| Extend preferred | `src/devices/fcv588/display-layout.mjs`, `web/lcd-presentation.mjs` | existing owners; chỉ tạo helper mới khi scout xác định cần |
| Modify | `web/app.mjs:124-154,324-560` | gọi spec, vẽ panel, depth ticks |
| Modify | `web/styles.css:86-108`; có thể `web/index.html:40-61` | labels/depth DOM overlay đúng parent/pane |
| Test new | `test/fcv588-photo-lcd-geometry.test.mjs`, `test/fcv588-photo-header.test.mjs` | contract RED→GREEN |
| Preserve | `src/core/session.mjs`, `src/devices/fcv588/model.mjs` | zero behavior/profile changes |

## Tests Before (TDD)
- [ ] RED về các invariant: 480×640, pane clipping, header no overlap, vị trí số lớn trong sonar bottom-left và NAV left-data pane; independent of CSS viewport.
- [x] RED `MAN.R` vs `MAN_R`, `LF/HF`, BL/BZ/MZ exact by zoom submode; manual photo variant labels không nhầm núm MODE title. RED trước khi stage projector mới được implement.
- [x] RED conditional header **cho hành vi còn thiếu**: Battery Off → picture-rate; Battery On thiếu typed voltage → không hiển thị số bịa, không hiển thị picture-rate sai slot. Numeric sample vẫn `BATTERY_VALUE=HOLD`.
- [x] RED range ticks 0/5/10/15/20 ở 20m fixture với marks nhỏ, không dùng 3 mốc cố định; shift/startDepth/range khác vẫn tính đúng.
- [ ] RED display foreground contrast ở White, Blue, Black, Night; độ sâu không bị canvas/modal che sai; VRM/alarm không đổi event.

## Implementation (chỉ sau RED)
1. Đặt header/footer/body boundaries dựa atlas, tách rendering coordinate from CSS scale.
2. Đưa readout lớn về widget gắn **pane** thay cho absolute global device; NAV không auto đặt phải.
3. Chuyển status strip từ chuỗi nối tự do sang tokens có priority/overflow strategy, e.g. battery takes picture-rate slot; không thêm teacher text.
4. Tách scale/tick generator thành pure function theo min/max/range/units; vẽ grid/tick mảnh và vùng đáy, giữ semantic labels.
5. Giữ parent element/ARIA, tính đọc được thực ở 375×812 / 1366×768 / 1920×1080; LCD vẫn 3:4 portrait.

## Refactor
Giảm duplicated `ctx.fillText` layout math, giữ một source truth cho bounds; không chạm raw sonar observation, event ordering, session hash, profile 21. Mọi new helper đều test được bằng Node mà không cần browser.

## Tests After / acceptance
- [x] Test mới GREEN (RED thật trước thay đổi), existing layout/source tests được điều chỉnh đúng chủ projector hiện tại và full Node 526/526 PASS; original FAIL logs preserved.
- [ ] Browser fixture White: header không tràn; số sâu nằm đúng pane và gọn trong LCD; tick dày đúng interval từ reference, sai số landmark được đánh giá theo confidence P01.
- [x] TDD targeted stage/browser smoke tại P02, guarded canonical apply chỉ sau khi integrity V57 được hòa giải; real browser-loaded source body SHA và PNG cùng session. Chưa có human OEM review → status `REFERENCE_ESTIMATE`.
- [ ] Perf: không tăng layout thrash đo thấy hoặc mất >1 frame budget trên máy QA; đo trước/ sau, chưa có số thì `NOT_YET_VERIFIED`.
