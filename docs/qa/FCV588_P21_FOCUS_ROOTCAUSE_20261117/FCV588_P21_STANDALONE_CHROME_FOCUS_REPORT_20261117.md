# P21 — Standalone Chrome / Windows POWER focus-boundary control (2026-11-17)

## Kết quả và giới hạn

**VERIFIED — phép thử Chrome độc lập qua Win32 + raw CDP:** không dùng Playwright để khởi chạy/điều khiển browser. Google Chrome hiện cài `157.0.8103.79`, profile QA riêng, cổng server `4221`, DevTools `9231` chỉ cho localhost. Một phép đối chứng **không nhấn POWER** xác nhận HWND Chrome trở thành Win32 foreground, sau đó HWND Helium được khôi phục foreground; `document.hasFocus()` đổi `true→false`, `visibilityState` đổi `visible→hidden`, và listener ghi sự kiện blur mới.

Ở phép thử POWER sau đó, Win32 foreground đi từ Chrome QA HWND/PID sang Helium HWND/PID. Raw CDP `Input.dispatchKeyEvent` gây down trên POWER (eventCount `0→1`, `pressing=true`). Khi native foreground rời Chrome, browser ghi blur/focus-loss, `document.hasFocus=false`, `visibility=hidden`; adapter hủy POWER thành eventCount `2`, `pressing=false`, trạng thái máy `POWER OFF` không đổi. CDP keyup tiếp theo giữ eventCount `2`, không có hành động POWER thừa. **PASS trong phạm vi đầu vào tự động qua CDP + chuyển foreground native**, **KHÔNG phải phép thử phím vật lý do người vận hành bấm**. Listener gắn trên window theo capture chưa lưu `event.target`, do vậy bằng chứng mạnh nhất là tổ hợp Win32 HWND, focus/visibility và chuỗi hủy; không diễn giải riêng log blur thành oracle xác định duy nhất target event.

**P20 FAILED được bảo toàn, không bị thay thế:** P20 dùng Playwright-launched Chrome + `page.keyboard` và đổi foreground thật nhưng `document.hasFocus()` vẫn true, không có focus loss/cancel; khi gọi keyup bằng Playwright thì còn phát up khi Chrome nằm background. So sánh P20/P21 chứng minh khác biệt theo *harness/browser delivery path*, chưa cô lập được một flag/API Playwright cụ thể. Không có bằng chứng đủ để sửa source. Worker read-only source/method đã xác nhận `web/hold-input.mjs` hủy trên button blur/window blur, và P20 chưa thực sự thử được nhánh hủy. Kết luận của reviewer dựa trên P20; quyền nghiệm thu P21 V2 dựa trên receipt và readback mới, không giả định reviewer đã independently chạy lại browser.

## Attempt ledger và regression

- P21 V1 write-once: `HARNESS_ERROR` do kiểm tra DOM quá sớm (`FCV588 page missing`); server/Chrome/debug/profile dọn đúng, source50/50. Không overwrite receipt.
- P21 V2 write-once: `PASS_NATIVE_WIN32_BLUR_POWER_CANCEL_CDP_INPUT_NOT_HUMAN`, SHA `a301ff2bce366504916cffee15814fb418e94dcd2dfb0d7059fe3b51621e44d6`. V2 chờ DOM sẵn sàng trước khi dùng test charter, không đổi runtime.
- Targeted Node: `C:
vm4w
odejs
ode.exe --test test/hold-input.test.mjs`, kết quả trực tiếp `8/8 PASS`; một lệnh trước đó dùng `node` không có trong PATH và thất bại ở launcher, không phải thất bại sản phẩm. Không rerun full Node/Python vì source không đổi.

## Integrity, chủ sở hữu và release

P20 final SHA `32e27b4e7f0d2b961ce35b0b176abe78385f663790563dd75f7a1ccdc7bc2759`; P20 SHA postreceipt `0fd9e5ffba3d941c23962810b3c75ffdee20a4068776779152cba09b8d461171`. SHA canonical runtime **50/50**, ảnh OEM tham chiếu **8/8**. Server người dùng `127.0.0.1:4173 PID1204` không bị quản lý/khởi động lại. Cổng QA `4221` và debugger `9231` đã đóng; profile Chrome QA bị xóa sau khi browser owned exited; foreground user được trả lại. Dữ liệu synthetic training, `F1 PUBLIC_REFERENCE v2`, không kết nối phần cứng/tàu, Phase6 OPEN, `65/65` claims HOLD, releaseApproval=HOLD, firmware thực tế UNKNOWN, OEM rights chưa clear.

## Bước tiếp có giá trị nhất

Nếu cần nghiệm thu **nhập liệu người thật**, một operator phải thực sự giữ Space trên nút POWER và dùng chuột/Alt+Tab vật lý để chuyển sang cửa sổ witness trong lúc giữ, log passively HWND và blur trước khi nhả; không thay bằng `page.keyboard` hay CDP và không dùng thiết bị thật. Sau đó mới đánh giá Narrator audio/transcript hoặc native High Contrast bằng QA được cho phép; không tiếp tục làm lại các browser smoke đã PASS. Nếu người dùng chỉ cần chất lượng phần mềm trình duyệt synthetic trong phạm vi hiện tại, kết quả P21 không đòi hỏi vá source.
