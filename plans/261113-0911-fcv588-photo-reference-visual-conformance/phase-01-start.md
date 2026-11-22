---
title: "Phase 1: Khóa ảnh đối chứng và baseline V57"
phase: 1
status: todo
priority: P1
dependencies: []
---
# Phase 1 — Khóa nguồn, tạo oracle và baseline chính xác

## Mục tiêu
Định nghĩa đủ bằng chứng và các trạng thái/ảnh đầu vào để mọi giai đoạn sau biết chính xác đang so với **ảnh máy**, **manual**, hay **thiết kế gốc độc lập**. Pha chỉ khảo sát và tạo fixture/report; **chưa sửa runtime**. Đây là pha đầu tiên của deep planning; mỗi pha sau phải scout lại source/consumer trước khi thực thi.

## Nguồn và giới hạn
- 8 ảnh 590×1280 người dùng cung cấp, SHA ở mục 2 của [source audit](./research/2026-11-13-photo-source-and-code-audit.md). Có góc nhìn, moiré, đèn phản xạ và bối cảnh phần cứng; **không** được coi toàn ảnh là framebuffer.
- Manual FURUNO OME-23890-E các mục 1.1–1.8, 1.21–1.22, 2.4, 4.10; product spec 480×640, kích thước LCD 128.2×170.9 mm; firmware ảnh không biết.
- Kế hoạch F1 gốc đang điều hành Phase 6: [plan.md](../261013-2359-fcv588-public-reference-deep-tdd-advice-v2/plan.md). **V57 có scoped-integrity và independent postreceipt** tại `docs/qa/FCV588_V57_HEADER_COMPACT_20261031/`, nhưng SHA hai bản đang bất nhất; [preflight 2026-11-13](./research/2026-11-13-v57-integrity-preflight.md) là blocker, không coi V57 chưa seal.
- Không sao chép ảnh/font/logo/manual OEM vào `web/`, `src/` hoặc bộ phân phối.

## Files to create / modify (khi cook)
| Loại | Đường dẫn | Tác động |
|---|---|---|
| Read-only | `sources/FCV588_GiaoDienThucTeMay2016/*.jpg` | 8/8 ảnh nguồn, không sửa |
| Read-only | `docs/research/FCV588_PUBLIC_UI_REFERENCE_MATRIX_2026-10-14.md`, `docs/qa/FCV588_V56*`, `docs/qa/FCV588_V57_HEADER_COMPACT_20261031/*` | khóa cả parent/final/postreceipt và all corrections |
| Tạo mới | `docs/research/FCV588_PHOTO_MODE_ATLAS_<run-id>.md` | 8 ảnh → modes, landmarks, facts vs inference |
| Tạo mới | `docs/qa/FCV588_VISUAL_BASELINE_<run-id>.json` | SHA source, browser, config, viewport, scenario |
| Tạo mới | `docs/qa/screenshots/FCV588_VISUAL_BASELINE_<run-id>/*.png` | owned runtime screenshots, không phải ảnh OEM |
| Tạo mới | `test/fcv588-photo-atlas-contract.test.mjs` (nếu thiếu) | kiểm ledger schema/SHAs/rights; không test OEM % |

## Tests Before — phải RED đúng nghĩa
1. Đọc V56 final/postreceipt **và V57 final/postreceipt** cùng các corrections 1/2/3; V57 runtime 38/38 đã khớp hiện tại nhưng **V57 scoped-integrity SHA không khớp postreceipt**, phải tìm nguyên nhân read-only và lập reconciliation có căn cứ. Bất đồng chưa giải thích → **STOP canonical mutation**, không tự rollback hoặc seal lại.
2. TDD red cho `photo-atlas-contract`: mỗi ảnh có filename+SHA+size 590×1280, mode, vùng LCD, confidence, perspective transform, source-rights, object-of-comparison; không tự giảm mức kiểm để xanh.
3. Kiểm hiện có: `npm run check`; `python -m unittest discover -s test -p 'test_*.py' -v`. So số kết quả với SHA tại **lượt này**, không trích 520/13 trước đó như PASS mới.
4. Chụp một baseline do trình duyệt **thật sự tải source**: power on/LF/HF/DUAL/LF-ZOOM/HF-ZOOM/NAV1/NAV2 và menu, phiên cố định; đo viewport, browser dpr, canvas, nguồn config, thời điểm screenshot. Nếu không mở được browser, ghi `BLOCKED` và kế hoạch không tự nhảy tới visual acceptance.

## Thao tác
- [x] SHA & manifest mọi ảnh gốc, pin tên hồ sơ và quyền reference-only/HOLD; không crop/xóa nội dung gốc. [Atlas 14/11](./research/2026-11-14-photo-mode-atlas.md).
- [ ] Xác lập quyền từng ảnh bằng rights ledger (owner, license/grant ID nếu có, nội bộ/derivative/public permissions, reviewer, source SHA). Crop/warp chỉ cho LCD planar, ghi sai số; **không tạo derivative khi chưa xác minh quyền**, ưu tiên landmark JSON; nếu phải lưu derivative hợp lệ, đặt trong vùng restricted ngoài `web/`/`src/`/`docs/` served/bao gói, ghi exact path trong ledger.
- [ ] Ghi các mốc chuẩn: header top, số độ sâu, chiều rộng LF/HF, đường chia ZOOM, thang 0/5/10/15/20, dải đáy, vùng NAV trái, menu trái/phải; mỗi mốc gắn confidence và ảnh.
- [ ] Phân loại theo `PHOTO_OBSERVED`/`MANUAL_CONFIRMED`/`ORIGINAL_ESTIMATE`/`UNKNOWN`; tách ảnh màn hình khỏi méo máy ảnh, đừng lấy RGB raw máy ảnh thành OEM calibrations.
- [ ] Lấy trạng thái thực của screenshot HTML/CSS/Canvas hiện tại và bảng sai khác P0/P1/P2; khóa 7 display modes và 3 zoom submodes.
- [ ] Chốt preset **tham chiếu ảnh**: White, Manual gain, Battery-On nếu dữ liệu typed, metric m, chế độ tương ứng; chỉ là giáo án/fixture, **không đổi mặc định model/replay**.

## Tests After / Verification
- [x] 8/8 ảnh SHA đúng, từng ảnh có mode + dữ kiện quan sát + hạn chế, không chứa ảnh OEM trong runtime.
- [ ] 8/8 ảnh đối ứng ít nhất một trường hợp synthetic baseline, có source refs và tọa độ được phiên bản hóa.
- [ ] Manifest runnable và screenshot source identity; mọi mismatch SHA là failure, không làm lại ảnh cũ.
- [x] Biên bản P1 rõ các chỗ chưa thể đo/font/firmware/rights, không tuyên bố tỉ lệ giống OEM. ROI/homography vẫn `NOT_YET_VERIFIED`.

## Rủi ro / STOP
Ảnh méo, che mép, góc khác nhau; phép homography LCD không áp dụng nguyên xi cho vỏ/phím/núm 3D. Ảnh chỉ một trạng thái LF/HF nên không đủ làm model âm học. Quyền ảnh chưa xác minh cho phân phối. **Blocker SHA của V57 phải xử lý trước source edits**; nếu browser/rights bị BLOCKED, chỉ làm source-bounded analysis, không coi source atlas là acceptance.
