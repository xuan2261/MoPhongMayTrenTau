# P29 — Electron Windows POC (STAGING BOUNDED PASS, NOT RELEASE)

Ngày: 2026-11-21. Canonical C:\Work\MoPhongMayTrenTau không bị thay đổi.

## Kết quả thực hiện

- Đóng gói Electron 45.4.1 Windows x64 thành thư mục portable có file FCV588-Synthetic-POC.exe và app.asar; ZIP portable được thử CRC.
- app://fcv588/ với custom standard secure origin, CSP chỉ self; no nodeIntegration/preload/IPC; sandbox + contextIsolation; deny network/navigation/permission; server người dùng 4173 không tham gia POC.
- App được khởi chạy bằng **exe sau đóng gói** trong QA profile riêng với proxy chết. Playwright Electron V5 PASS 25 trường hợp: module/resources local, chặn network, Canvas LF/DUAL/HF khác nhau, replay profile22 DUAL, nhập/xuất JSON có kiểm fingerprint và nội dung byte, cấu hình tồn tại sau đóng/mở lại, không thay đổi LCD khi nhập archive.
- Source/binary audit: app.asar 58/58 file đúng allowlist (56 web/src, main.cjs và package.json); không có Node development modules, file test, OEM JPEG hoặc PDF manual trong gói.
- Staged P28 replay focused 4/4 PASS và transfer unit tests 2/2 PASS; P28 canonical runtime54/54, OEM8/8 và manual SHA bất biến.
- Log FAILED đầu tiên được lưu nguyên để truy vết; không thay thế bằng nhãn PASS.

## Giới hạn chặn release

- **Chưa thử khởi chạy trên một Windows VM sạch thật sự ngắt mạng**; QA chỉ chặn URL và dùng proxy không hoạt động, không được coi tương đương air-gap.
- Chưa làm MSI/NSIS installer, chưa thử SmartScreen/EDR/Win10 LTSC/ARM64 hoặc quản trị nâng cấp. Portable ZIP bắt buộc giải nén nguyên thư mục.
- Chưa ký mã, chưa harden Electron fuses (RunAsNode/NODE_OPTIONS/inspect, ASAR integrity), chưa kiểm lời thoại Narrator/NVDA, âm thanh nghe thực và Win32 focus blur. Không cấp quyền truy cập thiết bị thật.
- Chuyển cấu hình từ Chrome/Edge cũ đòi hỏi người dùng chủ động chạy snippet trong trang trình duyệt cũ; chỉ fixture nhập và cấu hình tồn tại trên POC đã test. Không tự đọc browser profile.
- POC không chứng nhận pixel/OEM, firmware/hardware; Phase6 OPEN, 65/65 claims HOLD, releaseApproval HOLD.

## Bước tiếp theo

P30: chạy Portable ZIP trong máy Windows sạch offline hoàn toàn; bảo đảm first-launch không cần Node/browser, audit giao diện/âm thanh/input/đọc file, lưu dữ liệu sau nâng cấp, kiểm thử Win32 focus và UIA; harden Electron fuses + code-sign + installer riêng trước khi xem xét phát hành.
