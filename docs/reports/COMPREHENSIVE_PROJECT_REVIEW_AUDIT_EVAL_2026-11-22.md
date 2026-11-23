# BÁO CÁO ĐỌC HIỂU, REVIEW, AUDIT & ĐÁNH GIÁ TOÀN DIỆN DỰ ÁN `MoPhongMayTrenTau`

> **Đối tượng đánh giá:** Repository `xuan2261/MoPhongMayTrenTau` (`HEAD 9b89309`, nhánh `main`, single-commit import `2026-11-22 22:14:38 +0700`)  
> **Ngày kiểm toán:** `2026-11-22` (UTC)  
> **Yêu cầu gốc:** *"đọc hiểu toàn diện dự án; sau đó review, audit, eval toàn diện dự án cho tôi"*  
> **Phương pháp luận:** Đọc hiểu 100% mã nguồn runtime (`src/` + `web/` + `tools/server.mjs` + `apps/fcv588-electron-p30/` + `staging/*p31*`), kiểm toán tĩnh (AST, ESLint v10, complexity, duplication), kiểm thử động read-only (Node v22, Python 3.12, headless Google Chrome 158 qua Playwright tại `1440×900` & `360×800`, 29 raw-socket HTTP security probes, fuzzing 15.600 bước chuyển trạng thái, benchmark hiệu năng Node + Chrome), đối chiếu trực quan 8 ảnh phần cứng FCV-588 thực tế với 12 ảnh chụp mô phỏng, và rà soát toàn bộ hồ sơ quản trị/pháp lý/đặc tả.  
> **Nguyên tắc bất biến & giới hạn môi trường:** **Không sửa đổi bất kỳ tệp được theo dõi (tracked) nào** (`git diff` rỗng 100%). Thực thi trên Linux x86_64 container không có `git-lfs` (47 con trỏ LFS chưa tải nhị phân), không có `pypdf`/`pwsh`/Windows Electron runtime (các binary `.exe`/`.pdf`/`.zip` và báo cáo Windows được kiểm chứng qua mã nguồn, manifest và biên bản QA đã niêm phong).

---

## Mục Lục

- [0. Tóm Tắt Điều Hành (Executive Summary & Verdict Dashboard)](#0-tóm-tắt-điều-hành-executive-summary--verdict-dashboard)
- [Phần I — Đọc Hiểu Toàn Diện Dự Án (Comprehensive Project Understanding)](#phần-i--đọc-hiểu-toàn-diện-dự-án-comprehensive-project-understanding)
  - [1.1 Bản Chất Dự Án, Phạm Vi Thực Tế & Lịch Sử Tiến Hóa](#11-bản-chất-dự-án-phạm-vi-thực-tế--lịch-sử-tiến-hóa)
  - [1.2 Giải Phẫu Repository & Dung Lượng Lưu Trữ](#12-giải-phẫu-repository--dung-lượng-lưu-trữ)
  - [1.3 Tech Stack, Phụ Thuộc & Ràng Buộc Môi Trường](#13-tech-stack-phụ-thuộc--ràng-buộc-môi-trường)
  - [1.4 Kiến Trúc Hệ Thống & Luồng Dữ Liệu End-to-End](#14-kiến-trúc-hệ-thống--luồng-dữ-liệu-end-to-end)
  - [1.5 Bản Đồ Chức Năng Đầy Đủ (Full Feature Inventory: 64 + D15 + 5 Thiết Bị Chờ)](#15-bản-đồ-chức-năng-đầy-đủ-full-feature-inventory-64--d15--5-thiết-bị-chờ)
  - [1.6 Mô Hình Toán Học, Sonar & Xử Lý Tín Hiệu](#16-mô-hình-toán-học-sonar--xử-lý-tín-hiệu)
  - [1.7 Hệ Thống Quản Trị, Bằng Chứng & Kế Hoạch](#17-hệ-thống-quản-trị-bằng-chứng--kế-hoạch)
- [Phần II — Review Toàn Diện (Comprehensive Technical, Architecture & Domain Review)](#phần-ii--review-toàn-diện-comprehensive-technical-architecture--domain-review)
  - [2.1 Review Kiến Trúc, Chất Lượng Mã Nguồn & Khả Năng Bảo Trì](#21-review-kiến-trúc-chất-lượng-mã-nguồn--khả-năng-bảo-trì)
  - [2.2 Review Logic Miền, Chức Năng & Danh Mục Hợp Nhất 21 Lỗi (`BUG-01`–`BUG-21`)](#22-review-logic-miền-chức-năng--danh-mục-hợp-nhất-21-lỗi-bug-01bug-21)
  - [2.3 Review Độ Trung Thực Trực Quan (8 Ảnh Thực Tế vs 12 Ảnh Mô Phỏng)](#23-review-độ-trung-thực-trực-quan-8-ảnh-thực-tế-vs-12-ảnh-mô-phỏng)
  - [2.4 Review Giao Diện, UX, Khả Năng Tiếp Cận (A11y) & Quốc Tế Hóa (i18n)](#24-review-giao-diện-ux-khả-năng-tiếp-cận-a11y--quốc-tế-hóa-i18n)
  - [2.5 Review Hiệu Năng & Khả Năng Mở Rộng (Node + Live Chrome Benchmarks)](#25-review-hiệu-năng--khả-năng-mở-rộng-node--live-chrome-benchmarks)
  - [2.6 Review Bộ Kiểm Thử (`102` Node + `3` Python + `9` Fixtures) & Công Cụ (`35` `tools/*`)](#26-review-bộ-kiểm-thử-102-node--3-python--9-fixtures--công-cụ-35-tools)
  - [2.7 Review Ứng Dụng Desktop Electron (`P29`–`P36`)](#27-review-ứng-dụng-desktop-electron-p29p36)
  - [2.8 Review Khả Thi Lộ Trình 5 Thiết Bị Còn Lại](#28-review-khả-thi-lộ-trình-5-thiết-bị-còn-lại)
- [Phần III — Audit Toàn Diện (Comprehensive Multi-Layer Audit)](#phần-iii--audit-toàn-diện-comprehensive-multi-layer-audit)
  - [3.1 Audit Thực Thi & Kiểm Chứng Động (PASS vs 6 CLI FAIL, CRLF/Mixed-EOL & Fuzzing)](#31-audit-thực-thi--kiểm-chứng-động-pass-vs-6-cli-fail-crlfmixed-eol--fuzzing)
  - [3.2 Audit Bảo Mật, Quyền Riêng Tư & Chuỗi Cung Ứng (`S-01`–`S-09`)](#32-audit-bảo-mật-quyền-riêng-tư--chuỗi-cung-ứng-s-01s-09)
  - [3.3 Audit Pháp Lý, Bản Quyền, Giấy Phép & Sở Hữu Trí Tuệ](#33-audit-pháp-lý-bản-quyền-giấy-phép--sở-hữu-trí-tuệ)
  - [3.4 Audit Độ Lệch Tài Liệu & Đặc Tả (`D-01`–`D-15`)](#34-audit-độ-lệch-tài-liệu--đặc-tả-d-01d-15)
  - [3.5 Audit Vệ Sinh Repository & Sẵn Sàng Vận Hành](#35-audit-vệ-sinh-repository--sẵn-sàng-vận-hành)
- [Phần IV — Đánh Giá Toàn Diện & Lộ Trình Khắc Phục (Comprehensive Evaluation & Roadmap)](#phần-iv--đánh-giá-toàn-diện--lộ-trình-khắc-phục-comprehensive-evaluation--roadmap)
  - [4.1 Khung Chấm Điểm 100 Điểm (`E1`–`E8`) & Phân Tách Lõi vs Vận Hành](#41-khung-chấm-điểm-100-điểm-e1e8--phân-tách-lõi-vs-vận-hành)
  - [4.2 Phân Tích SWOT & Ma Trận Mức Độ Trưởng Thành](#42-phân-tích-swot--ma-trận-mức-độ-trưởng-thành)
  - [4.3 Cổng Chặn Phát Hành Không Thể Bù Trừ (Non-Compensable `NO_GO` Blockers)](#43-cổng-chặn-phát-hành-không-thể-bù-trừ-non-compensable-no_go-blockers)
  - [4.4 Lộ Trình Khắc Phục Ưu Tiên Theo Giai Đoạn (`P0`–`P3`)](#44-lộ-trình-khắc-phục-ưu-tiên-theo-giai-đoạn-p0p3)
- [Phụ Lục A — Bảng Lệnh Kiểm Chứng & Tái Hiện Read-Only](#phụ-lục-a--bảng-lệnh-kiểm-chứng--tái-hiện-read-only)
- [Phụ Lục B — Giới Hạn Phạm Vi & Điều Kiện Mất Hiệu Lực Báo Cáo](#phụ-lục-b--giới-hạn-phạm-vi--điều-kiện-mất-hiệu-lực-báo-cáo)

---

## 0. Tóm Tắt Điều Hành (Executive Summary & Verdict Dashboard)

### Kết luận then chốt (Pyramid Principle)

**`MoPhongMayTrenTau` mang một thực tại hai mặt rất rõ rệt và hiện ở trạng thái `NO_GO` (chưa đạt chuẩn phát hành công khai hay triển khai sản xuất).**

1. **Ở tầng lõi phần mềm Web (`src/` + `web/`, chỉ 54 tệp / 9.713 `wc -l` LOC, `~0,46 MiB` / `473 KiB` trên đĩa):** Dự án là một **nguyên mẫu huấn luyện máy đo sâu dò cá FURUNO FCV-588 (`F1-public-reference-22`) chạy hoàn toàn offline, không phụ thuộc gói bên thứ ba ở runtime, có kỷ luật tất định (deterministic event-sourcing) và kiểm soát an toàn/sandbox tốt hiếm thấy ở mức nguyên mẫu** (0 vòng phụ thuộc vòng lặp, 0 lỗ hổng XSS/`eval`/`fetch`, 29/29 bài kiểm tra HTTP loopback đều fail-closed, 15.600 bước fuzzing đạt 100% tái lập hash, 618/618 test Node + 13/13 test Python + 6/6 test Electron PASS, và trung thực tuyệt đối với nhãn `PUBLIC REFERENCE / NOT HARDWARE VALIDATED / TRAINING ONLY` — `65/65 HOLD`).
2. **Ở tầng chức năng sâu, đóng gói Desktop, tài liệu, vệ sinh kho mã và pháp lý:** Chính lớp vỏ vận hành và các kẽ hở tích hợp đã làm suy giảm nghiêm trọng giá trị thực tế của dự án:
   - **Rủi ro pháp lý ĐỎ (`S-01`, `S-02`):** 23 tài liệu PDF (`101,15 MiB`) và 2 tệp ZIP (`86,87 MiB`) bản quyền OEM = **`188,01 MiB` (`197,15 MB` thập phân / `197.145.926 byte` độc nhất qua Git LFS)** cùng **8 ảnh chụp thực địa phần cứng FCV-588 chưa có hồ sơ xác nhận quyền** đã bị đẩy lên GitHub sau khi xóa sạch `.gitignore` (chế độ *"FULL-WORKSPACE MODE"*, thậm chí bị `test/research-inventory.test.mjs:86` khóa cứng bắt rỗng!), trong khi kho mã **không có tệp `LICENSE`** và vẫn hiển thị nhãn hiệu **`FURUNO`** trên viền máy (`web/index.html:44`).
   - **21 lỗi chức năng/hiển thị đã tái hiện thực tế (`BUG-01`–`BUG-21`, gồm 11 lỗi P1, 8 lỗi P2, 1 lỗi P2/P3, 1 cụm P3):** Mặc dù `618/618` test PASS (do `45,1%` tệp test dùng `556` regex kiểm tra chuỗi văn bản thô và chỉ test từng hàm tách rời trên chuỗi tick ngắn), kiểm chứng động trên Node, Chrome thật và ảnh chụp màn hình phơi bày: **`0/50` giá trị chọn lựa trên cả 5 nhóm Menu chính (`0/13` Sounder) đọc được ở mặc định** (`BUG-07` CSS Grid ép `36/36` giá trị không trống thành `:...` + `BUG-08` tạo `14` ô trống gồm `12` khóa Sounder/Display bị bỏ sót, `1` khóa `D04` `language` vô hiệu hóa và `1` khóa `System.draft: null` fail-closed có chủ đích), `autoGainOffset` không hề tác động lên điểm ảnh sonar (`BUG-01`), thước độ sâu lệch `+43,5 px / +5,438 m` ở mốc `20 m` (`BUG-02`), cá biến mất vĩnh viễn sau `46 s` / `115 s` (`BUG-06`), `13/30` trạng thái overlay bị rò rỉ phím cứng (`BUG-04`, `BUG-10`, `BUG-11`), `NAV1`/`NAV2` bỏ qua hiệu chuẩn `Draft`/`Temp`/`Speed` (`BUG-05`), bài học `FCV588-LEARN-07` luôn chấm trượt khi học viên làm đúng hướng dẫn từ trạng thái tắt máy (`BUG-09`), và tình trạng treo giao diện **`1,65–2,27 giây`** khi nhập archive `2.000` sự kiện hoặc chấm bài 1 giờ.
   - **Phình kho mã cực đoan, lộ PII, trôi dạt tài liệu & phân mảnh Electron:** Kho mã phình tới **3.886 tệp / `307,32 MiB` trên đĩa / `1,93 GiB` (`~2,07 GB` thập phân) kèm LFS** (>98,8% là ảnh QA không dùng LFS, log và **13 bản sao `src/` + 14 bản sao `web/`**); rò rỉ **`174` lần xuất hiện đường dẫn PII trên `125` dòng tại `58` tệp** (`42` dạng thô + `132` dạng JSON `\\`) cùng URL ChatGPT riêng tư tại `VietMoPhongChoTatCaCacMay.md:1`; 15 điểm lệch đặc tả (`D-01`–`D-15`); **6 công cụ CLI `--check`/verify bị lỗi trên Linux** (chứng minh 6/6 biên bản V27+V28 vỡ SHA do chuẩn hóa CRLF→LF và P30 postreceipt vỡ do mixed EOL `\r\n`+`\n`); ứng dụng Electron phân mảnh 3 nhánh (`apps/` P30 vs `staging/` P31 vs `web/` P35), không ký số (`NotSigned`), không qua kiểm định đọc tiếng Narrator (`NO_GO`), và **5/6 thiết bị còn lại trong lộ trình mới ở trạng thái `NOT_STARTED`**.

### Bảng Điểm Đánh Giá Tổng Thể (`E1`–`E8`, Thang 100 Điểm)

| Mã | Tiêu chí đánh giá | Trọng số | Điểm (0–10) | Điểm quy đổi | Nhóm | Nhận định tóm tắt |
|---|---|---:|---:|---:|---|---|
| **E1** | Kiến trúc lõi mô phỏng & Tính tất định | **18%** | `6.8` | **12.24** / 18.00 | Lõi Web | Tất định xuất sắc (15.600 bước 0 lỗi), nhưng vi phạm layering `docs/decisions/ADR-0001.md` ở `src/core/`, nhân bản 97,1% `profile21`, God files (`reduceFcv588` CC=207), nghẽn hiệu năng `O(N²)`/6× replay, mô hình 1D chặn 5 thiết bị sau |
| **E2** | Phạm vi chức năng FCV-588 & Độ trung thực miền | **18%** | `5.5` | **9.90** / 18.00 | Lõi Web | Rộng trên FCV-588 (60 tập con + D15) & rất trung thực (`65/65 HOLD`), nhưng dính **11 lỗi P1 + 8 lỗi P2 + 1 lỗi P2/P3 + 1 cụm P3** ảnh hưởng trực tiếp tới huấn luyện vận hành & trực quan, cùng 3 tính năng một phần & `D04` chưa làm |
| **E3** | Bảo mật, Cô lập Sandbox & An toàn đầu vào | **14%** | `7.6` | **10.64** / 14.00 | Lõi Web | Runtime web (29/29 HTTP probes, 0 XSS) & Electron (9 fuses, `app://`) rất mạnh; bị kéo xuống bởi **`174` lần lộ PII trên `58` tệp + URL ChatGPT riêng tư (`S-04`)**, 4 `.exe` `NotSigned` + 6 gói cũ/6 lỗ hổng dev (`S-05`), `S-06`–`S-09` |
| **E4** | Tuân thủ Pháp lý, Bản quyền, Giấy phép & IP | **12%** | `2.0` | **2.40** / 12.00 | Pháp lý/Ops | **CẢNH BÁO ĐỎ:** Đẩy `188,01 MiB` (`197,15 MB` thập phân) PDF/ZIP OEM + 8 ảnh chụp thực địa phần cứng FCV-588 chưa có hồ sơ xác nhận quyền lên GitHub, thiếu `LICENSE`/`THIRD_PARTY_NOTICES`, chữ `FURUNO` trên viền máy (chỉ vớt điểm vì runtime `src/`+`web/` sạch 54/54) |
| **E5** | Độ chính xác Tài liệu & Đồng bộ Đặc tả–Mã nguồn | **10%** | `4.8` | **4.80** / 10.00 | Pháp lý/Ops | 210/210 link nội bộ sống & đầu `README.md:5-15` đã tóm tắt P36, nhưng còn **15 độ lệch lớn** (`README.md:46-116` & Acceptance dừng ở V31, `menu-atlas.json` lệch 12/13 mục Sounder, generator mâu thuẫn test V48) |
| **E6** | Chất lượng Kiểm thử, Khả năng Tái lập & CI/CD | **10%** | `5.4` | **5.40** / 10.00 | Lõi Web | 618+13+6 test nền PASS, nhưng **0 CI/linter/typecheck**, 556 regex thô bỏ lọt 21 lỗi, **6 CLI hỏng trên Linux**, 14/14 Chrome runner khóa cứng Windows |
| **E7** | Khả năng Tiếp cận (A11y), i18n & Trải nghiệm UX | **9%** | `5.8` | **5.22** / 9.00 | Lõi Web | Nền ARIA/tương phản/UIA/mobile tốt (36/39 nút ≥44 px), nhưng `BUG-07`+`BUG-08` làm hỏng đọc toàn bộ `0/50` giá trị menu, 3/39 control mobile <44 px, thiếu `lang="en"` (14/14), thiếu `prefers-reduced-motion`, Narrator chưa nghe thử |
| **E8** | Vệ sinh Repository, Bảo trì & Sẵn sàng Vận hành | **9%** | `3.4` | **3.06** / 9.00 | Pháp lý/Ops | `307,32 MiB` đĩa / `1,93 GiB` (`~2,07 GB` thập phân) LFS (98,8% bloat), 1.139 PNG thường (`264,41 MiB`), 13–14 bản sao mã nguồn, `.gitignore` rỗng (`S-03`), `18` tệp `*preimage*`/`*PREIMAGE*`, CRLF/mixed-EOL vỡ SHA, Electron 3 nhánh, 0 crash logging |
| **TỔNG** | **Điểm Tổng Thể Dự Án & Repository (`E1`–`E8`)** | **100%** | — | **53.66 / 100** | **Tổng hợp** | **`NO_GO` cho phát hành công khai / sản xuất** |
| *Phụ lục* | *Chỉ số Lõi Phần mềm Web (`E1, E2, E3, E6, E7`)* | *69%* | — | ***43.40 / 69.00*** (**`62.90 / 100`**) | *Quy đổi* | *Nguyên mẫu kỹ thuật đáng giá, cần 1 đợt sửa lỗi P1 & tối ưu hiệu năng* |
| *Phụ lục* | *Chỉ số Pháp lý, Tài liệu & Vận hành (`E4, E5, E8`)* | *31%* | — | ***10.26 / 31.00*** (**`33.10 / 100`**) | *Quy đổi* | *Nút thắt nghẽn nghiêm trọng nhất — bắt buộc xử lý P0 ngay lập tức* |

### Phán quyết Trưởng thành theo 4 Trục Độc lập

| Trục đánh giá | Phán quyết | Diễn giải ngắn gọn |
|---|---|---|
| **1. Nguyên mẫu Lõi Web FCV-588 (`src/`+`web/`)** | **CONDITIONAL PILOT (sau khi sửa P1)** | Nền tảng kiến trúc tất định & sandbox offline rất tốt; **chưa đạt chuẩn giảng dạy ngay** cho đến khi vá 11 lỗi P1 (`BUG-01`..`BUG-11`), đặc biệt menu không đọc được (`BUG-07`+`BUG-08`), thước sâu lệch (`BUG-02`), cá biến mất sau 46 s (`BUG-06`), và `LEARN-07` (`BUG-09`). |
| **2. Ứng dụng Desktop Electron Windows** | **`NO_GO` (Chỉ ở mức POC đóng băng)** | Sandbox/9 fuses tốt, nhưng phân mảnh 3 nhánh (P30/P31/P35), bị khóa chặt bởi SHA P28 (`build-bundle.mjs`), 0 test UI trên bản hardened, không ký số (`NotSigned`), ~262 MiB RAM ở trạng thái nghỉ, chưa kiểm định đọc tiếng Narrator. |
| **3. Nền tảng Đa thiết bị (5 thiết bị còn lại)** | **`NOT_READY` (Cần tái cấu trúc lõi)** | 5/6 thiết bị ở trạng thái `NOT_STARTED`/`HOLD`; `src/core/` và `web/app.mjs` đang đóng cứng cho sonar 1D FCV-588. Không thể thêm Radar/AIS/ECDIS theo kiến trúc hiện tại. |
| **4. Phát hành Công khai / Lưu hành Sản xuất** | **CỨNG `NO_GO` (Vi phạm Cổng Chặn)** | Bị chặn tuyệt đối bởi rủi ro bản quyền OEM trên GitHub (`S-01`), thiếu `LICENSE` (`S-02`), `.gitignore` rỗng (`S-03`), `65/65 HOLD` & chưa xác thực phần cứng thật. |

### Top 5 Điểm Mạnh Nổi Bật vs Top 10 Rủi Ro P0/P1 Hàng Đầu

**Top 5 Điểm Mạnh:**
1. **Lõi sự kiện tất định & tái lập chặt chẽ:** Không có phụ thuộc vòng lặp, zero runtime npm deps, 15.600 bước fuzzing đạt 33/33 khớp `finalSessionHash`, 0 ngoại lệ, 0 `NaN`, tách biệt đồng hồ thế giới (`simTick`) và đồng hồ giao diện (`uiElapsedMs`).
2. **Biên bảo mật offline vững chắc:** 0 sink XSS/`eval`/`fetch`/WebSerial trong `src/`+`web/`; `tools/server.mjs` vượt qua 29/29 HTTP probes; live Chrome thực thi `script-src 'self'` và `connect-src 'none'`; Electron khóa `app://fcv588` + 9 fuses + chặn egress.
3. **Kỷ luật trung thực học thuật & chống ảo giác xuất sắc:** Không ngụy tạo chứng nhận phần cứng — giữ `65/65 HOLD`, `hardwareValidated: false`, `releaseApproval: "HOLD"`, `P32 NO_GO`, `INCONCLUSIVE`, tách bạch 64 tính năng `FCV_OPERATOR` khỏi `D15 INSTRUCTOR_PLATFORM`, và cơ chế fail-closed `NO DATA` (TTL 10 tick).
4. **Phạm vi nghiệp vụ FCV-588 & công cụ giảng viên phong phú:** Triển khai 60 tập con vận hành (5 nhóm menu, 67 mục menu, 5 cấu hình cảnh báo, waypoint CRUD, 6 nhóm đơn vị, hiệu chuẩn, Bottom Discrimination/ACCU-FISH/RezBoost có khóa năng lực) cùng nền tảng D15 (5 tab ARIA, 5 tình huống lỗi, 7 bài học chấm ngữ nghĩa, trình xem archive offline + timeline).
5. **Nền tảng ngữ nghĩa & tiếp cận tốt:** 0 trùng ID, 0 control thiếu nhãn, 11/11 cặp màu đạt WCAG AA ≥4,5:1, `:focus-visible` rõ nét, 36/39 nút trên mobile `360×800` đạt ≥44×44 px (`0 px` tràn ngang), P31 mở khóa cây Windows UIA gốc (90 nút con).

**Top 10 Rủi Ro P0/P1 Hàng Đầu:**
1. **[P0 — Pháp lý `S-01`]** Đẩy 23 PDF (`101,15 MiB`) + 2 ZIP (`86,87 MiB`) tài liệu OEM có bản quyền = **`188,01 MiB` (`197,15 MB` thập phân / `197.145.926 byte` độc nhất, LFS)** và **8 ảnh chụp thực địa phần cứng FCV-588 chưa có hồ sơ xác nhận quyền** lên GitHub, mâu thuẫn trực tiếp với chính sách `not_an_approval_to_redistribute: true` của chính dự án (cổng chặn đỏ khi công khai/phân phối).
2. **[P0 — Pháp lý/Hygiene `S-02`, `S-03`]** Không có `LICENSE`/`THIRD_PARTY_NOTICES`, còn chữ `FURUNO` trên viền máy, và `.gitignore` rỗng (bị `test/research-inventory.test.mjs:86` khóa cứng) gây nguy cơ đẩy nhầm secret/`node_modules`/`__pycache__`.
3. **[P1 — Giao diện `BUG-07` + `BUG-08`]** Lỗi CSS Grid (`max-width: 48%` trong track `auto` cắt cụt `36/36` giá trị không trống) kết hợp `initialSettings()` thiếu `12` khóa Sounder/Display đang hoạt động + `1` khóa `D04` `language` vô hiệu hóa (`= 13` `undefined`) và `1` khóa `System.draft: null` fail-closed có chủ đích (`= 14` ô trống) khiến **`0/50` giá trị chọn lựa trên cả 5 nhóm Menu chính (`0/13` Sounder) đọc được ở mặc định**.
4. **[P1 — Sonar/Trực quan `BUG-01`, `BUG-02`, `BUG-03`]** `autoGainOffset` không nối vào tính hồi âm (`0/1.228.800` byte RGBA đổi); thước sâu lệch `+43,5 px / +5,438 m` ở mốc `20 m` và `[DEMO]` đè lên mốc `80 m`; lệch tốc độ thời gian (`0,46 s/cột` vs `1 cột/tick`) làm mục tiêu nhảy cóc `-53,80%` chính xác (`-53,81%` từ số làm tròn 4 chữ số thập phân) khi đổi cài đặt.
5. **[P1 — Tương tác & Bài học `BUG-04`, `BUG-09`, `BUG-10`, `BUG-11`]** `13/30` overlay bị rò rỉ phím cứng; `power-hold` bị phá bởi mọi phím; xoay `GAIN` khi mở hộp thoại Auto Gain bị xóa sạch khi nhấn `ENTER`; bài học `FCV588-LEARN-07` luôn trượt `ACTION_WHILE_POWERED_OFF` khi làm đúng hướng dẫn từ lúc tắt máy.
6. **[P1 — Miền huấn luyện `BUG-05`, `BUG-06`]** `NAV1`/`NAV2` và `RECEIVER STATUS` bỏ qua toàn bộ hiệu chuẩn `Draft`/`Temp`/`Speed` (và đơn vị tốc độ); cá tĩnh (`t=8, 24, 42`) biến mất vĩnh viễn sau `46 s` (báo động) / `115 s` (sonar 160 cột) ngay khi đồng hồ chạy từ lúc tắt máy.
7. **[P1 — Đặc tả & Công cụ `D-02..D-08`]** **6 công cụ CLI `--check`/verify bị lỗi trên Linux** (`menu-atlas.json` lệch 12/13 mục Sounder; `build_fcv588_public_acceptance.mjs` xung đột test V48; vỡ SHA CRLF/mixed-EOL trên V27/V28/P30; phần `Start locally`/`Where to find things` của `README.md:46-116` và Acceptance dừng ở V31, bỏ trống `V32–V57` & `P01–P28`).
8. **[P1/P2 — Hiệu năng]** Đóng băng luồng chính **`2.272,47 ms` (Node) / `1.653,23 ms` (Chrome)** khi nhập archive `2.000` sự kiện (do replay đồng bộ **6 lần**), **`1.892,04 ms`** khi chấm bài 1 giờ (`3×` dispatches), `dispatch()` lãng phí **`55,8%–93,7%` (`~71%`) CPU** để hash lại hằng số đóng băng và gặp vách đá `O(N²)` (`756,77 ms` @ 14.400 tick).
9. **[P1/P2 — Electron, PII & Chuỗi cung ứng]** Phân mảnh 3 nhánh P30/P31/P35, `build-bundle.mjs` khóa cứng SHA P28 chặn mọi bản vá lỗi, 0 test UI trên EXE hardened, 6 gói cũ + 6 lỗ hổng dev npm, 4 `.exe` chưa ký số, 0 crash telemetry, **`174` lần xuất hiện đường dẫn PII trên `125` dòng tại `58` tệp (`42` dạng thô + `132` dạng JSON `\\`)** cùng URL ChatGPT riêng tư tại `VietMoPhongChoTatCaCacMay.md:1`.
10. **[P2 — Kho mã & Khả năng mở rộng]** 98,8% kho mã (`307,32 MiB` đĩa / `1,93 GiB` ≈ `2,07 GB` thập phân kèm LFS) là bloat/ảnh không LFS/13–14 bản sao mã nguồn; 97,1% nhân bản nội bộ `*-profile21.mjs`; `src/core/` đóng cứng cho sonar FCV-588 chặn lộ trình 5 thiết bị tiếp theo.

---

## Phần I — Đọc Hiểu Toàn Diện Dự Án (Comprehensive Project Understanding)

### 1.1 Bản Chất Dự Án, Phạm Vi Thực Tế & Lịch Sử Tiến Hóa

**Bản chất sản phẩm:** `MoPhongMayTrenTau` là một **trình mô phỏng huấn luyện thiết bị hàng hải chạy hoàn toàn offline** (ưu tiên trình duyệt cục bộ qua loopback `127.0.0.1` và có nhánh thử nghiệm đóng gói Desktop Windows bằng Electron), nhắm tới 2 nhóm người dùng: **giảng viên hàng hải** (điều khiển tình huống sự cố, chấm 7 bài học, kiểm tra nhật ký phiên offline) và **học viên hàng hải** (thao tác bảng phím, núm xoay, menu, đọc màn hình sonar). Dự án đặt mục tiêu tuyệt đối không dùng cho hành hải thực tế (*training-only*).

**Phạm vi thực tế (1/6 thiết bị đã triển khai):** Theo `docs/evidence/device-register.json:5-124` và cấu trúc `src/devices/`, trong tổng số **6 thiết bị buồng lái** được hoạch định từ tài liệu gốc `VietMoPhongChoTatCaCacMay.md`:
- **Chỉ duy nhất 1 thiết bị được hiện thực hóa:** Máy đo sâu dò cá **FURUNO FCV-588** (`furuno.fcv588.cv588e`, revision hiện hành `F1-public-reference-22` tại `src/devices/fcv588/profile-version.mjs:6`), gồm **60 tập con vận hành tổng hợp** (`OPERABLE_SYNTHETIC_SUBSET`), **3 tính năng một phần** (`MENU_ONLY_PARTIAL`: `C11`, `D09`, `D14`), **1 tính năng chưa triển khai** (`NOT_IMPLEMENTED`: `D04` chuyển đổi ngôn ngữ & khởi động lại), và nền tảng giảng viên **`D15`** tách biệt hoàn toàn khỏi 64 tính năng OEM. Tất cả `65/65` tuyên bố tính năng vẫn ở trạng thái `HOLD` (`hardwareValidated: false`, `firmwareInstalled: null`, `releaseApproval: "HOLD"`).
- **5 thiết bị còn lại ở trạng thái `NOT_STARTED` / `HOLD` (0 dòng mã nguồn):** Radar `KODEN MDC-2060`, Radar ARPA `FURUNO FAR-2127`, Bộ thu phát `AIS R5` (`SUPREME`/`SOLID`), ECDIS `Transas/Wärtsilä NS4000`, và `KODEN J2000` (bị khóa định danh `IDENTITY_HOLD`). Ngoài ra có 1 stub quan sát chỉ dùng cho test (`synthetic.second-observer.test` trong `src/core/device-runtime.mjs`).

**Lịch sử tiến hóa (2026-10-13 → 2026-11-22):** Toàn bộ lịch sử phát triển trước đó diễn ra ngoài Git (ghi nhận tại `docs/F0-AUDIT.md:19`: *"chưa có Git repo"*) rồi được nhập vào Git bằng **duy nhất 1 commit** `9b89309` (`2026-11-22 22:14:38 +0700`, tác giả `xuan2261`, `chore(repository): import complete cleaned maritime simulator workspace`, 3.886 tệp, 966.003 dòng thêm, 0 tag, chỉ có nhánh `main`). Qua các mốc thời gian trong `plans/` và `docs/qa/`, dự án trải qua **6 giai đoạn rõ rệt**:
1. **2026-10-13 (F0 Foundation):** Nguyên mẫu FCV-588 ban đầu, `docs/decisions/ADR-0001.md`, `F0-AUDIT.md` (34/34 test), `device-register.json`, kho lưu trữ tài liệu tham khảo `sources/manuals/`, và 2 bản kế hoạch đầu (`plans/261013-1319-*`, `plans/261013-1428-*`).
2. **2026-10-14 → 2026-10-16 (F1 Public-Reference `V14`–`V31`):** Thực thi theo kế hoạch v2 (`plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/plan.md`), xây dựng đầy đủ 5 nhóm menu, báo động, điều hướng/waypoint, 7 bài học D15, tương tác xoay/giữ phím và QA Chrome tới `profile20`.
3. **2026-10-17 → 2026-10-31 (`V34`–`V57` Boundary, OEM Labels, A11y & D15 Tabs):** Tách ranh giới hiển thị LCD vs giảng viên, bổ sung ma trận nguồn `C11`/`D09`/`D14`, rà soát nhãn OEM và tiếp cận (`V36`, `V49`), chuyển bảng giảng viên D15 sang 5 tab ARIA (`V56`) và thu gọn tiêu đề (`V57`).
4. **2026-11-13 → 2026-11-17 (`P02`–`P28` Photo-Reference Visual Conformance & Archive Replay):** Kế hoạch thứ tư (`plans/261113-0911-fcv588-photo-reference-visual-conformance/plan.md`) đối chiếu 8 ảnh máy FCV-588 thật (`sources/FCV588_GiaoDienThucTeMay2016/*.jpg`); sắp xếp lại menu Sounder chuẩn AP-1 (`profile21` → `profile22` và đóng băng 10 tệp `*-profile21.mjs` tại `P14`), thêm bảng màu Trắng (`P23`), sidecar lưu trữ (`P24`), giao diện nhập archive offline (`P25`), trình xem Bottom Zoom (`P26`), dòng thời gian sự kiện (`P27`), và kiểm thử ma trận chế độ (`P28`).
5. **2026-11-21 (`P29`–`P35` Windows Electron POC, Installer, Native A11y & Release Gate):** Đóng gói bản P28 sang ứng dụng Windows Electron kín (`P29` portable, `P30` NSIS installer v0.0.1/0.0.2, `P31` mở khóa UIA v0.0.3), đánh giá phát hành **`NO_GO`** (`P32`), thử nghiệm Narrator (`P33`/`P34`), và vá nhãn `aria-label` phím `POWER/BRILL` trên bản web gốc (`P35`).
6. **2026-11-22 (`P36` Live Bottom Zoom QA & GitHub Prep):** Chạy QA Chrome sống cho `LF-ZOOM`/`HF-ZOOM` (`P36`, 0 sửa đổi mã sản phẩm), nén 40 thư mục staging cũ vào kho lạnh Git LFS (`staging/github-prep-20261122/`), xóa `node_modules`/profile Chrome, xóa trắng `.gitignore` sang chế độ *"FULL-WORKSPACE MODE"* và tạo commit duy nhất `9b89309`.

---

### 1.2 Giải Phẫu Repository & Dung Lượng Lưu Trữ

Không tính `.git` (`193,65 MiB ≈ 194 MiB`) và `.agents/`, cây thư mục làm việc gồm **3.886 tệp được theo dõi**, có phép cộng dung lượng chính xác khi giải nén đầy đủ **47 con trỏ Git LFS** là: **`322.247.366 byte` (`307,32 MiB`) trên đĩa − `6.182 byte` (47 con trỏ stub LFS bị thay thế) + `1.745.473.578 byte` (`1.664,61 MiB`) dữ liệu LFS = `2.067.714.762 byte` (`1.971,93 MiB` / `1,93 GiB` nhị phân ≈ `2,07 GB` thập phân)** *(tổng cộng thô chưa trừ stub là `2.067.720.944 byte`; lưu ý biên bản trước dọn dẹp `staging/github-prep-20261122/WORKSPACE_CLEANUP_FINAL_V2_20261122.json:7` ghi nhận ảnh chụp lịch sử `2.068.303.498 byte`)*.

> **Quy ước đơn vị dung lượng:** Toàn bộ bảng và số đo dung lượng kho mã trong báo cáo sử dụng nhất quán **đơn vị nhị phân IEC** (`KiB` = $1024$, `MiB` = $1024^2$, `GiB` = $1024^3$ byte); khi dẫn chiếu đơn vị **thập phân SI** (`MB` = $10^6$, `GB` = $10^9$ byte) để đối chiếu với biên bản gốc, báo cáo luôn ghi tường minh chú thích *"thập phân"* nhằm tránh mọi nhầm lẫn đơn vị.  
> **Quy ước đếm dòng mã (LOC):** Để đảm bảo minh bạch tuyệt đối, báo cáo tách rõ hai quy ước: `wc -l` (đếm ký tự `\n`) cho toàn kho (`src/` 35 tệp = **5.717 LOC**; `web/` 19 tệp = **3.996 LOC**; tổng runtime chuẩn 54 tệp = **9.713 LOC**, hoặc 55 tệp gồm `tools/server.mjs` = **9.791 `wc -l` LOC**) so với đếm `split(/\r?\n/)` trong AST (+1 dòng trên mỗi tệp kết thúc bằng `\n`, tức 55 tệp = **9.846 split LOC**, còn 42 tệp `.mjs` hoạt động không tính `*-profile21.mjs` = **7.162 split LOC / 6.281 SLOC**).

#### Bảng Phân Bố Toàn Bộ Thư Mục Gốc

| Thư mục gốc | Số tệp | Dung lượng đĩa (`MiB`) | Tệp mã / LOC (`wc -l`) | Tệp tài liệu–dữ liệu / LOC | Nhị phân / Con trỏ LFS | Vai trò thực tế |
|---|---:|---:|---:|---:|---:|---|
| `(root)` | 5 | 0,06 MiB | 0 / 0 | 5 / 553 | 0 | `package.json`, `README.md`, `VietMoPhongChoTatCaCacMay.md` (398 dòng `wc -l`), `.gitignore`, `.gitattributes` |
| `src/` | 35 | 0,26 MiB | 35 / **5.717** | 0 / 0 | 0 | **Lõi mô phỏng (`src/core/` 5 tệp / 1.109 LOC) + FCV-588 (30 tệp / 4.608 LOC gồm 10 bản sao `profile21`)** |
| `web/` | 19 | 0,20 MiB | 18 / **3.992** | 1 / 4 | 0 | **Giao diện trình duyệt (`index.html`, `styles.css`, `favicon.svg`, 16 `.mjs`)** |
| `test/` | 114 | 0,61 MiB | 105 / 12.043 | 9 / 1.053 | 0 | **Bộ kiểm thử chuẩn: 102 `.test.mjs`, 3 `.py`, 9 JSON fixture** |
| `tools/` | 35 | 0,43 MiB | 35 / 8.776 | 0 / 0 | 0 | Máy chủ loopback, kiểm toán tài sản/bằng chứng, **21 script QA `fcv588_*.py` (gồm 14 script Playwright Chrome và 7 script server/integrity)**, coldstore/PS1 |
| `apps/` | 76 | 0,68 MiB | 73 / 11.384 | 3 / 3.785 | 0 | `apps/fcv588-electron-p30/` — bản chụp Electron v0.0.1 (nhân bản toàn bộ `src/` + `web/`) |
| `sources/` | 37 | 1,44 MiB | 0 / 0 | 4 / 785 | 33 | 8 ảnh chụp thực địa phần cứng FCV-588 (`.jpg` `1,40 MiB`), manifest, **25 con trỏ LFS (23 `.pdf` `101,15 MiB` + 2 `.zip` `86,87 MiB` = `188,01 MiB` / `197,15 MB` thập phân / `197.145.926 byte` độc nhất)** |
| `staging/` | 599 | 7,23 MiB | 543 / 93.473 | 46 / 10.447 | 10 | Bản sao P29–P36, gói Electron P31, **4 `.exe` (`462,76 MiB` LFS) + 2 `.zip` khổng lồ (`861,97 MiB` LFS)** |
| `docs/` | 1.698 | **198,53 MiB** | 141 / 23.819 | 816 / 426.588 | 741 | ADR, sổ cái bằng chứng, nghiên cứu, báo cáo, 49 thư mục QA, **609 ảnh PNG trong `docs/qa/screenshots/` (`164,87 MiB`)** |
| `plans/` | 1.268 | **97,89 MiB** | 294 / 61.613 | 560 / 301.829 | 414 | 4 cây kế hoạch, 90 báo cáo v2, 1.144 tạo tác kiểm chứng ảnh |
| **TỔNG CỘNG** | **3.886** | **307,32 MiB** | **1.244 / 220.817** | **1.444 / 745.044** | **1.198** | **Mã lõi runtime (`src/`+`web/`): ~0,46 MiB (473 KiB) = 0,15% dung lượng đĩa (0,02% kèm LFS); 98,8% là `docs/`+`plans/`+`staging/`** |

#### Phân Bố 22 Loại Tệp & Tài Sản Nhị Phân

| Phần mở rộng | Số tệp | Dung lượng đĩa (`MiB`) | Trạng thái lưu trữ & Ghi chú |
|---|---:|---:|---|
| `.png` | **1.139** | **264,41 MiB** | **Lưu trực tiếp thành Git blob thường (KHÔNG dùng LFS)** — nguyên nhân chính làm `.git` phình `193,65 MiB` (`≈ 194 MiB`) |
| `.mjs` | 904 | 6,47 MiB | ES Modules rải khắp `src/`, `web/`, `test/`, `tools/`, `apps/`, `staging/`, `docs/`, `plans/` |
| `.json` | 684 | 11,93 MiB | Biên bản QA, manifest, sổ cái bằng chứng, fixture, `package*.json` |
| `.txt` / `.log` | 325 / 195 | 9,06 / 7,63 MiB | Tổng 520 tệp nhật ký QA trong `docs/qa/`, `plans/`, `staging/` |
| `.py` | 269 | 3,23 MiB | Script Playwright QA, kiểm toán, nén lạnh |
| `.md` | 218 | 1,67 MiB | Kế hoạch, ADR, nghiên cứu, báo cáo QA |
| `.pdf` | 23 | 0,00 MiB (3.027 B) | **Con trỏ Git LFS** (`sources/manuals/*`, danh nghĩa `101,15 MiB` / `106.059.773 B`) |
| `.cjs` | 22 | 0,10 MiB | Script main/builder/smoke/e2e Electron trong `apps/` & `staging/` |
| `.zip` | 20 | 0,00 MiB (2.619 B) | **Con trỏ Git LFS** (2 manual `86,87 MiB` + 2 kho lạnh `861,97 MiB` + P29 portable `150,91 MiB` + 15 bản sao nhỏ; 23 PDF + 2 ZIP manual = `188,01 MiB` chính xác, `188,02 MiB` theo tổng thành phần làm tròn) |
| `.ps1` | 18 | 0,10 MiB | Script PowerShell Windows (khôi phục coldstore, kiểm thử tiêu điểm UIA) |
| `.html` / `.css` / `.svg` | 16 / 14 / 13 | 0,31 / 0,48 / 0,00 MiB | Tài sản web gốc + 13 bản nhân bản rải rác |
| `.jpg` | 8 | 1,40 MiB | 8 ảnh chụp thực địa phần cứng FCV-588 (`sources/FCV588_GiaoDienThucTeMay2016/`), không nạp vào runtime |
| `.exe` | 4 | 0,00 MiB (536 B) | **Con trỏ Git LFS** (4 bộ cài NSIS Electron chưa ký số, ~`115,69 MiB`/tệp = `462,76 MiB` danh nghĩa) |
| Khác (`.blockmap`, `.yml`, `.preimage`, `.js`, `(no ext)`, `.gitignore`) | 14 | 0,53 MiB | 4 blockmap, 4 `builder-debug.yml` (không phải CI), 2 `.preimage`, 1 `.js`, `.gitignore`, `.gitattributes`, 1 preimage `.gitignore` |

---

### 1.3 Tech Stack, Phụ Thuộc & Ràng Buộc Môi Trường

| Lớp hệ thống | Công nghệ cốt lõi | Phụ thuộc & Ghim phiên bản | Bằng chứng |
|---|---|---|---|
| **Lõi Web & Giao diện chuẩn** | Vanilla JS (Native ESM `"type": "module"`), HTML5, CSS3 (`cqw`, `:has()`), Canvas 2D, Web Audio API, `localStorage` | **0 gói npm runtime, 0 bundler, 0 framework, 0 CDN** (chỉ có 1 URI ngoài là chuẩn XMLNS `http://www.w3.org/2000/svg` trong `web/favicon.svg`) | `package.json:1-13`, `tools/server.mjs:5-8` |
| **Nền tảng Node.js** | Node.js `>=22` | Chỉ dùng built-in: `node:http`, `node:fs/promises`, `node:path`, `node:url`, `node:crypto`, `node:assert/strict`, `node:test`, `node:child_process`, `node:net`, `node:os` | `package.json:12` |
| **Vỏ Desktop Electron (POC)** | Electron CommonJS (`desktop/main.cjs`), NSIS Windows x64 (`electron-builder`) | Ghim cứng `devDependencies`: `electron: "45.4.1"`, `electron-builder: "26.18.1"`, `@electron/fuses: "2.1.3"`, `@electron/packager: "20.3.0"`. **Không ghim cứng:** `playwright-core: "^1.65.1"`. Tổng **315 gói** trong lockfile P30/P31 (`node_modules/` đã xóa). | `apps/fcv588-electron-p30/package.json:12-18` |
| **Công cụ QA & Lưu trữ** | Python 3 + Windows PowerShell (`.ps1`) | Nhập `playwright.sync_api`, `PIL` (`Pillow`), `pypdf`, `requests`, cùng thư viện chuẩn (`unittest`, `hashlib`, `zipfile`, `urllib`). **Không có `requirements.txt` hay `pyproject.toml`.** | `tools/fcv588_chrome_viewport_acceptance.py:21`, `tools/verify_reference_manuals.py:18` |
| **Trình duyệt yêu cầu ngầm** | CSS Container Queries (`cqw`) + `:has()` | Yêu cầu tối thiểu **Chromium/Edge ≥ 105, Firefox ≥ 121, Safari ≥ 16** — nhưng **không khai báo** trong `README.md` hay `package.json`. | `web/styles.css:41,48,103,108,113,138-141` |

**Môi trường kiểm toán thực tế (Linux x86_64):** Node `v22.23.5`, npm `12.2.2`, Python `3.12.16` (có `PIL 13.0.0`, `playwright 1.65.2`; thiếu `pypdf`, `requests`), Google Chrome `158.0.8127.36` (`/usr/bin/google-chrome`), ESLint `v10.15.0`, Git `2.56.1` (thiếu `git-lfs`, `pwsh`, `electron`).

---

### 1.4 Kiến Trúc Hệ Thống & Luồng Dữ Liệu End-to-End

Kiến trúc mô phỏng tuân theo mô hình **event-sourced đơn chiều với reducer thuần** (tồn tại **0 phụ thuộc vòng lặp** trên toàn bộ 51 tệp `.mjs` trong `src/` và `web/`):

```text
[1] CỬA NGÕ ĐẦU VÀO (DOM / Bàn phím / Núm xoay / Nhấn giữ / Lặp phím / Đồng hồ 250 ms)
    ├─ web/hold-input.mjs (nhấn ngắn/giữ >3s POWER, >650ms FUNC; hủy khi blur/pointercancel)
    ├─ web/pad-repeat.mjs (lặp 4 hướng TrackPad: 450 ms khởi đầu / 150 ms lặp)
    ├─ web/rotary-input.mjs (kéo dọc 18 px/bước + cuộn chuột + nút trợ giúp ±)
    ├─ web/keyboard-shortcuts.mjs (Arrows, Enter, Esc, r, g, [, ], -, =)
    └─ web/app.mjs:1474 (setInterval 250 ms → ui-tick khi mở mode/brill/power-hold; tick mỗi 1000 ms)
                                            │
                                            ▼
[2] CHUẨN HÓA & PHÂN PHỐI SỰ KIỆN (src/core/)
    ├─ src/core/protocol.mjs:validateInput() + snapshotEventData() (đóng băng sâu, chặn prototype/chu kỳ)
    └─ src/core/session.mjs:dispatch(session, FCV588_ADAPTER, input, TRAINING_SCENARIO)
        ├─ kind="tick": advanceWorld() tiến WorldState độc lập cả khi power="off" hoặc Picture Advance="Stop"
        ├─ kind="ui-tick": chỉ cập nhật hẹn giờ modal (MODE 6s, BRILL 6s, power-hold 3s)
        ├─ kind="down"/"up"/"cancel": theo dõi heldControls & phân loại ngắn/dài
        └─ FCV588_ADAPTER.reduce → src/devices/fcv588/model.mjs:reduceFcv588() [pure reducer]
                                            │
                                            ▼
[3] CHIẾU CẢM BIẾN & HIỂN THỊ CHỈ-ĐỌC (Pure Projectors, cache theo simTick tại web/app.mjs:116-126)
    ├─ src/core/scenario.mjs:observeSounder() (lưới 160×301 web / 120×301 mặc định, maxDepthM=300 m)
    ├─ src/devices/fcv588/{echo-projection, display-layout, display-palette, display-widgets,
    │                      navigation, calibration, units, alarms, receiver-status, tankenmaru-status}
    ├─ web/fcv588-echo-rasterizer.mjs → Offscreen Canvas 320×480 → #echo-canvas (480×640, no smoothing)
    ├─ web/{lcd-presentation, lcd-config-presentation, lcd-control-presentation}.mjs → #lcd-overlay DOM
    └─ web/{lcd-instructor-meta, fcv588-training-source-matrix, instructor-tabs,
            fcv588-archive-import, fcv588-archive-bz-viewer, fcv588-archive-timeline}.mjs → D15 5-Tab Panel
```

**Các điểm vào (Entry Points) & Hệ thống Con quan trọng:**
1. **Máy chủ web cục bộ (`tools/server.mjs`, 78 LOC):** Lắng nghe duy nhất `127.0.0.1:${PORT ?? 4173}` (`1024..65535`), chỉ phục vụ `/`, `/web/*`, `/src/*`, khóa `realpath`, chỉ cho `GET`/`HEAD`, áp đặt CSP `connect-src 'none'`.
2. **Giao diện trình duyệt (`web/index.html`, 270 LOC + `web/styles.css`, 518 LOC + `web/app.mjs`, 1.491 LOC):** Bố cục 2 khung — bên trái là mặt máy `.device-frame` (LCD `480×640`, bảng 9 nhóm điều khiển vật lý), bên phải là bảng giảng viên D15 `.training-panel` được `web/instructor-tabs.mjs` tổ chức thành **5 tab ARIA** (*Phiên / Trợ giúp / Tình huống / Bài học / Nguồn & QA*). Hỗ trợ nút *Tập trung vào máy* và responsive breakpoints tại `1240 px` và `700 px`.
3. **Vỏ Desktop Electron (`apps/fcv588-electron-p30/desktop/main.cjs`, 161 LOC `wc -l`; P31 ở `staging/` thêm `setAccessibilitySupportEnabled(true)`):** Đăng ký giao thức kín `app://fcv588`, tắt hoàn toàn `nodeIntegration`/`devTools`/preload, bật `sandbox`/`contextIsolation`/`webSecurity`, chặn toàn bộ mạng ngoài qua `webRequest.onBeforeRequest`, và chèn thêm 1 thẻ `<script>` `web/desktop-settings.mjs` để xuất/nhập JSON cài đặt (`FCV588_SETTINGS_TRANSFER_V1`, ≤ 18 KB).
4. **Lưu trữ & Tương thích ngược (`settings.mjs`, `replay-compat.mjs`, `archive-compat.mjs`):**
   - *Persistence v18:* Lưu cài đặt đã xác nhận vào `localStorage` (`mophongmaytrentau.fcv588.public-reference.settings.v18`) kèm kiểm tra FNV-1a; hỗ trợ nhập chỉ-đọc `profile19` và `profile21` (thiếu `profile20`) qua sự kiện `restore-settings`.
   - *Replay v7 & Multi-device v4:* `createReplayEnvelope()` gắn `CORE_CONTRACT_VERSION="f1-core-7"`, `EVENT_SCHEMA_VERSION=5`, `REPLAY_ENVELOPE_VERSION=7`, `finalSessionHash` và `contentFingerprint` (FNV-1a32). `replay-compat.mjs` điều hướng gói `profile21` sang bộ 10 tệp đóng băng `*-profile21.mjs` mà không migrate.
   - *Archive Sidecar v1 (`P24`–`P27`):* Trình xem archive offline D15 đọc cặp `(envelope ≤ 1 MiB / ≤ 2.000 sự kiện, sidecar ≤ 8 KiB)` với hợp đồng hiển thị `P04_HISTORIC` (đáy giữa 1/2) hoặc `P23_LOWER_BOTTOM` (đáy 3/4) trên canvas riêng `432×256` mà không chạm vào phiên sống.

---

### 1.5 Bản Đồ Chức Năng Đầy Đủ (Full Feature Inventory: 64 + D15 + 5 Thiết Bị Chờ)

Bảng dưới tổng hợp **toàn bộ 64 tính năng vận hành FCV-588** (nhóm `A01`–`A17`, `B01`–`B20`, `C01`–`C13`, `D01`–`D14`), nền tảng giảng viên **`D15`**, lớp hạ tầng/Electron và **5 thiết bị chờ**, phản ánh trạng thái thực thi thực tế trong mã nguồn (đối chiếu với sổ cái `fcv588-public-implementation-status.json` và 21 lỗi đã phát hiện):

#### Nhóm A — Bảng Điều Khiển, Phím Vật Lý & Vận Hành Cơ Bản (`A01`–`A17`)

| ID | Tính năng | Tệp nguồn chính | Trạng thái mã thực tế & Vấn đề ghi nhận |
|---|---|---|---|
| **A01** | Hình học LCD dọc & mặt máy | `web/index.html:26,37-102`; `web/styles.css` | Đã triển khai (ước lượng độc lập `233:270` / `128:171`, `480×640`); hình học OEM vẫn `HOLD` |
| **A02** | 9 phím/núm vật lý & bộ thích ứng nhập liệu | `adapter.mjs:8-22`; `hold-input`, `pad-repeat`, `rotary-input`, `keyboard-shortcuts` | Đã triển khai (kéo dọc 18 px/bước, lặp 450/150 ms, phím tắt) |
| **A03** | Chu trình `POWER` & giữ >3 s để tắt | `protocol.mjs:81-92`; `session.mjs:87-110`; `model.mjs:759-791` | **Có lỗi (`BUG-10`)** — `power-hold` bị phá bởi mọi phím; giữ >3 s không tự tắt khi chưa thả; lệch nguồn đồng hồ (`ui-tick` vs `performance.now()`) |
| **A04** | Chỉnh độ sáng `BRILL` (0–9) | `model.mjs:39-45,764-775`; `lcd-control-presentation.mjs` | Đã triển khai (CSS `brightness(0.25..1.0)`, tự lưu sau 6 s); rò phím khác (`BUG-04`) |
| **A05** | Núm xoay `MODE` 7 vị trí | `model.mjs:32,764-773,901-907`; `web/app.mjs:1052-1067` | Đã triển khai (`NAV1, LF-ZOOM, LF, DUAL, HF, HF-ZOOM, NAV2`, tự áp dụng 6 s); rò xuyên qua menu đang mở (`BUG-04`) |
| **A06** | Chế độ đơn tần `LF` (50 kHz) / `HF` (200 kHz) | `display-layout.mjs:24`; `echo-projection.mjs:207-263` | **Có lỗi (`BUG-02`)** — lệch trục Y thước độ sâu (`+43,5 px` ở `20 m`) & `[DEMO]` đè mốc `80 m` |
| **A07** | Màn hình chia đôi `DUAL` 50/200 kHz | `display-layout.mjs:17-21`; `web/app.mjs:439-442,503-512` | Đã triển khai (chia tỷ lệ `25–75%`, A-Scope chỉ ở HF); hình thái đáy LF≡HF |
| **A08** | Chế độ thu phóng `LF-ZOOM` / `HF-ZOOM` | `scenario.mjs:105-147`; `echo-projection.mjs:267-360` | **Có lỗi (`BUG-12`)** — bỏ qua `fishSizeAdjust`, lệch/mất biểu tượng cá ở Bottom Lock, sọc mã vạch do upsampling từ 120 hàng |
| **A09** | Chế độ `NAV1` / `NAV2` (2/3 dữ liệu + 1/3 sonar) | `display-layout.mjs:12-16`; `navigation.mjs:123-216`; `web/app.mjs:443-493` | **Có lỗi (`BUG-05`, `BUG-21`)** — bỏ qua hiệu chuẩn `Draft`/`Temp`/`Speed`; `NAV2` ép dải sonar 50 kHz LF thay vì HF như ảnh thật |
| **A10** | Dải độ sâu `RANGE` Tự động / Thủ công (8 khe) | `scenario.mjs:195-212`; `model.mjs:697-699,923-937` | Đã triển khai (bị khóa khi bật Bottom Disc.); rò qua menu (`BUG-04`) |
| **A11** | `GAIN` Thủ công (0–10) & Tự động (`Fishing`/`Cruising`) + Offset (`-5..+5`) | `scenario.mjs:214-218`; `model.mjs:908-919,976-979` | **HỎNG một phần (`BUG-01`, `BUG-11`)** — `autoGainOffset` không nối vào hồi âm; xoay `GAIN` lúc mở hộp thoại bị xóa sạch khi nhấn `ENTER` |
| **A12** | Vạch đo độ sâu `VRM` | `model.mjs:679-680,1013-1022`; `web/app.mjs:410-426,558-570` | **Có lỗi (`BUG-02`, `BUG-18`)** — lệch so với thước sâu; khi đã bật không có phím/menu nào ẩn được ngoài Reset |
| **A13** | Menu chính 5 nhóm & Trình chỉnh cấu hình lồng nhau | `menu-atlas.mjs:8-257`; `model.mjs:399-587`; `web/styles.css:166-177` | **HỎNG hiển thị nặng (`BUG-04`, `BUG-07`, `BUG-08`)** — `0/50` giá trị chọn lựa trên cả 5 nhóm Menu chính (`0/13` Sounder) đọc được ở mặc định; rò phím cứng khi mở menu |
| **A14** | Dịch chuyển độ sâu `Shift` (`0..30 m`) | `scenario.mjs:267-269`; `menu-atlas.mjs:75,230-232` | Đã triển khai (khóa trong Auto Range; biên độ 30 m thu gọn cho lớp học) |
| **A15** | Tốc độ cuốn ảnh `Picture Advance` (`4x..1/16`, `Stop`) | `echo-projection.mjs:92-98,114-171` | **Có lỗi (`BUG-03`)** — lệch tốc độ thời gian gây dịch chuyển tức thời `-53,80%` (`-53,81%` từ số làm tròn 4 chữ số thập phân) khi đổi cấu hình |
| **A16** | Phím chức năng `FUNC` (nhấn ngắn chạy / nhấn giữ lập trình) | `menu-atlas.mjs:12-24`; `model.mjs:589-621,938-964` | **Có lỗi (`BUG-04`, `BUG-18`)** — 11 mục tiêu; `FUNC → WPT List → MENU` thoát nhầm vào menu `Data`; `func-setting` không tự đóng khi rút quyền năng lực |
| **A17** | Âm bấm phím `Key Beep` & Tự lặp TrackPad | `web/key-feedback.mjs`; `web/pad-repeat.mjs` | Đã triển khai (Web Audio sin 880 Hz / 46 ms; lặp 450/150 ms) |

#### Nhóm B — Xử Lý Tín Hiệu Sonar & Hiển Thị (`B01`–`B20`)

| ID | Tính năng | Tệp nguồn chính | Trạng thái mã thực tế & Vấn đề ghi nhận |
|---|---|---|---|
| **B01** | Bộ sinh đáy biển & hồi âm tổng hợp LF/HF | `src/core/scenario.mjs:7-88,224-283` | **Có lỗi (`BUG-06`)** — 3 mục tiêu cá tĩnh (`t=8, 24, 42`) biến mất vĩnh viễn sau `46 s`/`115 s` |
| **B02** | Khử nhiễu `Interference` (`Auto`/`High`/`Med`/`Low`/`Off`) | `echo-projection.mjs:215-216,228` | Đã triển khai (ngưỡng trừ phẳng `5/14/8/3/0`, không mô phỏng xung nhiễu thực) |
| **B03** | Khử tạp âm `Clutter` (`0..100`) | `echo-projection.mjs:213`; `fcv588-echo-rasterizer.mjs:81-83` | **Có lỗi (`BUG-14`)** — nhiễu bề mặt biến mất đột ngột nếu đáy vượt khỏi dải đo |
| **B04** | Xóa màu `Color Erase` (`0..50`) | `echo-projection.mjs:214`; `fcv588-echo-rasterizer.mjs:82-83` | Đã triển khai (ngưỡng cắt `2×`, không cập nhật chú giải Color Bar) |
| **B05** | Đồ thị biên độ `A-Scope` (`Off`/`Normal`/`Peak`) | `echo-projection.mjs:29-51,185-192`; `web/app.mjs:221-232` | Đã triển khai (chỉ ở HF khi `DUAL`; khóa `Window Size` khi bật) |
| **B06** | Đường trắng đáy `White Line` (`Off`/`On`) | `echo-projection.mjs:188`; `web/app.mjs:214-220` | **Thô sơ / Lỗi (`BUG-14`)** — vạch thẳng ngang 3 px không bám địa hình đáy; bị cắt ngoài khung ở Bottom Lock (`y=640..643`) |
| **B07** | Đánh dấu trắng `White Marker` (`Off`/`White`/`Gray`) | `display-palette.mjs:34-35`; `lcd-instructor-meta.mjs:75-85` | Đã triển khai (bản xem trước huấn luyện thay slot màu mạnh nhất `base[7]`) |
| **B08** | Khuếch đại theo thời gian `TVG` (`Low`/`Medium`/`High`) | `echo-projection.mjs:217,229-230` | Đã triển khai (hệ số tuyến tính theo độ sâu minh họa) |
| **B09** | Làm mịn `Smoothing` (`Off`/`On`) | `echo-projection.mjs:237-248` | Đã triển khai (lọc ngang `[1, 2, 1]/4`) |
| **B10** | Vùng đáy `Bottom Zone` (`Narrow`/`Standard`/`Wide`) | `echo-projection.mjs:19-27`; `web/app.mjs:204-213` | **Thô sơ (`BUG-14`)** — băng chữ nhật phẳng (`4/10/20 m`) quanh `bottomDepthM` mới nhất, không bám đường đáy |
| **B11** | Công suất phát `TX Power` (`Auto`, `10%..100%`, `Off`) | `echo-projection.mjs:218-221,233` | **Có lỗi (`BUG-13`)** — tắt `txPower="Off"` xóa hồi âm nhưng số đo sâu & báo động vẫn hoạt động |
| **B12** | Tốc độ phát xung `TX Rate` (`1..10`, `S`, `Max`) | `echo-projection.mjs:141-145` | Đã triển khai (nhân hệ số cuốn `0.1..1.25`) |
| **B13** | Chế độ Zoom (`Bottom Lock`/`Bottom Zoom`/`Marker Zoom`) | `echo-projection.mjs:310-360` | **Có lỗi (`BUG-12`)** — mất hiệu chuẩn cá & sọc dọc độ phân giải thấp |
| **B14** | `RezBoost` (`Off`/`Standard`/`Enhanced`) | `capabilities.mjs:5-27`; `echo-projection.mjs:197-198,231` | **Có lỗi (`BUG-21`)** — khóa đúng đầu dò `525STID-PWD`, nhưng `Standard` và `Enhanced` dùng công thức điểm ảnh **y hệt nhau** |
| **B15** | `ACCU-FISH` + Biểu tượng & Kích thước cá | `capabilities.mjs:5-27`; `echo-projection.mjs:74-91,257-261` | **Có lỗi (`BUG-06`, `BUG-12`)** — cá tắt sau 115 s; bỏ qua `fishSizeAdjust` ở khung Zoom |
| **B16** | Phân biệt đáy `Bottom Discrimination` (`Off`/`Graphic`/`Probability`) | `capabilities.mjs:28-44`; `echo-projection.mjs:53-72`; `web/app.mjs:233-276` | Đã triển khai khóa điều kiện (5–100 m, ≤10 kn, Auto Range, `draft≥0`); tỷ trọng đáy cố định `{0.1, 0.1, 0.2, 0.6}`; speed guard lệch khi paused (`BUG-17`) |
| **B17** | Khóa xung đột chế độ / tùy chọn | `menu-atlas.mjs:194-257`; `model.mjs:409-441` | Đã triển khai tốt (lỗ hổng nhỏ: `func-setting` & `moveMenu` không gọi `reconcileCapabilityMenu`) |
| **B18** | Tiện ích hiển thị phụ (`Depth Size`, `Zoom Marker`, `Temp Graph`, `Window Size`, `Color Bar`, `Header Info`, `Nav Data`, `Battery`) | `display-widgets.mjs:5-60`; `web/app.mjs:314-358` | Đã triển khai (đối tượng `battery` tạo ra ở `display-widgets.mjs:39-42` nhưng bị bỏ qua ở `web/app.mjs:316`; `Battery On` chỉ ẩn tốc độ cuốn) |
| **B19** | 5 bảng màu (`White`/`Blue`/`Black`/`Mono`/`Night`) × 8/16 màu & WCAG | `display-palette.mjs:5-72` | Đã triển khai tốt (tính độ chói WCAG tự đảo màu chữ trên nền trắng) |
| **B20** | Chế độ `Stop` tách biệt đồng hồ thế giới | `session.mjs:79-83`; `echo-projection.mjs:131-138` | Đã triển khai đúng bất biến ADR-0001 |

#### Nhóm C — Báo Động & Hàng Hải (`C01`–`C13`)

| ID | Tính năng | Tệp nguồn chính | Trạng thái mã thực tế & Vấn đề ghi nhận |
|---|---|---|---|
| **C01** | Báo động cá (`Fish School` / `Bottom Fish` / `ACCU-FISH`) | `alarms.mjs:13-24`; `model.mjs:105-106,836-840` | **Một phần / Bị lỗi (`BUG-06`, `BUG-16`)** — thiếu cửa sổ độ sâu/cỡ cá; không bao giờ kích hoạt lại sau `simTick > 46`; báo động ma sau khi tắt/bật máy |
| **C02** | Báo động độ sâu đáy (`Bottom From`/`Span`) | `alarms.mjs:10-12`; `model.mjs:102-103,833` | **Có lỗi (`BUG-13`)** — so sánh độ sâu thô chưa cộng `draft` |
| **C03** | Báo động nhiệt độ nước (`Off`/`Inside`/`Outside`) | `alarms.mjs:28-31`; `model.mjs:107-109,845-847` | **Có lỗi (`BUG-13`)** — so sánh nhiệt độ thô chưa cộng `tempAdjust` |
| **C04** | Báo động tốc độ (`Off`/`Inside`/`Outside`) | `alarms.mjs:32-35`; `model.mjs:110-112,842-844` | **Có lỗi (`BUG-13`)** — so sánh tốc độ thô chưa nhân `speedAdjust` |
| **C05** | Báo động đến điểm (`Arrival Alarm` & bán kính `0.01..1 NM`) | `alarms.mjs:36-39`; `model.mjs:118-120,799-803` | Đã triển khai (tính khoảng cách Haversine tới đích) |
| **C06** | Báo động loại đáy (`Rock`/`Gravel`/`Sand`/`Mud`) | `alarms.mjs:25-27`; `scenario.mjs:177` | **Hỏng logic (`BUG-13`)** — `scenario.mjs:177` đóng cứng `bottomType: "Rock"` bất chấp kịch bản đáy bùn |
| **C07** | Bật/tắt `ALARM1..5`, biểu ngữ & tắt chuông bằng phím | `alarms.mjs:45-62`; `model.mjs:624-665,747-755`; `web/lcd-presentation.mjs:170-189` | **Một phần (`BUG-13`, `BUG-16`)** — **không phát âm thanh báo động** (giới hạn phạm vi `HOLD` đã công bố tại `alarms.mjs:3-4` & `C04`); ở tầng reducer, `state.alarms.activeIds`/`audible` thô (`model.mjs:753`) trễ tới tick sau khi tắt profile lúc tạm dừng *(dù `web/lcd-presentation.mjs:170-189` ẩn ngay biểu ngữ LCD)* |
| **C08** | Đánh dấu điểm `MARK` (`WP001..`, tối đa 20) | `navigation.mjs:47-55`; `model.mjs:1025-1041` | **Có lỗi (`BUG-04`, `BUG-21`)** — rò qua menu đang mở; hỏng vĩnh viễn sau `WP999` (`"MARK 1000"` dài 9 > 8 ký tự) |
| **C09** | Quản lý Waypoint (Danh sách, đổi tên 37 ký tự, xóa, Go To, xóa hết) | `navigation.mjs:41-76`; `model.mjs:134-246` | Đã triển khai đầy đủ (bảo vệ đích đang hoạt động khỏi xóa) |
| **C10** | Chiếu dữ liệu `NAV1`/`NAV2` | `navigation.mjs:94-216`; `lcd-instructor-meta.mjs:157-167` | **Có lỗi (`BUG-05`)** — bỏ qua hiệu chuẩn; `WIND` luôn `NO DATA`; `TIME TO GO (SIM EST)` bị ẩn khỏi LCD và đẩy sang bảng giảng viên |
| **C11** | Menu `Data`, chỉnh ô NAV, `Bearing`/`Wind`, chọn nguồn `Own`/`NMEA` | `menu-atlas.mjs:40-50,118-133`; `model.mjs:250-275` | **`MENU_ONLY_PARTIAL`** — không có độ lệch từ trường (`True`/`Mag` chỉ đổi hậu tố nhãn), không có cảm biến gió/NMEA thật |
| **C12** | Cảm biến mất/cũ fail-closed (`NO DATA`, TTL 10 tick) | `navigation.mjs:19-26,98-149`; `receiver-status.mjs` | Đã triển khai chặt chẽ (`simTick - observedAtTick > 10` → `STALE_DATA`) |
| **C13** | Tích phân hành trình `Trip` / `Odometer` & Reset Trip | `navigation.mjs:10-17,84-92`; `model.mjs:374-385` | Đã triển khai (chưa có chức năng Reset Odometer) |

#### Nhóm D — Hệ Thống, Hiệu Chuẩn, Bảo Trì, Giảng Viên & Hạ Tầng (`D01`–`D15` + 5 Thiết Bị Chờ)

| ID | Tính năng | Tệp nguồn chính | Trạng thái mã thực tế & Vấn đề ghi nhận |
|---|---|---|---|
| **D01** | Menu `System` (19 mục) & `Installation` (6 mục) | `menu-atlas.mjs:134-228`; `model.mjs:455-587` | Đã triển khai (tự ẩn `NMEA`/`Receiver Status` khi Tankenmaru `On`) |
| **D02** | Bộ 8 mức Range Presets & Tự đặt lại khi đổi đơn vị sâu | `model.mjs:64-66,341-366` | Đã triển khai (giá trị lớp học `5..300 m`, nhỏ hơn dải thật `2..1200 m`) |
| **D03** | `Key Setup` (`FUNC Key` & `Key Beep`) | `menu-atlas.mjs:150-151`; `model.mjs:594-606` | Đã triển khai |
| **D04** | Chọn ngôn ngữ (`Language`) & Khởi động lại | `menu-atlas.mjs:138,180,201-202,240-241` | **`NOT_IMPLEMENTED`** — khóa cứng `["English"]`, vô hiệu hóa vĩnh viễn (`RIGHTS_HOLD_LANGUAGE_ASSETS_AND_REBOOT_SOURCE_GAP`), chưa có LCD tiếng Việt |
| **D05** | 6 nhóm đơn vị (`Depth`, `Temp`, `Fish Size`, `Speed`, `Wind`, `Distance`) | `units.mjs:8-70`; `model.mjs:276-301` | Một phần — `HR`/`pb` bị `HOLD`; `formatFcvWind` & `windUnit` không dùng ở runtime; `RECEIVER STATUS` đóng cứng `"kn"` (`BUG-05`) |
| **D06** | Hiệu chuẩn (`Gain ADJ HF/LF`, `Temp`, `Speed`, `Fish Size`, `Water Type`, `Zero Line Rejector`, `Draft`) | `calibration.mjs:7-46`; `echo-projection.mjs:222-232` | **Một phần / Bất nhất (`BUG-05`, `BUG-12`, `BUG-13`)** — `waterType` (`Salt`/`Fresh`) hoàn toàn là mã chết; `draft`/`temp`/`speed` bị bỏ qua ở NAV & báo động; `fishSizeAdjust` bị bỏ qua ở Zoom |
| **D07** | Chọn đầu dò (`GENERIC_600W`, `GENERIC_1KW`, `525STID-PWD`) | `capabilities.mjs:13-24`; `echo-projection.mjs:101-105` | Đã triển khai đúng khóa năng lực |
| **D08** | Chế độ `Demo` (`On`/`Off`) & chỉ báo `[DEMO]` | `model.mjs:682,795-797`; `web/app.mjs:389-390,494-502` | Đã triển khai (hiện `"NO SONAR DATA"` khi `Demo Off` mà chưa lắp `525STID-PWD`); `[DEMO]` đè mốc `80 m` (`BUG-02`) |
| **D09** | Tùy chọn hệ thống `Tankenmaru` | `tankenmaru-status.mjs:6-20`; `receiver-status.mjs:16` | **`MENU_ONLY_PARTIAL`** (`BUG-21`) — chỉ hiện thông số mặc định chỉ-đọc §2.9; `receiver-status.mjs:16` quên kiểm tra `tankenmaruOption` |
| **D10** | Bơm lỗi huấn luyện (`Low Battery`, `System Error`) | `training-faults.mjs:5-15`; `web/app.mjs:1095-1110` | Đã triển khai (chỉ hiển thị ngoài mặt máy trong D15, không vẽ trên LCD) |
| **D11** | `Diagnostics` & Kiểm tra màn hình `LCD Test` (5 màu) | `model.mjs:373,386-389`; `web/app.mjs:386-409` | Đã triển khai stub sandbox (`Diagnostics` chỉ hiện `"NO DATA"`, firmware `UNKNOWN`) |
| **D12** | Khôi phục mặc định `Restore Defaults` | `model.mjs:126-132,390-395` | **Một phần (`BUG-18`)** — không đặt lại `vrmVisible`, `vrmDepthM`, `mode`, waypoints, odometer |
| **D13** | Lưu bền cài đặt (`localStorage` v18) & Nhập cấu hình cũ | `settings.mjs:13-106`; `web/app.mjs:76-114` | **Có lỗi (`BUG-20`)** — hỗ trợ `profile19`/`21`/`22`, bỏ sót `profile20` |
| **D14** | `NMEA` & Trạng thái thu `Receiver Status` | `receiver-status.mjs:4-53`; `web/app.mjs:944-955` | **`MENU_ONLY_PARTIAL`** (`BUG-05`) — khóa `NMEA: OFF`, 0 serial/mạng, đóng cứng `"kn"` |
| **D15** | **Nền tảng Giảng viên** (5 Tab ARIA, 5 tình huống, 7 bài học, Ma trận nguồn, Archive offline + BZ Viewer + Timeline) | `src/core/lessons.mjs`; `archive-compat.mjs`; `web/{instructor-tabs,lcd-instructor-meta,fcv588-training-source-matrix,fcv588-archive-*}.mjs` | Đã triển khai phong phú nhưng dính `BUG-09` (`LEARN-07`), `BUG-17`, `BUG-19` (3 control mobile <44 px), `BUG-20` (giới hạn 30k nút JSON, `LEARN-05`, `cancel` nguồn), `BUG-21` (`LEARN-03`), và đóng băng 1,65–2,27 s |
| **Hạ tầng** | Server loopback `127.0.0.1`, Replay v7 / Multi v4, Electron P30/P31, Claim Gate | `tools/server.mjs`; `src/core/*`; `apps/fcv588-electron-p30/`; `claim-gate.mjs` | Web server & replay tốt; Electron phân mảnh 3 nhánh & `NO_GO`; `device-runtime.mjs` & `claim-gate.mjs` không có lời gọi từ runtime |
| **5 Thiết bị chờ** | `MDC-2060`, `FAR-2127`, `AIS R5`, `NS4000`, `KODEN J2000` | `docs/evidence/device-register.json`; `web/index.html:256-262` | **`NOT_STARTED` / `HOLD` (0 LOC)** — chỉ có dòng chữ tĩnh trên giao diện & tài liệu PDF/ZIP trong `sources/manuals/` |

---

### 1.6 Mô Hình Toán Học, Sonar & Xử Lý Tín Hiệu

1. **Hai đồng hồ tách biệt (`protocol.mjs:4`, `session.mjs:79-86`):**
   - *Đồng hồ thế giới:* số nguyên `simTick` (`TICK_DURATION_MS = 1000 ms`), tiến theo `{kind: "tick", steps: 1..20}` kể cả khi `power === "off"` hoặc `Picture Advance === "Stop"`.
   - *Đồng hồ giao diện:* `uiElapsedMs` tiến theo `{kind: "ui-tick", elapsedMs: 1..60000}` (trình duyệt gửi mỗi `250 ms` khi mở `mode`, `brill`, `power-hold`), không bao giờ làm thay đổi `worldState`.
2. **Địa hình đáy & Động học tàu (`scenario.mjs:13-39,159-168`, `navigation.mjs:10-40`):**
   - Đáy biển hình sin giới hạn trong $[43{,}4;\;55{,}8]\text{ m}$:
     $$D_{\text{bottom}}(t) = 49{,}6 + 5\sin(0{,}075\,t) + 1{,}2\sin(0{,}21\,t)$$
   - Tàu chạy thẳng về hướng Đông ($\phi_0 = 10{,}5^\circ\text{N}$, $\lambda_0 = 106{,}75^\circ\text{E}$, $v = 7\text{ kn}$, $\theta = 90^\circ$, $T = 18^\circ\text{C}$) theo phép chiếu phẳng (*plane sailing*): $\Delta\lambda = \frac{v \cdot \text{simTick}/3600}{60\max(0{,}1,\cos\phi_0)}$. Kinh độ **không cuộn qua $\pm 180^\circ$**, nhưng tràn thực tế chỉ xảy ra ở chính xác **`simTick = 2.222.438`** ($\lambda = 180{,}000032^\circ$, tương đương **`617,34 giờ`** chạy liên tục — đính chính ước tính nhẩm `~37.000` của khảo sát ban đầu).
   - Quãng đường `Trip/Odometer` dùng bước Euler $\Delta s = v\Delta t / 3600\text{ NM}$. Khoảng cách tới waypoint dùng công thức đại tròn **Haversine** ($R = 3440{,}065\text{ NM}$, có kẹp `Math.min(1, Math.sqrt(h))` an toàn số học).
3. **Đường ống tạo và chiếu hồi âm (`scenario.mjs:60-88,214-283` → `echo-projection.mjs:207-360` → `web/fcv588-echo-rasterizer.mjs:59-130`):**
   - *Lưới cảm biến thô:* `observeSounder` đánh giá tại thời điểm cột $t(x) = \text{simTick} - (C - x)\cdot 0{,}46$ (`SOUNDER_COLUMN_SECONDS = 0.46`; web mặc định $C = 160$, $R = 301$, độ sâu tối đa `300 m` = `1,0 m/hàng`).
   - *Đáy biển & 3 đàn cá Gaussian tĩnh:* $E_{\text{bot}} = 0{,}85 - 0{,}17(z - D_{\text{bottom}}(t))$ trong dải dày `2,3 m`; 3 khối cá cố định tại $(t_i, z_i, A_i) \in \{(8, 17, 0{,}75),\;(24, 29, 0{,}90),\;(42, 34, 0{,}65)\}$ với $\sigma_z = 2{,}3\text{ m}$ và $\sigma_t = 5{,}2$ (`50 kHz`) hoặc $2{,}6$ (`200 kHz`); nhiễu tất định PRNG trộn bit 32-bit kiểu Murmur (`noise01`, hằng số `0x45d9f3b`, `0x119de1f3`, luồng định danh `"sensor:fcv588:sonar-v1"`).
   - *Chuỗi xử lý hiển thị:*
     1. `makeEchoFrame` (`120` hàng): nhân biên độ với $(0{,}2 + 0{,}16\cdot G_{\text{eff}})$ (bỏ quên `autoGainOffset` — `BUG-01`).
     2. `projectFcvEcho`: trừ ngưỡng $1{,}25\cdot\text{clutter} + 2\cdot\text{colorErase} + T_{\text{IR}}$, nhân TVG tuyến tính (`0,73..1,0`), kéo tương phản RezBoost $(v-25)\cdot 1{,}22 + 25$ (giống hệt nhau giữa `Standard` và `Enhanced`), xóa 2 hàng đầu nếu bật Zero Line Rejector, nhân `TX Power` × `Gain ADJ` ($\pm 20\%$), và lọc làm mịn ngang `[1,2,1]/4`.
     3. `projectFcvZoom`: lấy mẫu lại từ bộ đệm `120` hàng `base.pixels` (thay vì `301` hàng thô) cho `Bottom Lock` / `Bottom Zoom` (`P23_LOWER_BOTTOM` ở 3/4 hoặc `P04_HISTORIC` ở 1/2) / `Marker Zoom`.
     4. `advanceFcvPictureHistory`: dịch cột theo phần dư tích lũy, xóa sạch bộ đệm mỗi khi `projectionKey` đổi (`BUG-03`).
     5. `rasterizeFcvEcho`: phóng `2×` ngang, `4×` dọc (`320×480` RGBA) bằng nội suy song tuyến, cộng lõi/đuôi đáy trang trí & tạp âm bề mặt (phụ thuộc `coherentBottom` — `BUG-14`), nhiễu dither $\pm 9$, và ánh xạ vào bảng 8 hoặc 16 màu RGB.
4. **Đơn vị, Hiệu chuẩn & Độ chói màu (`units.mjs`, `calibration.mjs`, `display-palette.mjs`):** Hệ số quy đổi hàng hải (`ft`, `fm`, `°F`, `in`, `km/h`, `mph`, `m/s`, `SM`) chuẩn xác; hiệu chuẩn (`depthM + draft`, `temp + tempAdj`, `speed * (1 + speedAdj/100)`, `fishSize * (1 + sizeAdj/100)`) sạch về công thức nhưng không được gọi đồng nhất (`BUG-05`, `BUG-12`, `BUG-13`); `getFcvLcdContrastTheme` áp dụng đúng công thức độ chói tương đối WCAG sRGB (`0.2126R + 0.7152G + 0.0722B`, ngưỡng `0.42`).
5. **Đánh giá trung thực giới hạn vật lý âm học:** Mô hình **không cài đặt phương trình sonar thủy âm** (không suy hao hình học $20\log R$, không hấp thụ theo tần số $\alpha(50\text{ kHz}) \ll \alpha(200\text{ kHz})$, không độ rộng chùm tia mở rộng theo độ sâu, không khác biệt độ dài xung, không phản xạ đáy lần 2, không đổi vận tốc âm theo `Salt`/`Fresh`, không đường cong vòm cá theo tốc độ tàu). Giới hạn này được dự án công bố minh bạch là *"illustrative, not acoustic physics"*; tuy nhiên các lỗi nội tại `BUG-01`..`BUG-03`, `BUG-05`, `BUG-06`, `BUG-12`–`BUG-14` phá vỡ ngay cả tính nhất quán của mô hình huấn luyện tổng hợp.

---

### 1.7 Hệ Thống Quản Trị, Bằng Chứng & Kế Hoạch

Dự án sở hữu một bộ máy quản trị bằng chứng rất đồ sộ (nhưng đang quá tải vận hành):
- **4 cây kế hoạch trong `plans/` (`1.268` tệp / `97,89 MiB`):** (1) `261013-1319-fcv588-full-fidelity-simulator` (bị chặn phần cứng/quyền); (2) `261013-1428-fcv588-public-reference-complete-operator` (bị thay thế cùng ngày); (3) `261013-2359-fcv588-public-reference-deep-tdd-advice-v2` (kế hoạch F1 chính, `plan.md` phình `792` dòng, mới tick **`14/50` = 28%** mục kiểm tra và `6/22` tác vụ); (4) `261113-0911-fcv588-photo-reference-visual-conformance` (`1.152` tệp / `96,92 MiB`, đẻ ra chuỗi `P02`–`P36`, các Phase 01–04 & 07 vẫn `TODO`).
- **Các văn bản chuẩn tắc:** `docs/decisions/ADR-0001.md` (8 bất biến lõi, *"ACCEPTED FOR F0 PROTOTYPE ONLY"*), `device-register.json` (6 thiết bị, 5 chưa bắt đầu), `FCV588_PUBLIC_CLAIM_POLICY.md` (khung `PUBLIC_REFERENCE`, chính sách bảo thủ `AI_PROCESS_HOLD`, 4 trục quyền `retain`/`aiProcess`/`reproduce`/`redistribute`), `FCV588_FIDELITY_ACCEPTANCE_PROTOCOL.md` (ngưỡng dung sai đo lường), `claim-gate.mjs` (bộ đánh giá tự động fail-closed đòi đủ biên bản `positive`/`negative`/`cancel`/`replay` + browser QA + duyệt của reviewer), và chính sách lưu giữ nguyên trạng các lần QA thất bại thay vì ghi đè.
- **Hiện trạng cổng phê duyệt:** **65/65** yêu sách tính năng FCV-588 giữ `claimDecision: "HOLD"`, `releaseApproval: "HOLD"`, `frameAuditedVideoCount: 0`, và Electron P32 chốt phán quyết `NO_GO`.

---
## Phần II — Review Toàn Diện (Comprehensive Technical, Architecture & Domain Review)

### 2.1 Review Kiến Trúc, Chất Lượng Mã Nguồn & Khả Năng Bảo Trì

Mặc dù lõi sự kiện (`src/` + `web/`) giữ được kỷ luật không có phụ thuộc vòng lặp (0 circular imports) và 0 lỗi cú pháp (`89/89` tệp JS/MJS/CJS hợp lệ), kiểm toán kiến trúc và phân tích tĩnh cho thấy **5 nhóm nợ kỹ thuật kết cấu nghiêm trọng**:

1. **Vi phạm phân lớp `ADR-0001` (Core-to-Device Layering Leaks):**
   - `docs/decisions/ADR-0001.md:23,47` và `src/core/protocol.mjs:131` tuyên bố `src/core/` là nền tảng *"device-agnostic"* cho đa thiết bị, nhưng trên thực tế cả 4 tệp lõi đều gắn cứng với FCV-588:
     - `src/core/lessons.mjs:7-8`: Nhập ngược từ tầng thiết bị (`FCV588_ADAPTER` từ `../devices/fcv588/adapter.mjs` và `projectFcvTrainingReceiver` từ `../devices/fcv588/receiver-status.mjs`).
     - `src/core/protocol.mjs:139-140,149-150,156,163`: Đóng cứng tên fixture (`"tankenmaruOption"`, `"virtualMounting"`, `"lowBattery"`, `"systemError"`, `"navigation"`) và phím FCV-588 (`"trackpad"`, `"power"`, `"func"`) trong `validateInput()`.
     - `src/core/scenario.mjs:8,50,80,195-283`: Đóng cứng `"fcv588-demo-depth-001"`, `"sensor:fcv588:sonar-v1"`, `SENSOR_MODEL_VERSION="fcv588-sonar-illustrative-v1"`, tần số `[50, 200]` kHz và hàm chiếu hiển thị (`effectiveRangeM`, `effectiveGain`, `makeEchoFrame`).
     - `src/core/device-runtime.mjs:78`: Đóng cứng `deviceId === "fcv588"` và ném ngoại lệ ở dòng `38` với mọi thiết bị thứ hai không phải stub `INERT_SECOND_DEVICE`.
2. **Nhân bản nội bộ `*-profile21.mjs` đạt 97,1% (1.889 split LOC / 1.879 `wc -l` LOC = 32,8% toàn bộ `src/`):**
   - Để giữ tương thích replay cho 6 fixture `profile21` (khác đúng thứ tự 3 mục trong menu Sounder và chuỗi phiên bản `F1-public-reference-21`), dự án đã sao chép nguyên xi **10 tệp** (`src/devices/fcv588/*-profile21.mjs`).
   - Tổng diff hợp nhất trên cả 10 tệp chỉ là **`+22 / -33` dòng** (55 dòng thay đổi trên 1.889 dòng!). Trong đó **3 tệp giống hệt 100% từng byte (`0` diff)**: `calibration-profile21.mjs`, `capabilities-profile21.mjs`, `units-profile21.mjs`; riêng `model-profile21.mjs` sao chép tới `1.032+` trên `1.043` dòng `wc -l` (`1.044` split LOC) của `model.mjs` *(con số `1.040` `wc -l` thuộc về chính `model-profile21.mjs`)*. Toàn bộ nhóm này lẽ ra chỉ cần một factory tham số hóa `createFcv588Profile({ revision, sounderOrder })`.
3. **Nhân bản mã nguồn diện rộng xuyên thư mục (13 bản `src/` & 14 bản `web/`):**
   - `src/` xuất hiện **13 lần** (1 bản chuẩn + **10 bản sao khớp SHA-256 35/35 tệp** trong `apps/` và `staging/` + 2 bản cũ phân kỳ trong `docs/qa/` & `plans/`) = **64.756 dòng mã trùng lặp**.
   - `web/` xuất hiện **14 lần** (1 bản chuẩn + 2 bản khớp 19/19 tệp + 8 bản Electron chỉ khác 1 dòng `index.html` + 3 bản cũ phân kỳ) = **49.041 dòng mã trùng lặp** — tổng cộng **113.797 LOC nhân bản** khắp kho mã.
4. **Tệp Khổng Lồ (God Files) & Top 12 Hàm Phức Tạp Nhất:**
   - `web/app.mjs` (**1.492 split LOC / 1.491 `wc -l` / 1.386 SLOC / 68,7 KB / 32 imports / 0 exports / 91 hàm**) ôm trọn vòng đời session, `localStorage`, vẽ Canvas 2D, dựng DOM 19 loại modal, 5 tab D15, nhập archive, timeline, phím tắt và vòng lặp 250 ms. Chính việc có **0 exports** khiến bộ test phải dùng 471 regex đọc văn bản thô và cả `new Function()`.
   - `src/devices/fcv588/model.mjs` (**1.044 split LOC / 50,7 KB / 49 hàm**) nhồi nhét toàn bộ 19 máy trạng thái overlay vào các chuỗi `if` lồng sâu.

| Hạng | Hàm (`tệp:dòng`) | LOC (SLOC) | AST CC | ESLint CC | Max Depth | Tham số | Tác động kỹ thuật |
|---|---|---:|---:|---:|---:|---:|---|
| 1 | `reduceFcv588` (`src/devices/fcv588/model.mjs:710-1043`) | **334** (316) | **179** | **207** | 3 | 2 | Reducer nguyên khối; nguyên nhân trực tiếp của `BUG-04`, `BUG-10`, `BUG-11`, `BUG-13`, `BUG-16` |
| 2 | `moveSpecialOverlay` (`src/devices/fcv588/model.mjs:248-397`) | **150** (150) | **89** | **89** | 3 | 2 | Dồn 8 trình chỉnh modal vào một chuỗi `if` phẳng |
| 3 | `projectFcvManualNavBoxes` (`src/devices/fcv588/navigation.mjs:123-216`) | 94 (80) | 54 | **62** | 1 | 1 | Chiếu dữ liệu hộp NAV1/NAV2 dày đặc điều kiện |
| 4 | `assessFcvLesson` (`src/core/lessons.mjs:143-292`) | **150** (129) | **57** | *(>15)* | 3 | 3 | Replay 3–4 lượt đồng bộ; chứa `BUG-09` & `BUG-20` |
| 5 | `moveMenu` (`src/devices/fcv588/model.mjs:443-544`) | **102** (102) | 53 | **57** | 3 | 2 | Điều hướng 5 nhóm menu + lưu/hủy draft |
| 6 | `renderDialog` (`web/app.mjs:872-1050`) | **179** (172) | 53 | **56** | 1 | 0 | Kết xuất DOM cho cả 19 loại hộp thoại |
| 7 | `moveWaypointWorkflow` (`src/devices/fcv588/model.mjs:134-246`) | **113** (113) | 50 | **52** | **4** | 2 | 5 màn hình CRUD waypoint + vòng xoay 37 ký tự |
| 8 | `rasterizeFcvEcho` (`web/fcv588-echo-rasterizer.mjs:59-130`) | 72 (66) | 48 | **49** | **4** | 3 | Vòng lặp điểm ảnh nóng; **669,6 magic nums/KLOC**; chứa `BUG-14` |
| 9 | `renderScreen` (`web/app.mjs:360-594`) | **235** (218) | 47 | **48** | **5** | 0 | Lồng sâu nhất kho (`depth=5` tại L534); chứa `BUG-02`, `BUG-05`, `BUG-14` |
| 10 | `validateInput` (`src/core/protocol.mjs:94-166`) | 73 (71) | **44** | *(>15)* | 2 | 1 | Đóng cứng phím & fixture FCV-588 ngay trong `src/core/` |
| 11 | `projectFcvInstructorSourceMatrix` (`web/fcv588-training-source-matrix.mjs:67-136`) | 70 (67) | 37 | **43** | 0 | 2 | 9 chuỗi toán tử 3 ngôi lồng nhau (`no-nested-ternary`) |
| 12 | `drawSourceGradedOverlays` (`web/app.mjs:203-311`) | **109** (108) | 20 | **29** | **4** | 6 | Vẽ Bottom Zone, White Line, A-Scope, BDS, Fish, RezBoost |

5. **Kết quả ESLint v10.15.0, Mã chết, Đồ thị Export & Hằng số Ma (Magic Numbers):**
   - **ESLint `recommended` (52 tệp `.mjs` trong `src/`+`web/`+`tools/server.mjs`):** 0 lỗi `no-undef`/`eval`/`eqeqeq`/`var`/`no-unreachable`/`radix`; có 26 báo lỗi gồm 15 phép tách `...rest` vô hại (`ignoreRestSiblings: true`) và **11 lỗi thực sự**:
     - **9 lỗi `no-unused-vars`:** `capabilities.mjs:28` & bản sao `capabilities-profile21.mjs:28` (`mountCompatible`, `mountAligned`), `web/app.mjs:1` (`makeEchoFrame`), `:7` (`FCV_RANGE_BANK_FIELDS`), `:10` (`projectNavData`), `:312` (`clampUi`), `:316` (`battery`).
     - **1 lỗi `no-useless-assignment`:** `src/core/lessons.mjs:177` (`let replayVerified = false;` bị ghi đè vô điều kiện trước khi đọc).
     - **1 lỗi `no-empty`:** **Duy nhất 1 khối `catch {}` thực sự rỗng** tại `web/app.mjs:1442` *(chỉnh xác nhận: các khối `catch` ở `web/app.mjs:80,98,110`, `web/key-feedback.mjs:35` và `tools/server.mjs:72` đều có câu lệnh `return`/fallback, không rỗng)*.
   - **ESLint luật mở rộng (135 cảnh báo):** 66 hàm `complexity > 15`, 47 `no-nested-ternary`, 16 hàm `> 80 SLOC`, 5 `no-shadow` (`device-runtime.mjs:51`, `web/app.mjs:174`, `fcv588-training-source-matrix.mjs:148,152,153`), 1 `max-depth > 4` (`web/app.mjs:534`).
   - **Đồ thị 164 export hoạt động (42 tệp `.mjs` không tính `profile21`):** **133** dùng ở runtime; **24** chỉ dùng trong `test/` hoặc `tools/` (gồm toàn bộ `src/core/device-runtime.mjs`, `claim-gate.mjs`, `formatFcvWind`); **7** hàm hỗ trợ nội bộ export thừa (`stableSerialize`, `noise01`, `FISHFINDER_NOISE_STREAM`, `effectiveGain`, `P26_VIEWER_COLUMNS`/`ROWS`, `nextInstructorTabIndex` — không bị nhập từ ngoài nhưng đều được gọi nội bộ trong chính module của chúng).
   - **Mã chết & CSS thừa:** Gán vô ích tại `web/app.mjs:353` (`ctx.fillStyle`), `:501` (`ctx.font`), lặp điều kiện `if (vrmShown)` tại `:558-559`; `settings.mjs:47` gọi `Object.hasOwn(choices, key)` trên đối tượng `Map` (luôn `false`); `session.mjs:44` (`pendingEffects: []`); `calibration.mjs:13,23,43` (`waterType`); `model.mjs:114` (`soundChoice`); `tools/server.mjs:21` (`MIME[".json"]`); và **chính xác 1 lớp CSS không sử dụng** trong `web/styles.css`: **`.detent`** (`web/styles.css:304`, 0 ID thừa).
   - **Mật độ hằng số ma (inline magic numbers):** **696 số / 6.281 SLOC = `110,8 / KLOC`**, cao nhất tại `display-palette.mjs` (`1.175,4/KLOC`), `web/fcv588-echo-rasterizer.mjs` (`669,6/KLOC`), `display-layout.mjs` (`415,4/KLOC`), và `src/core/scenario.mjs` (`254,3/KLOC`).

---

### 2.2 Review Logic Miền, Chức Năng & Danh Mục Hợp Nhất 21 Lỗi (`BUG-01`–`BUG-21`)

Tổng hợp toàn bộ **21 lỗi đã tái hiện thực nghiệm** (11 lỗi P1, 8 lỗi P2, 1 lỗi P2/P3, 1 cụm P3) từ khảo sát lõi (`Survey 2`), kiểm chứng động Node + Live Chrome (`W3`), và kiểm toán đối chiếu ảnh thực tế + Electron (`W4`) thành bảng định danh duy nhất không xung đột:

| Mã lỗi | Mức độ | Nguồn đối chiếu | Vị trí mã (`file:line`) | Cơ chế lỗi & Bằng chứng tái hiện thực nghiệm |
|---|---|---|---|---|
| **BUG-01** | **P1** | Survey 2 `B1`, W3 xác nhận | `src/core/scenario.mjs:214-218`; `echo-projection.mjs:250` | **`autoGainOffset` (`-5..+5`) bị bỏ quên hoàn toàn khi tính hồi âm.** `effectiveGain()` trả về hằng số `6.5` (`fishing`) hoặc `3.8` (`cruising`), phớt lờ `state.autoGainOffset`. Đổi `-5 → +5` làm đổi tiêu đề (`G:AF-5 → G:AF+5`) và xóa sạch lịch sử cuốn ảnh (`projectionKey` đổi), nhưng **Live Chrome xác nhận `0 / 1.228.800` byte RGBA trên `#echo-canvas` thay đổi** (SHA-256 ảnh giống hệt `f79990910e...`). |
| **BUG-02** | **P1** | Survey 2 `B2`, W3 & W4 xác nhận | `web/app.mjs:159,165-170,218,285,535,560`; `web/lcd-presentation.mjs:61-105` | **Trục Y thước độ sâu lệch so với ảnh sonar, VRM, White Line & biểu tượng cá; `[DEMO]` đè mốc `80 m`; vạch chia nửa pixel bị mờ.** Sonar và VRM chiếu trên `[0, 640]`, còn `projectFcvDepthTicks` nén thước vào `[62, 628]` (`top: 62, bottom: 12`). Trên dải `80 m`: mốc `0 m` lệch **`+62 px / +7,75 m`**; mốc `20 m` (sonar & VRM ở `160 px` vs nhãn ở `203,5 px`) lệch **`+43,5 px / +5,438 m`**; mốc `40 m` lệch `+25 px`; mốc `80 m` lệch `-12 px` và bị `[DEMO]` che khuất trên mọi ảnh P23/P28/P36. Tọa độ bán nguyên `201,5` / `484,5` làm nhòe xám vạch chia `20 m`/`60 m`. |
| **BUG-03** | **P1** | Survey 2 `B3`, W3 xác nhận | `src/core/scenario.mjs:85-88`; `echo-projection.mjs:144-169` | **Lệch tốc độ thời gian làm mục tiêu nhảy cóc `-53,80%` khi đổi bất kỳ cài đặt nào.** `observeSounder` trải cột theo `SOUNDER_COLUMN_SECONDS = 0.46 s/cột`, trong khi `advanceFcvPictureHistory` ở `1x/txRate=10` dịch `1 cột/tick`. Tại `simTick = 97` (120 cột), cá 31 cm đứng ở `x = 0,541667`; đổi `autoGainOffset` kích hoạt reset `projectionKey` khiến nó nhảy tức thì về `x = 0,003623` (**`-53,80%`** chính xác; `-53,81%` khi trừ hai số làm tròn 4 chữ số thập phân `0.5417→0.0036`) và 2 con cá kia biến mất (trên web 160 cột @ `simTick = 115`: **`-53,56%`**). |
| **BUG-04** | **P1** | Survey 2 `B4`, W3 mở rộng 30×9 | `src/devices/fcv588/model.mjs:873-970,1025-1041` | **Rò rỉ phím cứng qua `13/30` trạng thái overlay.** Các nhánh `menu`, `installation`, `fish-alarm*`, `func-*`, `range`, `gain`, `brill`, `mode`, `power-hold` chỉ chặn một phần phím, để lọt `MARK`, `GAIN`, `MODE`, `RANGE`, `FUNC`. **Live Chrome:** Đang mở Main Menu `Sounder`, bấm `MARK` vẫn tạo `WP001` phía sau, xoay `GAIN` đổi `Offset +1`, bấm `RANGE`/`MODE` phá hủy hoàn toàn menu. |
| **BUG-05** | **P1** | Survey 2 `B5`, W3 xác nhận | `web/app.mjs:446-454,571-577,954-955`; `display-widgets.mjs:12-35` | **`NAV1`/`NAV2` và `RECEIVER STATUS` bỏ qua `projectFcvCalibratedReadings` (`Draft`/`Temp`/`Speed`) và đơn vị tốc độ.** Với `draft=10, tempAdjust=+5, speedAdjust=+20%`: màn hình LF hiện `62.9 m`, `8.4 kn`, `23.0 °C`, còn NAV2 hiện thô `53.3 m`, `18.0 °C`, NAV1 hiện `7.0 kn`, và `RECEIVER STATUS` luôn đóng cứng đơn vị `"kn"` dù người dùng chọn `km/h`. |
| **BUG-06** | **P1** | Survey 2 `B6`, W3 xác nhận + đính chính | `src/core/scenario.mjs:24-31,69-73,169-170` | **Toàn bộ cá biến mất vĩnh viễn sau `46 s` (báo động) / `115 s` (sonar web 160 cột).** 3 đàn cá cố định tại `t = 8, 24, 42` không tuần hoàn theo chu kỳ trong khi `simTick` bắt đầu chạy ngay lúc `power="off"` (xác nhận trên Live Chrome sau 1,3 s). Học viên mở máy chậm quá `46 s` không bao giờ kích hoạt được báo động cá C01 nếu không nhấn Reset. *(Đính chính số học: kinh độ tàu tràn `>180°` ở đúng `simTick = 2.222.438` = `617,34 giờ`, không phải `~37.000`.)* |
| **BUG-07** | **P1** | W4 `B12` (mới) | `web/styles.css:167,175` | **Lỗi CSS Grid nghiền nát toàn bộ giá trị trên CẢ 5 nhóm Menu chính thành `:...` / `: Bot...`.** `.lcd-menu-row` đặt `grid-template-columns: minmax(0, 1fr) minmax(38px, auto)` nhưng `.lcd-menu-value` lại đặt `max-width: 48%`. Trong CSS Grid, `%` tính theo chính cột `auto` của phần tử nên mọi giá trị đều bị bóp còn 48% bề rộng tự nhiên của chính nó. **Kiểm chứng Live Chrome tại cả `1440×900` & `1366×768` xác nhận `0/50` giá trị chọn lựa đọc được trên toàn bộ 5 nhóm Menu chính** (`36/36` giá trị không trống bị cắt cụt `clientWidth < scrollWidth` + `14` ô trống: `Sounder` `0/13`, `Display` `0/15`, `Alarm` `0/7`, `Data` `0/5`, `System` `0/10`; xác nhận trực quan trên `P23_WHITE_LCD_MENU_1366x768_20261117.png`). |
| **BUG-08** | **P1** | W4 `B13` (mới) | `src/devices/fcv588/model.mjs:67-96`; `src/devices/fcv588/capabilities.mjs:35-37`; `web/lcd-presentation.mjs:221` | **`initialSettings()` bỏ sót `12` khóa chọn lựa đang hoạt động (tạo tổng `14` ô chọn lựa trống trên giao diện).** Phân tách chính xác: **`12` khóa đang hoạt động bị bỏ sót thực sự** (`Sounder` 6: `zoomMode`, `colorErase`, `clutter`, `whiteLine`, `whiteMarker`, `bottomZone`; `Display` 6: `colors`, `depthSize`, `zoomMarker`, `fishSymbol`, `fishSize`, `colorBar`) + **`1` khóa `D04` `System.language` đang bị vô hiệu hóa** (`= 13` khóa `undefined`), phân biệt với **`1` khóa `System.draft: null` fail-closed có chủ đích** (`model.mjs:78`, bắt buộc để `capabilities.mjs:35-37` trả về `BDS_DRAFT_MISSING`). Do `lcd-presentation.mjs:221` ẩn cả `undefined` lẫn `null`, **kết hợp với `BUG-07`, chính xác `0/50` giá trị chọn lựa trên cả 5 nhóm Menu chính (`0/13` Sounder) đọc được ở mặc định!** |
| **BUG-09** | **P1** | W3 `B12` (mới) | `src/core/lessons.mjs:112-128,233-244` | **Bài học `FCV588-LEARN-07` luôn chấm TRƯỢT `ACTION_WHILE_POWERED_OFF` khi làm đúng hướng dẫn tiếng Việt từ lúc tắt máy.** Dòng `236` miễn trừ `startupPower` cho kiểm tra phím thừa, nhưng dòng `240` **quên `!startupPower`**, nên cú nhấn `POWER` mở máy khớp `lesson.actions` khi `power==="off"` và lập tức phạt lỗi. **Tái hiện trên cả Node & Live Chrome** (`brightness=8`, `#lesson-result`: `"CHƯA ĐẠT: ACTION_WHILE_POWERED_OFF"`). |
| **BUG-10** | **P1** | W3 `B13` (mới) | `src/devices/fcv588/model.mjs:759-783,873-970`; `web/hold-input.mjs:24` | **Overlay `power-hold` hoàn toàn không được bảo vệ; giữ `>3 s` không bao giờ tự tắt.** Mọi phím (`MENU/ESC` + 7 phím cứng) đều phá `power-hold`, làm mất vĩnh viễn `priorOverlay` và lệch đồng bộ với `session.heldControls.power` khi nhận `cancel`. Đồng thời gửi `ui-tick 5000 ms` vẫn giữ `power:"on", remainingMs:0` vô hạn tới khi nhả tay (và đồng hồ đếm `ui-tick` lệch với `performance.now()`). |
| **BUG-11** | **P1** | W3 `B14` (mới) | `src/devices/fcv588/model.mjs:908-919,976-979` | **Xoay `GAIN` khi hộp thoại Auto Gain đang mở làm biến đổi trực tiếp trạng thái sống rồi bị `ENTER` xóa sạch về `0`.** Dòng `910` ghi thẳng vào `state.autoGainOffset` thay vì `overlay.offset` (kể cả khi `overlay.mode === "off"`!), sau đó nhấn `ENTER` (dòng `977`) ghi đè `overlay.offset` (`0`). **Tái hiện Live Chrome:** Push `GAIN` → xoay `+3` (`"Offset +3"`) → bấm `ENTER` (giật về `"Offset 0"`). |
| **BUG-12** | **P2** | Survey 2 `B7`, W3 & W4 xác nhận | `src/devices/fcv588/echo-projection.mjs:334-360` vs `:257-259` | **`projectFcvZoom` bỏ quên `fishSizeAdjust`, lệch/rơi biểu tượng cá ở Bottom Lock và tạo sọc mã vạch.** Với `fishSizeAdjust="+50%"`: khung thường hiện `[36, 65] cm` còn khung Zoom hiện thô `[43] cm`. Trên đáy gợn sóng Bottom Lock, đàn cá có đỉnh hồi âm `244` tại `col=42, row=64` bị rơi hoàn toàn (`syntheticFish.length === 0`). Lấy mẫu nearest-neighbor từ `120` hàng `base.pixels` (thay vì `301` hàng thô) khiến Zoom `300 m → 5 m` chỉ còn **2 mức màu khác nhau** trên cả 120 hàng. |
| **BUG-13** | **P2** | Survey 2 `B8`, W3 xác nhận | `src/core/scenario.mjs:177`; `src/devices/fcv588/model.mjs:114,641-643,753,797,831-850`; `web/lcd-presentation.mjs:170-189`; `src/devices/fcv588/alarms.mjs:3-4` | **Bất nhất trong hệ thống Báo động (3 lỗi P2 + 1 biên reducer + 1 giới hạn `HOLD`):** **(a)** Đóng cứng `bottomType: "Rock"` dù kịch bản là đáy bùn (`Mud=0.8`); **(b)** so sánh giá trị thô chưa hiệu chuẩn (`ALARM3/4/5` vẫn kêu dù giá trị hiệu chuẩn nằm ngoài ngưỡng); **(c) [biên tầng reducer]** tắt `ALARM1..5` khi thế giới tạm dừng để `state.alarms.activeIds`/`audible` thô tại `model.mjs:753` trễ tới tick sau *(ghi nhận công bằng: `web/lcd-presentation.mjs:170-189` `projectFcvAlarmPresentation`, được `web/app.mjs:362,578` gọi, đã lọc V30 giúp ẩn ngay biểu ngữ báo động trên LCD với `activeIds: []`)*; **(d)** `txPower="Off"` xóa hồi âm nhưng số đo sâu & báo động vẫn hoạt động; **(e) [giới hạn phạm vi `HOLD` đã công bố, không tính là lỗi code]** `soundChoice` (`Sound1..3`) không phát âm thanh phù hợp với tuyên bố minh bạch tại `src/devices/fcv588/alarms.mjs:3-4` (*"No beeper or other actual physical alarm interface is driven by this module"*) và `docs/evidence/fcv588-public-implementation-status.json` (`C04`: *"OEM timings/sound source HOLD"*). |
| **BUG-14** | **P2** | Survey 2 `B9`, W3 & W4 xác nhận | `web/fcv588-echo-rasterizer.mjs:77-116`; `web/app.mjs:204-220` | **Lỗi bộ raster & lớp phủ đáy biển:** (a) Tạp âm bề mặt bị khóa theo `coherentBottom !== null`, nên chuyển sang dải `20 m` (đáy ngoài khung) làm điểm ảnh tạp âm sụt từ **`11.020 → 57` px**; (b) thiếu `?? 0` trên `frame.startDepthM` (`L89`) sinh `NaN` (`11.020 → 23` px); (c) `White Line` vẽ vạch thẳng ngang (và bị cắt ngoài canvas tại `y=640..643` trong Bottom Lock) cùng `Bottom Zone` chữ nhật phẳng không bám đường đáy. |
| **BUG-15** | **P2** | Survey 2 `B10`, W3 xác nhận | `src/core/scenario.mjs:141-147` | **`sounderSourceRowForDepth(obs, -5)` trả về chỉ số âm `-5`** (thiếu kẹp cận dưới `0`). |
| **BUG-16** | **P2** | W3 `B15` (mới) | `src/devices/fcv588/model.mjs:788-791,859` | **Báo động ma sống sót qua `POWER OFF` và nháy 1 tick sau khi bật lại.** Tắt máy không xóa `state.alarms`, còn tick khởi động thứ 4 trả về sớm trước khi đánh giá lại báo động (tái hiện: `ALARM2` kích hoạt ở `t=8`, tắt máy tới `t=62` không còn cá, bật lên vẫn nháy `["ALARM2"]`). |
| **BUG-17** | **P2** | W3 `B16` (mới) | `src/devices/fcv588/model.mjs:720-742` | **Bật/tắt fixture `navigation` để `syntheticConditions.speedKn` cũ tới tick sau.** Dòng `728-737` chỉ cập nhật khi đổi `virtualMounting`, làm sai khóa tốc độ `0..10 kn` của Bottom Discrimination khi giảng viên tạm dừng phiên. |
| **BUG-18** | **P2** | W3 `B17` (mới) | `src/devices/fcv588/model.mjs:126-132,954-956` | **`Restore Defaults` không đặt lại `vrmVisible`/`vrmDepthM`/`mode`** (và khi VRM đã bật, không có bất kỳ thao tác học viên nào ẩn được VRM trừ nút Reset của giảng viên); đồng thời `FUNC → WPT List → MENU` thoát sang Main Menu `Data` thay vì quay về màn hình sonar. |
| **BUG-19** | **P2** | W3 `B19` (mới) | `web/styles.css:489,515`; `web/index.html:2,18,44-99` | **Lỗi tiếp cận mobile & WCAG 3.1.2 (Live Chrome):** Trên `360×800`, **3/39** control hiển thị trượt ngưỡng chạm `≥44×44 px`: `#archive-envelope-file` (`269–284×20 px`), `#archive-sidecar-file` (`269–284×20 px`, dao động nhẹ theo thanh cuộn/padding Chrome; đều trượt `≥44×44 px`), `#archive-timeline-range` (`133×16 px`). Ngoài ra **14/14** phần tử tiếng Anh trên mặt máy/LCD/banner thiếu `lang="en"` trong `<html lang="vi">`, và `web/styles.css` có **0** luật `@media (prefers-reduced-motion)` / `@media (forced-colors)`. |
| **BUG-20** | **P2/P3** | W3 `B18`, Survey 3 `D-14` | `src/devices/fcv588/settings.mjs:68-106`; `web/fcv588-archive-import.mjs:23`; `src/core/lessons.mjs:66-88,233-235` | **4 lỗi biên tương thích & bài học:** (a) Thiếu bộ giải mã cài đặt `profile20` (`F1-public-reference-20`); (b) giới hạn `30.000` nút JSON chặn archive `restore-settings` hợp lệ chỉ có `275` sự kiện (`789.950 B < 1 MiB`); (c) `LEARN-05` thiếu điều kiện kiểm tra `tankenmaruOption:false`; (d) trượt tay hủy (`cancel`) nút `POWER` lúc tắt máy làm hỏng vĩnh viễn mọi bài học `LEARN-01..07` với `UNEXPECTED_OPERATOR_ACTIONS`. |
| **BUG-21** | **P3** | Survey 2 `B11`, W3 & W4 | `model.mjs:1034-1037`; `receiver-status.mjs:16`; `echo-projection.mjs:231`; `lessons.mjs:168-170`; `web/app.mjs:461`; `apps/.../main.cjs:139-140` | **6 lỗi góc cạnh nhẹ:** (a) `MARK` hỏng vĩnh viễn từ `WP1000` (`"MARK 1000"` dài 9 > 8 ký tự); (b) `receiver-status.mjs:16` quên kiểm tra `tankenmaruOption`; (c) `RezBoost Standard` và `Enhanced` cho điểm ảnh giống hệt 100%; (d) xóa waypoint có sẵn trong `LEARN-03` trả `INVALID_LESSON_BOUNDARY`; (e) `NAV2` đóng cứng dải sonar 50 kHz LF thay vì HF như ảnh thật; (f) Electron `main.cjs:139-140` gọi `requestSingleInstanceLock()` mà thiếu handler `second-instance` để đưa cửa sổ cũ lên trước. |

#### Ma Trận Kiểm Chứng Đầy Đủ 30 Trạng Thái Overlay × 9 Phím Cứng (`BUG-04`, `BUG-10`, `BUG-11`)

Tất cả 28 loại `overlay.kind` (cộng thêm trạng thái đang sửa `menu-editing`, `installation-editing` = **30 trạng thái**) đã được truy cập qua chuỗi `dispatch()` hợp lệ và chọc dò bằng cả 9 phím/núm vật lý:

| Nhóm Overlay | Số trạng thái | Danh sách trạng thái | Phím cứng bị rò rỉ (tái hiện thực nghiệm) |
|---|---:|---|---|
| **Main / Nested Menus** (`model.mjs:873-899`) | 6 | `menu`, `menu-editing`, `installation`, `installation-editing`, `fish-alarm`, `fish-alarm-setting` | **7 phím rò:** `mark` (tạo WP), `range`, `gainPush`, `gainRot` (sửa gain sống), `modeRot`, `funcShort`, `funcLong` (phá hủy overlay) |
| **FUNC Overlays** (`model.mjs:878-882`) | 2 | `func-program`, `func-setting` | **5 phím rò:** `mark`, `range`, `gainPush`, `gainRot`, `modeRot` |
| **Control Dialogs** (`model.mjs:901-1041`) | 4 | `range`, `gain`, `brill`, `mode` | Rò `mark`, `gainRot` (sửa cả khi mở chính hộp thoại `gain`!), `funcShort`, `funcLong`, và các hộp thoại đè lên nhau |
| **Power Hold** (`model.mjs:776-783`) | 1 | `power-hold` | **Rò toàn bộ 7 phím + `MENU/ESC`** (xóa trắng `priorOverlay`, lệch `heldControls.power`) |
| **Special Overlays** (`moveSpecialOverlay`, `model.mjs:883-889`) | 17 | `range-bank`, `window-size`, `calibration`, `units`, `nav-boxes`, `receiver-status`, `tankenmaru-details`, `diagnostics`, `lcd-test`, `confirm-restore`, `trip-status`, `confirm-trip-reset`, `waypoints`, `waypoint-detail`, `waypoint-name`, `confirm-waypoint-delete`, `confirm-delete-all-waypoints` | **0 rò rỉ** (cô lập sạch toàn bộ phím ngoài `menu`/`enter`/`pad`) |
| **TỔNG KẾT** | **30** | **13/30 trạng thái rò rỉ (43,3%)** vs **17/30 trạng thái an toàn (56,7%)** | Cần hợp nhất toàn bộ 30 overlay qua một bộ chặn modal thống nhất |

---

### 2.3 Review Độ Trung Thực Trực Quan (8 Ảnh Thực Tế vs 12 Ảnh Mô Phỏng)

Đối chiếu trực tiếp toàn bộ **8 ảnh chụp phần cứng FURUNO FCV-588 thật trên tàu** (`sources/FCV588_GiaoDienThucTeMay2016/{giaoDien,lf,hf,dual,zoom,zoom2,nav1,nav2}.jpg`, máy cài giao diện tiếng Việt, độ sâu ~`19,3–20,0 m`, `MAN_R 20 m`, `Shift 2.0 m`, `Gain 10`, nền Trắng ban ngày, điện áp `13.5–13.7 V`) với **12 ảnh chụp màn hình mô phỏng** (`P23_WHITE_LCD_*`, `P28_DUAL`, `P31_NATIVE_POWER_FOCUS`, `P36_STAGE_{LF,HF}_ZOOM`):

| # | Hạng mục trực quan | Ảnh FCV-588 thực tế (2016) | Trình mô phỏng hiện tại (`P23`/`P28`/`P31`/`P36`) | Đánh giá độ trung thực |
|---|---|---|---|---|
| 1 | **Viền máy & Bố cục phím vật lý** | Logo `FURUNO` rộng nằm **trong dải kính đen phía trên LCD**; `MENU/ESC` + TrackPad + `ENTER` gọn thành một cụm tròn; `GAIN` có `-/+` hai bên & `PUSH TO AUTO` cong **bên dưới**; `MODE` chữ nằm **dưới** núm; nút nguồn xanh hình **viên thuốc ngang chứa chữ `BRILL` bên trong**. | Đủ danh sách phím và tỷ lệ dọc (`233:270`), nhưng cụm `MENU/TrackPad/ENTER` tách rời quá xa; `GAIN PUSH TO AUTO` xếp chồng phía trên không có `-/+`; nhãn `MODE` nằm trên núm; nút nguồn tròn có chữ `BRILL` **nằm ngoài bên phải** (`styles.css:310-311`). | **Trung bình** (nhận ra dáng máy, sai hình học/vị trí nhãn) |
| 2 | **Bảng màu LCD** | Nền trắng ban ngày sắc nét (`#FFFFFF`), chữ độ sâu đen có viền trắng (halo), nền đáy nâu sẫm với đuôi nhiều màu. | Mặc định là nền **Blue** (`model.mjs:75`); bảng `White` (P23) sáng rõ và tự đổi màu chữ đạt chuẩn WCAG. | **Trung bình–Khá** (nên cân nhắc mặc định/tiêu đề) |
| 3 | **Thanh tiêu đề (Header Info Bar)** | **Thanh nền xanh dương đặc** tách bạch hoàn toàn chữ `MAN_R G:10 ... 13.5V` khỏi cột nước; có số dịch sâu `2.0` ngay dưới thanh xanh; trên `NAV1`/`NAV2` thanh xanh hẹp nằm riêng trên dải sonar phải. | Thứ tự token tốt (`LF/HF`, `BL-LF`, `BZ-HF`), **nhưng không có thanh nền xanh** — chữ `.screen-top` trôi trực tiếp lên tạp âm cam/vàng làm giảm độ rõ; `MAN.R` (dấu chấm thay vì gạch dưới); bật `Battery` tạo ô trống không có số V; `NAV1`/`NAV2` ẩn luôn header; thiếu số `Shift`. | **Trung bình** |
| 4 | **Thước độ sâu, Số đo sâu & `[DEMO]`** | Vạch chia lớn (`5-`, `10-`, `15-`, `20-`) **kèm vạch chia phụ mỗi 1 m / 0,2 m** bám khít đáy; số độ sâu cực lớn (~22% chiều cao) có viền trắng, **nằm vắt ngang vạch chia giữa** ở `DUAL` & `ZOOM`. | **`BUG-02` lộ rõ trên mọi ảnh:** `0 m` tụt xuống dưới tạp âm; **`[DEMO]` đè trực tiếp lên mốc `80 m`**; `BL`/`BZ` đặt số độ sâu lệch góc trái dưới thay vì chính giữa vạch chia; thiếu vạch chia phụ; phông chữ Consolas nhỏ không viền. | **Thấp–Trung bình** (lỗi căn chỉnh rõ rệt) |
| 5 | **Chia đôi `LF` / `HF` / `DUAL`** | `LF` có tạp âm mặt dày + dải đáy dày nâu sẫm; `HF` nước sạch + vỏ đáy mỏng uốn lượn rõ đuôi nhiều màu. | Đúng trái=LF / phải=HF và tương phản tạp âm mặt, **nhưng hình thái đáy LF và HF giống nhau 100% từng khối bậc thang cam-đỏ**. | **Trung bình** |
| 6 | **Bottom Lock & Bottom Zoom** | `BL-LF`/`BL-HF` phẳng đáy sát vạch `0-` (chia `0→5` mỗi `0,2 m`), hồi âm sát đáy nét, **biểu tượng cá xanh quay trái + số đỏ (`10`, `14`)** khớp cả hai khung. | Khung trái Bottom Lock tạo **sọc mã vạch xanh dọc nặng** (upsampling ~7,5 hàng từ 120 hàng — `BUG-12`), đường đáy phẳng lơ lửng ~20% phía trên vạch `0 m`, `BL-LF` gần như y hệt `BL-HF`, `P36` Bottom Zoom vỡ hạt mạnh kèm hộp chữ nhật `Bottom Zone` cắt ngang. | **Thấp–Trung bình** |
| 7 | **Bố cục `NAV1` / `NAV2`** | 2/3 trái là các ô trắng chữ cực lớn (`NAV1`: `Vi tri` + `Do sau` theo cấu hình tùy chỉnh trên tàu chụp; `NAV2`: 4 ô `STW`, `SOG`, `Vi tri`, `Do sau`), thiếu cảm biến hiện **dấu gạch ngang** (`--.- kn`), `NAV1` phải = LF, **`NAV2` phải = HF**. | Đúng tỷ lệ 2/3–1/3; ghi nhận công bằng rằng `src/devices/fcv588/navigation.mjs:119-121` tuân theo **mặc định nhà sản xuất FURUNO OME-23890-E §1.4.4** (`NAV1`: `STW` + `WIND`; `NAV2`: `Depth` + `Temp` + `Trip` + `Odometer`, còn `nav1.jpg` hiển thị bộ ô NAV1 đã được tàu tùy chỉnh). Tuy nhiên chữ `"NO DATA"` nhỏ để trống ~70% diện tích khi chưa bật fixture, **`NAV2` ép dải sonar 50 kHz LF** (`web/app.mjs:461` — `BUG-21`), và bỏ qua hiệu chuẩn (`BUG-05`). | **Thấp–Trung bình** |
| 8 | **Menu chính & Ngôn ngữ** | Menu 2 cột nền tiêu đề xanh, toàn bộ 11 giá trị inline đọc sắc nét (`Xoa mau :0%`, `Nhieu tap :60%`, `Duong trang :Bien`), giao diện **tiếng Việt**, số `19.3 m` rõ phía dưới. | Đúng bố cục 2 cột và thứ tự 13 mục AP-1 (P14), **nhưng `BUG-07` + `BUG-08` phá nát toàn bộ cột giá trị trên cả 5 nhóm menu (`0/50` giá trị chọn lựa đọc được, gồm `0/13` Sounder)**; `D04` khóa tiếng Anh; `White Line` chỉ `Off`/`On` thay vì `Bien` (`Edge`). | **Thấp** (đang hỏng trực quan) |
| 9 | **White Line, BDS, A-Scope & Cá** | `Duong trang: Bien` bám khít đường cong đáy; cá xanh + số đỏ nổi bật xuyên suốt. | `White Line` & `Bottom Zone` là vạch/hộp thẳng ngang (`BUG-14`); `BDS` tỷ trọng cố định; 3 đàn cá tắt sau 115 s (`BUG-06`); `A-Scope` sạch và ổn. | **Thấp–Trung bình** |

> **Phát hiện quy trình quan trọng từ đối chiếu ảnh:** Kho mã chứa tới **1.139 ảnh PNG** kiểm tra hồi quy, nhưng quy trình tự động chỉ kiểm tra **tính bất biến SHA-256** (pixel lần sau giống lần trước) chứ **không kiểm định tính đúng đắn thị giác** — dẫn tới việc lỗi `BUG-07`+`BUG-08` (toàn bộ menu thành `:...`) và `[DEMO]` đè mốc `80 m` tồn tại ngay trong ảnh bằng chứng `P23_WHITE_LCD_MENU` đã được "đóng dấu PASS"!

---

### 2.4 Review Giao Diện, UX, Khả Năng Tiếp Cận (A11y) & Quốc Tế Hóa (i18n)

**Điểm mạnh đã kiểm chứng trên Live Chrome (`1440×900` & `360×800`):**
- Cấu trúc ngữ nghĩa sạch: `0` trùng ID, `0` trường nhập thiếu nhãn, thứ bậc tiêu đề hợp lệ (`H1 → H2 → H3 → H4`), `11` vùng sống (`role="status"`, `8` `aria-live="polite"`, `3` `aria-atomic="true"`), 5 tab ARIA D15 hoạt động chuẩn, vòng tiêu điểm `:focus-visible` `3px solid #ffc564` rõ ràng.
- Độ tương phản: **11/11 cặp màu** lấy mẫu đạt chuẩn WCAG AA `≥ 4,5:1` (từ `4,65:1` ở `.device-roadmap div` tới `14,43:1` ở `.hardware-key`).
- Bố cục mobile `360×800`: `scrollWidth = 360 === innerWidth` (**`0 px` tràn ngang**), hiển thị cảnh báo bố cục phi-OEM, **36/39** control hiển thị (bao gồm toàn bộ **16/16 phím mặt máy/TrackPad/trợ giúp ±**) đạt kích thước chạm `≥ 44×44 px`.
- Trên Windows Desktop: P31 đã chứng minh bật `app.setAccessibilitySupportEnabled(true)` giúp mở khóa cây UIA native (**90 phần tử con**, thứ tự Tab `GAIN → MODE → POWER`), và P35 đã sửa `aria-label` nút `POWER/BRILL` trên bản web gốc.

**Các lỗ hổng A11y / UX / i18n nghiêm trọng:**
1. **Menu mặc định không thể đọc (`BUG-07` + `BUG-08`):** Học viên mở bất kỳ nhóm nào trong cả 5 nhóm Menu chính đều không thấy giá trị chọn lựa hợp lệ nào (**`0/50` giá trị chọn lựa đọc được**, gồm `0/13` Sounder: `36/36` bị cắt cụt `:...` + `14` ô trống).
2. **Trượt mục tiêu chạm trên Mobile (`BUG-19`):** **3/39** control trong tab Archive không đạt `44×44 px`: `#archive-envelope-file` (`269–284×20 px`), `#archive-sidecar-file` (`269–284×20 px`, dao động nhẹ theo thanh cuộn/padding Chrome; đều trượt `≥44×44 px`), `#archive-timeline-range` (`133×16 px`).
3. **Vi phạm WCAG 3.1.2 (Language of Parts — `BUG-19`):** Tài liệu khai báo `<html lang="vi">` (`web/index.html:2`) nhưng **14/14** phần tử tiếng Anh trên mặt máy, LCD, banner (`FURUNO`, `MENU/ESC`, `GAIN PUSH TO AUTO`, `AUTO_R G:AF LF x1`, `PUBLIC REFERENCE / NOT HARDWARE VALIDATED / TRAINING ONLY`, ...) **không có thuộc tính `lang="en"`**, gây đọc sai hoàn toàn trên trình đọc màn hình tiếng Việt/Narrator.
4. **Thiếu tùy chọn giảm chuyển động & tương phản hệ thống:** `0` quy tắc `@media (prefers-reduced-motion)` hay `@media (forced-colors: active)` trong `web/styles.css`. Mục menu bị vô hiệu hóa (`.lcd-menu-row[aria-disabled="true"]`) hòa trộn chỉ còn tương phản `~3,21:1`.
5. **Rào cản kiểm định giọng đọc Narrator/NVDA:** P34 xác nhận không có kênh tự động an toàn quyền riêng tư để kiểm tra lời đọc của Narrator trên Windows bản cũ (`18363`/`19045`), và cổng nghe kiểm định trực tiếp bởi người dùng (`P32_NARRATOR_HUMAN_ACCEPTANCE`) vẫn ở trạng thái `BLOCKED_HUMAN_SPEECH_CONFIRMATION`.
6. **Chấm bài quá cứng nhắc & `D04` chưa có tiếng Việt:** `lessons.mjs:236-239` phạt trượt bài nếu học viên lỡ nhấn quá một bước rồi bấm mũi tên quay lại sửa; `D04 Language` khóa cứng tiếng Anh trong khi máy FCV-588 thực tế ở Việt Nam vận hành giao diện tiếng Việt (`giaoDien.jpg`); yêu cầu ngầm **Chromium ≥ 105** (`cqw`/`:has()`) chưa được ghi nhận trong tài liệu.

---

### 2.5 Review Hiệu Năng & Khả Năng Mở Rộng (Node + Live Chrome Benchmarks)

Đo kiểm thực nghiệm trên Node `v22.23.5` và Headless Chrome `158` phát hiện **5 điểm nghẽn hiệu năng mang tính nhân bội** (vô hình trong các unit test 20 sự kiện nhưng gây treo UI nghiêm trọng ở phiên học thực tế):

#### 1. Mở rộng nhật ký sự kiện & Chi phí `dispatch()` (`src/core/session.mjs:51,54,114`)

| Số tick (`N`) | `events.length` | Tổng `dispatch` (ms) | TB µs/tick | 100 tick cuối (µs/tick) | Heap Δ (MB) | `createReplayEnvelope` (ms / bytes) | `replay()` (ms) | Thuần `[...arr, i]` (ms) |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `100` | `103` | `26,31` | `263,11` | `259,48` | `0,03` | `1,22` / `7.042 B` | `26,96` | — |
| `1.000` | `1.003` | `184,14` | `184,14` | `183,12` | `0,13` | `10,57` / `65.550 B` | `189,34` | `3,41` |
| `3.600` (1 h) | `3.603` | `655,36` | `182,04` | `173,44` | `0,33` | `36,10` / `239.750 B` | `820,11` | `20,29` |
| `7.200` (2 h) | `7.203` | `1.655,13` | `229,88` | `217,03` | `0,39` | `87,38` / `480.950 B` | `1.438,45` | `65,34` |
| `14.400` (4 h) | `14.403` | **`3.269,82`** | `227,07` | **`363,67`** | — | — | — | **`756,77`** *(tăng 11,58× cho 2× N!)* |

- **Phát hiện gốc rễ vượt trên `O(N²)`:** **`55,8%–93,7%` (đại diện `~71%`, tức `130,07 µs` / `182 µs`, dao động theo trạng thái khởi động V8 JIT từ `55,8%` sau JIT @ `N=3.600` tới `93,7%` khi đang làm nóng JIT @ `N=1.000`) CPU nền của mỗi lệnh `dispatch()` bị lãng phí vào việc tuần tự hóa và tính lại FNV-1a trên hai hằng số đóng băng bất biến ở MỌI SỰ KIỆN**: `adapterProfileHash(adapter)` = `102,64 µs` (`session.mjs:51`) + `fingerprint(scenario)` = `27,43 µs` (`session.mjs:54`). Từ mốc `N > 7.200`, phép sao chép mảng `events: [...session.events, event]` (`session.mjs:114`) chạm vách đá `O(N²)` do V8 old-space GC bão hòa (**`756,77 ms`** tại `N = 14.400`).

#### 2. Các Điểm Nghẽn Đồng Bộ Trên Luồng Chính (Main-Thread Bottlenecks)

| Điểm nghẽn (`file:line`) | Cơ chế lãng phí | Số đo thực nghiệm (Node & Live Chrome) | Hệ số cải thiện khả thi |
|---|---|---|---|
| **Mã hóa cài đặt mỗi tick** (`web/app.mjs:103-114,134`) | Gọi `encodeFcvSettings()` (duyệt 106 khóa + `stableSerialize` + FNV-1a + `JSON.stringify`) ở mọi `tick` 1 Hz và `ui-tick` 4 Hz thay vì so sánh tham chiếu `settings !== lastRef`. | `190,51 µs/lần` vs `0,0152 µs` so sánh tham chiếu = **lãng phí `12.496×`**. | **~12.000×** (sửa 3 dòng) |
| **Raster hóa lại Canvas 4 Hz khi mở hộp thoại** (`web/app.mjs:142-172,1474`) | Mỗi `ui-tick` 250 ms vẽ lại toàn bộ `320×480` RGBA (×2 trong `DUAL`/`ZOOM` = `307.200` pixel + 2 `ImageData`) dù `simTick` và `projectionKey` không hề đổi. | Node: `15,55 ms` (đơn kênh), **`32,99 ms` (`p95 43,94 ms`) ở `DUAL`** (`13,19%` CPU ở 4 Hz). Live Chrome: **`7,78` lần `putImageData`/giây** khi `simTick` đứng yên (`90,41 ms`/lượt click `DUAL`). | **Loại bỏ 100%** lượt vẽ thừa khi chỉ có `ui-tick` |
| **Nhập Archive 2.000 sự kiện đóng băng UI** (`web/app.mjs:1383-1432`, `web/fcv588-archive-bz-viewer.mjs:71-78`, `web/fcv588-archive-timeline.mjs:26-55`) | Chạy đồng bộ **6 lần full replay = 12.000 lệnh `dispatch()`** trên luồng chính (`1×` import `362,48 ms` + `2×` BZ viewer `821,58 ms` + `2×` timeline `686,27 ms` + `1×` bước cuối `402,14 ms`). | Đóng băng luồng chính **`2.272,47 ms` (Node)** / **`1.653,23 ms` (Live Chrome)**. Mỗi bước kéo thanh timeline: **`373,03 ms` (Node) / `326,61 ms` (Chrome)** ở bước 1.999. | **~15×–25×** (`<150 ms` bằng 1× replay + `WeakMap` hash + checkpoint mỗi 100 bước) |
| **Chấm bài học lặp 4 lượt / 3× dispatches** (`src/core/lessons.mjs:181-247`) | Replay toàn bộ `0..N`, lặp dựng `prefixSession` `0..startSeq`, replay lại `prefixSession`, rồi dispatch `startSeq..N` = `2N + startSeq` dispatches. | Tại `N = 3.600` (1 h, `startSeq = 3.597`): **`1.892,04 ms`** (`10.797` dispatches, gấp **`2,96×`** so với 1 lượt replay `639,80 ms`). | **~10×** (1 lượt replay + `WeakMap` hash) |

---

### 2.6 Review Bộ Kiểm Thử (`102` Node + `3` Python + `9` Fixtures) & Công Cụ (`35` `tools/*`)

#### Phân Loại 4 Nhóm Của Toàn Bộ 102 Tệp Test Node (`618` Tests, `3.594` Assertions, `11.920` LOC)

| Phân loại chính | Số tệp | % Tệp | Số test chạy | % Test | Tổng `assert.*` | Raw Code-Text Asserts | Raw Doc-Text Asserts |
|---|---:|---:|---:|---:|---:|---:|---:|
| **(a) Hành vi / Máy trạng thái / Toán học / Miền** | **63** | 61,8% | **424** | 68,6% | **2.376** | 109 *(trong 22 tệp lai)* | 0 |
| **(b) Tất định Replay / Tương thích / Fixture Snapshot** | **12** | 11,8% | **66** | 10,7% | **464** | 52 *(trong 5 tệp lai)* | 0 |
| **(c) Regex / So khớp chuỗi mã nguồn là chính** *(9 thuần + 5 trội)* | **14** | 13,7% | **78** | 12,6% | **384** | **307** *(79,9% nhóm)* | 0 |
| **(d) Quản trị / Sổ cái / Link kế hoạch / `.gitignore` / Tài sản** | **13** | 12,7% | **50** | 8,1% | **370** | 3 *(2 tệp)* | **85** *(5 tệp)* |
| **TỔNG CỘNG (`test/*.test.mjs`)** | **102** | **100%** | **618** | **100%** | **3.594** | **471** *(13,1%)* | **85** *(2,4%)* |

- **Sự phụ thuộc cao vào kiểm tra chuỗi văn bản thô:** **46/102 tệp (45,1%)** thực hiện **`556/3.594` assertion (15,5%)** bằng cách đọc mã nguồn/HTML/CSS/Markdown thành chuỗi văn bản rồi chạy regex — bao gồm **9 tệp thuần regex (0 import runtime**, 44 test, 217 assert như `fcv588-public-browser.test.mjs` 92/92 assert) và **1 tệp dùng `new Function()`** cắt thân hàm `drawChannel` từ `web/app.mjs` (`test/fcv588-public-channel-labels.test.mjs:11-16`).
- **3 tệp Python (`13/13 PASS`, 218 LOC) & 9 JSON fixtures (`test/fixtures/`, 1.053 LOC):** `test_fcv588_visual_atlas.py` chỉ gọi `atlas.build()` trong bộ nhớ thay vì `--check`, nên vượt qua 6/6 dù SHA trên đĩa bị vỡ do CRLF→LF! Trong 9 fixture (6 `profile21`, 1 `profile22`, 2 `profile19`), hoàn toàn **thiếu fixture `profile20`**.

#### Giải Thích Gốc Rễ: Tại Sao 618 Test PASS Vẫn Lọt Toàn Bộ `BUG-01`–`BUG-21`?

1. **Regex thay thế cho kiểm thử hành vi tích hợp (lọt `BUG-01`, `BUG-02`, `BUG-05`, `BUG-07`, `BUG-14`):** `fcv588-public-panel.test.mjs:84` chỉ kiểm tra regex `/state\.autoGainOffset/` thay vì gọi `projectFcvEcho()`; `web-layout.test.mjs:35` chỉ kiểm tra chuỗi `projectFcvManualNavBoxes` có mặt trong `web/app.mjs` mà không kiểm tra tham số truyền vào bị thiếu hiệu chuẩn; `fcv588-public-channel-labels.test.mjs:21,34` mock rỗng `drawImage(){}` và thậm chí **khóa cứng `scale[0].y >= 58`** mà không kiểm tra lệch với ảnh sonar ở `y=0`; 0 test đọc `getBoundingClientRect` thực tế của `.lcd-menu-value` nên không thấy CSS Grid `max-width: 48%` nghiền nát chữ.
2. **Test tách rời từng hàm chiếu và không kiểm tra bất biến liên khung (lọt `BUG-08`, `BUG-12`, `BUG-13`, `BUG-15`, `BUG-21`):** Toàn bộ 27 lần gọi `projectFcvZoom()` không bao giờ truyền `fishSizeAdjust !== "0"`; `evaluateFcvAlarms()` được test bằng mock `{bottomType: "Sand"}` thay vì gọi `observeTrainingStatus()` trên kịch bản đáy bùn; `sounderSourceRowForDepth` và `effectiveGain` có **0 bài test trực tiếp**; `RezBoost` chỉ so `"Off"` vs `"Enhanced"`, không bao giờ so `"Standard"` vs `"Enhanced"`; không test nào kiểm tra `initialSettings()` có đủ 100% khóa choice trong `menu-atlas.mjs`.
3. **Kịch bản ngắn (`simTick ≤ 24`) & thiếu ma trận ngắt phím toàn diện (lọt `BUG-03`, `BUG-04`, `BUG-06`, `BUG-09`, `BUG-10`, `BUG-11`, `BUG-16`–`BUG-20`):** Test báo động cá dừng ở `t=8`, test ACCU-FISH dừng ở `t=24` (`0` test chạy quá `simTick > 46`); `0` test kiểm tra `SOUNDER_COLUMN_SECONDS` hay reset `projectionKey` tại `t=97`; test ngắt menu chỉ thử `power` và `training-fixture`, chưa từng gửi `MARK`/`GAIN`/`MODE`/`RANGE`/`FUNC` vào 30 trạng thái overlay; `LEARN-07` chỉ được test từ trạng thái đã bật máy (`power="on"`).

#### Kiểm Toán Toàn Bộ 35 Công Cụ (`tools/*`, `8.776` LOC)
- **Trùng lặp lớn:** Toàn bộ 21 script `fcv588_*.py` (`6.834` LOC) có **40,1% dòng trùng lặp nguyên văn**; riêng 13 script ghi ngày `V34`–`V36` (`*_20261018.py`, `3.824` LOC) trùng lặp tới **52,1%** (ví dụ `v35_canonical_server` vs `v36_canonical_server` giống nhau **96,7%**, `v35_compat_browser` vs `v36_legacy_compat_chrome` giống nhau **96,3%**).
- **Khóa cứng Windows (14/14 Chrome launcher):** **14/14 script mở Chrome Playwright** lệ thuộc `C:\Program Files\Google\Chrome\Application\chrome.exe` (7 khai báo trực tiếp + 7 nhập `DEFAULT_CHROME`), và **13/14 không có cờ `--chrome`**; `historical_stage_coldstore.py:141,154,333,341` gọi thuộc tính Win32 `st_file_attributes` gây crash trên Linux; 3 script `.ps1` đòi PowerShell + NTFS junction; `fcv588_v36_canonical_a11y_chrome_20261018.py:108` gây `SyntaxWarning: invalid escape sequence '\d'` trên Python 3.12.
- **Hiệu ứng phụ nguy hiểm ở mức top-level (4/5 tệp `.mjs`):** Khác với `verify_public_runtime_assets.mjs:43`, việc chỉ `import` `tools/build_fcv588_public_menu.mjs:27-35` hoặc `build_fcv588_public_acceptance.mjs:132-142` mà không có cờ `--check` sẽ **lập tức ghi đè tệp JSON sổ cái trên đĩa** (và ghi đè `fcv588-public-implementation-status.json` sẽ làm **hỏng ngay test V48**!). Ngoài ra `archive_reference_manuals.py` còn chạy gọi mạng scrape HTTPS ngay cả trong chế độ `--dry-run` (`L301-313`), 3 chỗ mở tệp không có `with` (`L208,224`, `verify_reference_manuals.py:50`), và trùng tên sau sanitize tạo lỗi đếm `24` thay vì `23` PDF.

---

### 2.7 Review Ứng Dụng Desktop Electron (`P29`–`P36`)

Kiểm toán toàn bộ 100% các tệp độc nhất trong `apps/fcv588-electron-p30/` (`17` `desktop/*` + `2` `web/desktop-settings*.mjs` + `package.json`) và `staging/fcv588-native-accessibility-p31-20261121/` (`7` tệp độc nhất) cùng toàn bộ báo cáo QA `P29`–`P36`:

1. **Điểm mạnh bảo mật vỏ Electron:** Đóng gói kín qua giao thức `app://fcv588`, tắt `nodeIntegration`/`devTools`/preload, bật `sandbox`/`contextIsolation`/`webSecurity`, chặn toàn bộ yêu cầu mạng ngoài và quyền thiết bị, khóa tải về chỉ đúng tên `FCV588-settings-training-only.json`, kiểm tra dotfile/`realpath`/giới hạn 4 MB, và bật đủ **9 Electron Fuses V1** (`RunAsNode: OFF`, `EnableEmbeddedAsarIntegrityValidation: ON`, `OnlyLoadAppFromAsar: ON`, `EnableCookieEncryption: ON`, `EnableNodeOptionsEnvironmentVariable: OFF`, `EnableNodeCliInspectArguments: OFF`, `GrantFileProtocolExtraPrivileges: OFF`, `WasmTrapHandlers: ON`, `LoadBrowserProcessSpecificV8Snapshot: OFF`).
2. **Phân mảnh 3 hướng & Bẫy vỡ dây chuyền khi hợp nhất:**
   - `apps/fcv588-electron-p30/` (`v0.0.1`) là bản duy nhất nằm trong `apps/`, nhưng **thiếu bản vá UIA P31** (`app.setAccessibilitySupportEnabled(true)`) và **thiếu bản vá nhãn `POWER/BRILL` P35**.
   - `staging/fcv588-native-accessibility-p31-20261121/` (`v0.0.3`) có bản vá UIA P31 (nằm kẹt trong `staging/`), nhưng vẫn **thiếu nhãn P35**.
   - Bản `web/index.html:99` chuẩn có bản vá P35, nhưng **nếu chép vào Electron sẽ lập tức làm hỏng 4 script PowerShell UIA** (`p30-native-keyboard-focus*.ps1:32`, `p31-native-focus-blur.ps1:63`, `p31-native-tab-visual.ps1:59` vì tất cả khóa cứng chuỗi cũ `'Nguồn và độ sáng*'`), đồng thời **bất kỳ sửa đổi nào lên 53/54 tệp `src/`/`web/` đều làm `desktop/build-bundle.mjs:14-17,38-39` ném lỗi `"P28 inherited source drift"`** do chốt cứng biên bản SHA của P28!
3. **Điểm mù QA nghiêm trọng trên bản EXE đã cứng hóa:** Vì bật fuse `RunAsNode: false` làm hỏng `playwright._electron.launch()`, **chưa có bất kỳ bài kiểm thử UI Playwright tự động nào từng chạy trên bản cài P30 v2 hay P31 thật**! Các script xác minh lưu trữ (`p30-host-verify-default.mjs:17`, `p31-profile-check.mjs:17`) buộc phải mở profile bằng **bản P29 chưa cứng hóa**, còn bản P30/P31 thật chỉ được chạy 4,5 giây rồi `taskkill /F`. Cũng chưa từng có bài test âm tính kiểm tra giả mạo ASAR.
4. **Mù giám sát sự cố, Thiếu xử lý cửa sổ đơn & Lỗ hổng UI chuyển cài đặt:** `main.cjs:139-140` gọi `requestSingleInstanceLock()` nhưng **không có listener `second-instance`** nên mở lần 2 bị thoát im lặng mà không hiện cửa sổ cũ; đồng thời `devTools: false` đi kèm **0 trình bắt lỗi** (`render-process-gone`, `child-process-gone`, `did-fail-load`, `uncaughtException`). Ngoài ra, lớp chuyển cài đặt desktop tại `apps/fcv588-electron-p30/web/desktop-settings.mjs:49` dùng hộp thoại chặn luồng `window.confirm()`, và `apps/fcv588-electron-p30/web/desktop-settings-core.mjs:7-9` nhân bản đúng lỗ hổng thiếu bộ giải mã `profile20` (`BUG-20(a)`).
5. **Tài nguyên `INCONCLUSIVE`, Giọng đọc bị chặn & Không chữ ký số (`P32 NO_GO`):**
   - Benchmark CPU/RAM (`P32`, `n=3` cặp, **chỉ đo lúc nghỉ `POWER OFF`**, không tải Canvas): Private RAM trung vị `263,41 MiB` (P30) vs `261,63 MiB` (P31) — **~262 MiB chỉ để đứng im**; mọi khoảng tin cậy 95% đều cắt qua `0` nên kết luận chính thức là **`INCONCLUSIVE`**.
   - Kiểm thử Narrator: P33 chỉ xác minh thay thế qua UIA (`PASS_NATIVE_UIA_FOCUS_SURROGATE`, `0` sự kiện live-region), P34 kết luận `BLOCKED_NO_PRIVACY_SAFE_NONHUMAN_SPEECH_CHANNEL`, cổng nghe trực tiếp của con người vẫn `BLOCKED_HUMAN_SPEECH_CONFIRMATION`.
   - Ký số & Cài đặt: Toàn bộ file cài đặt (`InstalledEXE` 249,98 MB, `P31Installer` 121,31 MB, uninstaller 140 KB) đều **`AuthenticodeStatus: "NotSigned"`**, máy build có `0` chứng thư ký số; bài cài trên host chạy dưới quyền Admin (chưa test tài khoản thường, chưa test máy ảo air-gapped sạch, `SmartScreenEDRValidated: false`) → **Phán quyết P32: `NO_GO`**.

---

### 2.8 Review Khả Thi Lộ Trình 5 Thiết Bị Còn Lại

#### 5 Điểm Nghẽn Kiến Trúc Trong `src/core/` & `web/` Chặn Mọi Thiết Bị Phi-Sonar Hiện Nay

| # | Điểm nghẽn (`file:line`) | Lý do không thể lắp Radar / AIS / ECDIS trực tiếp |
|---|---|---|
| 1 | **Mô hình thế giới 1D thuần sonar** (`src/core/scenario.mjs:7-32,149-193`) | `worldState` chỉ có `{simTick, bottomDepthM}`; tàu chạy thẳng cố định (`7 kn, 090°`), **không có** bánh lái/máy/ROT, **không có** đội tàu mục tiêu 2D (MMSI, CPA/TCPA, vệt ARPA), **không có** đường bờ/địa hình radar cực, **không có** hải đồ ENC S-57/S-52. |
| 2 | **Giao thức nhập liệu & fixture đóng cứng FCV-588** (`src/core/protocol.mjs:138-165`) | Đóng cứng 5 tên fixture FCV và phím `trackpad`/`power`/`func`; **thiếu hoàn toàn** bi xoay/con trỏ 2D `(dx, dy)` + nhấp chuột (`FAR-2127`, `MDC-2060`, `NS4000`), chạm/kéo màn hình cảm ứng `(x, y)` (`AIS R5 SUPREME`), bàn phím chữ-số (MMSI/RCU), và thanh gạt analog (Gain/STC/FTC). |
| 3 | **Multi-runtime chỉ là stub giả, không có bus liên thiết bị** (`src/core/device-runtime.mjs:9-101`) | `device-runtime.mjs` (0 import runtime) ném lỗi ở dòng `38` với mọi thiết bị thứ 2 ngoài `INERT_SECOND_DEVICE`; không có bus dữ liệu liên thiết bị (AIS → Radar/ECDIS, Máy đo sâu → ECDIS); `session.mjs:114` sao chép mảng `O(N²)` sẽ sụp đổ dưới luồng quét radar 10 Hz / sự kiện con trỏ. |
| 4 | **Bộ chấm bài khóa cứng FCV-588** (`src/core/lessons.mjs:7-8,258-272`) | Nhập trực tiếp `FCV588_ADAPTER` vào `src/core/` và trích xuất cứng các probe FCV-588. |
| 5 | **Vỏ Web đơn khối không có kiến trúc plugin thiết bị** (`web/app.mjs` 1.491 LOC, `web/index.html:256-262`) | 5 thiết bị còn lại chỉ là văn bản tĩnh trên HTML; chưa có bộ định tuyến thiết bị, giao diện gắn plugin, hay lớp kết xuất WebGL/Canvas PPI cực / vector ENC. |

#### Đánh Giá Khả Thi & Khuyến Nghị Build-vs-Buy Cho Từng Thiết Bị

| Thiết bị | Tình trạng pháp lý & Hồ sơ biến thể | Độ phức tạp | Khuyến nghị thực tế |
|---|---|---|---|
| **AIS R5** *(Transponder Class A)* | Đã có ZIP chính hãng (`R5_SUPREME` 145 tr. & `R5_SOLID` 107 tr., `RESTRICTED_REFERENCE_ONLY`). **Chặn định danh (`IDENTITY_HOLD`):** chưa xác định máy lớp học là bản cảm ứng `SUPREME` hay phím cứng `SOLID`. | **Trung bình–Khá** | **Nên làm đầu tiên sau khi tái cấu trúc `src/core/`** (sau khi xác nhận biến thể). Dễ triển khai nhất để chứng minh thế giới đa tàu & bus liên thiết bị (`AIS R5` + `FCV-588`). |
| **KODEN MDC-2060** *(Radar hàng hải)* | Đã có Rev14 (86 tr.) & Rev15 (88 tr.), nhưng dính **khóa pháp lý nghiêm ngặt `HOLD_AI_PROCESSING_AND_REDISTRIBUTION`** theo điều khoản website KODEN; chưa chốt Rev14 hay Rev15 (`VERSION_HOLD`). | **Cao** | **Khả thi làm thiết bị thứ 2** sau khi có lõi thế giới 2D, động cơ quét PPI cực (STC/FTC/EBL/VRM/trails/làm nóng magnetron 120 s) và **giải quyết xong quyền pháp lý với KODEN**. |
| **FURUNO FAR-2127** *(Radar IMO / ARPA)* | Đã có `OME35190U5` (325 tr., chỉ dùng cá nhân theo điều khoản FURUNO USA). **Chặn biến thể:** chưa chốt bàn điều khiển **RCU-014** (bàn phím đủ) hay **RCU-015** (bi xoay gọn). | **Rất cao** *(gấp 2–4× MDC-2060)* | Cần ARPA/TT đầy đủ (CPA/TCPA, vector thật/tương đối, diễn tập thử, phủ AIS). **Cân nhắc mua/cấp phép:** đã có phần mềm thương mại **`PC21X7`** (`VietMoPhongChoTatCaCacMay.md:27,128`); chỉ tự xây nếu tái sử dụng động cơ radar từ MDC-2060 và đã chốt RCU. |
| **Transas / Wärtsilä NS4000** *(ECDIS)* | Thiếu bản quyền: chỉ có bản mirror bên thứ ba `v2.00.009` (311 tr.), bản `v3.02.350` bị `RIGHTS_OR_ACCESS_HOLD`, **0 dữ liệu hải đồ ENC S-57/S-63 có phép**, chưa rõ lớp học dùng v2 hay v3. | **Cực cao / Không khả thi tự viết lại** | **KHÔNG khuyến nghị tự clone bằng vanilla JS** (đòi hỏi nhiều năm công người cho chuẩn hiển thị S-52, đường đẳng sâu an toàn, kiểm tra tuyến, giao diện MDI khổng lồ và ENC có bản quyền). **Nên mua bộ huấn luyện chính hãng / Mintra hoặc dùng mô hình tiêm NMEA vào máy thật kiểu Vimaru** (`VietMoPhongChoTatCaCacMay.md:168-186`). |
| **KODEN J2000** *(Máy dò cá chưa rõ định danh)* | **`IDENTITY_HOLD` (`NO_SOURCE_IDENTIFIED`)** — 0 tài liệu, mã máy không xuất hiện trong catalog KODEN (có thể là nhầm tên dòng CVS). | **Bị khóa cứng** | **Giữ nguyên `IDENTITY_HOLD`**, tuyệt đối không phân bổ nguồn lực cho tới khi có ảnh biển tên vật lý trên tàu/phòng thực hành. |

---
## Phần III — Audit Toàn Diện (Comprehensive Multi-Layer Audit)

### 3.1 Audit Thực Thi & Kiểm Chứng Động (PASS vs 6 CLI FAIL, CRLF/Mixed-EOL & Fuzzing)

#### A. Bảng Tổng Hợp Kết Quả Chạy Thực Tế (Read-Only Trên Linux Node v22.23.5 / Python 3.12.16 / Chrome 158)

| Hạng mục kiểm chứng | Lệnh / Cơ chế thực thi | Kết quả | Chi tiết đo được |
|---|---|---:|---|
| **Kiểm thử chuẩn Node** | `TMPDIR="$SCRATCH" npm run check` | **PASS (0)** | 5 syntax checks + **618/618** Node tests (0 fail, 0 skip, ~19–20 s) |
| **Kiểm tra cú pháp toàn bộ JS/MJS/CJS** | `node --check` trên 89 tệp (`src/`, `web/`, `tools/`, `apps/`) | **PASS (0)** | **89/89** tệp hợp lệ cú pháp (vượt xa 5 tệp của `npm run check`) |
| **Kiểm thử Python unit** | `PYTHONDONTWRITEBYTECODE=1 python3 -B -m unittest discover -s test -v` | **PASS (0)** | **13/13** tests (0,02 s) |
| **Kiểm thử Electron (Node-only)** | `node --test apps/fcv588-electron-p30/{desktop/settings-transfer,test/fcv588-p28-mode-replay-matrix}.test.mjs` | **PASS (0)** | **6/6** tests (2 + 4) |
| **Cổng tài sản runtime & P36 SHA** | `node tools/verify_public_runtime_assets.mjs` & đối chiếu manifest P36 | **PASS (0)** | **54/54** tài sản sạch (0 media OEM, 0 symlink), **54/54** khớp SHA-256 P36 |
| **Kiểm tra sổ cái Python** | `build_fcv588_public_trace.py --check` & `build_fcv588_feature_register.py --check` | **PASS (0)** | Khớp 64 FCV + D15 cô lập & sổ đăng ký 65 tính năng |
| **Kiểm tra liên kết & AST Python** | 210 liên kết trong 9 tài liệu lõi & `ast.parse` 30 tệp `.py` | **PASS** *(1 cảnh báo)* | **210/210** link nội bộ sống; 1 `SyntaxWarning` (`\d` tại `fcv588_v36_canonical_a11y_chrome_20261018.py:108`) |
| **Live Headless Chrome (`1440×900` & `360×800`)** | Playwright + `tools/server.mjs` loopback `127.0.0.1` | **PASS khởi động** | **52/52** request nội bộ HTTP `200`, **0** request ngoài, **0** console error/warning, **0** `pageerror`; xác nhận thực nghiệm `BUG-01..BUG-19` |
| **Fuzzing máy trạng thái đối kháng** | 5 seed ngẫu nhiên × 2.000 + 28 overlay có hướng dẫn × 200 | **PASS tính bền vững** | **15.600 bước chuyển**, **33/33 (100%)** khớp `finalSessionHash`, **0** ngoại lệ, **0** `NaN`/`Infinity`, **0** tràn chỉ số menu; phơi bày ma trận `13/30` rò phím |
| **CLI FAIL #1 — Menu Atlas** | `node tools/build_fcv588_public_menu.mjs --check` | **FAIL (1)** | `FAIL: menu evidence register drift` — `fcv588-public-menu-atlas.json` kẹt ở thứ tự Sounder trước P14 (**12/13** mục sai thứ tự) |
| **CLI FAIL #2 — Acceptance Ledger** | `node tools/build_fcv588_public_acceptance.mjs --check` | **FAIL (1)** | `FAIL: F1 implementation coverage checkpoint drift` — sửa tay `B07`/`B19` thời V46/V47 không cập nhật vào generator; chạy tạo lại sẽ làm hỏng test V48 |
| **CLI FAIL #3a & #3b — LCD Boundary** | `node tools/fcv588_lcd_boundary_audit.mjs --self-test` & mặc định | **FAIL (2)** | `--self-test` hỏng trên Linux vì `local("C:/outside")` (`L60`) không phải đường dẫn tuyệt đối POSIX; chế độ mặc định hỏng vì oracle V31 đóng cứng `profile-20 !== profile-22` (`L79`) |
| **CLI FAIL #4 — Visual Atlas V27 & V28** | `python3 -B tools/build_fcv588_visual_atlas.py --check --checkpoint V27` & `V28` | **FAIL (1)** | `ValueError: atlas drift` — **Chứng minh 6/6 biên bản (3/3 V27 + 3/3 V28) khớp SHA-256 100% khi khôi phục CRLF (`\n→\r\n`)** |
| **CLI FAIL #5 — Manual Verifier** | `python3 -B tools/verify_reference_manuals.py` | **FAIL (1)** | `ModuleNotFoundError: No module named 'pypdf'` + 25 tệp dưới `sources/manuals/` là con trỏ Git LFS ~130 byte chưa tải nhị phân |
| **CLI FAIL #6 — Stage Coldstore** | `python3 -B tools/historical_stage_coldstore.py verify` | **FAIL (1)** | `ValueError: Whole ZIP SHA mismatch` (con trỏ LFS 134 byte); các lệnh `build`/`audit-live` còn crash trên Linux vì `st_file_attributes` chỉ có trên Windows |

#### B. Chứng Minh Gốc Rễ Vỡ Chuỗi SHA Do CRLF→LF & Mixed-EOL (`\r\n` + `\n`)

Do `.gitattributes:1-10` thiếu quy tắc `-text` bảo toàn nguyên trạng byte cho các tệp JSON/MD đã niêm phong hash, toàn bộ `2.138` tệp văn bản trên bản checkout Linux đều bị chuẩn hóa thành LF (`LF=2.138, CRLF=0`), gây gãy dây chuyền kiểm chứng SHA-256 xuyên hệ điều hành:
1. **Visual Atlas V27 & V28 (`6/6` khớp hoàn toàn dưới CRLF):** Cả 3 biên bản V27 (`e52df8d2...`, `c4f43295...`, `92e166eb...`) và cả 3 biên bản V28 (`fa54805a...`, `3649b784...`, `a024cf26...`) đều khớp 100% SHA-256 đã niêm phong ngay khi phục hồi `\n → \r\n` *(đính chính nhận định trước đó cho rằng V28 hỏng cả hai định dạng)*.
2. **Chuỗi Postreceipt PowerShell P28/P29/P30/P35:** Các tệp `*_FINAL_INTEGRITY_*.json` do Node ghi dùng thuần LF nên vẫn khớp trên Linux (`LF_MATCH=true`). Ngược lại, các tệp `*_POSTRECEIPT_*.json` do PowerShell ghi bị vỡ toàn bộ trên Linux: `P28_POST`, `P29_POST` và `P35_POST` (`937ca3a5...`) khớp thuần CRLF, riêng **`P30_POST` (`bf1f7b322e...`) hỏng trên CẢ thuần LF lẫn thuần CRLF và CHỈ khớp đúng định dạng trộn EOL (`\r\n` bên trong `ConvertTo-Json` + ký tự `\n` đơn ở cuối tệp do lệnh PowerShell `+"\`n"` tại `p32-benchmark.ps1:121`)!**

---

### 3.2 Audit Bảo Mật, Quyền Riêng Tư & Chuỗi Cung Ứng (`S-01`–`S-09`)

#### A. Các Lớp Kiểm Soát Bảo Mật Tích Cực (Đã Xác Minh Trực Tiếp)
- **Không có điểm tiêm mã / mạng trong runtime (`src/` + `web/`):** Quét toàn bộ cho thấy **0** lần xuất hiện của `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval(`, `new Function`, `fetch(`, `XMLHttpRequest`, `WebSocket`, `navigator.serial`/`usb`/`bluetooth`, `postMessage`, `window.open`. Mọi hiển thị DOM đều dùng `.textContent`.
- **29/29 Raw-Socket HTTP Probes trên `tools/server.mjs` (`127.0.0.1:4197`) đều chặn fail-closed:**
  - Chỉ cho `GET`/`HEAD` (`200`); `POST`/`PUT`/`DELETE`/`OPTIONS` trả `405`.
  - Xâm nhập thư mục (`/../package.json`, `/%2e%2e/...`, `/web/../...`, `/src/%2e%2e/...`) trả `404`; đường dẫn mã hóa bên trong `/web/` (`/web/%2e%2e%2fpackage.json`) bị `inside()` chặn rõ ràng `403`.
  - Chặn liệt kê thư mục `/web/`, `/src/` (`403`); chặn toàn bộ thư mục gốc ngoài vùng phục vụ (`/docs/`, `/tools/`, `/sources/`, `/package.json`, `/.git/HEAD`, `/.gitignore`, `/web/.env` → `404`); chặn null-byte `%00` và `%ZZ` (`404`).
  - **Live Chromium xác nhận thực thi CSP thực tế:** `fetch('/web/index.html')` bị chặn bởi `connect-src 'none'` (`TypeError: Failed to fetch`), và chuỗi `eval` bị chặn bởi `script-src 'self'` (`EvalError`).
- **Vỏ Electron cứng hóa 9 Fuses & Phân tích JSON phòng thủ:** `app://fcv588`, `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`, không preload, hủy mọi request mạng ngoài; bộ đọc archive/settings/protocol kiểm soát giới hạn kích thước (`1 MiB` / `8 KiB` / `12–18 KB`), chiều sâu (`8`/`32`), chống chu kỳ và từ chối khóa `__proto__`/`constructor`/`prototype`. Không phát hiện API key, mật khẩu hay private key bị lộ trong mã nguồn (`codeSigningWithPrivateKey: 0`).

#### B. Danh Mục 9 Rủi Ro Bảo Mật, Quyền Riêng Tư, Chuỗi Cung Ứng & Pháp Lý (`S-01`–`S-09`)

| Mã | Mức độ | Danh mục | Vị trí / Bằng chứng | Mô tả phát hiện |
|---|---|---|---|---|
| **S-01** | **CRITICAL** | **Bản quyền / Tái phân phối** | `sources/manuals/` (23 PDF `101,15 MiB` + 2 ZIP `86,87 MiB` = **`188,01 MiB`** / `197,15 MB` thập phân / `197.145.926 B` độc nhất, LFS), `sources/FCV588_GiaoDienThucTeMay2016/*.jpg` (**8 ảnh chụp thực địa phần cứng FCV-588 chưa có hồ sơ xác nhận quyền**, `1,40 MiB`), `VERIFICATION_RECEIPT.json:180`, `staging/github-prep-20261122/.gitignore.preimage:15-20` & `full-workspace-preimage-.gitignore` | Đẩy tài liệu OEM có bản quyền (FURUNO, KODEN, TransponderTech/Raymarine, Transas/Wärtsilä) và 8 ảnh chụp thực địa phần cứng FCV-588 chưa có hồ sơ xác nhận quyền *(các script QA gọi lỏng là `OEM JPEG`, nhưng kiểm tra trực quan cho thấy ảnh chụp điện thoại máy lắp tiếng Việt trên vách tàu/phòng thực hành)* lên GitHub sau khi xóa bỏ quy tắc `.gitignore`. Ở kho **công khai** hoặc chia sẻ ra ngoài, đây là hành vi tái phân phối trái phép (`not_an_approval_to_redistribute: true`, cổng chặn **`NO_GO`** đỏ); đối với bản sao lưu cá nhân trong kho riêng tư một chủ sở hữu (khi chưa xác định trạng thái hiển thị remote), mức rủi ro pháp lý khác biệt nhưng vẫn cần gỡ bỏ khỏi Git/LFS trước khi cộng tác hoặc xuất bản. |
| **S-02** | **HIGH** | **Thiếu License & Nhãn hiệu** | Thư mục gốc (không có `LICENSE`), `web/index.html:44` (`FURUNO`), `apps/fcv588-electron-p30/package-lock.json` (`315/315` đều là `"dev": true`, thiếu `"license"`) | Không có tệp `LICENSE` ở thư mục gốc (mặc định *"All Rights Reserved"*), thiếu `THIRD_PARTY_NOTICES` cho runtime Electron/Chromium đóng gói trong bộ cài và thiếu cơ chế sinh SBOM/license tự động *(lưu ý kỹ thuật: toàn bộ `315/315` mục trong `package-lock.json` đều mang cờ `"dev": true` với `0` phụ thuộc npm runtime trong `apps/fcv588-electron-p30/package.json`, và định dạng rút gọn của npm lockfile v3 mặc nhiên bỏ qua trường `"license"`)*. Đồng thời vẫn hiển thị nhãn hiệu `FURUNO` trên viền máy trái `docs/research/FCV588_PUBLIC_CLAIM_POLICY.md:7`. |
| **S-03** | **HIGH** | **Rủi ro lộ Secret do `.gitignore` rỗng** | `.gitignore:1-8` & `test/research-inventory.test.mjs:81-86` | Root `.gitignore` có **0 quy tắc lọc** và bị unit test khóa cứng `assert.deepEqual(activeIgnoreRules, [])`! Bất kỳ lập trình viên nào chạy `npm ci`, tạo `.env`, `*.pem`, `*.key`, hoặc chạy Python thiếu `-B` (`__pycache__/`) đều có nguy cơ commit nhầm secret/rác. |
| **S-04** | **MEDIUM** | **Rò rỉ PII đường dẫn máy cá nhân & URL ChatGPT riêng tư** | **`174` lần xuất hiện trên `125` dòng tại `58` tệp được theo dõi** (`docs/`: `44`, `plans/`: `9`, `staging/`: `5`; vd: `P29_NPM_INSTALL_ATTEMPT1_20261121.txt:8`, `p26_canonical_postapply_tests.py:6`, `builder-debug.yml:92-93`, `P23_CANONICAL_POSTAPPLY_PYTHON13_20261117.json:6`) & **`VietMoPhongChoTatCaCacMay.md:1`** | Lộ tên tài khoản & máy Windows **`C:\Users\Z10PAD8C_Xuan2261\...`**: gồm `38` đường dẫn thô dạng `\` trên `19` tệp + `4` tên ngắn `Z10PAD~1` trong `4` tệp `builder-debug.yml` (`= 42` dạng thô), cộng **`132` đường dẫn JSON thoát dấu gạch chéo `C:\\Users\\Z10PAD8C_Xuan2261` trên `83` dòng tại `39` tệp JSON bổ sung** (lộ đường dẫn Poetry/trình duyệt/PID cục bộ). Ngoài ra, **`VietMoPhongChoTatCaCacMay.md:1`** làm lộ trực tiếp **URL dự án/hội thoại ChatGPT riêng tư** (`https://chatgpt.com/g/g-p-6acd837a22f48191aa4280a088d1834d-mophongmaytrentau/c/6acce448-bc64-83ec-99ae-fe71c26975b5`). Biên bản `staging/github-prep-20261122/WORKSPACE_CLEANUP_FINAL_V2_20261122.json:22` (`"filenameSensitiveCandidates": 0`) chỉ quét tên tệp nên bỏ sót toàn bộ nội dung này. |
| **S-05** | **MEDIUM** | **Chuỗi cung ứng & Phụ thuộc Electron** | `apps/fcv588-electron-p30/package*.json`, 3 lockfile trong `staging/`, `P30_FINAL_REPORT:21`, `P32_FINAL_REPORT:12` | (1) **6 lỗ hổng `moderate`** trong cây `devDependencies` (`npm audit --omit=dev` = 0); (2) **6 gói transitive đã `deprecated`** (`3× glob@7.2.3` có lỗ hổng công khai, `inflight@1.0.6` rò bộ nhớ, `rimraf@2.6.3`, `boolean@3.2.0`); (3) `playwright-core: "^1.65.1"` không ghim cứng; (4) **4 tệp `package-lock.json` với 3 SHA-256 khác nhau**; (5) **4 bộ cài `.exe` đều `Authenticode: NotSigned`**. |
| **S-06** | **LOW-MED** | **Lỗ hổng phòng vệ chiều sâu `tools/server.mjs`** | `tools/server.mjs:21,34-37,55-70` | Chưa chặn rõ đoạn tên tệp bắt đầu bằng dấu chấm (dotfile như `/web/.hidden.js` sẽ được phục vụ nếu lọt vào cây); thiếu `form-action 'none'`, `frame-src 'none'`, `worker-src 'none'`, `Referrer-Policy: no-referrer`, `Permissions-Policy`; chưa có trần kích thước tệp (Electron chặn 4 MB); còn mục chết `MIME[".json"]`. |
| **S-07** | **LOW-MED** | **Rủi ro Zip-Bomb & khớp URL ở công cụ tải** | `tools/archive_reference_manuals.py:246,262-279,301-313` | Tin cậy trường header `member.file_size` chưa xác thực trước khi gọi `shutil.copyfileobj` không giới hạn số byte giải nén thực tế (nguy cơ zip-bomb giả header); kiểm tra `"raymarine.canto.global/" in link` bằng chuỗi con thay vì `urlparse().hostname`; `--dry-run` vẫn gọi mạng HTTPS scrape trang nhà cung cấp. |
| **S-08** | **LOW** | **Treo luồng chính khi nhập Archive (DoS cục bộ)** | `web/app.mjs:1383-1432`, `web/fcv588-archive-bz-viewer.mjs:71-78`, `web/fcv588-archive-timeline.mjs:26-55` | Replay đồng bộ **6 lần** (12.000 `dispatch()`) làm treo trình duyệt `1,65–2,27 s` trên một archive hợp lệ `2.000` sự kiện. |
| **S-09** | **LOW** | **Giới hạn hàm băm phi mật mã** | `src/core/protocol.mjs:38-45` (`f0-fnv1a32-*`) | Được công bố minh bạch chỉ dùng phát hiện sai lệch (drift detection), không chống giả mạo bài thi; cần chữ ký mật mã/máy chủ nếu dùng cho thi cấp chứng chỉ. |

---

### 3.3 Audit Pháp Lý, Bản Quyền, Giấy Phép & Sở Hữu Trí Tuệ

Đây là **điểm nghẽn rủi ro cao nhất toàn dự án (`E4 = 2.0/10`)**:
1. **Tự mâu thuẫn chính sách bản quyền (`S-01` — CẢNH BÁO ĐỎ):** Chính thư mục `sources/manuals/README.md:29-30` và `VERIFICATION_RECEIPT.json:180` ghi rõ `"not_an_approval_to_redistribute": true`, đặc biệt điều khoản website KODEN cấm rõ việc xử lý AI và tái phân phối, còn FURUNO USA giới hạn cho sử dụng cá nhân. Bản `staging/github-prep-20261122/.gitignore.preimage:15-20` (và bản đầy đủ `staging/github-prep-20261122/full-workspace-preimage-.gitignore`) ban đầu đã lọc đúng `sources/manuals/**/*.{pdf,PDF,zip,ZIP}` để ngăn xuất bản. Tuy nhiên khi chuyển sang *"FULL-WORKSPACE MODE"* ngày `2026-11-22`, toàn bộ **23 PDF (`101,15 MiB`) + 2 ZIP (`86,87 MiB`) = `188,01 MiB` (`197,15 MB` thập phân / `197.145.926 byte` độc nhất qua LFS) cùng 8 ảnh chụp thực địa phần cứng FCV-588 chưa có hồ sơ xác nhận quyền (`1,40 MiB`)** đã bị đưa vào commit `9b89309` và đẩy lên remote GitHub `https://github.com/xuan2261/MoPhongMayTrenTau.git`. *(Phân biệt mức rủi ro theo trạng thái hiển thị remote chưa xác định: nếu kho GitHub để **công khai** hoặc chia sẻ ra ngoài, đây là hành vi tái phân phối không phép — cổng chặn **`NO_GO`** đỏ tuyệt đối; nếu chỉ là bản sao lưu cá nhân một chủ sở hữu trong kho **riêng tư**, rủi ro pháp lý khác biệt đáng kể và không thể khẳng định chắc chắn là vi phạm điều khoản khi chưa rõ visibility, song vẫn bắt buộc gỡ bỏ khỏi lịch sử Git/LFS trước bất kỳ hình thức cộng tác hay phát hành nào.)*
2. **Khoảng trống giấy phép dự án & mã nguồn mở bên thứ ba (`S-02`):** Dự án chưa có tệp `LICENSE` ở thư mục gốc (khiến mã nguồn rơi vào trạng thái *"All Rights Reserved"* không rõ quyền sử dụng/đóng góp), thiếu tệp `THIRD_PARTY_NOTICES` / `NOTICE` cho runtime Electron/Chromium được đóng gói trong bộ cài Windows, và chưa có quy trình sinh SBOM/license tự động. *(Lưu ý chính xác: dù toàn bộ `315/315` mục trong `package-lock.json` thiếu trường `"license"`, cả `315/315` mục này đều mang cờ `"dev": true` với `0` phụ thuộc npm runtime trong `apps/fcv588-electron-p30/package.json`, và định dạng rút gọn của npm lockfile v3 mặc nhiên bỏ qua siêu dữ liệu `"license"` — do đó trọng tâm tuân thủ nằm ở root `LICENSE` và notice cho runtime Electron/Chromium phân phối kèm bộ cài.)*
3. **Nhãn hiệu thương mại trên giao diện (`D-12`):** Dù `docs/research/FCV588_PUBLIC_CLAIM_POLICY.md:7` và `docs/decisions/ADR-0001.md:14` yêu cầu không đưa nhãn hiệu thương mại vào `web/` khi chưa có phép, `web/index.html:44` vẫn hiển thị trực tiếp `<span class="manufacturer-name">FURUNO</span>` ngay trên mặt máy mô phỏng.
4. **Điểm sáng pháp lý duy nhất:** Cây runtime phục vụ người dùng (`src/` + `web/`) hoàn toàn **không chứa bất kỳ tệp PDF, ảnh OEM, font hãng hay tài sản sao chép nào** (`verify_public_runtime_assets.mjs`: **54/54 PASS**).

---

### 3.4 Audit Độ Lệch Tài Liệu & Đặc Tả (`D-01`–`D-15`)

Kiểm toán đối chiếu chéo toàn bộ tài liệu, kế hoạch, biên bản và mã nguồn xác nhận **15 điểm lệch đặc tả thực tế**:

| Mã | Tệp tài liệu (`file:line`) | Nội dung ghi trong tài liệu | Thực tế mã nguồn / kho mã | Mức độ |
|---|---|---|---|---|
| **D-01** | `README.md:10,12` & `staging/github-prep-20261122/WORKSPACE_CLEANUP_FINAL_V2_20261122.json:23-24` | Khẳng định *"No GitHub upload, commit..."* (`README.md:10,12`), `githubUploaded: false`, `gitRootInitialized: false` (`:23-24`) | Kho mã ĐÃ khởi tạo Git (`9b89309`) và đẩy lên `origin = github.com/xuan2261/MoPhongMayTrenTau.git`. *(Ghi nhận công bằng: `WORKSPACE_CLEANUP_FINAL_V2_20261122.json` là biên bản bất biến tại thời điểm trước push, trong khi `README.md:10,12` là tài liệu sống cần được cập nhật.)* | Trung bình |
| **D-02** | `README.md:46-116` *(đối chiếu `:5-16`)* | Phần đầu `README.md:5-15` (`## Current scoped checkpoint (2026-11-22, P36; NOT RELEASED)`) **đã** tóm tắt `P29`–`P33`, `P32 NO_GO`, `P36`, `54/54` runtime SHA và `Node 618/618 + Python 13/13` (`:14`), và `:16` ghi rõ V31 `(superseded)`. Tuy nhiên, `## Start locally` (`README.md:46-69`) vẫn trích V31 `52 PASS / 1 FAIL`, `profile20`, `over 33 paths` (`:59`), đường dẫn `C:\Work\MoPhongMayTrenTau`, và `## Where to find things` (`:71-116`) vẫn gắn nhãn các biên bản V31 là `"Current"` | Độ lệch thực tế nằm ở hai mục hướng dẫn/tra cứu (`README.md:46-116`) chưa được cập nhật lên `F1-public-reference-22` / `54` tài sản runtime / `618/618 PASS`, liên kết các tài liệu `F0` chưa đánh dấu thay thế, và bỏ trống hoàn toàn chặng chuyển tiếp `V32–V57` & `P01–P28`/`P34–P35`. | **Cao** |
| **D-03** | `README.md:44` | Khẳng định *"No third-party packages ... are used by the simulator"* | Đúng cho web gốc, nhưng Electron shell kéo **315 gói npm** `devDependencies` bên thứ ba (`package-lock.json`). | Thấp–TB |
| **D-04** | `docs/evidence/fcv588-public-menu-atlas.json` vs `menu-atlas.mjs` | Sổ cái menu phải đồng bộ với mã vận hành | **FAIL `--check` (`RC=1`)**: JSON giữ nguyên thứ tự Sounder cũ trước P14 (`12/13` mục lệch). | **Cao** |
| **D-05** | `tools/build_fcv588_public_acceptance.mjs:19-77` vs `fcv588-public-implementation-status.json:539,794` | Công cụ sinh sổ cái kiểm định mức độ phủ tính năng | **FAIL `--check` (`RC=1`)**: Hai dòng `B07`/`B19` bị sửa tay ở V46/V47; chạy lại công cụ sẽ ghi đè `B07` và **làm hỏng `test/fcv588-v48-phase6-cross-ledger-claims.test.mjs:90-92`**! | **Cao** |
| **D-06** | `docs/reports/FCV588_PUBLIC_REFERENCE_ACCEPTANCE.md:3,21` | Tiêu đề vẫn là `V31, 2026-10-16` (`52/53` fail, `profile20`), dòng `21` ghi `"current35-file runtime SHA"` | Lỗi thời hơn 1 tháng phát triển (`V32`–`V57`, `P01`–`P36`); runtime thực tế hiện là **54 tệp** (`profile22`, `618/618 PASS`). | **Cao** |
| **D-07** | `docs/evidence/FCV-588.md:3,22-51` & `docs/qa/scenario-matrix.md:22-34` | Ghi `MARK`, `FUNC` là `DEFERRED`; `FCV-T07..T10` là `NOT STARTED` *(bản thân hai tệp đều ghi rõ mốc lịch sử `F0` / `F0-2026-10-13-01` tại `:3,22,40` và `:22`)* | Cả 6 hạng mục đều đã triển khai trong `model.mjs` và có bộ test riêng; điểm lệch thực tế là **`README.md:76,78` vẫn liên kết trực tiếp hai tài liệu F0 này mà không đánh dấu `superseded`**. | Trung bình |
| **D-08** | `docs/research/FCV588_V31_LCD_BOUNDARY_ORACLE.json` & `fcv588_lcd_boundary_audit.mjs:79` | Đối chiếu mã hiện tại với `sourceProfile: "F1-public-reference-20"` | **FAIL (`RC=2`)**: Lỗi so sánh cứng `'F1-public-reference-20' !== 'F1-public-reference-22'`. | Trung bình |
| **D-09** | `plans/261113-.../plan.md:140` & `FCV588_P33_NARRATOR_AT_FINAL_REPORT_20261121.md:23` | Ghi nhận mã băm niêm phong P14 và kết báo cáo P33 | Commit nguyên văn biến shell chưa mở rộng **`$finalsha`**, **`$postsha`** và chuỗi literal `\n`. | Thấp |
| **D-10** | `sources/manuals/VERIFICATION_RECEIPT.json:4,6,138-166` & `sources/manuals/README.md:17` | Ghi `"verified_pdf_files": 24` và `"verified_total_bytes": 197171462` (`197,17 MB` thập phân / `188,04 MiB`) | Chỉ có **23 tệp PDF** độc nhất (`106.059.773 B` = `101,15 MiB`) + **2 ZIP** (`91.086.153 B` = `86,87 MiB`) = **`197.145.926 byte`** (**`188,01 MiB`** / `197,15 MB` thập phân). Tệp `7000_118-205_A2_R5_SOLID_Flushmount_Cutout.PDF` (`25.536 byte`) bị trùng tên sau sanitize (EN & DE) nên `VERIFICATION_RECEIPT.json:6` cộng dồn 2 lần làm đội tổng thêm `25.536 byte` lên `197.171.462 byte` (`197,17 MB` thập phân / `188,04 MiB`). | Thấp |
| **D-11** | `docs/decisions/ADR-0001.md:47` & `src/core/protocol.mjs:131` | Khẳng định `src/core/` độc lập thiết bị (*"device-agnostic"*) | `protocol.mjs`, `scenario.mjs`, `lessons.mjs`, `device-runtime.mjs` đều nhúng cứng FCV-588. | Trung bình |
| **D-12** | `docs/research/FCV588_PUBLIC_CLAIM_POLICY.md:7` vs `web/index.html:44` | Cấm đưa nhãn hiệu thương mại vào `web/` khi chưa có phép | `web/index.html:44` hiển thị trực tiếp chữ `FURUNO` trên viền máy. | Trung bình |
| **D-13** | `apps/fcv588-electron-p30/desktop/main.cjs:145` | Không đề cập biến môi trường `FCV588_POC_PROFILE_DIR` | Tồn tại trong mã nguồn để ghi đè `userData` mà không có tài liệu; `apps/` đồng thời tụt sau P31 và P35. | Trung bình |
| **D-14** | `src/devices/fcv588/settings.mjs:88-106` | Hỗ trợ nhập cài đặt từ hồ sơ lịch sử | Có bộ nhập cho `profile19`, `profile21`, `profile22`, nhưng **thiếu `profile20`** (từ chối im lặng). | Thấp–TB |
| **D-15** | `package.json:10` | `npm run check` hàm ý kiểm tra cú pháp toàn bộ | Chỉ chạy `node --check` cho **5 tệp F0 gốc** trên tổng số **54** tệp runtime (89 tệp JS/MJS/CJS). | Thấp |

---

### 3.5 Audit Vệ Sinh Repository & Sẵn Sàng Vận Hành

| Trụ cột vận hành | Hiện trạng kiểm toán | Tác động thực tế |
|---|---|---|
| **CI/CD & Kiểm soát chất lượng tự động** | **0** workflow `.github/workflows/`, **0** cấu hình ESLint/Prettier/TypeScript (`jsconfig.json`/`tsconfig.json`), **0** `requirements.txt`/`pyproject.toml`. *(4 tệp `.yml` trong `staging/` chỉ là log debug của `electron-builder`.)* | Độ lệch đặc tả (`D-04`, `D-05`), lỗi lint (`11` lỗi ESLint), và lỗi đa nền tảng (`fcv588_lcd_boundary_audit.mjs`) không bị chặn khi chỉnh sửa. |
| **Phình dung lượng & Quản lý nhị phân** | **1.139 ảnh PNG (`264,41 MiB`)** lưu trực tiếp trong Git blob thường (`.gitattributes` bỏ quên `*.png`); **13 bản sao `src/` + 14 bản sao `web/`**; `520` tệp `.log`/`.txt`; **`18` tệp `*preimage*`/`*PREIMAGE*`** (`9` chữ thường + `9` bản sao lưu `PREIMAGE`); `4` tệp `.exe` chưa ký số; `20` tệp `.zip` (tổng **`1,93 GiB` / `~2,07 GB` thập phân** kèm LFS cho `~0,46 MiB` mã lõi). | Làm nặng thao tác `git clone`/`fetch`, gây nhiễu tìm kiếm mã nguồn và dễ sửa nhầm bản sao cũ thay vì bản chuẩn. |
| **`.gitignore` & `.gitattributes`** | `.gitignore` **trống 100%** (bị unit test ép rỗng!); `.gitattributes` thiếu `-text` cho biên bản SHA niêm phong. | Lộ nguy cơ commit secret/`node_modules`/`__pycache__/` và làm gãy hàng loạt SHA kiểm chứng khi checkout trên Linux/macOS. |
| **Khả năng quan sát sự cố (Observability)** | **0** `console.*`, **0** `window.onerror`/`unhandledrejection` ở web; **0** `render-process-gone`/`child-process-gone`/`uncaughtException` ở Electron (dù tắt `devTools: false`); `tools/server.mjs` không ghi log request/lỗi. | Khi lỗi xảy ra trên máy phòng thực hành, giảng viên và kỹ sư không có bất kỳ dấu vết chẩn đoán nào. |
| **Tính di động đa nền tảng (Cross-OS)** | `14/14` script Playwright khóa Chrome Windows, `3` script `.ps1` dùng NTFS junction, `historical_stage_coldstore.py` gọi Win32 `st_file_attributes`, `fcv588_lcd_boundary_audit.mjs:60` dùng `"C:/outside"`, gói Electron chỉ hỗ trợ Windows NSIS x64. | Không thể chạy bộ kiểm chứng hồi quy tự động hoàn chỉnh trên máy chủ CI Linux hoặc máy trạm macOS. |

---
## Phần IV — Đánh Giá Toàn Diện & Lộ Trình Khắc Phục (Comprehensive Evaluation & Roadmap)

### 4.1 Khung Chấm Điểm 100 Điểm (`E1`–`E8`) & Phân Tách Lõi vs Vận Hành

Để phản ánh trung thực thực tại hai mặt của `MoPhongMayTrenTau` (lõi mô phỏng tất định có kỷ luật tốt nhưng bị vây quanh bởi nợ pháp lý, trôi dạt tài liệu, phình kho mã và 21 lỗi chưa được bộ test bắt), đánh giá sử dụng **khung 8 tiêu chí có trọng số (tổng 100%)** neo trực tiếp vào bằng chứng định lượng:

> **Nguyên tắc phân tách ranh giới chấm điểm (Zero Double-Counting):** Mọi rủi ro xuyên cắt chỉ được tính điểm trừ tại **đúng 1 tiêu chí sở hữu duy nhất** để loại bỏ hoàn toàn trùng lặp:
> - **Mức độ sẵn sàng đa thiết bị (`5/6` thiết bị `NOT_STARTED` / mô hình 1D):** chỉ tính tại **`E1`** (cùng §2.8 & Trục trưởng thành 4); **`E2`** chấm riêng phạm vi chức năng và độ trung thực miền của **FCV-588**.
> - **`.gitignore` rỗng (`S-03`) & vệ sinh lưu trữ/phân mảnh kho mã:** chỉ tính tại **`E8`** (Vệ sinh Repository & Vận hành), **không** tính lặp tại `E3`.
> - **`4` bộ cài `.exe` chưa ký số (`Authenticode: NotSigned`, `S-05`) & chuỗi cung ứng/quyền riêng tư (`S-04`):** chỉ tính tại **`E3`** (Bảo mật, Chuỗi cung ứng & Quyền riêng tư), **không** tính lặp tại `E8`.
> - **`BUG-07`/`BUG-08` & `D04`:** được tách rõ khía cạnh **khiếm khuyết trạng thái/logic vận hành** tại `E2` so với khía cạnh **khả năng đọc giao diện/ergonomics/i18n** tại `E7` mà không cộng dồn trọng số.

| Mã | Tiêu chí | Trọng số | Điểm (0–10) | Phép tính trọng số | Điểm đạt | Cơ sở định lượng & Lý do trừ điểm |
|---|---|---:|---:|---|---:|---|
| **E1** | **Kiến trúc Lõi Mô phỏng & Tính Tất định** | **18%** | `6.8` | `6.8 × 18 / 10` | **12.24** | **(+)** 0 phụ thuộc vòng lặp, 0 runtime npm deps, 15.600 bước fuzzing đạt 33/33 tất định, tách đồng hồ `simTick`/`uiElapsedMs`, 618/618 test PASS. **(-)** Vi phạm `docs/decisions/ADR-0001.md` ở cả 4 tệp `src/core/`; 97,1% nhân bản `*-profile21.mjs` (`1.879 wc -l` / `1.889 split LOC`); God files (`web/app.mjs` `1.491 wc -l` / `1.492 split LOC` & 0 exports, `reduceFcv588` CC=207); `55,8%–93,7%` (`~71%`) CPU `dispatch()` hash lại hằng số + `O(N²)` cliff `756,77 ms` @ 14.400 tick; 6× archive replay `2,27 s`; mô hình 1D chặn lộ trình 5 thiết bị còn lại (`NOT_STARTED`). |
| **E2** | **Phạm vi Chức năng FCV-588 & Độ Trung thực Miền** | **18%** | `5.5` | `5.5 × 18 / 10` | **9.90** | **(+)** Phạm vi FCV-588 rộng (60 tập con vận hành + D15 phong phú) & trung thực mẫu mực (`65/65 HOLD`, fail-closed `NO DATA` 10-tick TTL, không ngụy tạo chứng nhận). **(-)** Dính **11 lỗi P1** + **8 lỗi P2** + **1 lỗi P2/P3** + **1 cụm P3** tái hiện trực tiếp (`BUG-01`..`BUG-21`), nổi bật: `0/50` giá trị chọn lựa trên cả 5 nhóm Menu chính (`0/13` Sounder) đọc được do sai logic khởi tạo/bố cục (`BUG-07`+`BUG-08`), `autoGainOffset` vô hiệu, thước sâu lệch `+43,5 px / +5,44 m`, nhảy cóc `-53,80%`, cá biến mất sau `46 s`/`115 s`, `13/30` overlay rò phím, NAV/Zoom/Alarms bỏ qua hiệu chuẩn, `LEARN-07` luôn trượt; còn 3 tính năng một phần (`C11`/`D09`/`D14`), `D04` chưa triển khai và `65/65 HOLD`. |
| **E3** | **Bảo mật, Cô lập Sandbox & An toàn Đầu vào** | **14%** | `7.6` | `7.6 × 14 / 10` | **10.64** | **(+)** 0 XSS/`eval`/`fetch`/WebSerial; 29/29 HTTP probes fail-closed; Chromium thực thi `script-src 'self'` & `connect-src 'none'`; Electron 9 fuses + `app://` + 0 preload; phân tích JSON chống `__proto__`/chu kỳ; 0 secret/private key rò rỉ. **(-)** `174` lần rò rỉ đường dẫn PII trên `125` dòng tại `58` tệp (`42` dạng thô + `132` dạng JSON `\\`) cùng URL ChatGPT riêng tư tại `VietMoPhongChoTatCaCacMay.md:1` (`S-04`); `4` `.exe` `Authenticode: NotSigned` + `6` lỗ hổng `moderate` dev + `6` gói `deprecated` (`S-05`); `tools/server.mjs` thiếu chặn dotfile/header phụ (`S-06`); `archive_reference_manuals.py` tin header zip-bomb (`S-07`); treo luồng chính cục bộ (`S-08`) & giới hạn FNV-1a (`S-09`). |
| **E4** | **Tuân thủ Pháp lý, Bản quyền, Giấy phép & IP** | **12%** | `2.0` | `2.0 × 12 / 10` | **2.40** | **(+)** Runtime phục vụ `src/`+`web/` sạch 54/54; chính sách phân loại quyền rõ ràng. **(- CẢNH BÁO ĐỎ):** Đẩy `188,01 MiB` (`197,15 MB` thập phân / `197.145.926 byte` độc nhất) PDF/ZIP OEM có bản quyền + 8 ảnh chụp thực địa phần cứng FCV-588 chưa có hồ sơ xác nhận quyền lên GitHub trái `not_an_approval_to_redistribute: true` (`S-01`); thiếu root `LICENSE`, thiếu `THIRD_PARTY_NOTICES` cho runtime Electron/Chromium (lưu ý `315/315` mục `package-lock.json` đều là `"dev": true` với `0` phụ thuộc npm runtime và định dạng lockfile v3 lược bỏ `"license"`); chữ `FURUNO` trên `web/index.html:44` (`S-02`, `D-12`). |
| **E5** | **Độ Chính xác Tài liệu & Đồng bộ Đặc tả–Mã nguồn** | **10%** | `4.8` | `4.8 × 10 / 10` | **4.80** | **(+)** 210/210 link nội bộ sống; trace & feature register `--check` PASS; lưu vết thất bại trung thực; đầu `README.md:5-15` đã cập nhật tóm tắt P36 (`2026-11-22`). **(-)** **15 điểm lệch (`D-01`..`D-15`)**: phần `Start locally` / `Where to find things` của `README.md:46-116` & `FCV588_PUBLIC_REFERENCE_ACCEPTANCE.md` dừng ở V31 (bỏ trống `V32–V57` & `P01–P28`); `menu-atlas.json` lệch 12/13 mục Sounder; `build_fcv588_public_acceptance.mjs` mâu thuẫn test V48; oracle LCD dừng ở `profile20`; `$finalsha`/`$postsha` chưa mở rộng; đếm trùng 24 vs 23 PDF (`+25.536 B`). |
| **E6** | **Chất lượng Kiểm thử, Khả năng Tái lập & CI/CD** | **10%** | `5.4` | `5.4 × 10 / 10` | **5.40** | **(+)** 618 Node + 13 Python + 6 Electron + 54 asset gate PASS; 49/102 tệp kiểm tra replay. **(-)** **0 CI/CD, 0 linter/typecheck, 0 `requirements.txt`**; `npm run check` chỉ check cú pháp 5/54 tệp; 45,1% tệp test dựa vào 556 regex văn bản thô bỏ lọt cả 21 lỗi; **6 CLI FAIL trên Linux**; vỡ SHA CRLF/mixed-EOL; **14/14 Chrome runner khóa cứng Windows**; 0 Playwright UI test trên Electron hardened. |
| **E7** | **Khả năng Tiếp cận (A11y), i18n & Trải nghiệm UX** | **9%** | `5.8` | `5.8 × 9 / 10` | **5.22** | **(+)** 0 trùng ID, 11/11 cặp màu đạt WCAG AA, `:focus-visible`, 11 live regions, 5 tab ARIA, mobile `0 px` tràn ngang (36/39 ≥44 px), P31 UIA 90 phần tử. **(-)** Trải nghiệm đọc menu bị phá hỏng toàn diện (`0/50` giá trị chọn lựa trên cả 5 nhóm menu đọc được do cắt cụt/trống ở `BUG-07`+`BUG-08`); 3/39 control mobile <44 px (`BUG-19`); 14/14 phần tử tiếng Anh thiếu `lang="en"` (WCAG 3.1.2); 0 `prefers-reduced-motion`/`forced-colors`; Narrator chưa nghe thử; `D04` khóa tiếng Anh; thiếu khai báo Chromium ≥105. |
| **E8** | **Vệ sinh Repository, Bảo trì & Sẵn sàng Vận hành** | **9%** | `3.4` | `3.4 × 9 / 10` | **3.06** | **(+)** Runtime nhỏ gọn (`~0,46 MiB` / `473 KiB`); không phụ thuộc CDN. **(-)** `.gitignore` rỗng (`S-03`, bị test khóa cứng); `.gitattributes` thiếu `-text` & chính sách `*.png`; **1.139 PNG không dùng LFS (`264,41 MiB`)**; `13×–14×` bản sao mã nguồn (`113.797` LOC trùng); `1.879` LOC `*-profile21.mjs`; dung lượng phình `307,32 MiB` đĩa / `1,93 GiB` (`~2,07 GB` thập phân) kèm LFS (98,8% bloat); `18` tệp `*preimage*`/`*PREIMAGE*`; Electron phân mảnh 3 nhánh (P30/P31/P35) + khóa SHA P28 + ~262 MiB idle RAM; 0 crash logging; 0 CI/lint/typecheck/`requirements.txt`. |
| **TỔNG** | **Điểm Tổng Thể Dự Án (`E1`–`E8`)** | **100%** | — | `12.24 + 9.90 + 10.64 + 2.40 + 4.80 + 5.40 + 5.22 + 3.06` | **53.66 / 100** | **Chưa đạt chuẩn phát hành (`NO_GO`)** |

#### Phân Tách Chỉ Số: Lõi Phần Mềm Web vs Quản Trị–Pháp Lý–Vận Hành

| Cụm đánh giá | Tiêu chí cấu thành | Tổng trọng số | Điểm đạt | Quy đổi thang 100 | Diễn giải quản trị |
|---|---|---:|---:|---:|---|
| **Cụm 1 — Lõi Phần mềm Web (`src/` + `web/` + `test/`)** | `E1 + E2 + E3 + E6 + E7` | **69%** | `43.40 / 69.00` | **`62.90 / 100`** | Nền tảng kỹ thuật tốt (tất định + sandbox + A11y cơ bản); chỉ cần 1–2 sprint tập trung vá `BUG-01`..`BUG-11`, tối ưu hiệu năng và thêm CI/test hành vi là có thể đạt `> 80/100`. |
| **Cụm 2 — Pháp lý, Tài liệu & Vận hành Kho mã** | `E4 + E5 + E8` | **31%** | `10.26 / 31.00` | **`33.10 / 100`** | **Hố sâu rủi ro lớn nhất:** Kéo tổng điểm toàn dự án tụt gần `10` điểm và kích hoạt cổng chặn `NO_GO` tuyệt đối dù lõi phần mềm hoạt động ổn. |
| **Tổng cộng (`Cụm 1 + Cụm 2`)** | `E1`–`E8` | **100%** | `53.66 / 100.00` | **`53.66 / 100`** | Phản ánh chính xác khoảng cách giữa chất lượng nguyên mẫu và tiêu chuẩn sản phẩm/phát hành. |

---

### 4.2 Phân Tích SWOT & Ma Trận Mức Độ Trưởng Thành

#### Phân Tích SWOT

| **Điểm Mạnh (Strengths)** | **Điểm Yếu (Weaknesses)** |
|---|---|
| • Lõi event-sourced thuần túy, zero runtime deps, 100% tất định qua 15.600 bước fuzzing.<br>• Biên bảo mật offline cực tốt (29/29 HTTP probes, CSP thực thi, Electron 9 fuses, 0 XSS).<br>• Văn hóa trung thực học thuật & chống ảo giác (`65/65 HOLD`, fail-closed `NO DATA`).<br>• Phủ rộng 60 tập con FCV-588 + nền tảng giảng viên D15 (5 tab, 7 bài học, archive replay).<br>• Bộ test nền 618+13+6 xanh và nền tảng ARIA/tương phản tốt. | • **11 lỗi P1** (`0/50` giá trị menu đọc được, `autoGainOffset` chết, thước sâu lệch 43,5 px, nhảy cóc 53,80%, cá mất sau 46 s, `13/30` rò phím, `LEARN-07` luôn trượt).<br>• 45,1% tệp test phụ thuộc 556 regex thô; 0 CI/CD, 0 linter/typecheck.<br>• Đóng băng 1,65–2,27 s khi nhập archive 2.000 sự kiện hoặc chấm bài 1 h.<br>• Kho mã phình `1,93 GiB` (`~2,07 GB` thập phân) với 13–14 bản sao mã nguồn, 97,1% nhân bản `profile21`, 1.139 PNG thường.<br>• Electron phân mảnh 3 nhánh, khóa SHA P28, không có log sự cố. |
| **Cơ Hội (Opportunities)** | **Thách Thức / Nguy Cơ (Threats)** |
| • Sửa `BUG-01..BUG-11` và tối ưu `WeakMap` + 1× replay là các bản vá gọn, ROI cực cao (nhảy chất lượng ngay lập tức).<br>• Kiến trúc web không phụ thuộc rất phù hợp chạy offline trên máy tính phòng thực hành hàng hải cấu hình thấp (không cần nặng 262 MiB RAM của Electron).<br>• Tái cấu trúc `src/core/` sang thế giới 2D mở đường cho cụm `FCV-588 + AIS R5 + MDC-2060`. | • **Rủi ro pháp lý/DMCA ngay lập tức** nếu kho GitHub chứa `188,01 MiB` (`197,15 MB` thập phân) tài liệu OEM (`S-01`) ở chế độ công khai hoặc phân phối ra ngoài.<br>• `.gitignore` rỗng (`S-03`) dễ dẫn tới rò rỉ khóa bí mật/credentials khi có thêm cộng tác viên.<br>• Tự viết lại ECDIS `NS4000` từ đầu sẽ tiêu tốn nguồn lực cực lớn mà không có hải đồ ENC hợp pháp.<br>• Bẫy khóa SHA (`build-bundle.mjs`, PowerShell UIA) khiến mọi cải tiến tương lai bị tê liệt nếu không gỡ bỏ sớm. |

#### Ma Trận Mức Độ Trưởng Thành (5 Trục)

| Trục trưởng thành | Cấp độ hiện tại (1–5) | Trạng thái | Điều kiện lên cấp tiếp theo |
|---|---:|---|---|
| **1. Nguyên mẫu Lõi Web FCV-588** | **3,0 / 5** *(Defined Prototype)* | Dùng thử nội bộ có kiểm soát | Vá 11 lỗi P1 (`BUG-01..11`) kèm nâng cấp `profile22 → profile23`, tối ưu 6× replay & `WeakMap` hash, thêm test hành vi liên khung & CI Linux |
| **2. Độ Trung thực Trực quan & Miền** | **2,2 / 5** *(Synthetic Proxy)* | Nhận diện được bố cục tổng thể | Vá `BUG-02`/`07`/`08`/`12`/`14`, bổ sung thanh tiêu đề xanh, lấy mẫu Zoom từ 301 hàng thô, xác thực với máy FCV-588 thật |
| **3. Gói Desktop Electron Windows** | **2,0 / 5** *(Frozen POC)* | **`NO_GO`** | Hợp nhất P30+P31+P35 vào 1 cây `apps/`, gỡ khóa SHA P28, cập nhật gói npm, thêm crash log & `second-instance`, kiểm thử Narrator trực tiếp & ký số Authenticode |
| **4. Nền tảng Đa thiết bị (5 máy chờ)** | **1,0 / 5** *(Pre-Architecture)* | **`NOT_STARTED`** | Tách sạch FCV-588 khỏi `src/core/`, thiết kế thế giới 2D đa tàu + bus liên thiết bị + giao thức con trỏ/chạm, làm `AIS R5` đầu tiên |
| **5. Sẵn sàng Phát hành & Vận hành** | **1,5 / 5** *(Pre-Release Blocked)* | **CỨNG `NO_GO`** | Xử lý triệt để P0 (gỡ manual OEM & 8 ảnh thực địa chưa rõ quyền khỏi Git, thêm `LICENSE`/`NOTICE`, khôi phục `.gitignore` chuẩn, thêm `.gitattributes -text`, xóa 174 lần lộ PII trên 58 tệp + URL ChatGPT riêng tư, dựng CI) |

---

### 4.3 Cổng Chặn Phát Hành Không Thể Bù Trừ (Non-Compensable `NO_GO` Blockers)

Bất kể tổng điểm số là bao nhiêu, **4 cổng chặn cứng** sau bắt buộc giữ phán quyết **`NO_GO`** đối với mọi hình thức phát hành công khai hoặc bàn giao sản xuất:

1. **Cổng Pháp lý & Bản quyền (`S-01`, `S-02`, `D-12`):** Không được phép phát hành hay mở công khai kho Git khi còn chứa 23 PDF + 2 ZIP tài liệu OEM (`188,01 MiB` / `197,15 MB` thập phân / `197.145.926 byte` độc nhất, LFS), 8 ảnh chụp thực địa phần cứng FCV-588 chưa có hồ sơ xác nhận quyền, thiếu tệp `LICENSE`/`THIRD_PARTY_NOTICES`, và chưa xử lý nhãn hiệu `FURUNO` trên `web/index.html:44`.
2. **Cổng Bảo vệ Kho mã (`S-03`, `S-04`):** Không được mở cộng tác nhóm khi `.gitignore` còn rỗng (bị khóa bởi unit test) và còn `174` lần lộ đường dẫn PII (`42` dạng thô `\`/`Z10PAD~1` + `132` dạng JSON thoát `\\`) trên `125` dòng tại `58` tệp cùng URL ChatGPT riêng tư tại `VietMoPhongChoTatCaCacMay.md:1`.
3. **Cổng Chức năng Huấn luyện Cốt lõi (`BUG-01`..`BUG-11`):** Không được đưa vào giảng dạy học viên chính thức khi **`0/50` giá trị chọn lựa trên cả 5 nhóm Menu chính (`0/13` Sounder) đọc được**, `autoGainOffset` vô tác dụng, thước độ sâu sai `+5,44 m`, cá biến mất sau `46 s`, `13/30` overlay rò phím và bài học `LEARN-07` luôn chấm trượt khi làm đúng hướng dẫn.
4. **Cổng Phân phối Desktop Windows & Tuyên bố OEM (`P32`–`P34`, `FCV588_PUBLIC_CLAIM_POLICY`):** Bộ cài Electron vẫn `Authenticode: NotSigned` (0 chứng thư), chưa có xác nhận nghe đọc trực tiếp Narrator (`BLOCKED_HUMAN_SPEECH_CONFIRMATION`), và `65/65` tính năng vẫn `HOLD` (`hardwareValidated: false`, `firmwareInstalled: null`, Phase 6 `OPEN`) — cấm tuyệt đối mọi tuyên bố tương đương phần cứng thật.

---

### 4.4 Lộ Trình Khắc Phục Ưu Tiên Theo Giai Đoạn (`P0`–`P3`)

#### Giai đoạn P0 — Khẩn Cấp (Ngay lập tức, 1–3 ngày): Pháp Lý, Bảo Mật Kho Mã & Toàn Vẹn Đa Nền Tảng
1. **Gỡ bỏ hoàn toàn tài sản bản quyền OEM khỏi Git/LFS (`S-01`):** Dùng `git filter-repo` xóa lịch sử 23 PDF + 2 ZIP trong `sources/manuals/` và 8 ảnh trong `sources/FCV588_GiaoDienThucTeMay2016/` (chỉ giữ lại `MANIFEST.json`, `ARCHIVE_COVERAGE.json`, `README.md` và `VERIFICATION_RECEIPT.json` đã sửa đếm đúng 23 PDF độc nhất = `197.145.926 byte` / `188,01 MiB`). Lưu trữ tài liệu gốc ở kho nội bộ riêng tách khỏi GitHub.
2. **Bổ sung `LICENSE`, `THIRD_PARTY_NOTICES.md` & rà soát nhãn hiệu (`S-02`, `D-12`):** Chọn giấy phép rõ ràng cho kho mã, lập bảng ghi công cho runtime Electron/Chromium đóng gói trong bộ cài (và sinh SBOM tự động cho cây build npm), đồng thời thay `<span class="manufacturer-name">FURUNO</span>` (`web/index.html:44`) bằng nhãn trung tính (hoặc chỉ giữ lại khi có văn bản cho phép).
3. **Khôi phục `.gitignore` chuẩn từ `staging/github-prep-20261122/full-workspace-preimage-.gitignore` & cập nhật `test/research-inventory.test.mjs:81-86` (`S-03`):** Sử dụng mẫu gốc **76 dòng `staging/github-prep-20261122/full-workspace-preimage-.gitignore`** *(chú ý: KHÔNG dùng nhầm `staging/github-prep-20261122/.gitignore.preimage` 20 dòng vì tệp ngắn đó KHÔNG chứa `__pycache__/` hay `*.pyc`)* — tệp 76 dòng đã bao phủ đầy đủ `__pycache__/`, `*.pyc`, `/staging/`, `/docs/qa/*`, `/plans/**/*.png`, `/sources/manuals/*`, `*.exe`, `*.zip`, `*.pdf`, `/VietMoPhongChoTatCaCacMay.md`, `node_modules/`, `.env`, `*.key`, `*.pem`. Đổi `test/research-inventory.test.mjs:81-86` để **khẳng định các quy tắc bảo vệ bắt buộc phải tồn tại** thay vì bắt rỗng!
4. **Cấu hình `.gitattributes` đúng chuẩn & tẩy sạch toàn bộ `174` lần lộ PII + URL ChatGPT riêng tư (`S-04`):** Thêm `-text` cho các biên bản JSON/MD đã niêm phong SHA (hoặc chuẩn hóa công cụ hash đọc văn bản chuẩn hóa `\n`), quyết định chính sách LFS/lưu trữ ngoài cho `*.png`, **tẩy sạch CẢ hai dạng gạch chéo đơn `\` (`38` lần + `4` `Z10PAD~1` trên `19` tệp) lẫn dạng JSON thoát dấu gạch chéo kép `C:\\Users\\Z10PAD8C_Xuan2261` (`132` lần trên `83` dòng tại `39` tệp JSON bổ sung) — tổng `174` lần xuất hiện trên `125` dòng tại `58` tệp** (`docs/`: 44, `plans/`: 9, `staging/`: 5), đồng thời **xóa/che URL hội thoại ChatGPT riêng tư tại `VietMoPhongChoTatCaCacMay.md:1`** (hoặc loại trừ hẳn `VietMoPhongChoTatCaCacMay.md` khỏi Git theo `full-workspace-preimage-.gitignore`).

#### Giai đoạn P1 — Ngắn Hạn (1–2 tuần): Vá Toàn Bộ 11 Lỗi P1, Đồng Bộ Đặc Tả & Sửa 6 CLI `--check`
1. **Vá 2 lỗi hiển thị Menu chí mạng (`BUG-07`, `BUG-08`) kèm trình tự bất biến replay `profile22 → profile23`:**
   - Xóa `max-width: 48%;` trên `.lcd-menu-value` (`web/styles.css:175`) để mở lại toàn bộ `36/36` giá trị không trống trên cả 5 nhóm menu.
   - Trong `initialSettings()` (`src/devices/fcv588/model.mjs:67-96`), **CHỈ bổ sung đúng `12` khóa chọn lựa đang hoạt động bị bỏ sót** (`Sounder` 6: `zoomMode`, `colorErase`, `clutter`, `whiteLine`, `whiteMarker`, `bottomZone`; `Display` 6: `colors`, `depthSize`, `zoomMarker`, `fishSymbol`, `fishSize`, `colorBar`) và hiển thị gọn cho mục `D04` `System.language` đang vô hiệu hóa. **CẢNH BÁO QUAN TRỌNG: TUYỆT ĐỐI KHÔNG thay thế `System.draft: null` (`model.mjs:78`) bằng `"0"`**, vì `null` là cơ chế fail-closed có chủ đích bắt buộc cho `capabilities.mjs:35-37` (`BDS_DRAFT_MISSING`); thay vào đó hãy hiển thị `null` rõ ràng (vd `": --"`) trong `web/lcd-presentation.mjs:221`.
   - **Ràng buộc bất biến Replay bắt buộc (cho cả P1 #1 và P1 #3):** Fixture `test/fixtures/P24_PINNED_PRE_P23_PROFILE22_ENVELOPE_20261117.json` được ghim cứng SHA-256 (`a48c56d3856d...`, `profileRevision: "F1-public-reference-22"`, `sessionHash: "f0-fnv1a32-a429fc78"`) xuyên suốt các bộ test P24–P27 (`test/fcv588-p24-zoom-archive.test.mjs:31-36,50,63`, `p25`, `p26`, `p27`); `src/devices/fcv588/replay-compat.mjs:15` trỏ thẳng `F1-public-reference-22` vào `FCV588_ADAPTER` đang hoạt động, còn `src/core/session.mjs:182-186` băm toàn bộ `deviceState.settings`. Vì vậy **bắt buộc thực hiện theo đúng 4 bước an toàn:** (a) kéo việc tham số hóa factory `*-profile21.mjs` (`P2 #2`) lên **trước hoặc song song với P1 #1/#3** để KHÔNG tạo thêm bản sao 10 tệp thứ ba; (b) đóng băng một adapter tương thích `profile22` trong `src/devices/fcv588/replay-compat.mjs`; (c) nâng `FCV588_PUBLIC_PROFILE_REVISION` lên `F1-public-reference-23` và thêm bộ giải mã `profile22` trong `src/devices/fcv588/settings.mjs`; (d) cập nhật các bài test phiên sống đang ghim `F1-public-reference-22` trong khi giữ 100% các bài test archive ghim P24–P27 PASS nguyên vẹn.
2. **Vá 3 lỗi Toán học/Sonar cốt lõi (`BUG-01`, `BUG-02`, `BUG-03`, `BUG-06`):**
   - Nối `state.autoGainOffset` vào `effectiveGain()` (`src/core/scenario.mjs:214-218`).
   - Thống nhất hệ tọa độ trục Y giữa ảnh sonar, thước độ sâu (`projectFcvDepthTicks`), VRM, White Line và biểu tượng cá (dành thanh header riêng ở trên cùng, vẽ vùng sonar trong `[headerH, 640]`, làm tròn `Math.round()` vạch chia 1 px và di chuyển `[DEMO]` ra khỏi mốc đáy). **Lưu ý liên kết test:** `test/fcv588-public-channel-labels.test.mjs:34` đang khẳng định `assert.ok(scale[0].y >= 58)` — cần bắt đầu khung sonar thống nhất ngay dưới dải header để bảo toàn `y >= 58`, hoặc cập nhật đồng bộ khẳng định đó cùng viewport mới.
   - Đồng bộ `SOUNDER_COLUMN_SECONDS` với tốc độ cuốn của `advanceFcvPictureHistory` (loại bỏ bước nhảy `-53,80%`).
   - Cho đàn cá lặp chu kỳ theo `simTick % cycleSeconds` (hoặc tạo luồng cá vô hạn theo PRNG) để học viên luôn thực hành được báo động cá C01 sau 46 giây; thêm kẹp `>= 0` ở `sounderSourceRowForDepth` (`BUG-15`) và bọc kinh độ `[-180, +180]`.
3. **Vá 4 lỗi Máy trạng thái, Hiệu chuẩn & Bài học (`BUG-04`, `BUG-05`, `BUG-09`, `BUG-10`, `BUG-11`, `BUG-16`, `BUG-17`, `BUG-18`):**
   - *(Thực hiện trên nhánh revision `F1-public-reference-23` theo trình tự bất biến replay ở P1 #1 để không làm gãy P24–P27.)* Gom toàn bộ `30` trạng thái overlay vào một bộ chặn modal thống nhất (bảo vệ cả `power-hold`, `menu*`, `func*`, `range`, `gain`, `brill`, `mode`); cho xoay `GAIN` cập nhật `overlay.offset` khi hộp thoại Auto Gain đang mở; xóa `state.alarms` khi `POWER OFF` (`BUG-16`) và đồng bộ `state.alarms.activeIds`/`audible` ngay ở tầng reducer khi tắt profile lúc tạm dừng (`BUG-13(c)`, bổ trợ cho lớp bảo vệ LCD sẵn có tại `web/lcd-presentation.mjs:170-189`); cập nhật `syntheticConditions.speedKn` ngay khi bật/tắt `navigation` fixture (`BUG-17`).
   - Đưa `projectFcvCalibratedReadings` vào `NAV1`/`NAV2`, `RECEIVER STATUS` (dùng đúng `speedUnit`), `projectFcvZoom` (`fishSizeAdjust`) và hệ thống Báo động (`BUG-05`, `BUG-12`, `BUG-13(b)`), sửa `bottomType` đọc động từ `bottomClassification` thay vì đóng cứng `"Rock"` (`BUG-13(a)`), và vô hiệu hóa báo động/số đo khi `txPower="Off"` (`BUG-13(d)`).
   - Thêm `!startupPower` vào `src/core/lessons.mjs:240` (`BUG-09`), cho phép `cancel` nút nguồn lúc tắt máy (`BUG-20`), và sửa `Restore Defaults` / nút tắt VRM (`BUG-18`).
4. **Sửa 6 CLI `--check` & Đồng bộ Đặc tả (`D-01`–`D-15`):**
   - Tái tạo `docs/evidence/fcv588-public-menu-atlas.json` khớp P14 AP-1; đồng bộ ghi chú `B07`/`B19` vào `tools/build_fcv588_public_acceptance.mjs` (và chặn hiệu ứng phụ tự ghi khi import); sửa `fcv588_lcd_boundary_audit.mjs:60` dùng đường dẫn POSIX/Windows chéo nền tảng & cập nhật oracle sang `profile22`/`profile23`; cập nhật `README.md:46-116`, `FCV588_PUBLIC_REFERENCE_ACCEPTANCE.md`, đánh dấu `superseded` trên liên kết `FCV-588.md`/`scenario-matrix.md`; thêm bộ nhập `profile20` (và `profile22`) vào `settings.mjs`.
5. **Vá nhanh A11y & Trực quan (`BUG-19`, `BUG-14`, `BUG-12`):** Nâng chiều cao chạm `≥ 44 px` cho 3 `<input>` tab Archive trên mobile; gắn `lang="en"` cho 14 vùng tiếng Anh; thêm `@media (prefers-reduced-motion)` & `@media (forced-colors)`; gỡ khóa `coherentBottom` khỏi tạp âm bề mặt, thêm `?? 0` cho `frame.startDepthM`; lấy mẫu Zoom/Bottom Lock từ lưới thô `301` hàng và vẽ `White Line` bám đường đáy.

#### Giai đoạn P2 — Trung Hạn (2–4 tuần): Tối Ưu Hiệu Năng 10×–100×, Khử Trùng Lặp, Hợp Nhất Electron & Dựng CI
1. **Tối ưu Hiệu năng độ lời cao (Quick Wins 10×–100×):**
   - Memoize `adapterProfileHash(adapter)` và `fingerprint(scenario)` bằng `WeakMap` trong `src/core/session.mjs:51,54` (giảm `55,8%–93,7%`, đại diện **~71% CPU** mỗi `dispatch()`).
   - Dùng `settings !== lastSettingsRef` trong `persistSettingsAfterChange()` (`web/app.mjs:103-114`, nhanh hơn **`12.496×`**).
   - Cache khung Canvas đã raster hóa theo `(simTick, projectionKey, mode, palette)` để loại bỏ `7,78` lần `putImageData`/giây thừa khi `ui-tick` chạy.
   - Rút gọn nhập archive từ **6× replay → 1× replay** + lưu checkpoint mỗi 100 bước (giảm đóng băng từ **`2.272 ms → < 150 ms`**) và rút gọn `assessFcvLesson` từ **4 lượt → 1 lượt** (`1.892 ms → < 200 ms`).
   - Giới hạn hoặc chuyển `session.events` sang cấu trúc chunk/persistent để triệt tiêu vách đá `O(N²)` khi học trên 2 giờ.
2. **Xóa sạch trùng lặp & Nợ cấu trúc:**
   - *(Ưu tiên kéo lên trước/song song P1 #1/#3 để đóng băng `profile22` mà không nhân bản thêm 10 tệp mới)*: Gộp 10 tệp `src/devices/fcv588/*-profile21.mjs` (`1.879 wc -l` / `1.889 split LOC`, 97,1% trùng) thành 1 factory tham số hóa duy nhất giữ nguyên 100% hash fixture P14 và hỗ trợ đăng ký gọn `profile21`/`profile22` trong `replay-compat.mjs`.
   - Tách `web/app.mjs` (`1.491 wc -l` / `1.492 split LOC`) thành 4 module có export rõ ràng (`sonar-canvas-renderer.mjs`, `lcd-dialog-controller.mjs`, `d15-panel-controller.mjs`, `archive-controller.mjs`) và tách `reduceFcv588` (`CC=207`) theo từng nhóm overlay; sửa sạch **11 lỗi ESLint**, 1 lớp CSS thừa `.detent`, 2 lỗi bảo mật nhẹ `tools/server.mjs` (`S-06`) và `archive_reference_manuals.py` (`S-07`).
   - Xóa các thư mục bản sao `staging/` dư thừa (12 bản `src/`, 13 bản `web/`), di chuyển lịch sử QA/PNG nặng ra ngoài nhánh chính (Release artifacts / object storage), giảm dung lượng kho từ `1,93 GiB` (`~2,07 GB` thập phân) xuống `< 15 MiB`.
   - Gộp 13 script Playwright `V34`–`V36` trùng lặp (52,1%) thành 1 bộ runner tham số hóa hỗ trợ `--chrome` / tự dò Chrome trên Linux & Windows.
3. **Dựng CI/CD & Nâng chuẩn kiểm thử:**
   - Thêm GitHub Actions (Linux + Windows): chạy `node --check` toàn bộ 100% `.mjs`/`.cjs`, `eslint`, `npm test`, `python3 -B -m unittest`, toàn bộ `--check` generators, và bộ test hành vi mới cho cả 21 lỗi `BUG-01..BUG-21` (thay thế dần 556 regex thô bằng kiểm thử hành vi + DOM/Canvas thật). Thêm `requirements.txt` chuẩn cho Python.
4. **Hợp nhất & Cứng hóa thật cho Electron (hoặc cân nhắc ưu tiên PWA/Browser cục bộ):**
   - Hợp nhất P30 (`apps/`) + P31 (`setAccessibilitySupportEnabled`) + P35 (`web/index.html`) thành một cây duy nhất đọc trực tiếp từ `src/`+`web/` (không sao chép tay); gỡ bỏ khóa cứng SHA P28 trong `build-bundle.mjs`; cập nhật PowerShell UIA sang nhãn P35; thay `window.confirm()` chặn renderer (`apps/fcv588-electron-p30/web/desktop-settings.mjs:49`) bằng hộp thoại nội tuyến và đồng bộ bộ giải mã `profile20`/`profile22` trong `desktop-settings-core.mjs:7-9`; thêm `second-instance` handler & log sự cố (`render-process-gone`, `uncaughtException`); nâng cấp `electron-builder`/gói npm xử lý 6 gói `deprecated` & 6 lỗ hổng `moderate`; đo benchmark dưới tải Canvas sống.

#### Giai đoạn P3 — Dài Hạn (1–3 tháng+): Kiến Trúc Đa Thiết Bị & Xác Thực Phần Cứng / Phát Hành
1. **Tái cấu trúc `src/core/` đạt chuẩn `ADR-0001` thực sự trước khi thêm thiết bị #2:**
   - Di chuyển toàn bộ hằng số sonar FCV-588 ra khỏi `src/core/{scenario,protocol,lessons,device-runtime}.mjs` về `src/devices/fcv588/`.
   - Thiết kế **Mô hình Thế giới 2D Đa tàu & Môi trường** (tàu mình có bánh lái/máy/HDG/COG/SOG, đội tàu mục tiêu MMSI/ARPA, đường bờ/độ sâu 2D), **Giao thức Đầu vào mở rộng** (con trỏ 2D/bi xoay, chạm màn hình, bàn phím chữ-số, thanh gạt analog), **Bus liên thiết bị chuẩn NMEA-0183/2000 nội bộ** và **Vỏ Web hỗ trợ plugin nhiều thiết bị**.
2. **Thứ tự triển khai 5 thiết bị thực tế:**
   - **(1) `AIS R5`** *(sau khi chốt bản SUPREME hay SOLID)* — độ phức tạp vừa phải, chứng minh bus đa thiết bị `AIS R5 + FCV-588`.
   - **(2) `KODEN MDC-2060`** *(sau khi xin phép/giải quyết điều khoản bản quyền KODEN & chốt Rev14/15)* — xây dựng động cơ Radar PPI cực.
   - **(3) `FURUNO FAR-2127`** *(sau khi chốt RCU-014/015)* — cân nhắc cấp phép `PC21X7` hoặc tái sử dụng động cơ Radar từ MDC-2060.
   - **(4) `Transas / Wärtsilä NS4000`** — **KHÔNG tự viết lại**; sử dụng trình huấn luyện chính hãng / Mintra hoặc tiêm NMEA vào máy thật kiểu Vimaru.
   - **(5) `KODEN J2000`** — giữ `IDENTITY_HOLD` cho tới khi xác minh ảnh biển tên vật lý.
3. **Đóng cổng phát hành sản phẩm (nếu triển khai rộng rãi):** Thực hiện kiểm định thực địa trên máy FCV-588 thật (xác nhận firmware, thời gian thực tế, tiếng Việt `D04`), tổ chức phiên nghe kiểm định trực tiếp bằng Narrator/NVDA, và mua chứng thư Authenticode ký số bộ cài Windows NSIS trước khi chuyển trạng thái từ `NO_GO` sang `GO`.

---

## Phụ Lục A — Bảng Lệnh Kiểm Chứng & Tái Hiện Read-Only

Tất cả các lệnh dưới đây chạy tại `/home/antigravity/xuan2261/MoPhongMayTrenTau` theo chế độ **chỉ-đọc** (luôn tách `TMPDIR` ra ngoài kho mã và dùng `PYTHONDONTWRITEBYTECODE=1 python3 -B` để không tạo `__pycache__/`):

```bash
# 1. Xác minh cây làm việc sạch (0 sửa đổi tracked files, 0 __pycache__)
git status -sb && git diff --stat
find . -maxdepth 4 \( -name '__pycache__' -o -name '*.pyc' \)

# 2. Chạy toàn bộ bộ kiểm thử chuẩn (Node 618 + Python 13 + Asset Gate 54 + Electron 6 + 2 Python --check)
SCRATCH="/home/antigravity/.gemini/jetski/scratch/teamwork_tmp/verify_audit"
mkdir -p "$SCRATCH" && chmod 700 "$SCRATCH"
TMPDIR="$SCRATCH" npm run check
PYTHONDONTWRITEBYTECODE=1 python3 -B -m unittest discover -s test -v
node tools/verify_public_runtime_assets.mjs
node --test apps/fcv588-electron-p30/desktop/settings-transfer.test.mjs \
            apps/fcv588-electron-p30/test/fcv588-p28-mode-replay-matrix.test.mjs
PYTHONDONTWRITEBYTECODE=1 python3 -B tools/build_fcv588_public_trace.py --check
PYTHONDONTWRITEBYTECODE=1 python3 -B tools/build_fcv588_feature_register.py --check

# 3. Tái hiện 6 công cụ CLI FAIL trên Linux
node tools/build_fcv588_public_menu.mjs --check                                   # RC=1 (12/13 Sounder drift)
node tools/build_fcv588_public_acceptance.mjs --check                             # RC=1 (B07/B19 drift)
node tools/fcv588_lcd_boundary_audit.mjs --self-test                              # RC=2 (C:/outside POSIX)
node tools/fcv588_lcd_boundary_audit.mjs                                          # RC=2 (profile-20 vs 22)
PYTHONDONTWRITEBYTECODE=1 python3 -B tools/build_fcv588_visual_atlas.py --check --checkpoint V27  # RC=1 (CRLF->LF)
PYTHONDONTWRITEBYTECODE=1 python3 -B tools/build_fcv588_visual_atlas.py --check --checkpoint V28  # RC=1 (CRLF->LF)
PYTHONDONTWRITEBYTECODE=1 python3 -B tools/verify_reference_manuals.py            # RC=1 (missing pypdf + LFS)
PYTHONDONTWRITEBYTECODE=1 python3 -B tools/historical_stage_coldstore.py verify   # RC=1 (LFS pointer SHA)

# 4. Tái hiện nhanh các lỗi P1 tiêu biểu (BUG-01, BUG-02, BUG-06, BUG-08, BUG-09, BUG-10, BUG-11, BUG-15)
node --input-type=module -e '
import {TRAINING_SCENARIO, initialWorldState, advanceWorld, observeSounder, observeTrainingStatus, sounderSourceRowForDepth} from "./src/core/scenario.mjs";
import {createSession, dispatch} from "./src/core/session.mjs";
import {assessFcvLesson} from "./src/core/lessons.mjs";
import {FCV588_ADAPTER} from "./src/devices/fcv588/adapter.mjs";
import {initialFcv588State} from "./src/devices/fcv588/model.mjs";
import {FCV_MENU_CATEGORIES, getFcvMenuItems} from "./src/devices/fcv588/menu-atlas.mjs";
import {projectFcvEcho, depthFractionOnFcvFrame} from "./src/devices/fcv588/echo-projection.mjs";
import {projectFcvDepthTicks} from "./web/lcd-presentation.mjs";
const go = (s, arr) => arr.reduce((a, i) => dispatch(a, FCV588_ADAPTER, i, TRAINING_SCENARIO), s);
const w0 = initialWorldState(TRAINING_SCENARIO), obs0 = observeSounder(TRAINING_SCENARIO, w0, {columns:120, rows:301}), sBase = initialFcv588State();
const eM = projectFcvEcho(obs0, {...sBase, gainMode:"fishing", autoGainOffset:-5});
const eP = projectFcvEcho(obs0, {...sBase, gainMode:"fishing", autoGainOffset:+5});
console.log("BUG-01 pixelsIdentical:", Buffer.from(eM.pixels).equals(Buffer.from(eP.pixels)), "keyDiff:", eM.projectionKey !== eP.projectionKey);
const t20 = projectFcvDepthTicks({startDepthM:0, rangeM:80}, {height:640, top:62, bottom:12}).find(t=>t.depthM===20);
console.log("BUG-02 sonar20Y:", depthFractionOnFcvFrame({startDepthM:0,rangeM:80},20)*640, "tick20Y:", t20.y);
console.log("BUG-06 tick47 fishPresent:", observeTrainingStatus(TRAINING_SCENARIO, advanceWorld(TRAINING_SCENARIO, w0, 47)).fishPresent);
const missing = FCV_MENU_CATEGORIES.flatMap(c => getFcvMenuItems(c, sBase).filter(i => i.kind==="choice" && (sBase.settings[i.settingKey]===undefined || sBase.settings[i.settingKey]===null)).map(i => `${c}.${i.settingKey}=${sBase.settings[i.settingKey]}`));
console.log("BUG-08 blank choices (12 active omitted + 1 D04 language + 1 intentional draft=null):", missing.length, missing);
const s09 = go(createSession(FCV588_ADAPTER, TRAINING_SCENARIO), [
  {kind:"down",control:"power"},{kind:"up",control:"power",durationMs:80},{kind:"tick",steps:4},
  {kind:"down",control:"power"},{kind:"up",control:"power",durationMs:80},
  {kind:"down",control:"power"},{kind:"up",control:"power",durationMs:80},{kind:"press",control:"enter"}]);
console.log("BUG-09 LEARN-07:", assessFcvLesson(s09, "FCV588-LEARN-07", {startSeq:0}).reasons, "brightness:", s09.deviceState.brightness);
const on = go(createSession(FCV588_ADAPTER, TRAINING_SCENARIO), [{kind:"down",control:"power"},{kind:"up",control:"power",durationMs:80},{kind:"tick",steps:4}]);
console.log("BUG-10 power-hold after MENU+cancel:", go(on, [{kind:"press",control:"menu"},{kind:"down",control:"power"},{kind:"press",control:"menu"},{kind:"cancel",control:"power"}]).deviceState.overlay);
const s11 = go(on, [{kind:"push",control:"gain"},{kind:"rotate",control:"gain",steps:3}]);
console.log("BUG-11 GAIN rotate->ENTER:", s11.deviceState.autoGainOffset, "->", dispatch(s11, FCV588_ADAPTER, {kind:"press",control:"enter"}, TRAINING_SCENARIO).deviceState.autoGainOffset);
console.log("BUG-15 row(-5):", sounderSourceRowForDepth(obs0, -5));
'

# 5. Chứng minh lỗi Mixed-EOL (\r\n + \n) trên biên bản P30 & kiểm toán số học điểm E1-E8
PYTHONDONTWRITEBYTECODE=1 python3 -B -c '
import hashlib, pathlib
raw = pathlib.Path("docs/qa/FCV588_ELECTRON_P30_INSTALLER_20261121/FCV588_P30_ELECTRON_INSTALLER_INDEPENDENT_SHA_POSTRECEIPT_20261121.json").read_bytes()
exp = "bf1f7b322e795e6ddb83070048ebfc10f3356626a72d224a6026a92dcdeee4a5"
print("P30_POST LF:", hashlib.sha256(raw).hexdigest()==exp,
      "CRLF:", hashlib.sha256(raw.replace(b"\n",b"\r\n")).hexdigest()==exp,
      "MIXED:", hashlib.sha256(raw.rstrip(b"\n").replace(b"\n",b"\r\n")+b"\n").hexdigest()==exp)
'
node -e '
const d=[[18,6.8],[18,5.5],[14,7.6],[12,2.0],[10,4.8],[10,5.4],[9,5.8],[9,3.4]];
console.log("Weight:", d.reduce((a,[w])=>a+w,0), "Total:", +d.reduce((a,[w,s])=>a+w*s/10,0).toFixed(2));
'

rm -rf "$SCRATCH"
```

---

## Phụ Lục B — Giới Hạn Phạm Vi & Điều Kiện Mất Hiệu Lực Báo Cáo

1. **Ràng buộc môi trường Linux container:** Không có `git-lfs`, `pypdf`, `pwsh`, hay môi trường Windows/Electron thực thi trên máy kiểm toán. Do đó:
   - Toàn bộ **47 đối tượng Git LFS** (23 `.pdf`, 20 `.zip`, 4 `.exe`, tổng `1.664,61 MiB` danh nghĩa) được kiểm toán qua header con trỏ LFS, manifest (`MANIFEST.json`, `VERIFICATION_RECEIPT.json`, `ARCHIVE_COVERAGE.json`) và mã nguồn/biên bản QA niêm phong chứ không mở trực tiếp tệp nhị phân.
   - Ứng dụng Electron Windows (`apps/fcv588-electron-p30/` và `staging/*p31*`) được kiểm toán toàn bộ 100% mã nguồn/script/lockfile và biên bản QA P29–P36, chưa chạy thử tệp `.exe` trực tiếp.
   - Đánh giá bảo mật phụ thuộc npm dựa trên biên bản `npm audit` của P30 (`0` runtime / `6` moderate dev) cộng quét tĩnh toàn bộ `package-lock.json` (`6` gói deprecated; toàn bộ `315/315` mục đều mang cờ `"dev": true` với `0` phụ thuộc npm runtime và lược bỏ trường `"license"` theo định dạng rút gọn npm lockfile v3), không truy vấn cơ sở dữ liệu CVE trực tuyến thời gian thực.
2. **Không có phần cứng FURUNO FCV-588 thực tế & Ảnh đối chiếu từ 1 thiết bị đơn lẻ:** 8 ảnh trong `sources/FCV588_GiaoDienThucTeMay2016/` là ảnh chụp thực địa bằng điện thoại một máy FCV-588 tiếng Việt lắp trên vách tàu/phòng thực hành đang chạy ở vùng nước ~`20 m` (không có ảnh `Bottom Zoom`, `Marker Zoom`, `A-Scope`, hay `Bottom Discrimination`, chưa rõ phiên bản firmware). Mọi đánh giá trực quan là so sánh thực nghiệm với ảnh máy thực địa đó, không thay thế kiểm định nhà sản xuất.
3. **Khả năng hiển thị kho GitHub (Public vs Private):** Không thể xác định quyền hiển thị công khai hay riêng tư của kho remote từ cấu hình Git cục bộ. Cần tách bạch rõ hai kịch bản pháp lý cho `S-01`: nếu kho ở chế độ **công khai (public)** hoặc chia sẻ cho bên thứ ba, việc lưu 23 PDF + 2 ZIP tài liệu OEM (`188,01 MiB`) cấu thành hành vi **tái phân phối không phép — cổng chặn `NO_GO` tuyệt đối**; ngược lại, một bản sao lưu cá nhân trong kho **riêng tư (private) một chủ sở hữu** có mức rủi ro pháp lý khác biệt rõ rệt và không thể kết luận chắc chắn là vi phạm điều khoản khi chưa biết trạng thái hiển thị remote, tuy nhiên vẫn cần gỡ tài sản bản quyền bên thứ ba khỏi lịch sử Git/LFS trước bất kỳ hình thức cộng tác hay phát hành nào.
4. **Hiệu năng Canvas phần mềm trên Headless Chrome Linux:** Số đo `90,41 ms`/lượt vẽ `DUAL` trên headless Chrome (`--disable-gpu`) sẽ thấp hơn trên máy Windows có tăng tốc GPU, tuy nhiên phần CPU thuần JS (`rasterizeFcvEcho` `32,99 ms`, nhập archive `1.653–2.272 ms`, chấm bài `1.892 ms`, `O(N²)` `756,77 ms`) là giới hạn CPU độc lập nền tảng và ảnh hưởng trực tiếp tới mọi máy lớp học.
5. **Điều kiện làm mất hiệu lực báo cáo:** Bất kỳ commit mới nào sau `9b89309` sửa đổi `src/`, `web/`, `test/`, `tools/`, `apps/`, `staging/`, `.gitignore`, `.gitattributes`, `docs/evidence/*.json`, chạy `git filter-repo` / `git lfs pull` / `npm ci`, hoặc thực hiện kiểm định phần cứng/Windows mới sẽ làm thay đổi các số dòng, số đo hiệu năng, danh mục lỗi và điểm đánh giá trong báo cáo này — cần chạy lại Phụ lục A để cập nhật.
