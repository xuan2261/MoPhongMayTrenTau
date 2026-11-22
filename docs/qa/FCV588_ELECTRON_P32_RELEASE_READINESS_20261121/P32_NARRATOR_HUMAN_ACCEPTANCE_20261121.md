# P32 — Narrator: kiểm tra nghe thực tế còn chờ người vận hành

**Trạng thái: BLOCKED_HUMAN_SPEECH_CONFIRMATION.** Không khẳng định đã nghe, không chạy Narrator hoặc ghi âm tự động.

Ứng dụng hiện tại: **FCV588 Synthetic Training POC UNRELEASED 0.0.3** trên Windows thật.
Windows UI Automation đã xác nhận GAIN, MODE, POWER là Button nhận focus có tên trợ năng. UIA Name không chứng minh Narrator đã phát âm.

## Thử thủ công khi có người trực tiếp nghe

1. Mở ứng dụng qua Start Menu. Nhấn **Win + Ctrl + Enter** để bật Narrator; kiểm tra nghe được âm thanh từ Narrator trước khi thao tác.
2. Dùng **Tab** đưa focus lần lượt đến GAIN, MODE, POWER. Đánh dấu PASS chỉ khi người nghe xác nhận Narrator đọc hoặc mô tả đúng từng điều khiển; nếu im lặng hoặc đọc sai, ghi FAILED với tên điều khiển cụ thể.
3. Trên GAIN và MODE, dùng phím mũi tên để đổi giá trị/chế độ; kiểm tra Narrator có thông báo thay đổi nếu ứng dụng phát live-region/focus announcement. Dùng POWER kích hoạt ngắn; kiểm tra thông tin khởi động bằng lời nói.
4. Tắt Narrator bằng **Win + Ctrl + Enter**, đóng ứng dụng và ghi kết quả.

| Gate | Kết quả hiện tại |
| --- | --- |
| GAIN / MODE / POWER trong UIA | VERIFIED |
| Lời đọc thực tế GAIN | NOT_YET_VERIFIED |
| Lời đọc thực tế MODE | NOT_YET_VERIFIED |
| Lời đọc thực tế POWER | NOT_YET_VERIFIED |
| Thông báo thay đổi GAIN/MODE/POWER | NOT_YET_VERIFIED |
| NVDA (chưa tìm thấy cài đặt thông thường) | NOT_YET_VERIFIED |

Không cần tải NVDA chỉ để hoàn tất vòng nghiệm thu giới hạn này. Không ghi âm, thu microphone, bật telemetry, sửa Narrator settings, hay dùng dữ liệu cá nhân. Nếu kiểm thử sau này được thực hiện, lưu receipt mới kèm xác nhận của người nghe, không sửa các receipt đã niêm phong.
