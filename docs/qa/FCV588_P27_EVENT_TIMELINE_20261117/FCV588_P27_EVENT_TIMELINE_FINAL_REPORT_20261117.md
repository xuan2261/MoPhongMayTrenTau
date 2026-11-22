# P27 — D15 archive event timeline: final bounded integration

Ngày: 2026-11-17. Canonical: C:\Work\MoPhongMayTrenTau.

## Phạm vi

- Xác thực toàn bộ envelope v7 + sidecar v1 trước khi replay từng prefix 0..N.
- D15 Previous/Next/slider, deterministic session hash; synthetic BZ chỉ khi POWER ON và LF/HF-ZOOM Bottom Zoom.
- Không tạo derived prefix archive/sidecar hoặc ảnh LCD OEM lịch sử; không thay live session/LCD/timer/storage.
- P26 renderer giữ chữ mặc định; P27 dùng raster-only để bảo đảm pixel RGBA deterministic, chú giải/provenance nằm trong D15.

## Kết quả kiểm thực hiện

- Staged focused 8/8, Node 613/613, Python 13/13.
- Staged Chrome V12 10/10, 52 actual HTTP body SHA matched, pixel RGBA first/revisit identical, invalid canvas reset.
- Guarded dryrun/backup four preimages; exact 4 modified + 2 new paths.
- Canonical focused 8/8, Node 613/613, Python 13/13.
- Canonical Chrome V1 10/10, 52 actual HTTP body SHA matched, pixel RGBA repeat and invalid reset.
- Canonical runtime 54/54 source SHA, P26 parent receipts unchanged; OEM photos 8/8 and manual SHA unchanged.

## Quyết định/giới hạn

- Worker-38 source/security và guarded preapply GO_BOUNDED là code/transaction reviews; không là OEM reviewer.
- Fingerprints xác định drift nội bộ, KHÔNG xác thực nguồn gốc ngoài hệ thống.
- Synthetic F1 PUBLIC_REFERENCE v2; firmware UNKNOWN, hardwareValidated=false.
- Phase 6 OPEN, 65/65 claims HOLD, releaseApproval=HOLD.
- Giữ toàn bộ RED/FAILED logs, browser diagnostics, parent ZIP/receipts; không xóa hoặc ghi đè.
- Không sử dụng/call HTTP tới user server 4173; QA port chạy cô lập rồi đóng.

## Đề xuất P28

Đối chứng trực quan replay timeline LF/HF/DUAL bằng manual/nguồn hợp pháp;
nếu stress 2000 sự kiện đo được trễ đáng kể thì chọn nhánh tối ưu tốc độ seek có test nguồn.
Không tự mở khóa OEM/hardware hoặc triển khai P28 từ đợt này.
