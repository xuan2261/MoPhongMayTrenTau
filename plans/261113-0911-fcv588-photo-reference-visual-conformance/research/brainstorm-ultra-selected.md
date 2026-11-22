RESULT
Outcome: kế hoạch cải tổ riêng lớp presentation FCV-588 để LCD/sonar/phím/menu/faceplate gần 8 ảnh tham chiếu và manual hơn, vẫn là mô phỏng huấn luyện độc lập. Downstream dùng ak-plan --deep --tdd, RED→GREEN, fixture tự sinh và stage/canonical hash QA; không gắn % fidelity.

Constraints: giữ nguyên model/state/replay/world/synthetic sensor và D15 ngoài LCD; không real maritime I/O; không đưa ảnh/font/firmware/vendor bytes vào runtime/publish; ảnh chỉ tham chiếu, perspective correction phải ghi uncertainty; provenance “2016”, firmware, OEM rights/hardware/release vẫn HOLD; không git/deploy/install/release, không ghi đè receipt cũ. Nguồn chính: operator manual https://www.furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/fcv628_fcv588_operators_manual.pdf và product page https://www.furuno.com/en/products/fishfinder/fcv-588/index.html .

Non-goals: không rewrite reducer/replay/sensor; không OEM/pixel-perfect claim; không suy exact RGB/font/pixel từ ảnh xiên; không biến 13.5–13.7V trên ảnh thành điện áp runtime; không đóng 65 HOLD bằng software/visual pass.

Acceptance/TDD:
1. Characterization giữ nguyên device-state/replay fingerprint/observation trước-sau renderer.
2. View spec thuần: NAV data trái 2/3 + sonar phải; DUAL LF trái/HF phải; zoom trái/normal phải.
3. Header Battery On dùng slot điện áp thay picture-advance theo manual; thiếu nguồn hợp pháp thì NO DATA. 13.xV chỉ được ở visual REFERENCE_FIXTURE, ngoài state/replay.
4. Thay render “3 nhãn sâu” bằng major/minor scale generator có range/đơn vị/thứ tự test được; không bịa pixel threshold.
5. Single/dual/zoom có depth lớn dưới-trái; NAV depth nằm trong pane dữ liệu trái, không ép sang sonar phải.
6. Dùng synthetic LF/HF hiện có; fixture phải biểu hiện khác biệt định tính manual: 50 kHz rộng/độ phân giải thấp/tail dài hơn, 200 kHz hẹp/chi tiết/tail ngắn hơn; không claim acoustic/OEM.
7. Scene đối chiếu ảnh chọn White palette/config tương ứng; chưa đổi default Blue vì thiếu bằng chứng default.
8. Menu/faceplate tự vẽ Canvas/CSS; kiểm cấu trúc cột, control order, LCD 480×640, vùng hiển thị ~128.2×170.9 mm, thân 233W×270H; offset từ ảnh ghi uncertainty.
9. Fixture deterministic cho LF/HF/DUAL/BL-LF/BL-HF/NAV1/NAV2/menu; review bằng anchor/quan hệ hình học + source ledger, không SSIM/% tùy ý.
10. RED phải fail vì mismatch thật; GREEN chỉ sửa presentation; stage/canonical hash allowlist, browser offline smoke, receipt mới bất biến lịch sử.

Trade-offs:
- CSS patch: rẻ; giả định renderer generic đủ. Fail khi NAV/header/scale/zoom/menu cần composition riêng, conditionals phình và sonar vẫn nghèo.
- Per-mode view-spec renderer — KHUYẾN NGHỊ: chi phí vừa; giả định core/layout/channel semantics hiện hữu đáng giữ, đã có bằng chứng. Nếu semantics state về sau bị bác bỏ, seam thuần vẫn dễ thay.
- Full rewrite: đắt/rủi ro; giả định kiến trúc hiện tại là vật cản. Fail sớm vì replay/D15/state regression và tái chứng minh nhiều gate chưa cần thiết.

Better approach: renderer redesign presentation-only tốt hơn vá CSS hoặc full rewrite. Evidence: display-layout đã đúng topology manual; scenario đã có LF/HF khác nhau; mismatch tập trung ở app.mjs drawChannel/header và styles.css NAV depth. Delta: thêm view-spec + render primitives + reference fixtures, giữ core bất biến. Switching cost: vừa.

Evidence confidence: HIGH — code, 8 ảnh đã xem, topology/manual/product dimensions, Battery-slot semantics. MEDIUM — tỉ lệ/offset/menu geometry từ ảnh xiên. LOW/HOLD — exact RGB/font/pixel, provenance 2016, installed firmware, actual voltage, OEM rights/certification.

CHANGES
Không có, read-only.

VALIDATION
Đã đọc ak-brainstorm + ultra reference, plan hiện hữu, display/palette/echo/model/app/CSS; xem đủ 8 ảnh và đối chiếu manual/product.

BLOCKERS
Không blocker cho planning. Các unknown nêu trên phải giữ HOLD.

