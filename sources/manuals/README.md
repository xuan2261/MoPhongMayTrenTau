# Kho manual tham khảo nội bộ — MoPhongMayTrenTau

**Kiểm định:** 13/10/2026. **Phạm vi:** file nguồn để nghiên cứu thiết kế mô phỏng; KHÔNG được coi là quyền tái xuất bản hay tích hợp vào phần mềm.

## Bản kiểm kê thực tế

| Thiết bị | Tư liệu đã lưu | Độ tin cậy về đúng model | Ghi chú |
| --- | --- | --- | --- |
| FURUNO FCV-588 | Operator's Manual OME-23890-E (2025; 88 trang), **Operator's Guide đa ngôn ngữ, Software History và brochure hãng 6 trang (tư liệu hình ảnh, không phải manual)** | Hãng, dùng chung FCV-628/588 | Hồ sơ tham chiếu công khai có thể bắt đầu không cần ảnh/Diagnostics máy lớp học; firmware và đầu dò thực tế vẫn chưa rõ |
| FURUNO FAR-2127 | FAR-2XX7 Operator's Manual OME-35190-U5 (2024; 325 trang) và Operator's Guide (4 trang) | Hãng, đúng họ FAR-2127 | Bộ điều khiển RCU-014/015 chưa chốt |
| KODEN MDC-2060 | MDC-2000 Series Rev14 (86 trang), Rev15 (88 trang), Quick Reference Rev00 (2 trang) | Hãng, có tên MDC-2060 trong bản PDF | Trang sản phẩm đang liên kết Rev14; đường Rev15 hợp lệ nhưng chưa chọn làm chuẩn |
| TransponderTech R5 SUPREME AIS | Gói tài liệu chính thức J1, manual AIS 7000 118-300 L1 (145 trang) và quick guide cùng các manual NAV | Đúng họ SUPREME, biến thể học viên chưa xác nhận | Không trộn với SOLID |
| TransponderTech R5 SOLID AIS | Gói tài liệu chính thức J1, manual AIS 7000 118-200 N1 (107 trang tiếng Anh), quick guide và bản tiếng Đức | Đúng họ SOLID, biến thể học viên chưa xác nhận | Không trộn với SUPREME |
| NS4000 / Navi-Sailor 4000 | User Manual v2.00.009 (311 trang) | Tài liệu lưu tại đại lý, không phải link phát hành chính hãng hiện hành | v3.02.350 có tài liệu xem trực tuyến nhưng chưa xác minh tải trực tiếp |
| KODEN J2000 | Không có PDF xác minh đúng mã | **HOLD — chưa xác định model** | Cần hình nhãn máy; tuyệt đối không lấy manual model khác thay |

Tổng kiểm tra sau khi bổ sung brochure tham khảo hãng: **24 PDF + 2 ZIP**, với **197.171.462 byte** (tính cả ZIP gốc và các bản PDF trích ra nên không phải dung lượng dữ liệu duy nhất). Trong 24 PDF có **một brochure không phải user manual**. Ba đường nguồn phụ không lấy được được nêu trong manifest, không được coi là file đã tải.

## Tập tin chứng cứ

- [MANIFEST.json](MANIFEST.json): nguồn tải, đường dẫn, file size, SHA-256, số trang, trạng thái từng URL.
- [VERIFICATION_RECEIPT.json](VERIFICATION_RECEIPT.json): kết quả đọc lại file trên Windows, gồm trường hợp FAIL/SKIP thực tế.
- [ARCHIVE_COVERAGE.json](ARCHIVE_COVERAGE.json): **trạng thái riêng cho từng model/biến thể**, bao gồm tài liệu đã lấy và các nguồn chưa thể lấy do phiên bản, quyền truy cập hoặc chưa xác định tên máy. Không đánh đồng trạng thái ACCOUNTED_WITH_HOLDS với “đã tải đầy đủ”.
- Chạy từ root dự án: `python tools/verify_reference_manuals.py`.
- Để kiểm kê/lấy thêm manual (có truy cập Internet): `python tools/archive_reference_manuals.py --dry-run` để xem URL, sau đó mới bỏ `--dry-run`.

## Cảnh báo nguồn và quyền

1. Lưu để **tham khảo hạn chế trong workspace**; không phân phối PDF, ảnh, screenshot, logo hoặc tài nguyên nhãn hàng kèm bản build/web/app.
2. Quyền xử lý tự động/generative AI, tái vẽ và phát hành phải được người nắm quyền xác nhận, nhất là [chính sách KODEN](https://www.koden-electronics.co.jp/en/site-p-en/) có hạn chế xử lý dùng AI. [FURUNO USA Terms](https://www.furunousa.com/en/terms_of_use) cũng hạn chế sử dụng nội dung ngoài phạm vi cá nhân.
3. Tên file/revision trong kho là **mô tả file tham khảo**, không khẳng định máy tại phòng học đang chạy phiên bản đó. Giữ các bản cùng model riêng; không tự thay phiên bản.
4. Không thực thi bất kỳ phần mềm, firmware, macro hoặc file thực thi nào bên trong ZIP. Trình tải chỉ trích PDF phù hợp, không cài hay gửi lệnh đến thiết bị thật.
5. Các màn hình từ manual được dùng để **đối chiếu nội bộ có kiểm soát** sau khi làm rõ quyền, không sao chép trực tiếp vào giao diện phát hành.

## Khoảng trống cần xử lý

- **FCV-588:** có ảnh/brochure/video tham chiếu công khai nhưng không có firmware, đầu dò hay cấu hình của máy học viên; quyền sao chép ảnh/video/đối chiếu cần kiểm riêng. Kế hoạch PUBLIC_REFERENCE có thể thực hiện trước, kế hoạch HARDWARE_TARGET vẫn HOLD.
- **AIS R5:** biết chắc là SUPREME hay SOLID, phiên bản firmware.
- **FAR-2127:** bộ điều khiển và phiên bản.
- **NS4000:** phiên bản chạy thực tế và quyền truy cập manual tương ứng.
- **J2000:** xác định lại model/nhà sản xuất bằng ảnh nhãn thiết bị.

**Trạng thái archive:** PASS với các file đã thu thập, **không phải PASS về tính đầy đủ cho mọi model/firmware**.

### Trạng thái lưu trữ chuẩn

Từng mục trong ARCHIVE_COVERAGE.json phải thuộc một trong các trạng thái: ARCHIVED_VERIFIED, RIGHTS_OR_ACCESS_HOLD, IDENTITY_HOLD, VERSION_HOLD hoặc SOURCE_UNAVAILABLE. **NS4000 v3.02.350** hiện là RIGHTS_OR_ACCESS_HOLD; **KODEN J2000** là IDENTITY_HOLD. Cả hai đều chưa có file local tương ứng và tuyệt đối không được ghi là đã tải.
