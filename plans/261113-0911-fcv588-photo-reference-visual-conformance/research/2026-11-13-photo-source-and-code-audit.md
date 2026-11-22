# FCV-588 — source audit cho kế hoạch visual conformance
Ngày khảo sát: 2026-11-13 (+07). Phạm vi: read-only research, không sửa runtime hoặc receipt.

## 1. Thẩm quyền nguồn

- **P — 8 ảnh gốc trên Windows:** `sources/FCV588_GiaoDienThucTeMay2016/*.jpg`, ảnh người dùng chỉ định. Tên folder không chứng minh năm sản xuất/ngày chụp/firmware. Tất cả 590×1280 px (toàn cảnh máy/chụp lệch, không phải dump LCD 480×640).
- **M — manual nhà sản xuất:** FURUNO FCV-628/588 Operator's Manual OME-23890-E, §1.1–1.8, §1.21–1.22, §2.4 và §4.10; URL https://www.furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/fcv628_fcv588_operators_manual.pdf ; bản E cập nhật 2025, nên không tự nhận phản ánh firmware chiếc máy trong ảnh.
- **S — specification chính thức:** https://www.furuno.com/en/products/fishfinder/fcv-588/index.html ; 480×640 portrait LCD, 8.4 inch, 233×270×158 mm tổng thể. KHÔNG suy kích thước riêng phần đầu vỏ từ 270 mm tổng thể.
- **C — code hiện hành:** các đường dẫn và số dòng ở §3; mã đang chạy chưa được screenshot lại bằng Chrome trong phiên lập kế hoạch này.
- **R — nguồn có giới hạn quyền:** ảnh, PDF/font/logo không được copy từ sources/manuals vào web/src, không đóng gói cho người khác hoặc xuất bản chỉ vì là tài liệu đọc được. Chỉ dùng nội bộ cho quan sát và phép đo đã được phép.

## 2. Kiểm kê ảnh — SHA-256 bất biến tại lúc khảo sát

| Ảnh | SHA256 | Điều quan sát trực tiếp |
|---|---|---|
| `giaoDien.jpg` | `E7B78466FA582DC0CC50AEC8E2FC264F8B3EE187D93A53CACE1E88D1E156C99C` | Menu tiếng Việt với sidebar trái, danh sách/giá trị phải, footer hướng dẫn; sonar/độ sâu còn thấy ở nền |
| `lf.jpg` | `C3EF46A27FC965C95D2DF33981B0C66775B848AE96AA8EFDCAD932B91A50C3EF` | `MAN.R G:10 LF 13.6V`; hồi âm mặt nước rất dày/tối, đáy khoảng 19.4 m, nền trắng |
| `hf.jpg` | `7F1A69504FD703988750729EE38B4964229480A4C55B20AE0F0BB4815F6EA2A9` | `HF 13.7V`; cột nước thưa điểm, đáy khoảng 19.7 m |
| `dual.jpg` | `4D88FE11CDA8A9107F97E44A392103CC68EB8AB8E685B7B5E7408A556A2BC37B` | `LF/HF`, LF trái nhiễu dày, HF phải thưa, hai đáy, phân chia dọc |
| `zoom.jpg` | `ECC7AF35E30AAFB8F0E9CFE9F05F94C8D529D6D410A2E523053286149D330B52` | `BL-LF`, vùng zoom trái/đầy đủ phải, thang độ sâu độc lập |
| `zoom2.jpg` | `41EAA80B42450B36C3B0F547B9276E26703CE1B74D2F85B1393255FDA42BCD99` | `BL-HF`, vùng bottom lock trái và sonar phải; cá/mục tiêu/đường đáy nhiều lớp |
| `nav1.jpg` | `B90DE3AFEB18730E10E4AC897FB20BBDE36155E25CC344ABED259BA1DE0D030E` | Ô dữ liệu vị trí/độ sâu lớn bên trái; sonar 1/3 phải; số sâu lớn nằm phần dữ liệu trái |
| `nav2.jpg` | `9F225C6834EFE86C76FD8A86BBFAA8F6D276F1E055A815EFC91087A832397DE6` | Ô tốc độ/vị trí/độ sâu lớn bên trái, thiếu receiver thể hiện nét gạch; sonar phải |

Ghi chú: LF/HF khác nhau quan sát ở cùng buổi ảnh không xác định được thuật toán đầu dò hoặc mẫu noise thống kê. Không dùng ảnh chụp có moiré/phản xạ/bóng góc như ground-truth pixel thô.

## 3. Đối chiếu mã nguồn có định vị

- `src/devices/fcv588/model.mjs:64-74`: `palette: "Blue"` mặc định; đây là hợp lệ trong hệ menu chung nhưng không trùng **cấu hình White của ảnh đối chứng**.
- `src/devices/fcv588/display-palette.mjs:5-15`: RGB độc lập lớp học, không phải RGB đo máy.
- `src/devices/fcv588/display-layout.mjs:6-24`: DUAL LF trái/HF phải; ZOOM trái/normal phải; NAV trái 2/3/sonar phải 1/3. Có thể tái sử dụng.
- `src/devices/fcv588/echo-projection.mjs:196-277`: synthetic echo, TVG/clutter/interference/smoothing, zoom; giữ phép chiếu thuần túy, không lấy ảnh tĩnh làm source dữ liệu.
- `web/app.mjs:124-154`: `drawChannel` dùng 1 renderer chung, nhãn `50 kHz/200 kHz` và 3 mốc độ sâu → không sát bản chụp.
- `web/app.mjs:324-560`: một khối dựng hình lớn; NAV số liệu `19px Consolas`, `screen-top` có `AUTO_R/MAN_R` và picture-rate, không thấy điều kiện battery-voltage theo §1.22. NAV sâu lớn còn đặt về phía phải từ CSS.
- `web/styles.css:86-108`: bezel/LCD/chữ/độ sâu dùng các kích thước CSS theo viewport; `depth-indicator[data-view=NAV]` đặt sang phải, khác ảnh NAV người dùng cung cấp.
- `web/index.html:25-105`: .device-frame + canvas 480×640 + controls; D15 tách ngoài máy.
- `test/fcv588-public-manual-layout.test.mjs`, `test/fcv588-public-reference-visual.test.mjs`, `test/fcv588-public-display.test.mjs`: hữu ích làm regression, KHÔNG là visual OEM review.
- `test/fcv588-v57-header-compact.test.mjs`: 6 bài test V57 đã có; **V57 final và independent postreceipt thực tế tồn tại** trong `docs/qa/FCV588_V57_HEADER_COMPACT_20261031/`. Readback mới ngày 2026-11-13 thấy 38/38 runtime SHA đúng với manifest nhưng SHA file scoped-integrity khác postreceipt; xem [preflight](./2026-11-13-v57-integrity-preflight.md). Không chạm code trước khi giải thích bất đồng.

## 4. Nghiên cứu manual: điều kiện rất dễ làm sai

- §1.4 LF/HF; §1.4.2 LF trái/HF phải; §1.4.3 BL/BZ/MZ header; §1.4.4 NAV 2/3 trái. Mặc định NAV1/NAV2 theo manual có thể khác cấu hình trong ảnh vì các ô NAV tùy chỉnh.
- §1.22 [Battery] On **thay thế** picture-advance speed indicator bằng battery voltage trên header. Không bịa điện áp 13.7 V cố định; chỉ hiển thị khi có typed synthetic battery fixture hoặc trạng thái phù hợp, và giữ ngữ nghĩa nhận nguồn.
- §2.4 + §4.10: mục ngôn ngữ chứa lựa chọn `Viet Nam`. Ảnh menu tiếng Việt có căn cứ, nhưng không xác minh mọi chuỗi dịch của phiên đang chạy; chỉ dùng locale label được nguồn hỗ trợ.
- Manual 2025 mô tả `Colors` 8/16/64, nhưng project hiện có firmware/rights/source gates; đừng tự sửa enum để khớp manual mới hơn.
- Manual §2.8 cho phép `[DEMO]` trong DEMO đúng ngữ cảnh; không thêm SIM, synthetic, teacher labels lên LCD.
- Thang 480×640 là LCD thực; ảnh 590×1280 bao gồm vỏ, góc chụp, môi trường: không lấy sai ảnh toàn khung làm kích thước LCD.

## 5. Phân lớp độ tin cậy và phép đo

| Cấp | Có thể chốt từ nguồn | Chưa được phép tuyên bố |
|---|---|---|
| HIGH | mode labels, bảng điều khiển, nền White của 8 ảnh, LF/HF/DUAL/ZOOM/NAV bố cục, số sâu lớn, §1.22 Battery thay thế picture-rate | installed firmware 2016, OEM pixel-perfect |
| MEDIUM | tương quan kích thước vùng, hình dáng đáy và mật độ echo, tỉ lệ font/khung từ ảnh điện thoại | chính xác RGB/glyph/delay/noise-distribution |
| UNKNOWN/HOLD | nhận dạng phiên bản firmware cụ thể, ngày chụp, quyền sử dụng media, font gốc, detent/nhấn/cảm giác vật lý, màu quang học | phần trăm tương đồng OEM, phát hành kèm ảnh PDF |

## 6. Định nghĩa đầu ra và kiểm chứng

- Lập photo atlas 8 mode với vùng LCD crop/warp **chỉ nội bộ**, ghi rõ đánh dấu/camera artifacts, normalized landmarks và confidence, cùng nguồn revision/fingerprint.
- UI renderer sử dụng **tọa độ logic 480×640** và view-model tách per-mode; Canvas dựng sonar liên tục từ typed synthetic data; HTML/CSS phím/mặt máy, D15 ngoài máy.
- So sánh có lớp phủ landmark theo vùng UI, không so trực tiếp raw JPEG vs canvas làm phép chứng nhận. Golden screenshots phải là sản phẩm tự vẽ, chạy bằng fixed scenario/clock và ghi SHA.
- Characterization GREEN hiện có (LF/HF channel difference, deterministic frame), chỉ TDD RED→GREEN cho **photo-specific behaviors còn thiếu**: geometry/labels/conditional Battery thiếu numeric sample, NAV left depth, scale, bottom texture/face; source, rights, server chỉ phục vụ allowlist. Numeric voltage `HOLD` tới khi có typed source + compatibility contract.
- Gate: mỗi phase scoped changed files + stage QA + regression Node/Python + Chrome source HTTP-body SHA + screenshots/render; stop nếu SHA drift/harness failures chưa giải thích; Phase6/65 feature HOLD không tự nâng.
- Source oracle thiếu → `REFERENCE_ESTIMATE` hoặc `NOT_YET_VERIFIED`; không đổi các giá trị này thành PASS vì unit/browser test.

## 7. Kết luận nghiên cứu

Chọn **renderer theo từng chế độ có data-flow độc lập** thay cho CSS-only và rewrite. Quyền, firmware, số đo quang học, tính năng chưa có oracle giữ HOLD. Phải kiểm lại ảnh baseline mới trước tính độ sai lệch; kế hoạch mới không sửa source hiện tại.

### Nguồn tham chiếu nội bộ
- `docs/research/FCV588_PUBLIC_UI_REFERENCE_MATRIX_2026-10-14.md`.
- `docs/research/FCV588_OFFICIAL_VISUAL_COMPARISON_V28.md`.
- `plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/phase-06-conformance-classroom-qa.md`.

