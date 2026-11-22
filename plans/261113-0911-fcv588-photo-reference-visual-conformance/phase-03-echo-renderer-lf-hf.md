---
title: "Phase 3: Deterministic LF/HF echo painting"
phase: 3
status: in-progress
priority: P1
dependencies: [1, 2]
---
# Phase 3 — Hiện thực texture hồi âm động, LF/HF khác nhau có lý do

## Mục tiêu
Đưa hình sonar từ các ô màu tổng quát thành dòng ảnh liên tục có **surface clutter / mid-water weak returns / bottom envelope / bottom trailing**, khác biệt 50 và 200 kHz theo công thức synthetic có nguồn. Giữ thời gian, replay và dữ liệu raw hoàn toàn tất định.

## Nguồn và boundaries
- `lf.jpg`: dải hồi âm tầng trên rất dày; `hf.jpg`: cột nước phía trên gần trắng; cả hai có dải đáy gần 19–20m, màu nâu đỏ/ánh vàng/xanh. Đây là **hai tình huống quan sát được**, không phải bằng chứng mọi LF luôn nhiều nhiễu, HF luôn sạch.
- Manual mục 1.4.1–1.4.2 nói 50 kHz búp sóng rộng, 200 kHz phân giải cao; không cho phép tự tuyên bố mô hình acoustic chuẩn.
- Giữ `src/core/scenario.mjs` world truth, `src/devices/fcv588/echo-projection.mjs` display projection, `advanceFcvPictureHistory` và D15 synthetic provenance. Không nhét jpeg vào `drawImage` làm dữ liệu sonar.

## Files dự kiến
| Action | Paths | Tác động |
|---|---|---|
| Create | `web/fcv588-echo-rasterizer.mjs` (nếu scout chứng minh cần) | rendering/tile/texture/palette riêng |
| Modify | `web/app.mjs:124-154`, `src/devices/fcv588/echo-projection.mjs` | tách drawChannel vs raster; per-channel synthetic projection |
| Modify có gate | `src/devices/fcv588/display-palette.mjs` | White fixture style, không bắt chước RGB ảnh máy |
| Test new | `test/fcv588-photo-echo-render.test.mjs` | determinism, depth bottom, LF/HF differentiation |
| Preserve | `src/core/scenario.mjs` (ưu tiên chỉ đọc); `src/core/session.mjs` | world/session/replay không sửa |

## Tests Before (RED)
- [ ] **Characterization GREEN** cho LF/HF khác nhau và deterministic: `test/fcv588-public-display.test.mjs` đã kiểm invariants này, KHÔNG gọi RED giả; chỉ RED cho photo-conformance mới như bottom layering, thang và hình dạng/clip còn thiếu.
- [ ] RED texture clutter shaping từ **typed channels/settings hiện có**; không tự thêm scenario fixture/schema field. Nếu cần fixture mới, tách gate phê duyệt mới để bảo toàn world/replay.
- [ ] RED seabed contour liên tục theo x, strong-core + weaker tail, layer color interpolation; không tạo dải đáy thẳng một màu/đứt đoạn trừ fixture thiết kế như vậy.
- [ ] RED frame at same observation/seed/settings reproducible byte for byte; replay frame hash ổn định; `Picture Advance Stop` không trôi ảnh; change range/gain only affects display projection.
- [ ] RED no NaN/out-of-canvas reads across 2/20/100m depth ranges, White/Blue palette; zero-observation must not synthesize fish.

## Các bước
1. Thiết kế view-only intensity layers: water column, near surface, target patches, bottom leading edge and tail; mỗi layer có 0..255 intensity trước khi palette mapping. Ghi rõ source class `SYNTHETIC_DISPLAY_ONLY`.
2. Tái dùng frequency response đã có trong `src/core/scenario.mjs` (50/200 khác nhau), chỉ chỉnh texture/threshold của **visual raster**, không double-apply physics hoặc thay world target positions.
3. Resample/scroll buffer dựa `advanceFcvPictureHistory` đang dùng, giữ cadence/picture advance and deterministic sample; cache only rendering-owned state.
4. Palette White đối chứng đặt như display setting fixture, không đổi menu enum/phần cứng. Fish size/White Line/A-scope/BDS chỉ active khi capability cho phép.
5. Kiểm giới hạn nguồn và frame budget từ hai màn hình browser trước/sau; không lấy hiệu năng mới làm chi phí không kiểm soát.

## Refactor
Chỉ loại bỏ duplicate drawing logic và noise source không thuộc image raster; tránh thêm engine/WebGL/physics dependency không cần. Không gọi network, transducer, USB, WebSerial/GNSS.

## Tests After / acceptance
- [x] TDD GREEN và synthetic LF/HF fingerprints/deterministic artifacts, không dùng ảnh OEM làm golden pixels.
- [x] Screenshot synthetic LF/HF/DUAL/BL White/Blue được review, có SHA; không đưa ảnh thật vào runtime.
- [x] Stage và canonical Chrome 9/9 mỗi môi trường, full 3 viewport + actual-loaded source hashes, source core/replay unchanged.
- [x] Chỉ báo `VISUAL_TRAINING_REFERENCE`, không chứng nhận số đếm cá/độ sâu acoustic accuracy.

## Kiểm chứng P03 V2 — 2026-11-14 (canonical post-apply đang nghiệm thu)

- Stage V2: deterministic synthetic rasterizer mới `web/fcv588-echo-rasterizer.mjs`, typed `bottomDepthM` chống false-bottom; TDD RED nguyên bản và RED provenance bổ sung đã lưu, targeted GREEN 10/10, Node 535/535, Python 13/13, Chrome staging 9/9 (375×812 / 1366×768 / 1920×1080), 8/8 OEM image URLs bị chặn. Independent worker-8 review: GO.
- Guarded dry-run `P03_DRY_RC=0`, preimage P02 38/38, staged runtime39; guarded canonical apply chính xác bốn paths (hai runtime và hai test), ZIP preimage + journal/receipt write-once tại `research/qa-20261114/`. Runtime canonical 39/39 SHA khớp stage.
- Fresh canonical test logs `p03-canonical-node-postapply-v1.txt` (535/535) và `p03-canonical-python-postapply-v1.txt` (13/13) PASS. Canonical Chrome `p03-canonical-browser-v2/` 9/9 PASS (35 loaded JS/CSS SHA/case, 8/8 photo URLs 404, no browser errors, test-owned port 4185 cleaned).
- [Final P03 integrity](../../docs/qa/FCV588_VISUAL_P03_20261114/FCV588_VISUAL_P03_FINAL_INTEGRITY_20261114.json) SHA256 `1132a7d8eae167a9afa60e5271bfec282b53b848054f3637cb973467fcd67c6d`; [independent postreceipt](../../docs/qa/FCV588_VISUAL_P03_20261114/FCV588_VISUAL_P03_INDEPENDENT_POSTRECEIPT_20261114.json) SHA256 `48abc24fecae4df657e79d4ed7ba6d365fb4a97a086fbf99792b9b8535da362e`. Bằng chứng này xác nhận phạm vi P03 synthetic visual software QA, không phải full P01–P07 acceptance.
- Không sửa world/scenario/replay/firmware/rights hoặc thêm OEM JPEG. Đây là `VISUAL_TRAINING_REFERENCE` synthetic; 65 feature claims, Phase6, rights, hardware, release vẫn HOLD/OPEN.
