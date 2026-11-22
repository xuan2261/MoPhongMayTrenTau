# FCV-588 — Atlas mặt máy và LCD V27

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
`2b9003590613d42aba72bf98aa33d4cb4f4d5a6ae173c9328f5329e4b38545ed`.

- `docs/qa/FCV588_LCD_V27_GREEN_RECEIPT.json` — SHA-256 `e52df8d2d883d4fcba630f0cc7e986558da0b8278165bfd5d54b67dcc96b90ee`
- `docs/qa/FCV588_CHROME_VIEWPORT_V27_RECEIPT.json` — SHA-256 `c4f43295767377929afc87917eb2d43f08a2aef7bd27a9f5f583e280d39ccfe5`
- `docs/qa/FCV588_CHROME_MOBILE_V27_RECEIPT.json` — SHA-256 `92e166ebaf58ae1c871391ce1797c728f82fd126a7110f7a7a32821580d4f078`

Đây là xuất bảng từ các lần Chrome đã chạy; không phải một lần
kiểm thử mới hay kiểm SHA hiện tại của toàn bộ mã nguồn.

## Tọa độ chuẩn hóa đã ghi nhận

### 1366x768 — REFERENCE_ESTIMATE

| Thành phần | x | y | Rộng | Cao | CSS px (rộng × cao) |
| --- | ---: | ---: | ---: | ---: | ---: |
| `.device-frame` | 0.0000 | 0.0000 | 1.0000 | 1.1588 | 680.00 × 787.97 |
| `.equipment` | 0.0000 | 0.0000 | 1.0000 | 1.0000 | 680.00 × 680.00 |
| `#lcd` | 0.0712 | 0.1392 | 0.5531 | 0.7389 | 376.11 × 502.45 |
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
| `#lcd` | 0.0712 | 0.1392 | 0.5531 | 0.7389 | 376.11 × 502.45 |
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
| `.device-frame` | -0.0344 | -0.0755 | 1.0688 | 1.1213 | 342.00 × 1202.14 |
| `.equipment` | 0.0000 | 0.0000 | 1.0000 | 1.0000 | 320.00 × 1072.14 |
| `#lcd` | 0.0156 | 0.0047 | 0.9688 | 0.3863 | 310.00 × 414.14 |
| `#key-menu` | 0.0125 | 0.4143 | 0.9750 | 0.0448 | 312.00 × 48.00 |
| `.pad` | 0.2500 | 0.4739 | 0.5000 | 0.1492 | 160.00 × 160.00 |
| `#key-enter` | 0.0125 | 0.6381 | 0.9750 | 0.0410 | 312.00 × 44.00 |
| `#key-range` | 0.0125 | 0.6941 | 0.9750 | 0.0410 | 312.00 × 44.00 |
| `#key-mark` | 0.0125 | 0.7463 | 0.9750 | 0.0410 | 312.00 × 44.00 |
| `#key-func` | 0.0125 | 0.7985 | 0.9750 | 0.0410 | 312.00 × 44.00 |
| `#gain-knob` | 0.1469 | 0.8713 | 0.2000 | 0.0597 | 64.00 × 64.00 |
| `#mode-knob` | 0.6531 | 0.8713 | 0.2000 | 0.0597 | 64.00 × 64.00 |
| `#key-power` | 0.1094 | 0.9459 | 0.7812 | 0.0466 | 250.00 × 50.00 |

### 390x844 — TRAINING_REFLOW

| Thành phần | x | y | Rộng | Cao | CSS px (rộng × cao) |
| --- | ---: | ---: | ---: | ---: | ---: |
| `.device-frame` | -0.0314 | -0.0728 | 1.0629 | 1.1061 | 372.00 × 1230.22 |
| `.equipment` | 0.0000 | 0.0000 | 1.0000 | 1.0000 | 350.00 × 1112.22 |
| `#lcd` | 0.0143 | 0.0045 | 0.9714 | 0.4084 | 340.00 × 454.22 |
| `#key-menu` | 0.0114 | 0.4354 | 0.9771 | 0.0432 | 342.00 × 48.00 |
| `.pad` | 0.2714 | 0.4929 | 0.4571 | 0.1439 | 160.00 × 160.00 |
| `#key-enter` | 0.0114 | 0.6511 | 0.9771 | 0.0396 | 342.00 × 44.00 |
| `#key-range` | 0.0114 | 0.7051 | 0.9771 | 0.0396 | 342.00 × 44.00 |
| `#key-mark` | 0.0114 | 0.7554 | 0.9771 | 0.0396 | 342.00 × 44.00 |
| `#key-func` | 0.0114 | 0.8058 | 0.9771 | 0.0396 | 342.00 × 44.00 |
| `#gain-knob` | 0.1557 | 0.8759 | 0.1829 | 0.0575 | 64.00 × 64.00 |
| `#mode-knob` | 0.6614 | 0.8759 | 0.1829 | 0.0575 | 64.00 × 64.00 |
| `#key-power` | 0.1429 | 0.9479 | 0.7143 | 0.0450 | 250.00 × 50.00 |

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
