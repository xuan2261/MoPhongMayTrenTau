# Brainstorm ultra — anonymized candidate output packet
Created by controller from five read-only worker final results; worker index/order stripped. Scope: plan research only. Source/firmware/right HOLD.

## Candidate A

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

## Candidate B

RESULT
candidate — outcome contract read-only.

Outcome: Cải tổ tầng trình bày FCV-588 offline để LCD/sonar/phím/menu/faceplate bám 8 ảnh tham chiếu theo LF, HF, DUAL, BL-LF, BL-HF, NAV1, NAV2 và menu; giữ nguyên model/state/replay/synthetic sensor, D15 ngoài LCD. Không claim OEM 100% hay % fidelity.

Constraints: ảnh OEM chỉ tham chiếu, không chép ảnh/font/firmware/vendor pixels; perspective correction phải ghi uncertainty. Firmware/provenance máy chụp 2016 UNKNOWN; Phase6/65 claims, hardware, firmware, rights/release tiếp tục HOLD. Không real maritime I/O. Voltage chỉ hiện khi có typed synthetic display sample; không hardcode 13.5–13.7V. TDD RED→GREEN, stage/canonical source-hash QA, receipt mới không overwrite, không git/deploy/install/release.

Non-goals: không đổi reducer/event log/replay schema/synthetic sensor/D15; không reverse-engineer firmware; không sao chép OEM assets; không pixel-perfect.

Acceptance:
1) RED→GREEN pure presentation tests cho từng mode: DUAL 50 kHz trái/200 kHz phải; zoom trái/normal phải; NAV data trái 2/3 + sonar strip phải; depth lớn của NAV nằm trong khối trái.
2) Header có range/gain/mode; Battery On thì voltage thay picture-advance theo manual, thiếu typed sample phải fail-closed.
3) Scale/depth/menu mode-aware: nhiều range ticks theo reference, không còn NAV depth bị CSS đẩy sai pane; menu giữ cấu trúc/nhãn VN quan sát được bằng font tự chọn.
4) Cùng synthetic scene, LF/HF có morphology khác có test deterministic nhưng không claim acoustic physics.
5) Faceplate dùng số công khai 233W×270H; LCD 128×171 mm, 480×640; phần khác là photo-informed estimate.
6) Visual QA dùng fixture synthetic tự tạo + checklist/landmark side-by-side; sai số phối cảnh ghi rõ; không đặt pixel threshold hay similarity % vô căn cứ.
7) Targeted → full Node/Python → browser staged/canonical + source/response hashes; replay/D15/model behavior giữ nguyên ngoài allowlist presentation.

Trade-offs:
- CSS patch: giả định lỗi chủ yếu style; fail vì app.mjs hardcode header, generic drawChannel và 3 range labels. Rẻ nhưng không đủ.
- Per-mode renderer/view specs: giả định state đủ cho đa số visual contract; fail sớm ở token thiếu nguồn như voltage. Chi phí vừa, cô lập presentation, dễ TDD/rollback.
- Full rewrite: giả định renderer không tách được; fail ở regression surface lớn cho menu/replay/D15. Rủi ro/cost cao, chưa có bằng chứng cần.

Better approach: chọn renderer redesign theo per-mode declarative view specs + shared primitives; giữ echo-projection/model làm nguồn dữ liệu, tách header/scale/depth/NAV/menu thành projector thuần. Bằng chứng trực tiếp: display-layout đã có seam mode-aware; echo-projection/lcd-presentation là display-only; sai lệch hiện nằm ở app.mjs/CSS.

Handoff ak-plan --deep --tdd: P0 freeze SHA 8 ảnh/manual/product/source; P1 RED view-spec/header/scale/depth; P2 GREEN primitives + battery fail-closed; P3 LF/HF morphology; P4 DUAL/ZOOM/NAV; P5 menu/faceplate original artwork; P6 browser visual fixtures + stage/canonical hash QA + full regression/HOLD matrix.

Evidence confidence: HIGH — 8 ảnh trực tiếp, source trực tiếp, manual OME-23890-E (DUAL/ZOOM/NAV/Battery/LCD), Furuno product page (270×233×158). MEDIUM — tỷ lệ/vị trí suy từ ảnh có perspective. LOW/UNKNOWN — OEM RGB/font, firmware cụ thể 2016, điện áp thật/sensor behavior.

VALIDATION
Đã đọc ak-brainstorm 2.9.1 và ultra contract. Manual: https://www.furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/fcv628_fcv588_operators_manual.pdf ; product: https://www.furuno.com/en/products/fishfinder/fcv-588/index.html . Không sửa file/chạy build/test/tạo artifact.

BLOCKERS
Không blocker cho brainstorm; firmware/rights/hardware/real-voltage giữ HOLD/UNKNOWN.

## Candidate C

RESULT
Đã hoàn tất candidate read-only. Khuyến nghị: redesign renderer theo per-mode view specs + shared painter primitives, migrate từng mode. Đây là phương án cân bằng nhất giữa fidelity, khả năng TDD và rủi ro hồi quy; CSS patch không đủ, full rewrite quá rộng.

CHANGES
Không ghi/sửa file, không cài, không chạy test/runtime, không thay plan/source/shared artifact.

VALIDATION
Đã đọc ak-brainstorm 2.9.1 và --ultra reference; đã đọc plan hiện có, app.mjs, styles.css, display-layout, display-palette, echo-projection, lcd-presentation, navigation và test visual/V57 liên quan; đã mở trực tiếp 8/8 ảnh local. Evidence xác nhận: nền trắng, header MAN.R/G:10/mode/13.5–13.7V, số sâu lớn đen sát đáy, thang sâu nhiều mốc, đáy nâu-đỏ, LF/HF khác tán xạ, DUAL chia dọc, BL zoom trái/normal phải, NAV data trái + sonar phải, menu Việt. Code hiện tại: drawChannel chỉ 3 nhãn sâu; header thiếu voltage; NAV layout 2/3 trái + 1/3 phải nhưng CSS depth NAV sang phải; default palette Blue. FURUNO official product xác nhận FCV-588 8.4in, 480×640, 270×233×158 mm; official manual/guide xác nhận NAV 2/3 trái và AUTO_R/MAN_R/mode list. Contract đầy đủ Outcome/Constraints/Non-goals/Acceptance/Trade-offs/Better approaches và handoff ak-plan --deep --tdd đã gửi prime. Acceptance nhấn mạnh RED→GREEN view-spec tests, generated synthetic fixtures, no invented pixel threshold, presentation-only voltage provenance, faceplate dùng 233×270 và LCD 128×171/480×640, stage/canonical hash QA và receipts mới.

BLOCKERS
Direct fetch URL manual user nêu bị 403 trong run; official Furuno manual/guide search vẫn cung cấp evidence tương ứng. Installed firmware và provenance “2016” vẫn UNKNOWN. OEM RGB/font/pixel coordinates và hành vi voltage thật không được chứng nhận. V56 sealed nhưng V57 hiện unsealed; Node520/Python13 chỉ historical evidence, cần pin current canonical hashes trước mutation.

## Candidate D

RESULT
candidate — ak-brainstorm --ultra, read-only, fixed packet.

Outcome
Cải tổ PRESENTATION FCV-588 offline để LCD/sonar/phím/menu/faceplate bám 8 ảnh tham chiếu và kích thước công bố, giữ nguyên model/state/replay/synthetic sensor; không tuyên bố OEM 100% hay fidelity %.

Constraints
- LCD logic 480x640; LCD 128.2x170.9 mm; mặt máy 233 mm rộng, 270 mm cao.
- Ảnh: nền trắng; MAN.R, G:10, LF/HF hoặc BL-LF/BL-HF, 13.5–13.7V; số sâu đen rất lớn; nhiều mốc sâu; đáy nâu-đỏ dày; LF/HF khác scatter; NAV1/2: data boxes trái, sonar strip phải; menu tiếng Việt.
- Code packet: palette Blue; header AUTO_R/MAN_R thiếu voltage; drawChannel generic với 3 depth numbers; CSS NAV depth RIGHT, trái ảnh.
- Vendor photos/fonts/firmware chỉ làm reference; không copy/publish. Perspective correction phải ghi uncertainty.
- Firmware/“2016” provenance unknown; hardware/firmware/OEM-rights claims HOLD. D15 giữ riêng. Không maritime I/O thật, git/deploy/install/release.
- Nguồn quyền uy: Furuno operator manual PDF + product page FCV-588 trong packet.

Non-goals
Không mô phỏng firmware/DSP OEM, font proprietary, boot/timing, I/O tàu thật; không xác nhận firmware 2016; không rewrite state/replay/model vì fidelity; không tạo ngưỡng pixel tuyệt đối từ ảnh phối cảnh.

Acceptance
1) Per-mode view spec cho LF/HF/DUAL/ZOOM/NAV1/NAV2/menu: header, depth readout/scale, sonar viewport, bottom band, data boxes.
2) RED chứng minh thiếu voltage, NAV side sai, generic drawChannel, Blue palette; GREEN khi presentation semantics khớp spec.
3) Fixtures dùng synthetic sonar + lawful measurements; visual QA theo quan hệ cấu trúc (NAV boxes trái/sonar phải; header mode/gain/voltage; bottom band dày), không vendor images, fidelity %, hay ±N px bịa đặt.
4) Cùng synthetic scene, LF/HF khác scatter/texture theo deterministic rule; DUAL giữ hai channel.
5) Depth readout nổi bật nhất, đen trên nền sáng; ladder nhiều mốc; bottom band nâu-đỏ có continuity.
6) Menu/faceplate/keys bằng CSS/vector/text tự dựng hoặc asset có quyền; measurements ghi provenance+uncertainty.
7) Regression chứng minh model/state/replay/synthetic sensor không đổi và D15 vẫn riêng.
8) Stage QA ghi canonical source hash + source/output hashes; receipt mới, không overwrite receipts cũ.
9) Firmware provenance/OEM rights và claim thiếu source vẫn HOLD.

Trade-offs
A CSS patch: nhỏ nhất. Assumption: lệch chủ yếu style/layout. Fail ở voltage/header semantics, LF/HF scatter, NAV structure vì CSS không sửa canvas semantics.
B Renderer redesign + per-mode view specs — RECOMMEND. Assumption: state hiện có đủ dữ liệu; nếu thiếu, thêm presentation adapter-derived field trước khi đụng core. NAV/DUAL cho thấy seam này giữ state/replay ổn định.
C Full rewrite: linh hoạt nhưng blast radius lớn, rủi ro replay/D15/state; packet không chứng minh cần rewrite.

Better approaches
B tốt hơn CSS patch vì lỗi nằm ở cả CSS và renderer semantics; tốt hơn full rewrite vì phạm vi nhỏ hơn và giữ core boundary.

Handoff ak-plan --deep --tdd
S0 evidence register + lawful measurements/uncertainty; S1 RED view-spec tests; S2 GREEN LCD/header/depth/palette; S3 LF/HF/DUAL/ZOOM; S4 NAV1/2 + menu; S5 faceplate/keys; S6 regression model/replay/D15; S7 canonical/source-hash + visual QA receipts.

Evidence confidence
HIGH: code-state gaps/boundaries/prior QA trong packet. MEDIUM-HIGH: dimensions/manual/product facts supplied with authoritative URLs, không re-fetch do fixed-packet rule. MEDIUM: visual traits do perspective/camera uncertainty. UNKNOWN/HOLD: firmware version/provenance, exact 2016 link, OEM DSP/render internals, exact fonts/colors/pixel geometry.

VALIDATION
Đã đọc ak-brainstorm v2.9.1 và brainstorm-ultra-mode.md. Không sửa runtime, không web, không artifact, không candidate consultation.

BLOCKERS
Không blocker; các unknown trên phải giữ HOLD.

## Candidate E

RESULT
candidate hoàn tất read-only. Khuyến nghị renderer redesign với per-mode view specs; CSS-only thiếu lực vì sai lệch nằm cả CSS và Canvas/DOM, full rewrite không có căn cứ.

CHANGES
Không ghi/sửa file, không chạy install/git/deploy/release, không đổi plan/source.

VALIDATION
Đã đọc ak-brainstorm v2.9.1 + ultra contract; 8 ảnh local; app.mjs/styles.css/lcd-presentation/display-layout/display-palette/echo-projection/model; accepted plan; V56/V57 QA reports. Đã đối chiếu nguồn FURUNO chính thức: product page xác nhận 8.4”, 480×640, 50/200kHz, modes, 270×233×158mm; brochure xác nhận LCD 128.2×170.9mm; Operator’s Guide xác nhận AUTO_R/MAN_R, gain/mode labels, large depth. Manual URL chính thức được ghi; direct fetch bị 403 trong ca này.

BLOCKERS
Installed firmware, provenance “2016”, exact OEM font/RGB/pixel geometry và nguồn typed synthetic voltage vẫn UNKNOWN; phải giữ rights/reviewer/hardware/release HOLD.
