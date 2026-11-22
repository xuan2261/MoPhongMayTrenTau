# FCV-588 — danh mục chức năng phục vụ mô phỏng huấn luyện đầy đủ

**Ngày nghiên cứu:** 13/10/2026 · **Trạng thái:** Research draft / NOT IMPLEMENTED · **Tài liệu tham chiếu:** FURUNO FCV-628/FCV-588 Operator's Manual OME-23890-E (88 trang PDF bản 2025, tham chiếu nội bộ bị hạn chế quyền); trang sản phẩm FURUNO. **Chưa khóa firmware/đầu dò của máy lớp học.**

**Bản ghi máy đọc được:** [FCV588_FEATURE_REGISTER_DRAFT.json](FCV588_FEATURE_REGISTER_DRAFT.json) được tạo chỉ từ bản kiểm kê nghiên cứu này, chưa đọc PDF hãng bằng pipeline. Trong tổng **65 dòng**, có **64 hạng mục thao tác FCV-588** (11 SIMULATED_ONLY, 53 OPEN) và **một mục D15 thuộc bảng giảng viên** (SIMULATED_ONLY theo quy trình kiểm thử nền tảng, không phải chức năng của máy FURUNO). Chưa có thao tác FCV nào VERIFIED_IMPLEMENTED. Kiểm tra bằng `python tools/build_fcv588_feature_register.py --check`.

## Cách đọc

Đây là ma trận **hành vi người vận hành cần khảo sát và kiểm thử**, không phải cam kết mọi cấu hình/option luôn khả dụng. Thông tin được diễn giải, không sao chép hình, bảng hoặc nguyên văn manual vào source. Số trang ở cột “Mục manual” là số trang **in trên tài liệu**, khác chỉ số trang PDF. Nguồn chức năng ở cấp nhóm đã được xác nhận; chi tiết từng danh sách lựa chọn phải kiểm lại bằng manual bản được phép khai thác và bằng máy thật.

**Mức độ thực hiện F0:** P = đang mô phỏng một phần; H = placeholder hoặc chưa thực hiện; N = chưa có. **Phụ thuộc**: CORE = chức năng mặc định; OPT = option đầu dò/cấu hình; DATA = dữ liệu ngoại vi giả lập; FW = khác biệt firmware; TEACHER = tương tác dùng cho giảng viên chứ không phải phím máy thật.

## A. Mặt máy, hệ thống trạng thái và thao tác cơ bản

| ID | Yêu cầu cần mô phỏng và test chấp nhận | Mục manual | Phụ thuộc | F0 |
| --- | --- | --- | --- | --- |
| A01 | Tỷ lệ màn hình LCD dọc 480×640, mặt máy và phím riêng đúng vị trí/tỷ lệ theo ảnh có quyền dùng; không biến shortcut chuột thành phím cứng | Sản phẩm, §1.1 tr.1 | CORE/FW | P |
| A02 | MENU/ESC, ENTER, TrackPad bốn hướng, RANGE, MARK, FUNC, nhấn/xoay GAIN, xoay MODE, POWER/BRILL; các hành vi nhấn/giữ/nhả/cancel | §1.1 tr.1 | CORE | P |
| A03 | POWER: trạng thái tắt/khởi động/bật, giữ hơn 3 giây để tắt, đồng hồ đếm/phím; lần chạy trước/khôi phục cấu hình | §1.2 tr.2 | CORE/FW | P |
| A04 | BRILL độ sáng 0–9: chọn/cycling/phím ENTER hoặc MENU, timer tự đóng và ảnh hưởng độ sáng hiển thị | §1.3 tr.2 | CORE | P |
| A05 | MODE: bảy vị trí thực tế, cửa sổ chọn chế độ, chuyển tự động sau timeout, đúng tiêu đề và bối cảnh | §1.4 tr.2–4 | CORE/FW | P |
| A06 | LF/HF đơn tần, biểu tượng, nhãn, thang độ sâu và cửa sổ ảnh quét cuộn | §1.4.1 tr.2 | CORE/OPT | P |
| A07 | DUAL 50/200 kHz: chia cửa sổ, nhãn/tần số, vùng ảnh tương ứng, cùng dữ liệu nguồn giả lập | §1.4.2 tr.3 | CORE/OPT | P |
| A08 | Zoom: Bottom Lock, Bottom Zoom, Marker Zoom, vị trí, dải zoom và hành vi chọn mục tiêu | §1.4.3 tr.3–4 | CORE/FW | H |
| A09 | NAV1/NAV2: loại, cột dữ liệu/bố trí, dữ liệu thiếu và hiện trạng “no data” khi mất sensor | §1.4.4 tr.4 | DATA | H |
| A10 | RANGE auto/manual: chọn 8 cấp, Auto_R/Man_R, đổi phạm vi ảnh hiển thị nhưng không sửa dữ liệu đáy | §1.5 tr.5, §2.2 tr.26 | CORE/FW | P |
| A11 | GAIN manual 0–10, Auto Fishing/Cruising/Off; Auto Gain Offset -5…+5; cancel/commit đúng ngữ cảnh | §1.6 tr.5–6 | CORE | P |
| A12 | VRM: TrackPad lên/xuống, độ sâu VRM, vạch đánh dấu trên màn hình, không hoạt động trong NAV | §1.7 tr.6 | CORE/FW | P |
| A13 | Menu chính 5 nhóm, điều hướng item và menu con, thay đổi giá trị staged, ENTER lưu, MENU/ESC quay lại/cancel theo từng mục | §1.8 tr.7, §1.22 tr.22 | CORE/FW | H |
| A14 | Shift thay đổi cửa sổ độ sâu; phụ thuộc Auto Range và độ sâu hợp lệ | §1.9 tr.7–8 | CORE | N |
| A15 | Tốc độ ảnh cuộn: 4×, 2×, 1×, 1/2…1/16, Stop; dừng ảnh không được ngầm dừng shared-world clock | §1.10 tr.8 | CORE | N |
| A16 | MENU/FUNC: nhấn ngắn mở chức năng gán, giữ mở cấu hình chức năng; thời lượng giữ phải hiệu chuẩn máy thực, không mặc định 650 ms | §1.19 tr.18–19, §2.3 tr.26 | CORE/FW | H |
| A17 | Bật/tắt âm phím, tăng tốc/auto-repeat TrackPad, hiệu ứng focus/nhấn giữ và thao tác nhầm | §2.3 tr.26 | CORE/FW | N |

## B. Xử lý và hiển thị ảnh hồi âm

| ID | Chức năng/test quan sát | Mục manual | Phụ thuộc | F0 |
| --- | --- | --- | --- | --- |
| B01 | Sản sinh kịch bản LF/HF có đáy, mục tiêu, nhiễu, nước sâu; độ sâu thực tế thay đổi theo kịch bản | §1.4, §1.22 Sounder | CORE | P |
| B02 | Interference Rejection: Auto/High/Medium/Low/Off ảnh hưởng interference profile định trước | §1.11 tr.9 | CORE | N |
| B03 | Clutter giảm nhiễu mức thấp, nội suy/cài đặt hiển thị và reset | §1.12 tr.9 | CORE | N |
| B04 | Color Erase xóa các mức hồi âm yếu và palette/color bar tương ứng | §1.13 tr.10 | CORE | N |
| B05 | A-Scope: cột cường độ tức thời theo độ sâu, bật/tắt và đồng bộ hình sonar | §1.14 tr.10 | CORE | N |
| B06 | White Line: đường trắng trước ảnh đáy, phân biệt mục tiêu sát đáy | §1.22 Sounder tr.22–23 | CORE | N |
| B07 | White Marker: chọn màu hiển thị trắng, xử lý đúng các thay đổi firmware | §1.22 Sounder, software history | FW | N |
| B08 | TVG: các chế độ giảm khuếch đại theo khoảng cách, thay đổi echo processing (không thay world) | §1.22 Sounder tr.22–23 | CORE | N |
| B09 | Smoothing: bật/tắt và hiệu ứng làm mịn nhất quán trên dữ liệu giả lập | §1.22 Sounder | CORE | N |
| B10 | Bottom Zone: cửa sổ/phạm vi nhận dạng đáy, ảnh và menu liên quan | §1.22 Sounder | CORE/OPT | N |
| B11 | TX Power: giao diện điều chỉnh và diễn giải tín hiệu giả lập; **không phát tín hiệu thật** | §1.22 Sounder | CORE/OPT | N |
| B12 | TX Rate: nhịp cập nhật hồi âm giả lập, không liên quan phát xung phần cứng | §1.22 Sounder | CORE | N |
| B13 | Zoom Mode chọn Bottom Lock/Bottom Zoom/Marker Zoom, kèm dải Zoom và BL được cấu hình trong System Range | §1.22 Sounder, §2.2 | CORE | N |
| B14 | RezBoost: Standard/Enhanced, phản hồi hình demo trong giả lập, chỉ enable khi option đầu dò/setting tương thích | §1.17 tr.14 | OPT/FW | N |
| B15 | ACCU-FISH: bật/tắt, đánh giá kích thước cá, biểu tượng cá và các đơn vị hiển thị | §1.15 tr.11–12 | OPT | N |
| B16 | Bottom Discrimination: Graphic/Probability, hiển thị loại đáy, legend và giới hạn khi thiết bị dùng đầu dò không tương thích | §1.16 tr.13–14 | OPT | N |
| B17 | Các xung đột mode: Bottom Discrimination/RezBoost/ACCU-FISH/NAV/Zoom/A-Scope trong từng cấu hình; controls disabled theo manual | §1.15–1.17, §2.7 | OPT/FW | N |
| B18 | Depth Size, Zoom Marker, Temp Graph, Window Size, Battery info, Color Bar, Palette, Header Info, Nav Data overlays | §1.22 Display tr.23–24 | DATA/FW | N |
| B19 | Bật/tắt/chọn bảng màu, 8/16 màu và các cài đặt liên quan firmware khác nhau | §1.22 Display, software history | FW | N |
| B20 | Power/stop/advance/refresh: khi Stop, ảnh quét dừng nhưng state clock, các cập nhật sensor, cảnh báo và menu đúng logic | §1.10, §1.22 | CORE | N |

## C. Cảnh báo và dữ liệu dẫn đường mô phỏng

| ID | Chức năng/test | Mục manual | Phụ thuộc | F0 |
| --- | --- | --- | --- | --- |
| C01 | Cảnh báo đàn cá Fish School, Bottom Fish và ACCU-FISH (điều kiện vùng, chiều dài giả lập, mode) | §1.18 tr.14–17 | OPT | N |
| C02 | Cảnh báo độ sâu đáy Bottom Alarm theo giới hạn/cự ly | §1.18 tr.14–17 | CORE | N |
| C03 | Cảnh báo nhiệt độ nước “Inside/Outside” trên dữ liệu cảm biến giả lập | §1.18 tr.14–17 | DATA | N |
| C04 | Cảnh báo tốc độ “Inside/Outside” theo STW/SOG giả lập | §1.18 tr.14–17 | DATA | N |
| C05 | Cảnh báo đến waypoint Arrival và cấu hình bán kính/điều kiện | §1.18 tr.14–17 | DATA | N |
| C06 | Cảnh báo loại đáy, chỉ có khi Bottom Discrimination khả dụng | §1.18 tr.14–17 | OPT | N |
| C07 | Bật/tắt alarm, nhóm cấu hình từng cảnh báo, biểu tượng nhấp nháy, audible alarm, một phím để im âm, điều kiện reset icon | §1.18 tr.14–17 | CORE/OPT | N |
| C08 | MARK: lưu waypoint tại vị trí/cursor, cấu hình, giới hạn từ Tankenmaru và mất nav data | §1.20 tr.18–21 | DATA/OPT | H |
| C09 | Danh sách, đổi tên, chỉnh sửa, xóa một/nhiều waypoint, chọn điểm đến và trạng thái chưa lưu/cancel | §1.20 tr.19–21 | DATA | N |
| C10 | NAV1/NAV2: GPS position, COG/SOG/heading, STW, distance, temperature, wind, bearing, destination/range, XTE và các hộp dữ liệu | §1.4.4, §1.21 tr.20–22 | DATA | H |
| C11 | Data menu, Data Box, bearing true/magnetic, wind true/relative, dữ liệu thiếu hoặc hết hạn | §1.22 Data tr.24–25 | DATA | N |
| C12 | Mất nguồn giả lập NMEA/GPS/temp/speed: hiển thị “--” và timeout dữ liệu, **không phát NMEA ra thiết bị thật** | §1.21–1.22 | DATA | N |
| C13 | Quãng đường Trip/Odometer, reset, sử dụng nguồn tốc độ ownship/gps theo menu | §1.22 Data / §2.6 | DATA | N |

## D. System, cấu hình, bảo trì hiển thị an toàn

| ID | Chức năng/test | Mục manual | Phụ thuộc | F0 |
| --- | --- | --- | --- | --- |
| D01 | System menu: cây menu/nhóm hiển thị theo cấu hình Standard hoặc Tankenmaru | §2.1 tr.26 | FW/OPT | N |
| D02 | 8 preset Range 1…8, Zoom Range, B/L Range; thay đổi depth units cập nhật preset/default đúng manual | §2.2 tr.26 | CORE/FW | N |
| D03 | Key menu: gán FUNC, phản hồi beep On/Off | §2.3 tr.26 | CORE | N |
| D04 | Chọn ngôn ngữ UI; các tài nguyên ngôn ngữ có quyền và trạng thái reboot/persistence | §2.4 tr.26 | FW | N |
| D05 | Units: depth, temperature, fish size, speed, wind, distance; chuyển đổi *chỉ giá trị hiển thị*, không thay truth | §2.5 tr.27 | CORE/DATA | N |
| D06 | Calibration: draft, gain, temp, speed, fish size, water type, zero line; thay đổi device/sensor model phù hợp, không sửa world | §2.6 tr.27–28 | OPT/DATA | N |
| D07 | Transducer selection, 600W/1kW, compatibility guard cho RezBoost/Bottom Disc./ACCU-FISH | §2.7 tr.28, sản phẩm | OPT | N |
| D08 | Demo On/Off, nhãn [DEMO], tự tạo echo khi không có đầu dò, tất cả control vẫn tương tác | §2.8 tr.28 | CORE | N (F0 luôn là synthetic) |
| D09 | Tankenmaru: chỉ mô phỏng menu/video status nếu phần cứng có option; **không mô phỏng phát radio** | §2.9 tr.29 | OPT | N |
| D10 | Power/battery low alert, error/status, lỗi dữ liệu cảm biến, trạng thái giao diện khi lỗi | §3.2–3.3 | CORE/DATA | N |
| D11 | Diagnostic screen: firmware Starter/Booter/Main, self-test giả lập và màn hình LCD color test | §3.7, §3.8 | FW | N |
| D12 | Restore defaults/Clear memory/Reset odometer trong bộ nhớ *mô phỏng* và xác nhận trước khi xóa | §3.9 | CORE | N |
| D13 | Persist setting giữa các lần Power off/on nếu manual yêu cầu; khác với reset bài tập giảng viên; có test snapshot | §1–3 / cần máy thật | CORE/FW | N |
| D14 | NMEA interface: mô phỏng trạng thái nhận/không nhận trong adapter sandbox; **không mở serial/UDP/thiết bị thật** | Menu System/NMEA, phần giao tiếp | DATA | N |
| D15 | Tự đánh giá/luyện tập: replay seed cố định, lesson initial state, kiểm tra đúng chuỗi semantic, trang kết quả riêng của giảng viên | Thiết kế lớp học (không phải chức năng FURUNO) | TEACHER | P |

## E. Ưu tiên và ma trận cấu hình

**P0/Đúng máy:** chốt hình học phím, firmware, power timing, Menu/ENTER/ESC, chế độ màn hình, Range/Gain/Offset, tự động lưu, 8 basic ranges, VRM, status box; các mục A01–A15 là nền cho thao tác thực.

**P1/Ảnh & echo:** zoom chính xác; picture advance/Stop; Gain/TVG/Clutter/Interference/White Line/A-Scope; báo động; Cửa sổ NAV giả lập đầu vào.

**P2/Chức năng nâng cao:** ACCU-FISH, RezBoost, Bottom Discrimination (chỉ đúng đầu dò); Waypoints, Demo, System/Language/Calibration, Diagnostic/Restore và Tankenmaru nếu máy được trang bị.

Không “đầy đủ” bằng cách ép bật tất cả option. Lấy **model + firmware + đầu dò + language + cấu hình ngoại vi** làm khóa hồ sơ. **64 mục FCV_OPERATOR** sử dụng một bộ trạng thái chuẩn: `OPEN` (thiếu), `SIMULATED_ONLY` (chưa xác nhận giống máy), `VERIFIED_IMPLEMENTED` (hành vi được chuyên gia và bài kiểm chấp nhận), `NOT_APPLICABLE_WITH_EVIDENCE` (máy thật không hỗ trợ, có chứng cứ về trạng thái disabled). Chỉ hai trạng thái cuối đáp ứng điều kiện phát hành về độ trung thực thao tác. **D15 là INSTRUCTOR_PLATFORM**, kiểm riêng tính năng giảng viên, không tính vào phép so sánh độ giống FCV-588. Xem [giao thức nghiệm thu](FCV588_FIDELITY_ACCEPTANCE_PROTOCOL.md).

## F. 12 loại tình huống để nghiệm thu

| Loại | Ví dụ / kết quả bắt buộc |
| --- | --- |
| Khởi động & persistence | Bật máy với cài đặt đã lưu, kiểm tra BRILL/MODE/Range đúng với firmware |
| Chọn/thoát menu | ENTER lưu, MENU/ESC hủy hoặc lùi một cấp, nguồn vẫn cập nhật độc lập |
| Phím giữ/cancel | Giữ POWER ngưỡng >3s, chuột kéo ra ngoài, đổi focus, khóa focus |
| Núm xoay | Từng nấc MODE/GAIN, cuộn nhanh/chậm, không bấm một nấc ra hai event |
| Dữ liệu echo | Đáy phẳng, đáy thay đổi, đàn cá, tần 50/200, thang 2–1200m |
| Tùy chọn phụ thuộc | Không có đầu dò hỗ trợ thì RezBoost/Bottom Disc không tự kích hoạt |
| Kịch bản tín hiệu nhiễu | Đặt interference/clutter mạnh/yếu đúng hiệu ứng và dữ liệu kịch bản |
| Alarm | Bật, kích hoạt, im chuông, biểu tượng chỉ biến mất khi hết điều kiện |
| Thiếu GPS/temp | Hiện placeholder dữ liệu, mất nguồn dữ liệu không làm app crash |
| Waypoint | Thêm/đổi/xóa, hủy, reset lesson, persistence sau power |
| Demo/Diagnostics | Nhãn Demo, thiếu đầu dò vẫn thao tác, chức năng diagnostic chỉ sandbox |
| Replay/học tập | Cùng seed/profile/log ra cùng kết quả; sai firmware hoặc khác bài thì từ chối |

## G. Chốt điều kiện trước khi chấp nhận đầy đủ

1. **Tư liệu thật:** ảnh chính diện có quyền; bảng vị trí/rộng cao phím; chụp từng trang menu và màn hình status.
2. **Khóa cấu hình:** Starter/Booter/Main version, transducer, Tankenmaru, đơn vị đo, phạm vi 8 preset và menu tùy chọn thực.
3. **Test cấp thao tác:** mọi hàng được triển khai phải có trạng thái ban đầu, input, kết quả, thoát/hủy, persistence, tình huống không hợp lệ.
4. **Nghiệm thu độc lập:** người vận hành FCV-588 xác nhận đúng trình tự phím và mặt máy; test 100% những workflow mục tiêu, không lấy tự động PASS thay chữ ký.
5. **Bản quyền:** tài liệu gốc là restricted evidence; không đưa vào `web`, `dist`, công khai GitHub/hosting nếu chưa có quyền.

**Trạng thái hiện tại:** đây là **kiểm kê nghiên cứu** gồm 17 + 20 + 13 + 15 = **65 yêu cầu/mục đối chiếu**; không có nghĩa 65/65 đã chạy hoặc 65/65 đã được xác nhận trên FCV-588 thực.
