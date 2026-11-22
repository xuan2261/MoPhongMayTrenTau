# P28 — Mode replay and illustrative LCD visual QA (bounded)

Ngày: 2026-11-17. Canonical: C:\Work\MoPhongMayTrenTau.

## Nguồn oracle và phạm vi

- Đọc trực tiếp manual nguồn OME-23890-E PDF trang 10 (§1.4.1: LF50/HF200, chế độ đơn), 11 (§1.4.2: DUAL LF trái/HF phải), 12 (§1.4.3: Bottom Zoom trái + hình thường phải, đáy ở phần dưới).
- Manual không định lượng OEM pixel fraction .75. P23 .75 là classroom projection; P04 .5 chỉ là hợp đồng archive legacy.
- D15 timeline của LF/HF/DUAL chỉ chiếu trạng thái sự kiện và hash; cố ý không tạo hình LCD lịch sử cho chế độ thường. LF/HF-ZOOM được xem BZ synthetic khi active/POWER ON.
- 6 full synthetic QA envelope + sidecar, không mint prefix lịch sử, không sao chép OEM ảnh/PDF vào runtime.

## Kết quả QA

- Staging focused P28 4/4; full Node 617/617; Python 13/13.
- Staging Chrome D15 7/7, 52 source-body SHA; Chrome LCD live 3/3 LF/DUAL/HF, thêm 52 source-body SHA. Synthetic, không pixel OEM.
- Canonical focused P28 4/4; full Node 617/617; Python 13/13.
- Canonical Chrome D15 7/7, 52 source-body SHA; Chrome LCD live 3/3, 52 source-body SHA; QA ports đã đóng.
- Chỉ một test file mới được guarded applied; 0 runtime edit; P27 runtime54/54 và OEM 8/8 SHA không đổi.
- RED/FAILED harness V1 (disclaimer mismatch) và LCD V1/V2 (hidden UI/CSP) giữ nguyên, không nâng thành PASS.

## Giới hạn / HOLD

- Đây là kiểm chứng hành vi synthetic, layout định tính và replay deterministic, không phải chứng nhận OEM visual/pixel fidelity.
- Chưa có oracle exact OEM bezel, RGB/font/line/ticks/seabed, calibration BZ pixel .75, hoặc ảnh BZ thực (2 ảnh zoom.jpg/zoom2.jpg tham chiếu là BL).
- Full replay validation bảo đảm drift theo hash nội bộ, không xác thực nguồn gốc archive ngoài hệ thống.
- F1 PUBLIC_REFERENCE v2; Phase6 OPEN; 65/65 claims HOLD; firmware UNKNOWN; hardwareValidated=false; releaseApproval=HOLD.
- Server người dùng 127.0.0.1:4173 PID1204 được giữ nguyên; QA không gửi HTTP tới server này.

## P29 đề xuất

P29 ưu tiên xác minh tương tác native/hardware còn NOT_RUN bằng môi trường QA Windows tách biệt có phép,
hoặc đối chứng OEM bezel/font/RGB từ nguồn hợp pháp nếu có oracle. Không triển khai tự động và không nâng release.
