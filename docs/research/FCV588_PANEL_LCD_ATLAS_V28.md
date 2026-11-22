# FCV-588 — Atlas mặt máy và LCD V28

**Phạm vi: tọa độ đo từ trình duyệt mô phỏng; không phải số đo máy thật.**
Không có tỷ lệ giống OEM, chứng nhận phần cứng hoặc phê duyệt phát hành.

## Nguồn và cách đọc

LCD logic 480×640 được đối chiếu trang sản phẩm FURUNO Italia. Kích thước
tham chiếu 128×171 và bao hình 233×270 kế thừa hồ sơ nguồn công khai của
dự án; không suy ra kích thước đầu máy trần hoặc vị trí nút chính xác.
Bố cục menu, góc núm và nét vỏ vẫn là hình vẽ độc lập có nhãn ước lượng.

Tọa độ chuẩn hóa lấy góc trên trái `.equipment` làm (0,0), chia x/rộng
cho chiều rộng đầu máy mô phỏng, y/cao cho chiều cao tương ứng. CSS px
không phải mm hay pixel vật lý của màn hình. Ở điện thoại, `.equipment`
là bố cục luyện tập đã sắp lại, không được so trực tiếp với mặt máy thật.

## Bằng chứng đầu vào

Runtime: `F1-public-reference-19`; 33 tệp; manifest:
`79eb71132e233571b3f45454f55095c73292343ce7134405f38d4caa5ba65ab3`.

- `docs/qa/FCV588_LCD_V28_GREEN_RECEIPT.json` — SHA-256 `fa54805a2b4017cacdda6ea60697b9e738c416e28d51ccae917b50158986b9c5`
- `docs/qa/FCV588_CHROME_VIEWPORT_V28_RECEIPT.json` — SHA-256 `3649b78474ae18cccac35a671098e919af219f66aa603adafae7c3a1a0d9f48a`
- `docs/qa/FCV588_CHROME_MOBILE_V28_RECEIPT.json` — SHA-256 `a024cf26188f7c7672579e2a9115a292b9d2efaef286360adf074de1bde6a197`

V28 đã mở trực quan ba ảnh trên trang FURUNO USA. Phần
đối chiếu định tính được ghi riêng trong
[bảng nguồn chính thức V28](FCV588_OFFICIAL_VISUAL_COMPARISON_V28.md).
Ảnh nguồn không cung cấp tọa độ phần cứng cho các số đo bên dưới.

Đây là xuất bảng từ các lần Chrome đã chạy; không phải một lần
kiểm thử mới hay kiểm SHA hiện tại của toàn bộ mã nguồn.

## Tọa độ chuẩn hóa đã ghi nhận

### 1366x768 — REFERENCE_ESTIMATE

| Thành phần | x | y | Rộng | Cao | CSS px (rộng × cao) |
| --- | ---: | ---: | ---: | ---: | ---: |
| `.device-frame` | 0.0000 | 0.0000 | 1.0000 | 1.1588 | 680.00 × 787.97 |
| `.equipment` | 0.0000 | 0.0000 | 1.0000 | 1.0000 | 680.00 × 680.00 |
| `#lcd` | 0.0712 | 0.1237 | 0.5531 | 0.7389 | 376.11 × 502.45 |
| `#key-menu` | 0.7586 | 0.0723 | 0.1310 | 0.0500 | 89.09 × 34.00 |
| `.pad` | 0.7536 | 0.1314 | 0.1412 | 0.1412 | 96.00 × 96.00 |
| `#key-enter` | 0.7586 | 0.2835 | 0.1310 | 0.0456 | 89.09 × 31.00 |
| `#key-range` | 0.7564 | 0.3510 | 0.1355 | 0.0456 | 92.17 × 31.00 |
| `#key-mark` | 0.7564 | 0.4084 | 0.1355 | 0.0456 | 92.17 × 31.00 |
| `#key-func` | 0.7564 | 0.4657 | 0.1355 | 0.0456 | 92.17 × 31.00 |
| `#gain-knob` | 0.7764 | 0.5725 | 0.0956 | 0.0956 | 65.00 × 65.00 |
| `#mode-knob` | 0.7764 | 0.7330 | 0.0956 | 0.0956 | 65.00 × 65.00 |
| `#key-power` | 0.7947 | 0.8578 | 0.0588 | 0.0544 | 40.00 × 37.00 |

### 1920x1080 — REFERENCE_ESTIMATE

| Thành phần | x | y | Rộng | Cao | CSS px (rộng × cao) |
| --- | ---: | ---: | ---: | ---: | ---: |
| `.device-frame` | 0.0000 | 0.0000 | 1.0000 | 1.1588 | 680.00 × 787.97 |
| `.equipment` | 0.0000 | 0.0000 | 1.0000 | 1.0000 | 680.00 × 680.00 |
| `#lcd` | 0.0712 | 0.1237 | 0.5531 | 0.7389 | 376.11 × 502.45 |
| `#key-menu` | 0.7586 | 0.0723 | 0.1310 | 0.0500 | 89.09 × 34.00 |
| `.pad` | 0.7536 | 0.1314 | 0.1412 | 0.1412 | 96.00 × 96.00 |
| `#key-enter` | 0.7586 | 0.2835 | 0.1310 | 0.0456 | 89.09 × 31.00 |
| `#key-range` | 0.7564 | 0.3510 | 0.1355 | 0.0456 | 92.17 × 31.00 |
| `#key-mark` | 0.7564 | 0.4084 | 0.1355 | 0.0456 | 92.17 × 31.00 |
| `#key-func` | 0.7564 | 0.4657 | 0.1355 | 0.0456 | 92.17 × 31.00 |
| `#gain-knob` | 0.7764 | 0.5725 | 0.0956 | 0.0956 | 65.00 × 65.00 |
| `#mode-knob` | 0.7764 | 0.7330 | 0.0956 | 0.0956 | 65.00 × 65.00 |
| `#key-power` | 0.7947 | 0.8578 | 0.0588 | 0.0544 | 40.00 × 37.00 |

### 360x800 — TRAINING_REFLOW

| Thành phần | x | y | Rộng | Cao | CSS px (rộng × cao) |
| --- | ---: | ---: | ---: | ---: | ---: |
| `.device-frame` | -0.0344 | -0.0459 | 1.0688 | 1.0910 | 342.00 × 1187.14 |
| `.equipment` | 0.0000 | 0.0000 | 1.0000 | 1.0000 | 320.00 × 1088.14 |
| `#lcd` | 0.0156 | 0.0193 | 0.9688 | 0.3806 | 310.00 × 414.14 |
| `#key-menu` | 0.0125 | 0.4229 | 0.9750 | 0.0441 | 312.00 × 48.00 |
| `.pad` | 0.2500 | 0.4817 | 0.5000 | 0.1470 | 160.00 × 160.00 |
| `#key-enter` | 0.0125 | 0.6434 | 0.9750 | 0.0404 | 312.00 × 44.00 |
| `#key-range` | 0.0125 | 0.6986 | 0.9750 | 0.0404 | 312.00 × 44.00 |
| `#key-mark` | 0.0125 | 0.7500 | 0.9750 | 0.0404 | 312.00 × 44.00 |
| `#key-func` | 0.0125 | 0.8015 | 0.9750 | 0.0404 | 312.00 × 44.00 |
| `#gain-knob` | 0.1469 | 0.8732 | 0.2000 | 0.0588 | 64.00 × 64.00 |
| `#mode-knob` | 0.6531 | 0.8732 | 0.2000 | 0.0588 | 64.00 × 64.00 |
| `#key-power` | 0.1094 | 0.9467 | 0.7812 | 0.0459 | 250.00 × 50.00 |

### 390x844 — TRAINING_REFLOW

| Thành phần | x | y | Rộng | Cao | CSS px (rộng × cao) |
| --- | ---: | ---: | ---: | ---: | ---: |
| `.device-frame` | -0.0314 | -0.0443 | 1.0629 | 1.0771 | 372.00 × 1215.22 |
| `.equipment` | 0.0000 | 0.0000 | 1.0000 | 1.0000 | 350.00 × 1128.22 |
| `#lcd` | 0.0143 | 0.0186 | 0.9714 | 0.4026 | 340.00 × 454.22 |
| `#key-menu` | 0.0114 | 0.4434 | 0.9771 | 0.0425 | 342.00 × 48.00 |
| `.pad` | 0.2714 | 0.5001 | 0.4571 | 0.1418 | 160.00 × 160.00 |
| `#key-enter` | 0.0114 | 0.6561 | 0.9771 | 0.0390 | 342.00 × 44.00 |
| `#key-range` | 0.0114 | 0.7093 | 0.9771 | 0.0390 | 342.00 × 44.00 |
| `#key-mark` | 0.0114 | 0.7589 | 0.9771 | 0.0390 | 342.00 × 44.00 |
| `#key-func` | 0.0114 | 0.8085 | 0.9771 | 0.0390 | 342.00 × 44.00 |
| `#gain-knob` | 0.1557 | 0.8777 | 0.1829 | 0.0567 | 64.00 × 64.00 |
| `#mode-knob` | 0.6614 | 0.8777 | 0.1829 | 0.0567 | 64.00 × 64.00 |
| `#key-power` | 0.1429 | 0.9486 | 0.7143 | 0.0443 | 250.00 × 50.00 |

## Kết quả Chrome đầy đủ

| Viewport | Response body đã đối chiếu | Đường dẫn khác nhau |
| --- | ---: | ---: |
| 1366x768 | 63 | 31 |
| 1920x1080 | 63 | 31 |
| 360x800 | 31 | 31 |
| 390x844 | 31 | 31 |

## Chưa đủ căn cứ nghiệm thu mặt máy

Cần nguồn hình học mặt trước và menu có thể kiểm chứng để thay các tọa độ
ước lượng bằng tọa độ tham chiếu. Chưa có xác nhận font, màu, đường nét vỏ,
tâm nút, hành trình núm hoặc quy trình phím đúng firmware cụ thể. Không dùng
kết quả test phần mềm để tuyên bố giống máy thật 100%. Các gate vẫn HOLD.
