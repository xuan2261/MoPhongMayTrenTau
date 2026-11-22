# FCV588 P25 — Báo cáo final / Offline archive D15
Ngày 17/11/2026. Kết quả: VERIFIED BOUNDED_CANONICAL_POSTAPPLY_PASS; release HOLD.

P25 đã thêm hai lựa chọn file JSON trong D15 để nạp replay envelope v7 và presentation sidecar v1 cục bộ. Replay thực qua API P24: kiểm đúng phiên bản profile, sự kiện, finalSessionHash và hợp đồng P04_HISTORIC/P23_LOWER_BOTTOM. D15 hiển thị hash, tick, event count, sơ đồ BZ synthetic; không ghi đè session, LCD, settings hay timer đang chạy. FNV fingerprint chỉ chống drift, không xác thực nguồn gốc lịch sử.

Bảo vệ tệp: giới hạn envelope 1 MiB, sidecar 8 KiB, tối đa 2000 sự kiện, 32 tầng/30000 nút cấu trúc; từ chối JSON sai, khóa không an toàn, sidecar mismatch, sự kiện sửa đổi, quá dung lượng, lỗi File.text và nội dung HTML độc hại. Không fetch, upload, localStorage hay kết nối tàu.

Đã guarded apply đúng 5 đường dẫn (3 file web sửa + 1 module web mới + 1 Node test mới). Preimage 3 file gốc giữ trong ZIP immutable; runtime hiện có 52 mục gồm 50 mục P23, module P24, module P25. 8 ảnh OEM REFERENCE_ONLY nguyên SHA. Hai reviewer worker35/worker36 BOUNDED_CANONICAL_APPLY_GO và BOUNDED_POSTAPPLY_GO.

Staging: focused Node 7/7, full Node 596/596, Python 13/13, Chrome 5/5 và 50/50 actual browser HTTP body SHA. Canonical: focused 7/7, full Node 596/596, Python 13/13, Chrome 5/5 và HTTP 50/50. Cổng QA 4226 đã đóng. Server user tại 127.0.0.1:4173 PID1204 không khởi động lại.

Bảo toàn các FAIL lịch sử: RED do thiếu UI; Python attempt đầu sai interpreter/Playwright, sửa bằng interpreter đúng; Chrome attempt đầu sai tên data-session-hash do harness, V2/V3 sau đó PASS. Các lỗi lịch sử không được gán PASS.

Không thực hiện: import archive lên LCD sống, dựng lại toàn bộ LCD lịch sử, event-by-event scrubber, export, kiểm chứng pixel OEM/hardware/firmware/rights. Phase 6 OPEN, 65/65 public claims HOLD, hardwareValidated=false, firmware UNKNOWN, releaseApproval=HOLD.

P26 đề xuất: ưu tiên đối chứng trực quan mode Bottom Zoom theo manual và ảnh tham chiếu trong một viewer riêng có nguồn, đặc biệt giới hạn pixel OEM chưa đo. Nếu ưu tiên bài học thao tác: bổ sung timeline xem lần lượt các sự kiện archive trong D15, không làm đổi session sống.
