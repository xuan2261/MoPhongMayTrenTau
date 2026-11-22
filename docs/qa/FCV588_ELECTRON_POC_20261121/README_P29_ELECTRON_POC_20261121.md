# P29 — FCV-588 Electron Windows x64 POC (STAGING ONLY)

Loại bản dựng: portable Windows x64, synthetic offline training, không phải máy FCV-588 thật. Không phải bản phát hành production, không có chữ ký mã, không có installer MSI/NSIS. releaseApproval=HOLD, Phase6 OPEN, 65/65 claims HOLD, firmware UNKNOWN và hardwareValidated=false.

## Mở bản Windows

1. Giải nén P29_FCV588_ELECTRON_PORTABLE_WIN_X64_20261121.zip nguyên cả thư mục; không lấy riêng file EXE ra ngoài.
2. Mở FCV588-Synthetic-POC-win32-x64/FCV588-Synthetic-POC.exe. Đây là cửa sổ độc lập được đóng gói cùng Chromium; không cần chạy npm start, Node.js hay mở Chrome/Edge.
3. Chỉ dùng cho học tập; không kết nối thiết bị thật, định vị hay vận hành tàu.

Bản POC chưa ký có thể hiển thị cảnh báo SmartScreen theo chính sách máy. Không bỏ qua chính sách bảo mật của tổ chức; không phân phối ra bên ngoài khi chưa được phép.

## Giữ/chuyển cấu hình cục bộ

- Cấu hình của bản Windows nằm trong hồ sơ riêng, không chạm localStorage của Chrome/Edge hay phiên đang chạy tại 127.0.0.1:4173.
- Muốn chuyển cấu hình đã lưu từ trình duyệt cũ: người dùng tự mở trang http://127.0.0.1:4173 trong trình duyệt của mình, mở DevTools > Console và chạy nội dung file P29_LEGACY_BROWSER_SETTINGS_EXPORT_20261121.js. Script chỉ đọc đúng một khóa cấu hình mophongmaytrentau.fcv588.public-reference.settings.v18 và tải FCV588-settings-training-only.json. Không chạy trên website khác.
- Trong ứng dụng Windows, cuộn xuống phần Windows POC — Chuyển cấu hình thủ công, chọn file đã xuất và nhấn Kiểm tra và nhập cấu hình. Ứng dụng chỉ nhận wrapper/schema/profile/fingerprint/setting hợp lệ; sau khi xác nhận, ứng dụng tải lại để khôi phục.
- Nếu chưa từng lưu cấu hình trên trình duyệt cũ, không cần nhập. Cấu hình đã lưu trên Windows tiếp tục tồn tại sau khi đóng/mở lại trong cùng hồ sơ POC.
- Chỉ chuyển cấu hình; không chuyển replay, session events, waypoints hay dữ liệu máy thật. Không đọc/copy database hồ sơ trình duyệt.

## Chứng cứ và giới hạn

- Đóng gói 56 file web/src (54 runtime P28, index chỉ thêm module và hai module UI mới), desktop/main.cjs và package.json. ASAR có 58 file; không có JPEG OEM/PDF manual/node_modules/test.
- Electron dùng origin app://fcv588/, CSP, không expose Node/preload/IPC, chặn quyền thiết bị, tải URL ngoài và điều hướng ngoài.
- Đã chạy EXE đã đóng gói trên Windows bằng Playwright Electron, với HTTP(S) proxy không hoạt động và profile QA riêng; không gọi server người dùng 4173. Kiểm tra URL local, các mode LF/DUAL/HF, Canvas SHA, replay, xuất/nhập cấu hình và giữ cấu hình sau khi đóng/mở lại.
- Chưa nghiệm thu cài đặt trên máy Windows sạch ngắt Internet thực sự/air-gapped; Win10/LTSC/ARM64; SmartScreen/EDR; nghe âm thanh thực; Narrator/NVDA/Windows focus native; ký mã và installer. Chạy trên máy có Internet nhưng đã chặn URL/proxy không thay thế được kiểm thử air-gapped.

Các log EJSONPARSE, ETARGET, resource-timing, Electron Download automation và ASAR audit ban đầu thất bại được giữ nguyên; các kết quả PASS cuối có receipt mới.
