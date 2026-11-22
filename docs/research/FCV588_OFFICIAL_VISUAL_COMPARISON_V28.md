# FCV-588 — Đối chiếu trực quan nguồn chính thức, V28

**Ngày quan sát: 2026-10-15. Phạm vi: PUBLIC_REFERENCE, hình vẽ độc lập.**
Không có tỷ lệ giống OEM hoặc xác nhận số đo phần cứng. Bảng này phân biệt
những gì nhìn thấy trong ảnh hãng với lựa chọn kỹ thuật của bản mô phỏng.

## Nguồn đã thực sự mở

Trang [FCV588 của FURUNO USA](https://www.furunousa.com/en/products/fcv588)
được mở trong trình duyệt kết nối. Đã mở từng ảnh trong cửa sổ thư viện:

| Mã quan sát | Ảnh nguồn trên thư viện FURUNO | Nội dung dùng để đối chiếu |
| --- | --- | --- |
| V28-FRONT | `FCV588-Front-Reflection.png` | Kiểu chân đế trong ảnh, vị trí chữ FURUNO và bố trí các nút |
| V28-BOTTOM | `FCV588-BottomDiscMode.png` | Vị trí độ sâu, thang màu, thông tin đầu màn hình và dải phân loại đáy |
| V28-WHITE | `FCV588-WhitelineScreen.png` | Vị trí độ sâu ở chế độ chia đôi và một cửa sổ chỉnh White Line |

Metadata của ba phần tử ảnh báo kích thước tự nhiên 1000×1000. Đây là
kích thước ảnh web, không phải độ phân giải LCD, kích thước vỏ hoặc tọa độ
đo trên thiết bị. Ảnh chỉ được quan sát trong bộ nhớ tham chiếu của công cụ
trình duyệt; không đưa vào `web/`, `src/` hoặc ảnh QA của mô phỏng.

## Sai khác và cách xử lý

| Thành phần | Quan sát nguồn | Bản V27 | Sửa trong V28 | Giới hạn còn lại |
| --- | --- | --- | --- | --- |
| Chân đế | V28-FRONT có trụ giữa và đế bo tròn | Khung chữ U tự vẽ | Vẽ lại trụ giữa và đế bằng CSS | Chỉ bám kiểu đế trong ảnh này, không suy ra mọi phụ kiện gá lắp hoặc số đo mm |
| Chữ viền | FURUNO nhỏ nằm trong vùng viền tối sát LCD | Chữ lớn trên mặt xám, nhãn model lớn tách rời | Chuyển chữ vào viền LCD, dùng font hệ thống nhỏ | Không chép logo hoặc font hãng; model vẫn ghi ở tiêu đề ứng dụng |
| Độ sâu sonar | Các ảnh cho thấy số lớn ở phía dưới bên trái | Phía dưới bên phải | Chuyển sang trái trong sonar/DUAL/Zoom; nâng lên khi vùng phân loại đáy thực sự được vẽ | Cỡ chữ, đường viền chữ và vị trí pixel chưa được xác nhận; NAV giữ bố cục cũ vì ảnh này không xác minh NAV |
| Thang màu | V28-BOTTOM có thang dọc mép trái, mức mạnh trên và yếu dưới | Dải ngang phía dưới, vẽ lặp theo kênh | Một thang dọc, dùng bảng màu mô phỏng sẵn có theo thứ tự mạnh–yếu | Không lấy mẫu RGB từ ảnh; chiều dài và chiều rộng thang là tọa độ thiết kế |
| Tốc độ ảnh | Đầu màn hình ảnh nguồn có ký hiệu `x1` | Thiếu thông tin tốc độ ảnh đã chọn | Hiển thị tốc độ đã xác nhận và `STOP`; không hiển thị nhầm giá trị còn đang chỉnh | Không coi hình dạng ký hiệu hoặc thứ tự hiển thị mới là tái tạo firmware chính xác |
| Nhãn thang độ sâu | Đầu màn hình phải đọc được khi chia đôi | Nhãn đầu thang tại y=22 chạm dòng trạng thái | Chuyển nhãn đầu thang xuống dưới nhãn tần số; kiểm thử chính hàm vẽ bằng Canvas ghi nhận tọa độ | Đây là sửa tính đọc được của bản mô phỏng, không phải tọa độ lấy từ ảnh OEM |

## Bằng chứng kiểm tra và tọa độ

Bản RED ban đầu lưu 9 assertion hiển thị thất bại cho mỗi desktop và 8 cho
mỗi điện thoại; các luồng nền vẫn hoạt động. Bản GREEN đầu tiên giữ riêng,
không dùng để chứng nhận thay đổi nhãn thang độ sâu xảy ra sau đó. Bản FINAL
và các bộ Chrome/LCD V28 được thu riêng sau khi hoàn tất mã nguồn.

Atlas V27 được giữ nguyên làm mốc. Atlas V28 được xuất từ các receipt mới
của trình duyệt; cả hai chỉ đo bản mô phỏng. Những vị trí chưa có ảnh nguồn
đủ rõ hoặc chưa có số đo vẫn là `REFERENCE_ESTIMATE`, không dùng tọa độ CSS
để tính phần trăm giống máy thật.

## Nguồn còn thiếu và việc tiếp theo

Các ảnh đã mở chưa đủ để xác nhận toàn bộ menu, thứ tự phím, giá trị White
Line theo phiên bản, font, màu LCD, hình học vỏ và lực/hành trình núm. Dải
phân loại đáy, hình echo và thuật toán cá vẫn là minh họa tổng hợp. Không
có dữ liệu từ đầu dò, GNSS hoặc thiết bị thật.

Ưu tiên tiếp theo là đối chiếu cửa sổ chỉnh White Line và các menu gốc với
nguồn vận hành có thể kiểm chứng, rồi viết oracle cho thao tác và giá trị.
Không thay một lựa chọn mô phỏng bằng giá trị đoán từ duy nhất một ảnh.
