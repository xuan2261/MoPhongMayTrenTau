# FCV-588 V36 — Integrated D15 readability and accessibility checkpoint

**Date:** 2026-10-18. **Canonical workspace:** C:\Work\MoPhongMayTrenTau.
**Profile:** F1-public-reference-20 / PUBLIC_REFERENCE, offline instructor
training, no real vessel system or hardware inputs.

## Result and exact scope

V36 source, DOM accessibility and software QA are **RECONCILED**. This
is not an OEM hardware/pixel conformance or public release decision.
The user-authorized GPT-6 supervision replaces only the previously
unavailable Kongming approval step. It is not independent external
counsel; actual Extra High client setting is not attested by project tools.

The canonical V35 source and all its prior verified receipts were read
before changing four presentation-only files:

1. web/index.html: three distinct h4 instructor card headings with stable
   aria-labelledby names; one screen-reader-only atomic polite status
   region in the D15 panel; no element added within device-frame.
2. web/styles.css: D15-only rem typography and line height/spacing,
   plus safe wrapping. The original slate/cyan/warm-amber palette and
   physical-device CSS are preserved.
3. web/app.mjs: projects source transitions exactly once into the
   external live-region text when the underlying C11/D09/D14 status
   changes. Ordinary world-tick changes to sample age do not retrigger
   announcements; no focus move, timer or device dispatch.
4. web/fcv588-training-source-matrix.mjs: pure, immutable source-
   transition projection, new no-data/option-revoke tests.

All **23/23 core src** modules remain byte-identical to V35; the entire
physical device-frame HTML slice is unchanged. V36 introduces no GPS,
NMEA, WebSerial, WebUSB, RF, network, sensor or firmware handling.
The V35 core/replay/settings/profile IDs remain pinned.

## Before and after measurements

The original D15 status matrix was 9px state labels, 10px details, 11px
card headings and summary, 12px title/intro. Its text contrast was
already between 8.4:1 and 13.73:1 against the verified solid
background, so contrast did **not** require an artistic color change.

| Role | V35 px | V36 px, computed Chrome | Design intent |
| --- | ---: | ---: | --- |
| Matrix heading | 12 | **16** | Section hierarchy |
| Instructor intro | 12 | **14** | Readable explanation |
| C11/D09/D14 h4 heading | 11 | **14** | Three named cards |
| Source-state text | 9 | **13** | Readable short status |
| Main state summary | 11 | **14** | Readable body |
| Source/rights details | 10 | **13** | Details not relegated to tiny print |

Computed text contrast after V36 ranges from **8.4:1 to 13.73:1**
in the tested matrix, above the 4.5:1 normal text threshold. Browser
simulated root text-size 200% enlarged all six roles proportionally,
without horizontal clipping at **320px**. Increased *vertical scrolling*
at 200% is expected and observed; it is not claimed to be compact.
The layout remains user scrollable and does not hide D15 content.

The Chrome accessibility snapshot verifies three article names tied
to level-four headings and one polite atomic read-only status. A
MutationObserver confirms world ticks with unchanged source status
do not cause repeated status mutations; transitions generate discrete
status announcements in DOM. Keyboard Tab, visible focus, teacher
shortcuts and absence of new matrix tab stops were exercised.

**Important limit:** NVDA and VoiceOver actual spoken speech **were not
executed**. NVDA was not found at common Windows locations, and system
Narrator was not activated on the user's desktop. Automated
ARIA/browser-tree evidence is not a recording of human-perceived speech.

## Staging evidence (isolated V36)

Folder: staging/fcv588-v36-instructor-accessibility/

- Baseline 4 viewport screenshots and computed font/ARIA data:
  evidence/V36_D15_BASELINE_20261018.json.
- V36 staging Node: **46/46 PASS**;
  evidence/V36_D15_NODE_TARGETED_20261018.log.
- V36 Chrome: **189/189 PASS** on **7** exact viewports
  1440×900, 768×1024, 375×812, 320×720, 390×844, 1366×768, 1920×1080.
  21/21 new PNG SHA; evidence/V36_D15_A11Y_CHROME_20261018.json.
- Staged HTTP/negative routes: **37/37 exact SHA** and **4/4 denied**;
  evidence/V36_D15_SERVED_SOURCE_20261018.json.
- V36 review patch **4 web files**, SHA-256
  d9f68cd6dbfeb3cd86bc33b3fbd0894245a4c3da8e827639c856c5ceeb68e9d3,
  git apply --check **exit 0**. Exact manifest:
  evidence/V36_INSTRUCTOR_A11Y_PATCH_MANIFEST.json.
- Preapply checks and GPT-6 GO:
  docs/qa/FCV588_V36_PREAPPLY_GPT6_20261018.json and
  reports/2026-10-18-v36-gpt6-a11y-integration-go.md.

## Post-integration verified receipts

V36 patch was applied to the canonical four files with pre-write
normalized-text SHA checks on Windows and then compared to the frozen
staging source bytes. The applied-source receipt:
docs/qa/FCV588_V36_CANONICAL_APPLY_GPT6_20261018.json.

| Check | Canonical observed result | Evidence in docs/qa |
| --- | --- | --- |
| V34/V35/V36 targeted Node | **46/46 PASS** | FCV588_V36_CANONICAL_NODE_TARGETED_20261018.log |
| Full Node and syntax | **451/451 PASS** | FCV588_V36_CANONICAL_FULL_NODE_20261018.log |
| Python integrity/unit | **13/13 PASS** | FCV588_V36_CANONICAL_PYTHON_20261018.log |
| V36 accessibility Chrome | **189/189 PASS**, 7 viewports, 21 PNG | FCV588_V36_CANONICAL_A11Y_CHROME_20261018.json |
| Prior V34 compatibility Chrome | **330/330 PASS**, 5 viewports, 75 PNG | FCV588_V36_COMPAT_CHROME_20261018.json |
| Prior V35 D15 journey Chrome | **120/120 PASS**, 5 viewports, 25 PNG | FCV588_V36_LEGACY_D15_CHROME_20261018.json |
| Canonical HTTP source + forbidden routes | **37/37 SHA, 4/4 denied** | FCV588_V36_CANONICAL_SERVED_SOURCE_20261018.json |
| Consolidated runtime and images | **37/37 source SHA, 121/121 PNG SHA** | FCV588_V36_FINAL_INTEGRITY_20261018.json |

Three post-integrated Chrome suites together provide **639/639**
assertion PASS and **121** SHA-verified images, but do not count as
639 distinct FCV operator capabilities. All browser requested source
bytes were checked against the canonical manifest and all temporary
QA server ports were verified closed.

**Final V36 integrity receipt SHA-256:**
d7d7c3eba806317d6690f2d4cb91cc15eed6c705b16ab1519ed4621f168ebafe

No Git commit, push, PR, deployment, installation or release occurred.
The historical V31 failed Verify log remains unchanged at SHA-256
93cf5389a6f3fad2dc4c5f420ea2f0943f3e7d85e3831a39589a8a938064f4c9.

## Remaining acceptance boundaries

- 64 FCV operator rows and D15 remain independent claim tracks.
  **65/65 claim release gates HOLD** absent individual source/rights
  verification, not converted to PASS by software QA.
- The prior F1 v2 checklist **14/50** and **6/22** named-task
  acceptance remain unchanged pending full phase/reviewer evidence.
- Source and rights restrictions, installed firmware details, exact
  OEM menu geometry/timing, transducer behavior, electromagnetic
  transmissions and true sonar physics remain unknown/unvalidated.
- A successful headless Chrome test is not the Phase 6 manual
  CoS Desktop attach-before-reload acceptance or a real screen-reader
  speech audit. This phase and public distribution remain HOLD.
- An independent CoS reviewer was asked to inspect V36, but the
  sleeping reviewer session failed to resume. **No independent
  reviewer result is claimed.**

## Recommended next milestone — V37

1. **Real assistive technology audit:** in a dedicated test environment
   with NVDA/Windows Narrator and, if available, VoiceOver, check spoken
   article names, live announcements, focus movement and reduced-motion
   behavior; do not disturb the user's working desktop to simulate a PASS.
2. **Source-bound interaction completeness:** add negative-order,
   power-cycle, save/cancel, option revoke/regrant and deterministic
   replay vectors for C11 waypoint, D09 Tankenmaru and D14 Own/NMEA.
   Implement only source-supported behavior in offline mode.
3. **OEM-source/rights reconciliation:** obtain firmware/version-
   specific, authorized menu and appearance reference and review
   each row of the 64+D15 acceptance matrix. Do not self-award a
   percentage of likeness based on current staging pictures.
