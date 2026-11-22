# V51 — Real CoS Desktop attached viewports: PARTIAL QA report (2026-10-22)

Outcome: **geometry gates passed** for the two targeted native attached content viewports. Software regression passed. The overall Phase 6/lesson/hardware/release gate remains **OPEN / HOLD**. This is supplementary evidence to the V51 C-only partial report, **not a V51 final seal**.

## Contract, baseline and authority

Project: MoPhongMayTrenTau. Canonical: C:\Work\MoPhongMayTrenTau. Single active plan: plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/plan.md, Phase 6. Only locally generated synthetic training output; no real ship devices or OEM assets.

- V50 Final Integrity SHA-256: 88b6633a7bd8b68e0e3f048319095eb4d1d783e7f91d74fefad05e59770fd36a.
- V50 Independent Postreceipt SHA-256: 1c95c486994004457f16f71fb75f885449f9b3ba00ea75ca348275016fcbb31b.
- Canonical runtime: 37/37 byte SHA match after attached QA. No source edits or replay/schema/firmware changes.

## Native attached viewport results

| Test | Observed result | Qualification |
| --- | --- | --- |
| CoS Desktop attached + Windows owned window, 1366 x 768 CSS px | PASS for exact 1366 x 768, DPR 1; CoS screenshot 1366 x 768 at scale 1 | Powered state, actual scrollY 360 bringing POWER fully into view; no horizontal overflow |
| CoS Desktop attached + Windows fullscreen, 1920 x 1080 CSS px | PASS for exact 1920 x 1080, DPR 1, screen origin 1920,0 | CoS returned preview 1600 x 900 scale 0.8333; separate native PNG was saved at 1920 x 1080 and inspected |
| Native screenshot after POWER/MENU at 1920 x 1080 | PASS visual observation | Sounder menu on original training LCD; D15 outside the face; PNG inspected |
| POWER, MENU/ESC, Escape, Tab and Shift+Tab browser actions | PASS in observed scope | Real CoS Desktop browser actions, not synthetic DOM event invocation |

CoS Desktop attached before reload; a separate Helium QA window was used on Windows DISPLAY5. Existing user work window position and size were checked unchanged at resize time. The owned QA tab was later closed and localhost test server stopped.

## Actual browser network, source and accessibility

- Browser diagnostics after attached reload: 35/35 HTTP 200, all origin http://127.0.0.1:4173; 0 console errors and 0 observed external requests.
- 32/35 **complete actual browser-loaded response bodies** were read from browser_network and SHA-256 checked against both V50 runtime receipt and current disk source. Exact per-path record: V51_ATTACHED_NETWORK_FULL_BODY_SHA_PARTIAL_20261022.json.
- Three large loaded bodies were truncated by the browser inspection tool and remain **NOT_RUN for response-body SHA**: web/styles.css, web/app.mjs and src/devices/fcv588/model.mjs. Their HTTP 200 statuses and separate disk hashes cannot substitute for complete captured browser-loaded bytes.
- A failed readback originated from a one-character transcription discrepancy in the manually transferred units.mjs digest. Preserve V51_BROWSER_BODY_SHA_TRANSFER_VERIFY_ORIGINAL_STOP_20261022.txt. A second narrowly corrected complete 32-row check passed; no runtime source needed modification.
- Live DOM showed D15 polite status located outside the LCD. This verifies markup only; no spoken Narrator/NVDA utterances were captured.

## Post-browser software regression and provenance

- Full Node npm run check: 511/511 PASS, exit 0, in V51_ATTACHED_POSTBROWSER_FULL_NODE_20261022.log.
- Python unittest: 13/13 PASS, exit 0, in V51_ATTACHED_POSTBROWSER_PYTHON_20261022.log.
- Native PNG: V51_ATTACHED_1366x768_POWERED_REAL_SCROLL.png (1366 x 768), V51_ATTACHED_1920x1080_PHYSICAL_FULL_SCREEN.png (1920 x 1080), V51_ATTACHED_1920x1080_POWERED_MENU.png (1920 x 1080), plus original browser-window capture and preliminary crop. Sizes and SHA-256 are checked in V51_ATTACHED_EXACT_PARTIAL_OBSERVATION_20261022.json.
- The current receipts describe observed tests and checks, not an OEM conformance claim. No original V50 FAIL logs, seals, plan, source, firmware, or media files were modified.

## Gates deliberately not closed

- **NOT_RUN**: Narrator/NVDA real spoken output. Narrator installed but no dedicated approved isolated spoken QA VM; NVDA was not confirmed installed. DOM/ARIA is not speech evidence.
- **NOT_RUN**: genuine Windows/Chrome window.blur delivered during a POWER hold. Previous tests that change Win32 foreground but do not produce window.blur are not PASS. No synthetic blur acceptance.
- **NOT_RUN**: complete browser-loaded bytes for the three truncated HTTP responses.
- OEM geometry, pixel, firmware, hardware and asset rights remain UNKNOWN / HOLD. The user asked to skip backup work; no backup activity was included in this continuation.

**Acceptance unchanged**: Phase 6 OPEN; 65/65 public claims HOLD (64 operator + D15); 14/50 checklist; 6/22 accepted named tasks; hardwareValidated=false; installed firmware UNKNOWN; releaseApproval=HOLD.

## Bounded next technical milestone

Use an approved isolated Windows QA environment to capture actual Narrator/NVDA utterances (including no repetitive D15 timer speech) and a genuine OS window.blur event under a held POWER input. Capture timestamped OS/DOM/utterance artifacts; otherwise continue NOT_RUN. Independently select browser tooling that exposes **full originally loaded body bytes** for all 35 resources at exact viewports; never infer digest from a fresh fetch or disk-only SHA. Preserve current write-once evidence and continue 65/65 HOLD until independent per-feature oracle, reviewer, firmware and rights gates can actually pass.
