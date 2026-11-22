# P07 — Visual reference / physical-landmark / accessibility assessment

**Reviewer:** `worker-1`  
**Scope:** QA-only, read-only đối với 8 JPEG gốc và runtime/canonical; không chạy Chrome, không chạy Narrator/NVDA, không sửa ảnh hay source.  
**Reference authority:** `research/2026-11-14-photo-mode-atlas.md` + `phase-07-independent-visual-qa.md`.  
**Decision:** `PASS_WITH_SOURCE_GAPS` cho photo-landmark/a11y evidence package; **không** phải OEM/physical-equivalence certification.

## 1. 8 ảnh gốc — identity và mode map

Tất cả ảnh là `590×1280 RGB`, giữ nguyên tại `sources/FCV588_GiaoDienThucTeMay2016/`; SHA-256 khớp atlas P01 8/8.

| File | SHA-256 | Photo-grade mode / landmark trực tiếp |
|---|---|---|
| `giaoDien.jpg` | `e7b78466fa582dc0cc50aec8e2fc264f8b3ee187d93a53cace1e88d1e156c99c` | Main menu; `MAN.R G:10 HF 13.5V`; depth `19.3 m`; 5 nhóm menu ở trái, giá trị ở phải, footer phím; sonar/depth còn thấy dưới modal. |
| `lf.jpg` | `c3ef46a27fc965c95d2df33981b0c66775b848ae96aa8efdcad932b91a50c3ef` | LF; `MAN.R G:10 LF 13.6V`; depth `19.4 m`; ticks thấy `2.0/5/10/15/20`; near-surface clutter mạnh, bottom nâu/đỏ. |
| `hf.jpg` | `7f1a69504fd703988750729ee38b4964229480a4c55b20ae0f0bb4815f6ea2a9` | HF; `MAN.R G:10 HF 13.7V`; depth `19.7 m`; ticks `2.0/5/10/15/20`; water-column thưa hơn ảnh LF này, nhưng không suy rộng thành quy luật vật lý. |
| `dual.jpg` | `4d88fe11cda8a9107f97e44a392103cc68eb8ab8e685b7b5e7408a556a2bc37b` | DUAL; `LF/HF 13.7V`; depth `20.0 m`; LF trái/HF phải; split gần nửa. |
| `zoom.jpg` | `ecc7af35e30aafb8f0e9cfe9f05f94c8d529d6d410a2e523053286149d330b52` | BL-LF; `13.7V`; depth `19.8 m`; pane BL trái có thang tương đối `5→0`, normal LF bên phải có thang tuyệt đối. |
| `zoom2.jpg` | `41eaa80b42450b36c3b0f547b9276e26703ce1b74d2f85b1393255fda42bcd99` | BL-HF; `13.5V`; depth `19.7 m`; pane BL trái / normal HF phải; fish symbols/echo chỉ là quan sát ảnh, không được copy thành runtime asset. |
| `nav1.jpg` | `b90de3afeb18730e10e4ac897fb20bbde36155e25cc344abed259ba1de0d030e` | NAV1; `13.7V`; depth `19.9 m`; data pane lớn bên trái, sonar strip hẹp bên phải. |
| `nav2.jpg` | `9f225c6834efe86c76fd8a86bbfaa8f6d276f1e055a815efc91087a832397de6` | NAV2; `13.5V`; STW `0.0 kn`, SOG/position thiếu dữ liệu, depth `19.7 m`; data trái / sonar phải. |

Rights: `REFERENCE_ONLY`; `rightsOwner=UNKNOWN`, redistribution/derivative/runtime embedding vẫn `HOLD`.

## 2. Landmark hình học có thể hỗ trợ

Một probe chỉ-đọc dùng vertical-edge strength trong ROI ảnh, không warp/crop/ghi file, cho các tỷ lệ **photo-space** sau. Đây là tỷ lệ vị trí divider giữa hai mép LCD quan sát được trong cùng ảnh, không phải tọa độ OEM hay homography đã hiệu chuẩn:

| Photo | left edge x | divider x | right edge x | divider fraction | Kết luận hợp lệ |
|---|---:|---:|---:|---:|---|
| `dual.jpg` | 75 | 256 | 457 | 0.474 | Hỗ trợ DUAL gần 1/2–1/2; LF trái/HF phải. |
| `zoom.jpg` | 58 | 253 | 469 | 0.475 | Hỗ trợ BL-LF gần 1/2–1/2; zoom trái/normal phải. |
| `zoom2.jpg` | 68 | 277 | 492 | 0.493 | Hỗ trợ BL-HF gần 1/2–1/2. |
| `nav1.jpg` | 53 | 334 | 443 | 0.721 | Hỗ trợ data-left khoảng 2/3 và sonar-right khoảng 1/3. |
| `nav2.jpg` | 96 | 327 | 436 | 0.679 | Hỗ trợ data-left khoảng 2/3 và sonar-right khoảng 1/3. |

Các số trên chỉ dùng như **landmark quan hệ**. Không đặt tolerance pixel/OEM từ chúng vì góc máy, lens/perspective, mép LCD cong/che, crop và tư thế máy khác nhau giữa ảnh.

### `SOURCE_GAP` — physical ROI / homography

- Không có checkerboard/AprilTag/thước đo hoặc vật chuẩn đồng phẳng với mặt LCD trong ảnh.
- Camera không được hiệu chuẩn; perspective và lens distortion chưa biết.
- Toàn bộ mặt máy và nhiều control không cùng một mặt phẳng; một LCD homography không thể rectified đúng knob/pad/bezel nổi.
- Mép thân máy/right controls bị crop khác nhau; không có repeatable four-corner ROI đã duyệt cho cả 8 ảnh.
- Vì vậy **không** suy ra mm-position, detent spacing, OEM pixel coordinates, RGB/glyph/font hoặc faceplate tolerance từ JPEG. `233×270 mm` face và khoảng `128×171 mm` LCD chỉ là public-reference dimensions đã ghi trong atlas/CSS, không phải phép đo từ 8 ảnh này.

## 3. Đối chiếu atlas với evidence P04/P05/P06

- **P04 BL/zoom:** corrected source-bound Chrome evidence cho BL-LF/BL-HF có flat-bottom witness `strongestRow=639/640`, sample coverage `1.0`; topology BL trái/normal phải phù hợp atlas. Đây là simulator geometry proof, không phải photo RMSE/homography proof.
- **P05 menu:** browser receipt giữ modal bên trong LCD, sidebar trước content và để lộ `uncoveredBottomFraction=0.2146344497` (1366×768) / `0.2156574231` (375×812). Điều này phù hợp landmark atlas “menu không che toàn bộ, sonar/depth còn thấy dưới modal”; không chứng minh exact camera-pixel alignment hay exact Vietnamese firmware locale.
- **P06 face:** current CSS giữ `.display-housing left=5.5%, width=59%`, `.controls left=73%, width=21%`, pad `86×86 px`, knob `59×59 px`. Các tỷ lệ chỉ hỗ trợ quan hệ ảnh “LCD lớn bên trái / control column hẹp bên phải”. `exact faceplate mm geometry` vẫn SOURCE_GAP/HOLD.

Không thực hiện raw-JPEG RMSE, SSIM hay pixel registration vì phase07 cấm dùng camera JPEG như framebuffer oracle khi chưa có lawful/repeatable ROI+homography.

## 4. Accessibility audit — current canonical static source

**VERIFIED_STATIC**

- D15 nằm ngoài `.device-frame`; HTML có `role=tablist`, 5 `role=tab`, 5 `role=tabpanel`, `aria-controls` ↔ panel id và `aria-labelledby` ↔ tab id.
- Roving tabindex: tab active `0`, tab inactive `-1`; `ArrowLeft/ArrowRight/Home/End` chuyển tab và focus; inactive panel dùng `hidden`.
- `.d15-tab` min-height `44px`; `:focus-visible` có outline; `training-panel:focus-within` phục hồi opacity.
- `keyboard-shortcuts.mjs` không route FCV shortcut khi focus nằm trong `.training-panel`, input/textarea/select/contenteditable; native Enter/Space trên button không bị dispatch trùng; arrow của MODE/GAIN knob do control đó sở hữu.
- Các live-region D15 dùng `role=status`, `aria-live=polite`, `aria-atomic=true`; LCD không bị biến thành instructor live status.
- Current canonical hashes: `index.html=6918d1b5...c74847`, `styles.css=2925f129...f4660`, `instructor-tabs.mjs=0cb956f9...b5800`, `keyboard-shortcuts.mjs=f80cb855...52ddb`, `app.mjs=272f4220...265ee`.

**CHROME_EVIDENCE_BOUNDARY**

- P04 corrected browser evidence loaded the exact current five files above; mobile case observed 5 D15 tabs, all outside LCD, and operator event count unchanged while D15-owned keys were exercised.
- P06 historical browser v5 proved device-focus computed opacity/focus behavior at 375×812, 1366×768 and 1920×1080, but its `app.mjs`/`styles.css` hashes are older (`6dc6...` / `0e4c...`). Therefore P06 Chrome is supporting historical behavior, **not** an exact-current-source browser focus certification.

**NOT_RUN**

- Windows Narrator spoken labels/order.
- NVDA speech/browse/focus mode output.
- OS-level window blur/refocus and assistive-technology focus restoration.
- High-contrast/forced-colors spoken/visual review outside existing CSS/static checks.

Prerequisites for those claims: interactive Windows desktop, exact current canonical served from owned loopback QA port, installed/enabled Narrator or NVDA, deterministic keyboard traversal script, captured Speech Viewer/transcript (NVDA) or equivalent auditable spoken-output record, and explicit OS window blur/refocus steps. DOM/ARIA/unit tests alone không đủ để chuyển các mục này sang PASS.

## 5. Holds và bounded next action

Giữ nguyên: `Phase6/F1 OPEN`, `65/65 feature claims HOLD`, `hardware HOLD`, `firmware HOLD`, `rights HOLD`, `release HOLD`, không OEM fidelity percentage.

**Bounded next action:** nếu cần nâng P07 photo-geometry từ landmark quan hệ lên đo định lượng, tạo một **restricted non-served measurement protocol** mới: pin 4 LCD corners/ROI cho từng ảnh, ghi uncertainty và reject ảnh không đủ bốn góc; chỉ rectified LCD plane, không dùng homography đó cho bezel/controls. Sau đó có thể so normalized pane/divider/header landmarks với project screenshots. Accessibility spoken/OS-focus phải là một QA run riêng có Narrator/NVDA thật; không ghép vào software PASS hiện tại.
