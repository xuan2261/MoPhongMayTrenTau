# Bàn giao nghiên cứu FCV-588 và kho manual — 13/10/2026

**Địa chỉ làm việc duy nhất:** `C:\Work\MoPhongMayTrenTau`
**Trạng thái giao:** nghiên cứu/plan/kiểm định tư liệu đã hoàn thiện theo phạm vi có thể kiểm chứng, **chưa hiện thực F1 toàn chức năng**.
**Giới hạn:** ứng dụng đào tạo, không thay thế máy đo sâu thật; mọi đầu ra sonar/waypoint/GPS là dữ liệu kịch bản không phục vụ dẫn tàu.

## 1. Kết quả đã làm và kiểm chứng

| Công việc | File/chứng cứ | Kết quả |
| --- | --- | --- |
| Thu thập tài liệu theo model/biến thể | `sources/manuals/MANIFEST.json` | 23 PDF + 2 ZIP, toàn bộ tài liệu **đã tải** được xác minh chữ ký/kích thước/số trang/SHA-256 |
| Xác minh lại độc lập trong Windows | `sources/manuals/VERIFICATION_RECEIPT.json` | PASS_AVAILABLE_ASSETS_WITH_GAPS; 195.535.769 byte gồm cả ZIP + bản trích PDF |
| Không giả báo “tải đủ mọi máy” | `sources/manuals/ARCHIVE_COVERAGE.json` | ACCOUNTED_WITH_HOLDS; NS4000 v3 và J2000 vẫn chưa có bản phù hợp |
| Nghiên cứu chức năng FCV-588 | `docs/research/FCV588_FULL_FUNCTION_INVENTORY_2026-10-13.md` | 65 dòng: 64 hành vi giao diện/vận hành + 1 mục nền tảng giảng viên |
| Hồ sơ chức năng có thể kiểm tra | `docs/research/FCV588_FEATURE_REGISTER_DRAFT.json` | 64 FCV_OPERATOR (11 SIMULATED_ONLY, 53 OPEN), D15 INSTRUCTOR_PLATFORM (SIMULATED_ONLY), **0 chức năng được xác nhận bằng thiết bị thật** |
| So sánh giải pháp và kiến trúc | `docs/research/FCV588_HIGH_FIDELITY_BRAINSTORM_ADVICE_2026-10-13.md` | Chọn per-device state machine + giao diện đúng model + shared deterministic world/sensor core |
| Chuẩn nghiệm thu có số đo | `docs/research/FCV588_FIDELITY_ACCEPTANCE_PROTOCOL.md` | 4 trạng thái FCV chuẩn, D15 QA tách riêng; đề xuất sai lệch hình học ±2%, 0 lỗi event/30 lần, static screenshot ≤3% sau mask; **chưa được người vận hành ký** |
| Lộ trình chính thức | `plans/261013-1319-fcv588-full-fidelity-simulator/plan.md` | AgentKit CLI scaffold thật, 7 pha, 78 công việc, 0 hoàn thành; `ak plan validate` PASS |
| Kiểm thử dự án sau nghiên cứu | `docs/reports/FCV588_RESEARCH_QA_2026-10-13.txt` | `npm run check` **41/41 PASS**; feature register --check và plan validate PASS |

Ba đường tải phụ từng thất bại (một revision FCV cũ trả trang HTML và hai bản AIS FCC bị từ chối 403) được lưu trong manifest. Các nguồn hãng hiện có khác đã thay vai trò tham khảo nên không cần bypass 403. Riêng **J2000** chưa xác định được đúng model; **NS4000 3.02.350** mới tìm được bản xem online/metadata, chưa có PDF cấp phép tải xuống phù hợp. Giữ HOLD, không gán manual dòng máy khác.

## 2. Cấu trúc thư mục

```text
C:\Work\MoPhongMayTrenTau\
  README.md
  VietMoPhongChoTatCaCacMay.md      (giữ nguyên)
  src/                               F0 core, FCV state và adapter
  web/                               F0 giao diện và phím
  test/                              Node test, bao gồm research/plan guards
  sources/manuals/
    FCV-588/                        Operator Manual E, Guide đa ngôn ngữ, Software History
    FAR-2127/                        Operator Manual + Guide
    MDC-2060/                        Rev14, Rev15, Quick Reference
    AIS-R5-SUPREME/                   Gói ZIP hãng và PDF manual trích xuất
    AIS-R5-SOLID/                     Gói ZIP hãng và PDF manual trích xuất
    NS4000/                          Historical User Manual v2
    MANIFEST.json
    VERIFICATION_RECEIPT.json
    ARCHIVE_COVERAGE.json
    README.md
  docs/research/                     Nghiên cứu, 65-item inventory, register, acceptance protocol
  docs/reports/                      Receipt/biên bản nghiên cứu
  plans/261013-1319-fcv588-full-fidelity-simulator/
    plan.md
    phase-01-start.md
    phase-02-panel-input-power.md
    phase-03-menus-configuration.md
    phase-04-echo-renderer-advanced.md
    phase-05-alarms-waypoints-nav-diagnostics.md
    phase-06-classroom-qa-acceptance.md
    phase-07-multi-device-isolation.md
```

Các raw PDF/ZIP là **restricted evidence** và được loại khỏi Git mặc định qua `.gitignore`; không đưa vào `web`, `dist`, public GitHub hoặc bộ cài. Một số nhà sản xuất, nhất là KODEN, hạn chế xử lý/tái tạo bằng GenAI khi chưa có sự cho phép.

## 3. Các sai khác còn tồn tại của F0 so với FCV-588 thật

| Nhóm | Hành vi cần đối chiếu / triển khai đúng trước khi gọi là F1 |
| --- | --- |
| MODE | Cửa sổ chọn xuất hiện khi xoay, tự ẩn sau ~6 giây, chế độ khi thoát startup; không chỉ thay mode tức thời |
| POWER | Đếm ngược khi giữ tắt máy và persistence theo firmware |
| BRILL | Nhấn lặp để cycle độ sáng, cửa sổ tự đóng, ENTER/MENU đúng hành vi |
| RANGE / GAIN | Nhấn lặp chọn preset, Auto Gain Offset, điều kiện cấm dưới Bottom Discrimination |
| VRM | Bước tăng và vị trí chỉ báo độ sâu sát vạch trên đúng màn hình thật |
| Sonar view | LF/HF, DUAL, Zoom/Bottom Lock/Bottom Zoom/Marker Zoom, A-Scope và đồ họa mục tiêu đặc thù |
| Menu/System | Cây menu cụ thể, lưu/hủy, ngôn ngữ/units/calibration/option/persistence |
| Alarms/NAV/Waypoints | Điều kiện kích hoạt/cảnh báo/ack/mute, thiếu dữ liệu cảm biến, CRUD waypoint, nguồn nav |
| Advanced | ACCU-FISH, RezBoost, Bottom Discrimination theo đúng loại đầu dò; Demo, diagnostics, reset |

Những tính năng điều kiện phải kiểm tra với transducer, Tankenmaru và phiên bản Main. Không lấy từ manual mới nhất làm giả định cho phần cứng cũ.

## 4. Skill và mức độ thực thi có thật

- **Đã đọc hướng dẫn gói:** `ak-brainstorm` v2.8.2, `ak-research`, `ak-pdf`, `ak-docs-seeker`, `ak-plan`, cùng các reference brainstorm ultra/advice và native PDF workflow.
- **Có thực thi thật:** Windows `ak plan create/add-phase/validate/parse`; Python native để tải, trích riêng PDF, xác minh và phát hành manifest; Node `npm run check`.
- **Chưa thể xác nhận:** flag `--ultrathink` không tồn tại trong cú pháp skill; `--ultra` cần **đúng 5 read-only candidates chạy cùng đợt và một Kongming verifier**, nhưng runtime CoS hiện chỉ có 2 worker; `--advice` supervisor Kongming không có API nhắm đích được. Không có fan-out giả, model-routing giả hoặc receipt `ultra` giả. Hai worker read-only đã góp ý về chức năng/nguồn và review bản kế hoạch, nhưng không đồng nghĩa chạy đúng chế độ ultra/advice.
- **Đã tiếp thu review:** thêm archive gate, một bộ trạng thái chuẩn, ngưỡng QA định lượng, sửa UNKNOWN cũ và loại trừ D15 khỏi việc chấm độ giống phần cứng FCV.

## 5. Lệnh tự xác minh từ workspace

```powershell
cd C:\Work\MoPhongMayTrenTau
python tools/verify_reference_manuals.py
python tools/build_fcv588_feature_register.py --check
ak plan validate .\plans\261013-1319-fcv588-full-fidelity-simulator
ak plan parse .\plans\261013-1319-fcv588-full-fidelity-simulator --json
npm run check
npm start
```

App F0 hiện chỉ phục vụ localhost 127.0.0.1:4173. Các câu hỏi về firmware, quyền ảnh và bộ phát sonar không được “kiểm định” bằng một lần chạy phần mềm.

## 6. Khuyến nghị bước tiếp theo

**F1 Phase 1 — Equipment Evidence & Rights Lock** là bước nên thực hiện trước. Cần ảnh vuông góc chính diện, nhãn rõ phím/knob, kích thước khung, ảnh màn hình Diagnostics với Starter/Booter/Main, model đầu dò và phụ kiện Tankenmaru, những nguồn GPS/temperature/speed đang lắp, chế độ ngôn ngữ và 8 dải Range thực, đồng thời cần xác nhận phạm vi được phép dùng ảnh/manual trong nội bộ và phát hành phần mềm đào tạo.

Song song có thể kiểm tra/định nghĩa các test thuần phần mềm không phụ thuộc quyền ảnh. Nhưng **không đánh dấu F1 GO hoặc 65/65 đạt** nếu chưa có đối chiếu máy thật và một người vận hành chấp thuận. Mục tiêu là mô phỏng *thao tác và phản hồi màn hình của đúng chiếc FCV-588*, không tuyên bố tương đương thiết bị đo sâu chứng nhận.

## 7. Nguồn chính

- [FURUNO FCV-588 product/spec](https://www.furuno.com/en/products/fishfinder/fcv-588/index.html)
- [FURUNO FCV628/588 Operator's Manual](https://www.furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/fcv628_fcv588_operators_manual.pdf)
- [FURUNO FCV628/588 Operator's Guide](https://www.furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/fcv628_fcv588_operators_guide.pdf)
- [FURUNO USA support/software history](https://www.furunousa.com/en/support/FCV588)
- [KODEN MDC-2060](https://www.koden-electronics.co.jp/en/marines/mdc-en/mdc-2060-2/)
- [TransponderTech R5 SUPREME/SOLID support](https://www.transpondertech.com/support)
- [Wärtsilä Navi-Sailor lifecycle](https://www.wartsila.com/marine/products/data-service-downloads)
- [KODEN copyright/AI processing policy](https://www.koden-electronics.co.jp/en/site-p-en/)

**Kết luận của giai đoạn nghiên cứu:** technical exploration/report/plan và manual file integrity **GO** trong phạm vi đã kiểm; F1 hardware-fidelity và quyền phân phối **NO-GO cho tới khi có chứng cứ và quyền đầy đủ**.

## 8. Biên bản chốt review độc lập

**Đánh giá read-only cuối (13/10/2026): GO cho mức RESEARCH/PLAN readiness; không còn Critical/Important xác nhận trong các file được kiểm lại.** Reviewer độc lập đã xác nhận ba nhóm lỗi kế hoạch ban đầu được khép kín: manual archive có cổng kiểm kê và trạng thái HOLD minh bạch; bộ trạng thái nghiệm thu nhất quán; ngưỡng định lượng yêu cầu người vận hành ký trước triển khai. Hai lỗi còn lại cũng được sửa: bỏ nhãn UNKNOWN lỗi thời trong phase-03/06 để dùng OPEN kèm lý do chưa có chứng cứ, và tách chức năng giảng viên D15 khỏi 64 hạng mục FCV_OPERATOR. Kết quả này không được diễn giải là “FCV-588 giống hệt máy thật”.

Reviewer chỉ đọc mã/tài liệu, **không tự chạy lại test**; bằng chứng chạy thực thuộc lần npm run check **41/41 PASS** của điều phối viên, ak plan validate trả valid=true và manifest verification PASS. Khả năng chạy skill --ultra đúng giao thức năm ứng viên và kongming --advice vẫn thiếu trong runtime này; không ghi nhận đã chạy các chế độ đó.
