# MoPhongMayTrenTau — PUBLIC_REFERENCE maritime training simulators

This workspace develops a **training-only** collection of marine-instrument UI simulators. The target is to reproduce the operation sequences of a specific hardware model/controller/firmware, **not** to provide navigation, depth measurement or real-ship decision support.

## FURUNO FCV-588 Standalone Simulator — v1.0.1 Complete (`v1.0.1-fcv588`)

Sản phẩm mô phỏng độc lập **Máy Đo Sâu Dò Cá FURUNO FCV-588** đã hoàn thiện khép kín 100% (`65/65` tính năng theo ma trận kiểm chứng, `0 NOT_IMPLEMENTED`, profile `F1-public-reference-24`), hỗ trợ **3 định dạng chạy độc lập 100% offline** (tải trực tiếp tại [GitHub Releases `v1.0.1-fcv588`](https://github.com/xuan2261/MoPhongMayTrenTau/releases/tag/v1.0.1-fcv588) hoặc tự đóng gói cục bộ):

| Định dạng phát hành | Tệp đích | Cách sử dụng |
| --- | --- | --- |
| **1. Windows Portable (`.exe` duy nhất)** | `FCV-588-Portable-1.0.1-win-x64.exe` | Tải về nhấp đúp chạy ngay trên Windows 10/11 (x64), không cần cài đặt hay Node.js, tích hợp biểu tượng FCV-588 riêng (`16–256 px`). |
| **2. Bộ cài đặt Windows NSIS (`.exe`)** | `FCV-588-Setup-1.0.1-win-x64.exe` | Trình cài đặt chuẩn Windows, cho phép chọn thư mục cài và tự động tạo biểu tượng **FURUNO FCV-588 Simulator** ngoài Desktop & Start Menu. |
| **3. Tệp đơn đa nền tảng (`.html`)** | `FCV-588-Standalone.html` | 1 tệp HTML duy nhất (~750 KB, khóa cứng CSP offline `connect-src 'none'`, nhúng trọn bộ ESM + CSS + SVG icon), mở trực tiếp qua `file://` trên Windows / macOS / Linux. |

### Chạy nhanh & Đóng gói trên máy cục bộ

- **Windows (nhấp đúp 1 chạm):**
  - `Chay-FCV588.bat` — Tự mở cửa sổ ứng dụng FCV-588 độc lập (hỗ trợ cả đường dẫn chứa dấu cách, tự biên dịch `dist\FCV-588-Standalone.html` nếu chưa có).
  - `DongGoi-BoCai-FCV588.bat` — Tự đóng gói trọn bộ `FCV-588-Standalone.html` + `FCV-588-Portable-1.0.1-win-x64.exe` + `FCV-588-Setup-1.0.1-win-x64.exe`.
- **Dòng lệnh đa nền tảng (Node.js 22+):**
  ```bash
  npm run build:standalone   # Xuất dist/FCV-588-Standalone.html (~750 KB)
  npm start                  # Chạy máy chủ huấn luyện cục bộ tại http://127.0.0.1:4173
  npm run check              # Kiểm tra cú pháp + chạy toàn bộ bộ kiểm thử Node
  ```

### Điểm nổi bật của bản hoàn thiện FCV-588 v1.0.1

- **Mặt máy & LCD chuẩn thực tế:** Viền đen `FURUNO`, cụm phím đồng tâm `MENU/ESC` · `TrackPad` · `ENTER`, núm xoay `GAIN` (`PUSH TO AUTO`, nhấp dấu `−`/`+`, kéo chuột, cuộn chuột) và `MODE` (nhấp đơn xem trước, nhấp đúp chuyển tức thời), nút nguồn viên thuốc xanh dương `BRILL`, thanh trạng thái xanh dương đặc (`MAN_R G: 10 LF/HF ... 13.6V`), số độ sâu viền trắng Halo cỡ lớn, `White Line: Edge` (`Bien`) bám sát địa hình đáy và màn khởi động FURUNO tương phản cao trên mọi bảng màu.
- **Song ngữ Việt – Anh triệt để 100% (`D04 Tieng Viet` & `English`):** Việt hóa toàn diện 5 nhóm Menu chính, mọi menu con (`THANG DO`, `DON VI`, `HIEU CHUAN`, `CAI DAT`, `O DU LIEU NAV1/NAV2`, `BAO DONG 1..5`, `PHIM FUNC`), dải báo động LCD, hộp dữ liệu phụ, `GAIN`, `MODE`, `RANGE` kèm chu trình khởi động lại 4 nhịp đúng thực tế.
- **Âm thanh phần cứng Web Audio Buzzer (`Loa máy: BẬT / TẮT`):** Tái tạo tiếng *pip* đôi khi bật máy, *pip* hạ tần khi tắt máy, phân biệt rõ `He thong > Tieng Phim: Tat` (click cơ học nhẹ) với `Bat` (tiếng *bíp* piezo `2420 Hz`), nấc xoay núm cơ học và còi báo động ngắt quãng 2 xung (`ALARM1..5`, `ARRIVAL`) tắt còi khi nhấn phím cứng bất kỳ theo manual `OME-23890-E §1.18`.
- **Không gian làm việc ổn định tuyệt đối (`0.00px` CLS):** Thanh trạng thái nguồn neo cố định bên dưới chân đế máy không gây giật/lệch vùng nhìn mặt máy; hỗ trợ `Tập trung vào máy`, `Toàn màn hình (F11)` đồng bộ cả trình duyệt lẫn Electron `.exe`, Lưu/Nạp cấu hình `.json` tức thời ngay cả khi máy đang bật, và Xuất/Phát lại phiên Replay tất định.

> **Lưu ý an toàn bắt buộc:** Phần mềm chỉ phục vụ huấn luyện và giảng dạy mô phỏng độc lập (`TRAINING ONLY`), không kết nối đầu dò/GPS/NMEA thực tế và tuyệt đối không dùng để dẫn tàu.

## KODEN MDC-2060 Marine Radar Simulator — Public Reference (MRD-104 / RB717A)

Mô phỏng độc lập **Radar hàng hải KODEN MDC-2060** (màn hình dọc `MRD-104` 10.4" + anten quét hở `RB717A` 6 kW, hồ sơ `koden.mdc2060.mrd104` / `F1-mdc2060-public-ref-1`, trạng thái `F1_PUBLIC_REFERENCE_PARTIAL`, `releaseApproval: HOLD`), chạy **100% offline** với **0 phụ thuộc runtime npm** trên cùng lõi đa thiết bị `src/core/maritime-world.mjs`.

### Chạy nhanh & Kiểm thử cục bộ

- **Windows (nhấp đúp 1 chạm):** `Chay-MDC2060.bat` — Tự biên dịch `dist\MDC-2060-Standalone.html` nếu chưa có và mở cửa sổ ứng dụng độc lập (dự phòng máy chủ cục bộ `http://127.0.0.1:4173/mdc2060`).
- **Dòng lệnh đa nền tảng (Node.js 22+):**
  ```bash
  npm run build:standalone:mdc2060   # Xuất dist/MDC-2060-Standalone.html (~970 KB, 30 mô-đun ESM, CSP connect-src 'none')
  npm start                          # Mở giao diện huấn luyện tại http://127.0.0.1:4173/mdc2060
  npm run test:e2e:mdc2060           # Chạy trọn bộ 278 bài kiểm thử hộp đen E2E (Tiers 1–4, gồm Headless Chrome CDP)
  ```

### Khả năng mô phỏng nổi bật

- **Mặt máy `MRD-104` (`480×640`) & Anten `RB717A`:** 18 thang đo `0.0625–64 NM`, 4 chế độ hướng (`H-UP`, `N-UP`, `C-UP`, `W-UP`), chế độ chuyển động (`RM`/`TM`), bố cục `PPI` / `PPI/PPI` / `PPI/NAV`, đếm ngược nung magnetron 120 giây chuẩn kèm tùy chọn giảng viên `Fast Preheat 5s` và `Skip Preheat`.
- **Tín hiệu radar, khử nhiễu & đo đạc:** Xử lý tín hiệu cực (`GAIN`/`STC`/`FTC`/`IR`/`EXP`), bóng khuất địa hình, 4 bảng màu gốc; đo phương vị và cự ly qua `EBL1/2`, `VRM1/2`, đường chỉ số song song `PI`, đo 2 điểm và `HL OFF`.
- **Mục tiêu `ATA` / `AIS` & vùng cảnh giới:** Theo dõi `ATA` tối đa 50 mục tiêu (`CPA`/`TCPA`, bản tin `$RATTM`), lớp phủ `AIS` tối đa 100 mục tiêu và `Guard Zone` (`IN`/`OUT`).
- **Liên thông cầu tàu & giảng dạy D15:** Đồng bộ thời gian thực với `FURUNO FCV-588`, chuyển đổi `EN/VI` trên màn hình LCD, bảng giảng viên D15 5 tab tiếng Việt (3 kịch bản, 7 bài học chấm điểm tất định `MDC2060-LEARN-01..07` và phát lại `Replay` tất định).

> **Lưu ý an toàn & trung thực bắt buộc:** Bản mô phỏng chỉ dùng cho huấn luyện (`PUBLIC REFERENCE / NOT HARDWARE VALIDATED / TRAINING ONLY`, `releaseApproval: HOLD`, chưa xác thực phần cứng/firmware thực tế), không chứa tài liệu/nhị phân OEM và tuyệt đối không dùng cho hàng hải thực tế.

---

## Historical scoped checkpoint (2026-11-22, P36 + P0 hygiene; pre-v1.0.0 archive note)

- The main `src/` + `web/` application is an offline, synthetic, browser-based FCV-588 training simulator (`54` verified public runtime files, active profile `F1-public-reference-22`+). P36 independently checked LIVE LF-ZOOM/HF-ZOOM Bottom Zoom in headless Chrome at 1366x768 and 1920x1080: 4/4 cases and 208/208 actual localhost source-body SHA checks passed, with 54/54 isolated-stage runtime hashes unchanged. See `docs/qa/FCV588_P36_LIVE_BOTTOM_ZOOM_20261122/` for the original local receipts.
- Windows Electron P30 **historical source snapshot** is stored in `apps/fcv588-electron-p30/`. Historical source, package locks, installers and ZIP evidence remain under `staging/` and `docs/qa/`; regenerable `node_modules` and test-owned Chromium profiles were removed in the 2026-11-22 cleanup. Restore dependencies using `npm ci` in the corresponding staging root when necessary. The P30 `npm run bundle:offline` verifies the pinned P28 source. P31 is installed locally for testing; P32 release assessment remains **NO_GO**. Committing installer evidence does not constitute an approved release.
- **All 65 feature claims remain HOLD**, Phase 6 remains OPEN, installed OEM firmware and hardware fidelity are unverified, third-party media rights are restricted and `releaseApproval=HOLD`. Narrator's *audible* speech still needs human confirmation. Passing synthetic QA does not prove equivalence to a physical FURUNO unit.
- **Repository & Git hygiene boundary:** The workspace was initialized as a Git repository (`9b89309`) and pushed to `xuan2261/MoPhongMayTrenTau` as a development workspace (**not** an approved product or classroom release). Root `.gitignore` enforces exclusions for regenerable build caches (`node_modules/`, `__pycache__/`, `*.pyc`), local secrets (`.env`, `*.key`, `*.pem`), `.agents/`, and rights-restricted OEM manuals/field photographs (`sources/manuals/**/*.{pdf,zip}`, `sources/FCV588_GiaoDienThucTeMay2016/*.jpg`), while keeping `docs/reports/` unblocked. `.gitattributes` routes large binary archives to Git LFS and marks SHA-sealed QA JSON receipts and test fixtures `-text` so cross-OS checkouts do not corrupt line-ending digests.
- **Historical stages preserved:** `staging/github-prep-20261122/HISTORICAL_STAGES_DEDUP_20261122.zip` replaces the older 753 MiB P13/P14/P15 snapshot and 37 loose legacy staging folders. It contains 19,502 complete file records from 40 stage roots with 2,950 unique SHA-256 blobs and metadata for 24 NTFS junctions; archive size is ~241.66 MiB. All 2,950 blob hashes and 19,502 restored file hashes were checked independently, and the live originals matched 19,502/19,502 before retirement. Restore one or more roots using `tools/restore_historical_stages_20261122.ps1 -StageNames @('staging/fcv588-v41-oem-sounder-labels')`, or restore P13-P15 with `tools/restore_p13_p15_stage_snapshots.ps1`. Historical scripts that refer to archived staging paths require restoration first. Older manifest/cleanup receipts remain as history; the original large P13/P14/P15 ZIP has been superseded and removed.
- **Publication & rights gate (NOT RELEASE APPROVED):** Repository synchronization to GitHub is for development version control only and is **not** a public release or redistribution license. Before any public distribution or classroom deployment, review repository visibility, `LICENSE`, `THIRD_PARTY_NOTICES.md`, OEM copyright restrictions (`not_an_approval_to_redistribute: true`), and open audit gates in `docs/reports/COMPREHENSIVE_PROJECT_REVIEW_AUDIT_EVAL_2026-11-22.md`.
- **Additional disk cleanup 2026-11-22:** removed 19,742 regenerable files (three Electron `node_modules` trees and 21 isolated QA Chromium profiles). The historical P29 unpacked application was verified byte-for-byte (73/73 SHA) against `docs/qa/FCV588_ELECTRON_POC_20261121/P29_FCV588_ELECTRON_PORTABLE_WIN_X64_20261121.zip` and its loose `dist/` was removed. Four P30/P31 `win-unpacked/` trees (293 files) were archived with complete SHA verification in `staging/github-prep-20261122/ELECTRON_UNPACKED_P30_P31_ARCHIVE_20261122.zip` and their loose copies removed. Use `tools/restore_electron_unpacked_20261122.ps1` for an explicit restoration before a historical EXE-based QA rerun. Installer EXEs, source and final QA receipts are preserved; the archived unpacked builds are **not** a new approved release. Deletion receipts are in `staging/github-prep-20261122/`.
- **Final QA-profile sweep & PII scrub:** removed four previously missed test-owned Chromium profiles under P29/P33 (289 regenerable files, ~32.58 MiB), recorded in `staging/github-prep-20261122/ADDITIONAL_CHROMIUM_PROFILES_CLEANUP_20261122.json`, and scrubbed workstation user-profile paths (`<USER_PROFILE>`) and private chat URLs across text documentation/receipts.

## Historical status (FCV-588 public-reference V31, 2026-10-16; superseded)

- **FURUNO FCV-588**: interactive offline original-art classroom simulator,
  historical profile `F1-public-reference-20` at V31 (superseded by AP-1 Sounder order and photo-reference checkpoints up to P36 / `F1-public-reference-22`+), scenario v7, settings schema18. It
  supports physical keys/TrackPad/hold and direct pointer-drag rotary input,
  LF/HF/DUAL/Zoom,
  source-gated synthetic sonar/alarms/NAV, protected IEC/NMEA settings,
  deterministic replay and **seven instructor D15 lessons**.
  Current 64 operator functions + separate D15:
  60 operator synthetic subsets, 3 partial (C11/D09/D14), 1 not implemented
  (D04), plus the separate synthetic D15 platform (5 ARIA tabs, offline archive sidecar & Bottom Zoom viewer).
  D09 is held by default unless an instructor explicitly declares an
  **optional synthetic Tankenmaru fixture**, never hardware entitlement.
  At phone widths the **training-only** face reflows to preserve a readable
  LCD and touch controls, explicitly **not OEM bezel geometry**.
  Every public-release claim remains **HOLD**.
- **MDC-2060, FAR-2127, AIS R5, NS4000**: profiles are held for later independent validation; no working UI is claimed.
- **KODEN J2000**: model identification is unresolved, status `HOLD`.
- **Dependency boundary:** The core browser simulator (`src/` + `web/` + `tools/server.mjs`) uses **zero third-party runtime npm packages**, and no hardware drivers, serial ports, NMEA transmitters, network publishers, live AIS or real equipment. The optional historical Windows Electron shell (`apps/fcv588-electron-p30/`) uses pinned third-party build/packaging `devDependencies` (`electron`, `electron-builder`, `@electron/fuses`, `@electron/packager`, `playwright-core`); see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Start locally

Requires **Node.js 22 or newer** (plus Python 3.12+ for Python QA/ledger checks) and a modern browser supporting CSS Container Queries (`cqw`) and `:has()` (Chromium/Edge ≥ 105, Firefox ≥ 121, Safari ≥ 16). From the repository root:

```bash
npm run check
PYTHONDONTWRITEBYTECODE=1 python3 -B -m unittest discover -s test -v
npm start
```

Open `http://127.0.0.1:4173` (FURUNO FCV-588) or `http://127.0.0.1:4173/mdc2060` (KODEN MDC-2060). The local server listens strictly on loopback (`127.0.0.1`), blocks dotfile segments and oversized payloads (>4 MiB), and serves only whitelisted `/web` and `/src` assets under strict offline CSP (`connect-src 'none'`). **For offline training only — NOT FOR MARINE NAVIGATION.**

Current verification baseline: `npm run check` validates syntax across all `src/**/*.mjs`, `web/**/*.mjs`, and `tools/*.mjs` modules before running the full Node test suite; `node tools/verify_public_runtime_assets.mjs` checks all `65` public runtime assets; standalone checks (`node tools/build_fcv588_standalone.mjs --check`, `node tools/build_mdc2060_standalone.mjs --check`) and `npm run test:e2e:mdc2060` verify offline packaging and the 278-test MDC-2060 E2E suite; and CLI ledger checks (`build_fcv588_public_menu.mjs --check`, `build_fcv588_public_acceptance.mjs --check`, `build_fcv588_public_trace.py --check`, `build_fcv588_feature_register.py --check`, `build_fcv588_visual_atlas.py --check`, `fcv588_lcd_boundary_audit.mjs --self-test`) verify cross-ledger consistency. Settings persistence uses schema `v18` with explicit read-only importers for compatible historical profiles; archived `profile21` replays remain verifiable alongside active AP-1 Sounder menus. Plan acceptance remains conservative (`14/50` checklist items, `6/22` named Tasks, **all `65/65` public claims `HOLD`**). Do not treat this repository as a certified hardware substitute or approved release.

## Where to find things

| Path | Purpose |
| --- | --- |
| `LICENSE` | MIT License for original code/artwork plus mandatory training-only and OEM non-affiliation notice |
| `THIRD_PARTY_NOTICES.md` | Zero-dependency web runtime statement and Electron/Chromium/Node.js desktop binary notices |
| `.github/workflows/ci.yml` | Cross-OS (`ubuntu-latest` + `windows-latest`) Node 22 & Python 3.12 verification workflow |
| `docs/decisions/ADR-0001.md` | Architecture trade-offs and explicit boundaries |
| `docs/reports/COMPREHENSIVE_PROJECT_REVIEW_AUDIT_EVAL_2026-11-22.md` | Comprehensive 2026-11-22 architecture, security, legal, domain, and QA audit baseline |
| `docs/reports/FCV588_PUBLIC_REFERENCE_ACCEPTANCE.md` | Scoped P36/F1-public-reference implementation overview, historical checkpoints, and HOLD gates |
| `docs/evidence/device-register.json` | Model/version/approval state for all proposed devices |
| `docs/evidence/fcv588-public-implementation-status.json` | Current machine-readable 64+D15 implementation checkpoint and `HOLD` claim ledger |
| `docs/evidence/fcv588-public-menu-atlas.json` | Current machine-readable 5-category / AP-1 Sounder menu source atlas |
| `docs/evidence/fcv588-public-trace-matrix.json` | Canonical 64 operator + D15 instructor source trace and boundary guards |
| `docs/evidence/FCV-588.md` | Early FURUNO source notes and provisional behaviors **(historical F0, superseded)** |
| `docs/qa/scenario-matrix.md` | Initial training scripts and QA criteria **(historical F0, superseded)** |
| `docs/qa/FCV588_P36_LIVE_BOTTOM_ZOOM_20261122/` | P36 live headless Chrome Bottom Zoom (`LF-ZOOM`/`HF-ZOOM`) verification receipts |
| `plans/261113-0911-fcv588-photo-reference-visual-conformance/plan.md` | P01–P28 photo-reference visual conformance, AP-1 Sounder menu, and offline archive plan |
| `docs/qa/FCV588_V31_EVIDENCE_SUMMARY.json` | Historical V31 scoped source/receipt/hash evidence (superseded by V32–V57 & P01–P36) |
| `docs/qa/FCV588_OPERATOR_V31_GREEN_RECEIPT.json` | Historical V31 284 native operator/migration/storage/Canvas checks on four viewports |
| `plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/reports/continuation-2026-10-16-v31-transactions-controls.md` | Historical V31 changes, compatibility, exact tests and QA/counsel gates |
| `plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/reports/v31-failure-counsel-packet.md` | Historical V31 52/53 failure and test-only Manual fixture packet |
| `docs/qa/FCV588_V30_EVIDENCE_SUMMARY.json` | Historical V30 runtime/receipt/harness/screenshot SHA reconciliation |
| `docs/qa/FCV588_CHROME_VIEWPORT_V30_RECEIPT.json` | Historical V30 full desktop controls/D15/replay receipt |
| `docs/qa/FCV588_CHROME_MOBILE_V30_RECEIPT.json` | Historical V30 phone source-integrity/44px evidence |
| `docs/qa/FCV588_CONFIGURATION_V30_REVIEW_RECEIPT.json` | Historical V30 post-review 264 configuration assertions, alarm status/Canvas and DOM cleanup |
| `docs/qa/FCV588_V30_OPEN_GATE_FINDING.json` | Historical V30 reproduced optional-menu draft revoke/regrant finding (repaired in V31) |
| `plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/reports/continuation-2026-10-16-v30-integrated-configuration.md` | Historical V30 implementation, source limits, actual tests, and independent review |
| `plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/reports/v30-checklist-review.md` | Historical V30 row-by-row 50 checklist / 22 Task assessment |
| `plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/reports/continuation-2026-10-15-v19-phone-accessibility-browser.md` | Historical V19 phone reflow evidence, superseded by later execution checkpoints |
| `plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/reports/continuation-2026-10-15-v18-d09-menu-admission-safety.md` | Historical P1 menu-edit audit and accepted V18 source/runtime remediation |
| `docs/qa/FCV588_CHROME_VIEWPORT_V17_RECEIPT.json` | Historical D09 optional-fixture baseline prior to menu reindex correction |
| `docs/qa/FCV588_CHROME_VIEWPORT_V16_RECEIPT.json` | Historical two-P1 fix confirmation, Chrome verified |
| `plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/reports/continuation-2026-10-15-v15-c11-rotary-chrome.md` | Earlier V15 changes and response-integrity acceptance |
| `plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/reports/continuation-2026-10-14-v14-operator-source-ui-course.md` | Historical V14 baseline and 22 named task statuses |
| `docs/F0-AUDIT.md` | Initial F0 gate, implementation checklist, and honest limitations **(historical F0, superseded)** |
| `docs/research/FCV588_FULL_FUNCTION_INVENTORY_2026-10-13.md` | Inventory of 64 FCV-588 operator behaviors plus separate instructor-platform D15, conditional options and test gaps |
| `docs/research/FCV588_FEATURE_REGISTER_DRAFT.json` | 65 requirements: 64 FCV operator behaviors (11 simulated-only, 53 open) + one instructor-platform item D15 (simulated-only), zero hardware-approved |
| `docs/research/FCV588_FIDELITY_ACCEPTANCE_PROTOCOL.md` | Canonical release status and proposed operator-signed geometry/gesture/visual thresholds |
| `docs/research/FCV588_HIGH_FIDELITY_BRAINSTORM_ADVICE_2026-10-13.md` | Earlier hardware-target fidelity research and trade-offs |
| `docs/research/FCV588_PUBLIC_MEDIA_EVIDENCE_2026-10-13.md` | Current PUBLIC_REFERENCE source register: official images, manuals, two video candidates, and frame-review unknowns |
| `docs/research/FCV588_PUBLIC_UI_REFERENCE_MATRIX_2026-10-14.md` | 14 UI/screen/control reference categories tied to specific FURUNO manual sections, public photos and test cases |
| `docs/reports/FCV588_PUBLIC_REFERENCE_QA_2026-10-14.md` | Historical public-reference research/plan QA baseline (47/47 at that time); superseded by newer tests and v2 planning evidence |
| `plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/reports/plan-validation-2026-10-14.md` | Historical v2 plan-authoring verification; its old baseline failure is superseded by later source-bound checks |
| `sources/manuals/README.md` | Restricted reference-manual collection (23 unique PDFs + 2 ZIPs, 188.01 MiB), gap and rights notes |
| `sources/manuals/ARCHIVE_COVERAGE.json` | Explicit per-model archive coverage and unresolved rights/version/identity holds |
| `sources/manuals/MANIFEST.json` | URL, revisions, SHA-256 and file-level provenance |
| `sources/manuals/VERIFICATION_RECEIPT.json` | Offline deduplicated file integrity and page-count verification |
| `src/core/` | Deterministic events, session/replay and scenario generator |
| `src/devices/fcv588/` | Device-specific state transitions, AP-1 menu atlas, and archived `profile21` replay compatibility |
| `src/devices/mdc2060/` | KODEN MDC-2060 (MRD-104 / RB717A) radar signal engine, ATA/AIS/Guard Zone model, scenarios, EN/VI i18n, and 7 D15 lessons |
| `web/` | Native-browser demonstrator, with the LCD screen, physical keys, and 5-tab D15 trainer separated from the core |
| `web/mdc2060/` | Dedicated KODEN MDC-2060 MRD-104 portrait console, Canvas 2D PPI renderer, physical controls, and D15 instructor platform |
| `Chay-MDC2060.bat` | One-click Windows offline launcher for `dist/MDC-2060-Standalone.html` (with auto-build and `/mdc2060` loopback fallback) |
| `test/` | Dependency-free Node (`node:test`) and Python (`unittest`) assertions |
| `test/e2e-mdc2060/` | 278-test opaque-box MDC-2060 E2E verification suite across Tiers 1–4 (including Headless Chrome CDP browser checks) |
| `plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/plan.md` | **Active execution plan**: 7 phases / 22 named Task units / 50 checklist entries. Phase 1 checked 10/10 (`14/50` total); remaining acceptance/source gates still open. |
| `plans/261013-1428-fcv588-public-reference-complete-operator/plan.md` | Earlier PUBLIC_REFERENCE v1 plan retained for comparison and traceability; superseded for future execution |
| `plans/261013-1319-fcv588-full-fidelity-simulator/plan.md` | **Deferred hardware-target** plan retained for provenance; needs actual unit and operator sign-off |

## Important boundaries

This code is **not** affiliated with or endorsed by FURUNO, KODEN, TransponderTech, Raymarine, Transas, Wärtsilä, or any other manufacturer. UI drawings are original simplified training illustrations. There is **no** real transducer/radar/AIS interface. Do not connect to operational marine systems.

**Current plan distinction:** installed classroom FCV-588 firmware, transducer wiring, and Diagnostics remain unverified (`firmwareInstalled=null`, `hardwareValidated=false`). Public-reference training progresses against OME-23890-E and documented public references without claiming hardware equivalence. Refer to `docs/evidence/fcv588-public-implementation-status.json` and the v2 `PUBLIC_REFERENCE` plan first.

The local manual archive contains copyright-protected publisher material (`not_an_approval_to_redistribute: true`). Keep raw PDFs and ZIP bundles strictly out of Git distributions, `web/`, and packaged builds, and obtain appropriate permission before processing with AI, reproducing or circulating their contents. Verify local reference manuals with `PYTHONDONTWRITEBYTECODE=1 python3 -B tools/verify_reference_manuals.py`.

The inherited conversation transcript `VietMoPhongChoTatCaCacMay.md` has had its private origin chat URL redacted (`<REDACTED_PRIVATE_CHAT_URL>`) while retaining its technical text for traceability. Sources/uncertainties in it are **not** automatically accepted as validated requirements. For FCV-588, the tracked `docs/evidence/` ledgers are the source of truth.
