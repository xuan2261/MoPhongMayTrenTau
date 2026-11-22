# V57 — Compact FCV-588 training header

Date: 2026-10-31 (Vietnam local)
Canonical workspace: C:\Work\MoPhongMayTrenTau
Status: **SCOPED UI POLISH PASS**. This is not Phase 6 or hardware/OEM acceptance.

## User request

Reduce repeated introductory/status text at the top of the FCV-588 training interface to reclaim vertical space, without losing the project's public-reference and non-hardware-validation meaning.

## Design brief

- **Register:** Product UI.
- **Scene:** Instructor/student using an offline FCV-588 sounder training simulator on desktop, tablet and phone; the face/LCD and controls should dominate the first view.
- **Direction:** Compact instrument-training console, because repeated introductory copy was pushing the device down the page.
- **Color:** Preserve the existing restrained dark navy, teal and steel palette.
- **Type:** Preserve the existing Segoe UI/Consolas system; no new font dependency.
- **Signature:** The portrait FCV-588 LCD and its independent hardware-face illustration.
- **Dials:** Variance 1, motion 0, density reduced only in the header.

## Before and after

The old top section repeated the same scope in a masthead chip and a separate banner, then spent more vertical space on a second eyebrow, a long subtitle and a static simulator-status chip.

The new structure is:

1. Brand mark and MoPhongMayTrenTau only.
2. One compact role=note disclosure in the masthead: **PUBLIC REFERENCE / NOT HARDWARE VALIDATED / TRAINING ONLY**.
3. One title: **FCV-588 Training Console**.
4. One short subtitle: **Mô phỏng độc lập từ manual công khai.**

Removed from the top section: MARITIME INSTRUMENT TRAINING LAB, the duplicate F1 / PUBLIC REFERENCE / CHƯA XÁC NHẬN PHẦN CỨNG chip, the separate duplicate public-reference banner, THỰC HÀNH TƯƠNG TÁC / MÁY ĐO SÂU, the long subtitle and the static MÔI TRƯỜNG GIẢ LẬP chip.

The state-dependent source cue still reports MODE hiện tại: <mode> and now uses the concise detail **Hồi âm mô phỏng. Không kết nối đầu dò.**. The full bottom safety disclaimer remains unchanged: synthetic depth/targets/signals, no transducer/maritime/broadcast connection, and not for real navigation. The LCD/device face, D15 five tabs and their controls are unchanged.

## Implementation scope

Changed existing runtime files:
- web/index.html
- web/styles.css
- web/lcd-instructor-meta.mjs

Added one test file:
- test/fcv588-v57-header-compact.test.mjs

Among the 38 runtime assets in the V56 inventory, three existing files changed for V57 and the other 35 remain byte-identical. No reducer, sonar, LCD rendering, hardware geometry, menu, firmware profile, replay, settings schema, D15 tab binding, source/rights ledger or feature claim was changed.

## Measurements

Chrome CSS viewports, canonical application:

| Viewport | Old workbench top | New workbench top | Vertical space recovered | Old document height | New document height |
|---|---:|---:|---:|---:|---:|
| 1440×900 | 319.8 px | 143.0 px | **176.8 px** | 1199 px | 1023 px |
| 768×1024 | 325.6 px | 127.0 px | **198.6 px** | 2028 px | 1829 px |
| 375×812 | 352.6 px | 160.1 px | **192.5 px** | 2388 px | 2195 px |
| 320×812 | no baseline capture | 171.3 px | — | — | 2165 px |

No horizontal overflow was observed at any of the four final viewports. The page still scrolls on phones because the training face and instructor workspace are intentionally tall; V57 does not claim a zero-scroll phone page.

## Verification

- Staging TDD final: **6/6 PASS**.
- Focused canonical compatibility tests (V34 source cue, web-layout, V57): **19/19 PASS**.
- Canonical full npm run check: **520/520 PASS**.
- Canonical Python unittest: **13/13 PASS**.
- Canonical Chrome DOM/input/source verification: **4/4 viewports PASS** at 1440×900, 768×1024, 375×812 and 320×812.
- Browser-loaded localhost response bodies: **36/36 SHA matches per viewport**.
- Chrome page/console errors: **0**; external requests: **0**.
- D15 tab interactions, keyboard navigation, preserved original control IDs, 44×44 minimum tab targets and always-mounted live regions passed the inherited V56 checks.
- No-JavaScript fallback: tablist stays hidden and all five instructor panels remain visible.
- Four default-session screenshots and four source-verified browser screenshots were saved; the final screenshots were inspected at desktop, tablet and mobile sizes.

The bundled ak-frontend-design render-check.mjs was not available as a verified local runtime path in this CoS workspace. Its viewport/visual intent was met using the project's installed Python Playwright + Chrome, with actual browser response-body SHA verification and native screenshot inspection instead. This is an implementation-method adaptation, not a claim that the bundled script ran.

## TDD and harness history (all original attempts preserved)

- The expected initial TDD RED is preserved.
- One first browser probe assumed a short POWER click would expose the live source cue; it did not. No product change was made to force that assumption. The dynamic cue is verified through the actual projectFcvSourceCue unit test instead.
- The first canonical full Node attempt was **518/520** because legacy tests require the explicit phrase Không kết nối đầu dò. The detail was revised to the shorter **Hồi âm mô phỏng. Không kết nối đầu dò.**, preserving the existing safety contract. No assertions were weakened.
- A first focused run then exposed case-sensitive copy matching; the capitalization was corrected to the exact existing phrase. The next focused run was **19/19 PASS**, and the next full run was **520/520 PASS**.
- One canonical browser harness attempt used a global .eyebrow absence check, which also matched the unrelated D15 eyebrow. The check was narrowed to .heading .eyebrow; the final four-viewport run passed. Original failed logs and receipts were not overwritten.
- One stage browser summary string retained the earlier /3 denominator after adding a fourth viewport; a separate JSON readback confirmed **4/4 PASS**. The original text log remains preserved.

## Skills and parallel review

The Native Skills Hub routing/policy and exact Drive skill bodies were read. The selected UI-only polish owner was ak-frontend-design v3.1.0; ak-cook v2.5.1 supplied the implementation/TDD workflow and ak-test v1.3.0 supplied the test scope and UI QA principles. Relevant UX polish, quick-workflow and visual-critique references were read. A full-site UX/SEO audit was intentionally not run because the requested change was limited to the existing header.

Five independent read-only design perspectives were launched in one parallel wave. At the single permitted worker-status collection, their final reports were not all available; **no consensus or completed five-way ranking is claimed**. The final design was selected by the controller from the user's request, source inspection and measured Chrome evidence.

## Acceptance and project gates

- V56 sealed receipts were not modified.
- V56 preimage was rechecked before apply: **38/38 runtime pins matched**.
- V57 canonical apply and subsequent safety-copy corrections each have separate SHA-guarded receipts.
- Phase 6 remains **OPEN**.
- Feature claims remain **65/65 HOLD**.
- Hardware validated: **false**.
- Installed firmware: **UNKNOWN**.
- Rights clearance: **false**.
- Reviewer signoff: **NOT_OBTAINED**.
- Release approval: **HOLD**.
- Actual Narrator/NVDA spoken output: **NOT_RUN**.
- Genuine Windows/Chrome window.blur while POWER is held: **NOT_RUN**.
- No backup was attempted; drive D: was not accessed.
- No dependency installation, commit, push, deploy or release occurred.

## Next step

The instructor can review the compact header at http://127.0.0.1:4173/ after refreshing the browser. The next substantial project gate remains real screen-reader speech and genuine Windows focus-loss testing in an approved isolated QA environment; V57 does not substitute for either.
## Ultra/advice workflow compliance note

The ak-brainstorm v2.9.0 contract, its --ultra reference, the shared ultra verifier protocol and --advice advisory-supervision reference were read during final continuation review. The earlier five-worker wave was a useful parallel UX critique, but it was **not** a compliant ak-brainstorm --ultra run: its five prompts had different specialist emphases rather than one identical immutable candidate packet; the usable-candidate gate, anonymized verifier ranking, winning-contract materialization and verifier receipt were not completed. This report therefore makes no Ultra winner, score, margin or unanimity claim.

The active host exposes generic ChatGPT workers but no dedicated kongming kit-agent/delegation capability. The --advice mode requires that exact supervisor and cannot be truthfully claimed by relabeling a generic worker. It was not run. ak-advise v1.6.0 was also read but not invoked: it is an optional interactive interview/preview workflow, not a substitute for the --advice supervisor, and the implementation's material choices were already settled by the user's explicit brief and measured source/browser evidence.

The compact-header implementation and its software/browser QA are complete within the available verified workflow. A future design decision that genuinely needs formal --ultra --advice should be started only on a host that exposes five parallel read-only candidate dispatch and the required kongming supervisor; otherwise the correct result is to disclose the unsupported mode rather than simulate it.