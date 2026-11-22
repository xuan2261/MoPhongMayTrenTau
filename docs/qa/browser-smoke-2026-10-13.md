# Kiểm tra Chrome trực tiếp — FCV-588 F0

**Ngày:** 13/10/2026
**Địa chỉ:** http://127.0.0.1:4173 (loopback trên máy phát triển Windows)
**Mục tiêu:** thử tương tác thực tế của bản mô phỏng F0, không nghiệm thu độ giống máy thật.

## Chuỗi thao tác thực hiện

1. Mở Chrome vào localhost, kiểm tra DOM có mặt máy, phím RANGE, GAIN, MODE, POWER/BRILL, TrackPad và vùng điều khiển giảng viên. Trang nạp xong.
2. Tạm dừng đồng hồ và chọn Đặt lại bài. Đồng hồ/sự kiện quay về 0.
3. Click POWER/BRILL (nhấn ngắn), click nút +1 giây bốn lần. Quan sát màn hình từ OFF sang RUN, có độ sâu và ảnh hồi âm.
4. Click MODE+, sau đó RANGE, TrackPad RIGHT và DOWN, ENTER. Quan sát header chuyển trạng thái MAN_R, Mode DUAL.
5. Click núm GAIN, TrackPad UP, ENTER, GAIN+. Quan sát header hiện giá trị thủ công.
6. Click Kiểm tra replay. Giao diện hiện: **REPLAY PASS — trạng thái và sự kiện trùng khớp (15 bước)**.
7. Kiểm tra HTTP thủ công: / -> 200; /src/core/session.mjs -> 200; /web/styles.css -> 200; /docs/evidence/FCV-588.md -> 404; /VietMoPhongChoTatCaCacMay.md -> 404; CSP có connect-src 'none'.

## Kết quả

**PASS (đã quan sát):** trang nạp, nút thật tương tác, đồng hồ có thể tạm dừng/điều khiển, thiết bị có chế độ OFF/ON, thay đổi MODES/RANGE/GAIN qua UI, replay không sai lệch phiên được thử, tài liệu riêng tư không được cung cấp bởi static server.

**Chưa được kiểm tra bằng browser:** ảnh chụp giao diện/pixel comparison (công cụ ảnh nền gặp lỗi BROWSER_CDP_TIMEOUT), kích thước mobile, pointercancel/blur giữa thời gian giữ phím, power hold >3 s trực tiếp, khả năng dùng bàn phím hoàn toàn, hiệu năng nhiều phiên/học viên. Kiểm thử unit đã xác nhận press/release tick và cancel edge, nhưng không thay thế E2E thiết bị thật.

Lỗi favicon.ico trả 404 trong phiên đầu khi chưa đặt icon. Sau đó tạo /web/favicon.svg và link tường minh; bài test HTTP tự động xác nhận file này được phục vụ (200). Không tái hiện bằng ảnh chụp Chrome cuối.

**Verdict:** browser interaction smoke PASS trong phạm vi đã thử; UI Fidelity & Accessibility E2E vẫn PENDING.

## Đợt kiểm tra bổ sung (13/10/2026, buổi tối)

- Mở lại cùng tab Chrome ở địa chỉ loopback sau khi cập nhật mã nguồn; kiểm tra DOM và ảnh chụp viewport: LCD tỷ lệ dọc **480×640**, ENTER không còn nằm trong TrackPad, nút trợ xoay MODE/GAIN nằm ở bảng điều khiển giảng viên.
- Tạm dừng và reset. Click POWER, chọn +1 giây bốn lần, màn hình chuyển sang RUN với độ sâu minh họa.
- Click trợ MODE+, RANGE, TrackPad RIGHT, ENTER, GAIN push, TrackPad UP, ENTER, trợ GAIN+.
- Chrome cho ra trạng thái **MAN_R G:5.5 LF/HF**, sim tick 0004, sự kiện 014, MODE DUAL.
- Click kiểm tra replay hiển thị **REPLAY PASS (14 bước)**. Snapshot screenshot qua Chrome thành công; ảnh dùng để kiểm tra bố cục, chưa có ảnh tham chiếu đủ quyền để so sánh pixel.
- Kiểm thử trực tiếp thao tác giữ >3s, mobile viewport và VRM sau bổ sung **chưa đủ E2E**; phần logic được chứng minh chủ yếu bằng unit tests.
