# Báo cáo F0 — Audit, kiến trúc và nghiệm thu có điều kiện

**Ngày:** 13/10/2026
**Workspace:** C:\Work\MoPhongMayTrenTau
**Mức:** F0 prototype; **không** phải mô phỏng được xác nhận giống FCV-588 thật.

## 1. Phạm vi triển khai thực tế

- Xây dựng nền tảng tối thiểu native Node ES modules, HTML/CSS/Canvas để dùng trên trình duyệt Windows. Không cài dependency, không tạo repo từ mã bên thứ ba, không sửa lịch sử VietMoPhongChoTatCaCacMay.md.
- Lõi kịch bản minh họa đáy biển, đàn cá; đồng hồ mô phỏng riêng; quan sát sonar LF/HF riêng; module trạng thái FCV-588 độc lập; chuỗi InputEvent nhấn/nhả/giữ/xoay/push/TrackPad; log sự kiện, reset/replay.
- Mặt máy FCV-588 tự vẽ (mock-up) nay có LCD dọc 480×640, ENTER tách TrackPad và nút trợ xoay ± đặt ở bảng giảng viên. POWER, MODE, GAIN, RANGE, MENU/ESC, ENTER, TrackPad và VRM minh họa hoạt động trong các luồng F0. FUNC/MARK và các menu ngoài phạm vi hiển thị rõ trạng thái chưa triển khai.
- Sổ 6 hồ sơ máy, kiến trúc mở rộng, hồ sơ chứng cứ manual và 10 workflow đề xuất, ma trận test đã được tạo. Không có UI hoặc logic dùng chung máy radar/AIS/ECDIS nào được tuyên bố đã hoàn tất.

## 2. Chứng cứ đã quan sát

| Hạng mục | Bằng chứng | Kết quả |
| --- | --- | --- |
| Runtime | Node.js v22.22.0, npm v10.2.4 tại Windows workspace | Có |
| Nguồn dự án trước đó | Chỉ có file VietMoPhongChoTatCaCacMay.md, chưa có Git repo | Đã kiểm tra, không đụng file cũ |
| Syntax & unit integration | npm run check (Node syntax + node:test) | **34/34 PASS** sau sửa replay, input, portrait UI, VRM, static-server tests |
| HTTP security | GET index/src/web 200; docs và transcript 404; POST 405; CSP connect-src none | PASS trong test và kiểm tra thủ công |
| Chrome manual input | Boot, pause/step, MODE -> DUAL, Range -> MAN_R, Gain -> manual, replay 14 bước; ảnh chụp Chrome màn hình dọc | PASS giới hạn thử nghiệm — xem docs/qa/browser-smoke-2026-10-13.md |
| Replay integrity | Envelope gồm metadata+sự kiện+contentFingerprint; replay từng prefix; mismatch và tráo sự kiện/header bị từ chối | Test tự động; không phải chứng thực nguồn |
| World/sensor separation | SimTick và echo không phụ thuộc nguồn FCV, Gain/Range không sửa world | Test tự động |
| Device fidelity | Ảnh mặt máy/hệ menu/firmware thực tế chưa có | **HOLD** |

**Chú ý:** fingerprint FNV1a32 chỉ là dấu vân tay nhận biết thay đổi để test, **không phải hash bảo mật hoặc chữ ký chống giả mạo**. Bản đánh giá kết quả học tập phía browser cũng không phải hệ chấm điểm chống gian lận.

## 3. Findings và biện pháp

| Mức | Finding | Hành động |
| --- | --- | --- |
| P0 (đã sửa) | Đồng hồ đặt trong deviceState sẽ đóng băng khi POWER OFF; AIS/radar dùng chung sẽ sai. | Di chuyển thời gian vào session.worldState, luôn tick độc lập. |
| P0 (đã sửa) | Hold action chỉ được browser phân loại sẽ phá replay. | Nhận DOWN/UP/CANCEL theo tick; phân loại trong core. |
| P0 (đã sửa) | Replay thiếu phiên bản scenario/profile/PRNG, dễ đọc nhầm log cũ. | Meta version và fingerprints, kiểm tra tick/sequence, reject mismatch. |
| P0 (đã sửa) | World/sensor echoes phụ thuộc Gain/Range có thể thay đổi sự thật tình huống. | observeSounder tách khỏi display; Gain/Range chỉ ảnh hưởng phép chiếu. |
| P1 (đã sửa) | Tổ hợp nút thật TrackPad bị tách thành bốn control ảo. | Chuẩn hóa control trackpad + direction, keyboard mapping ở web. |
| P1 (đã sửa) | Đổi focus khi giữ Space/Enter hoặc nhiều pointer làm POWER/FUNC mắc kẹt, nhả sớm. | web/hold-input.mjs theo pointerId, nghe document keyup, focus blur, lostpointercapture; test 5 kịch bản. |
| P1 (đã sửa) | Log và metadata replay truyền rời nhau, có thể tráo cặp mà vẫn phát lại. | createReplayEnvelope bind thành một gói có dấu kiểm tra; test swap/reject. Không chống gian lận với phía client độc hại. |
| P1 (đã sửa sơ bộ) | Giao diện sai tỷ lệ LCD ngang, ENTER nằm trong TrackPad, các nút trợ xoay giả làm nút máy thật. | Portrait 480×640; ENTER tách riêng; +/- chuyển sang trainer. Geometry chính xác vẫn cần ảnh máy thật. |
| P1 (đã sửa sơ bộ) | Giữ POWER khi đồng hồ mô phỏng pause bị tính sai thời lượng. | Browser capture durationMs trong input event, core phân loại từ input đã ghi để replay deterministic. |
| P1 (đã sửa) | Thông báo núm GAIN auto dễ khiến học viên hiểu nhầm offset. | Nêu rõ Offset ±5 qua TrackPad còn deferred, xoay tay cần Off. |
| P1 (đang mở) | Chưa xác định firmware/transducer và chưa có hình ảnh được phép sử dụng. | F1 Fidelity Gate HOLD. |
| P1 (đang mở) | Hình NAV/ZOOM, menu thật, Shift, Pic.Advance, Interference thiếu; VRM mới có dòng/vạch minh họa. | Hoàn thành theo 10 mục Evidence Pack và đối chiếu máy thật; không chứng nhận VRM chỉ từ test. |
| P2 (đang mở) | Browser screenshot baseline/mobile/a11y/pointer long hold chưa xong. | Kiểm chứng E2E bằng thiết bị/viewport mục tiêu trước F1. |

## 4. Quyền, nguồn dữ liệu và an toàn

- Thiết bị mô phỏng training-only; không phát ra NMEA, AIS, RF, radar, dữ liệu serial, không kết nối đầu dò, và không đưa ra quyết định hàng hải.
- Node static server chỉ nghe 127.0.0.1, phục vụ file nằm trong /web và /src; chặn truy cập tài liệu riêng và directory traversal ra ngoài hai cây.
- Ảnh mặt máy/canvas là bản tự vẽ giản lược. Chưa đưa ảnh, logo hay screenshot bản quyền của FURUNO/KODEN vào phần mềm.
- Tài liệu trên mạng chỉ phục vụ nghiên cứu; không có PDF manufacturer nào được tải vào workspace, và chưa có checksum đối chiếu bytes.
- Mọi profile khác FCV-588 đều HOLD: MDC-2060 còn thiếu controller/version; FAR-2127 cần RCU; AIS R5 chưa biết SUPREME/SOLID; NS4000 chưa khóa thế hệ; KODEN J2000 chưa đúng tên model.

## 5. GO/NO-GO và điều kiện nghiệm thu

**GO có điều kiện cho F0 prototype** để bắt đầu thử nghiệm kỹ thuật, tạo bài học và tiếp tục kiểm thử. Không được gọi là sản phẩm có fidelity được chứng nhận, phần mềm sẵn sàng phát hành hoặc mô phỏng tàu thật.

**NO-GO cho F1 fidelity/đào tạo chính thức** cho tới khi xác định firmware/transducer/biến thể controller; có bộ ảnh tự chụp hoặc licensed, đối chiếu hình học và UI từng trạng thái; triển khai đủ 10 workflow chính, QA tình huống lỗi, và có chuyên gia vận hành duyệt.

## 6. Tiếp tục triển khai — đề xuất ưu tiên

1. Thu thập Evidence Pack thực tế cho FCV-588: ảnh chính diện, nhãn núm/phím, kích thước, màn hình Diagnostics firmware, loại đầu dò, trạng thái Tankenmaru, quyền phân phối tài sản.
2. Khóa DeviceProfile theo một máy thật và phiên bản cụ thể, tạo 10 test kịch bản thao tác từ manual có ảnh/video và expected state.
3. Đối chiếu và nghiệm thu FCV-T06 VRM với máy thật, thực hiện FCV-T07 Menu, sau đó Shift/Pic.Advance/Interference, bổ sung Auto Gain Offset/BRILL timeout; kiểm tra visual + keyboard/pointer.
4. Mở rộng world/sensor typed ports cho radar, sau đó đưa MDC-2060 hoặc AIS R5 vào cùng scene với FCV để chứng minh liên thông **không ảnh hưởng** echo cũ.
5. Chỉ sau F1 đạt: lập kế hoạch UI production, quản lý bài học/học viên, phân phối nội bộ và rà soát pháp lý.

## 7. Lệnh kiểm tra

Từ workspace:

~~~powershell
npm run check
npm start
~~~

Trình duyệt mở http://127.0.0.1:4173. Để tránh tạo các luồng mạng không cần thiết, dịch vụ HTTP hiện chỉ phục vụ local và không cung cấp bất kỳ API xuất dữ liệu.
