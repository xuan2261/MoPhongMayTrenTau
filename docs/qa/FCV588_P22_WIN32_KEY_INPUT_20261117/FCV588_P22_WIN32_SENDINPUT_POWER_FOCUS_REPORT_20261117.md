# FCV-588 P22 — Windows SendInput / POWER focus cancel (17/11/2026)

## Kết luận

**VERIFIED trong phạm vi phím Windows tự động (`SendInput`) + Chrome cửa sổ thật.** Chrome QA được bind chính xác HWND/PID/executable, có Win32 foreground và `document.hasFocus=true`, POWER là active element. `SendInput(VK_SPACE)` gửi đúng một keydown vào Chrome; sự kiện trusted `keydown` đến `#key-power`, `pressing=true`. Foreground chuyển tới **cửa sổ witness QA riêng** (không phải cửa sổ người dùng). Chrome phát `blur` thật với `event.target===window` sau keydown và `document.hasFocus=false`; adapter hủy POWER một lần. `SendInput` keyup khi witness còn foreground không đến Chrome và không sinh `up` sai. Chuỗi đếm sự kiện **0→1→2→2**, máy vẫn `POWER OFF`.

**Đây KHÔNG phải thao tác bàn phím vật lý của con người**: `SendInput` là đầu vào Windows được công cụ tiêm, có thể bị low-level hook nhận diện `injected`. Vì vậy human-operator physical-input acceptance vẫn **NOT_YET_VERIFIED**. Không kiểm Narrator speech, NVDA, High Contrast thực, thiết bị/firmware OEM.

## Phân loại các lượt thử và điều chỉnh oracle

- P22 V1: `HARNESS_EXCEPTION` trước khi gửi phím, vì Python chạy qua Poetry shim nên PID tạo tiến trình khác PID top-level Tk witness. Receipt lỗi và runner giữ nguyên.
- P22 V2: **hành vi hủy POWER đã đúng**, nhưng runner tự đặt thêm `visibilityState==='hidden'` làm tiêu chí PASS nên báo `P22_FAIL_OS_KEY_FOCUS_CANCEL_OR_HARNESS`. Chrome thực tế vẫn `visibilityState='visible'` mặc dù native foreground đã rời Chrome, `document.hasFocus=false` và `window` có sự kiện `blur` chính xác. Đây là điều kiện phụ **không thuộc hợp đồng source `web/hold-input.mjs` hay acceptance gate P11**, không phải bằng chứng lỗi mô phỏng. V2 được giữ nguyên.
- P22 V3: hiệu chỉnh **chỉ oracle**: giữ ghi nhận `visibilityHidden=false` như observation, nhưng chỉ gate bắt buộc `window` target blur, focus loss, down→cancel chính xác, status không đổi, và nhả phím ở witness không tạo sự kiện Chrome. V3 PASS; không thay đổi runtime/source để đạt kết quả.

## Kiểm tra bảo toàn

P21 final/post SHA exact; canonical runtime **50/50** SHA đúng, ảnh OEM REFERENCE_ONLY **8/8**, user server `127.0.0.1:4173` PID1204 không bị restart/kill; cổng QA 4222 và debug 9232 đã đóng, profile và witness QA đã dọn, phím Space không còn giữ, foreground gốc được khôi phục theo receipt. Mọi file trong P22 chỉ thuộc `docs/qa`, không phát hành. Không rerun full Node/Python vì source không đổi; P21 focused Node 8/8 vẫn là sealed prior run.

Hai reviewer chỉ đọc đã rà soát đường Win32 SendInput và source `hold-input`, không sửa source; không nhận là độc lập vận hành hay nghiệm thu OEM. Mục tiêu 100% likeness chỉ là đích thiết kế; F1 PUBLIC_REFERENCE v2 synthetic, firmware thật UNKNOWN, hardwareValidated=false, OEM rights chưa clear, Phase6 OPEN, 65/65 claims HOLD, `releaseApproval=HOLD`.

## Bước tiếp cụ thể

Nếu phải nghiệm thu chính xác **phím vật lý của người vận hành**, cần một phiên thao tác thực duy nhất: giữ Space bằng bàn phím vào nút POWER, chuyển foreground qua Alt+Tab/chuột thật khi phím còn giữ, nhả ở witness; quan sát thụ động HWND + browser `blur` (target window) + trạng thái POWER và đếm edge. Không thay phím vật lý bằng CDP/Playwright/SendInput mà gọi đó là PASS human. Nếu chỉ cần mô phỏng browser offline synthetic, nhánh POWER focus-cancel có bằng chứng Windows QA đủ để không sửa source vô cớ. Sau khi chốt ngoại lệ human, ưu tiên ROI ảnh và thao tác OEM có nguồn, không tiếp tục chạy lại smoke test.
