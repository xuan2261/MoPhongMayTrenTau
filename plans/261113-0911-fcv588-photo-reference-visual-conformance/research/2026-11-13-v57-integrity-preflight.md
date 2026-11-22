# Đối chứng V57 mới nhất trước triển khai visual

Ngày kiểm read-only: 2026-11-13 (+07). Đường dẫn canonical: `C:\Work\MoPhongMayTrenTau`.

## Phát hiện đã chạy thực
- Folder mới nhất: `docs/qa/FCV588_V57_HEADER_COMPACT_20261031/` gồm `V57_HEADER_COMPACT_SCOPED_INTEGRITY_20261031.json` và `V57_HEADER_COMPACT_INDEPENDENT_POSTRECEIPT_20261031.json`. Như vậy kết luận trước đó rằng không có final V57 là **SAI / SUPERSEDED**.
- PowerShell đọc `runtime38SourceSHA` từ scoped-integrity và chạy `Get-FileHash` trên từng runtime file: **38/38 MATCH** với danh sách trong manifest đã đọc (0 runtime mismatch).
- PowerShell đọc SHA thực của file scoped-integrity hiện tại: `aaa6c3b37b106e5828fac430bdfb94472a27ab8497f0828deacce305b4cf99dc`.
- Trong postreceipt độc lập: `v57ScopedIntegritySHA256=8efde8cf84a8761544fb399a26672f1a8d9dfca9d14e2e0bb9504b5c68a5d35c` → **MISMATCH**, dù postreceipt ở thời điểm 31/10 tự tuyên bố `V57_INDEPENDENT_SHA_READBACK_MATCH_PHASE6_OPEN`.
- Windows timestamps: scoped-integrity đã sửa lần cuối `2026-10-31T11:55:27.1739221+07:00`, **muộn hơn** postreceipt `2026-10-31T11:51:56.3576815+07:00`. Không chứng minh được đây là sửa đổi gì hoặc ai làm, không suy diễn là malicious.
- Theo scoped-integrity: 38 runtime, khác V56 ba file `web/index.html`, `web/lcd-instructor-meta.mjs`, `web/styles.css`. Không lấy apply-attempt1 làm final truth; V57 có correction attempt2/attempt3.

## Verdict
- `VERIFIED`: folder final/postreceipt V57 tồn tại; 38/38 runtime SHA đúng với manifest V57 hiện tại.
- `FAILED`: SHA của final scoped-integrity hiện tại KHÔNG khớp SHA đã pin trong independent postreceipt.
- `BLOCKED`: không coi checkpoint V57 postreceipt có hiệu lực **tại thời điểm hiện tại** cho phép canonical apply; không chạy `ak-cook`/code, không seal lại V57, không ghi đè receipt hay sửa source.
- `NOT_YET_VERIFIED`: nguyên nhân sai lệch, snapshot byte gốc của bản sealed trước khi chỉnh report, signature/backup có thể phục hồi.

## Hành động gỡ blocker, read-only
1. So từng trường và byte giữa manifest final hiện tại, bản staging/postreceipt snapshot độc lập, các file V57 apply/correction log lịch sử; kiểm SHA-256 các nguồn đối chứng và thời gian.
2. Không dùng expected `8ef...` như chứng cứ final hiện tại chỉ vì nội dung postreceipt ghi MATCH. Không đổi expected SHA, không đổi file gốc.
3. Nếu xác minh khác biệt chỉ là sửa metadata/report sau postreceipt, viết **một báo cáo reconciliation mới có SHA riêng**, lưu bản before+after và điều kiện chấp nhận từ supervisor, giữ nguyên bản gốc. Nếu không đủ căn cứ, STOP mọi thay đổi canonical; Phase1 vẫn có thể đo ảnh/manual read-only.
4. Không tiến hành guarded canonical apply đến khi read-only source-bound reconciliation được reviewer chấp nhận và V57 preimages được pin lại một cách không phá lịch sử.

> Đây là kết quả kiểm mới, thay thế phần mô tả V57 `unsealed` trong các handoff cũ. Chỉ là integrity gate, không cấp quyền OEM/hardware/rights/release.

