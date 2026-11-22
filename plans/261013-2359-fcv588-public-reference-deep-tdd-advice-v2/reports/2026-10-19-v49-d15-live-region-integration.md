# FCV-588 V49 — D15 semantic live-region, Windows Chrome and source-bound QA

**Date:** 2026-10-19. **Scope:** Offline F1 PUBLIC_REFERENCE training simulator at `C:\Work\MoPhongMayTrenTau`. **Not an OEM firmware/hardware, real sonar, audio screen-reader or course-release acceptance.**

## Decision and result

V49 fixes one bounded instructor-accessibility risk: the visually ticking D15 guidance block previously had a broad `role="status" aria-live="polite"`. An original Windows Chrome DOM probe observed eight updates of that live container during a 1.2-second BRILL preview, although no additional user action occurred. This is evidence of *possible* repeated assistive announcements, **not evidence that Narrator/NVDA actually spoke**.

The corrected `#operator-guidance` becomes a non-live `role="group"`. A new hidden `#operator-guidance-announcement` polite status outside the FCV-588 face receives only semantic title changes and stays silent on initial render. The visible BRILL countdown and instructor guidance continue to update at 250-ms UI ticks. The existing D15 source-matrix announcement remains separate. LCD labels, displayed OEM-facing text, key/knob behavior, sensor observations, device reducer, event/session/replay/settings schemas, profile21, firmware and rights are **unchanged**.

V49 authorizes exactly four canonical source/test files:

| Relative path | V49 treatment |
| --- | --- |
| `web/index.html` | Non-live visual D15 group plus a separate hidden polite status |
| `web/app.mjs` | Semantic-title-only announcement; first-render silence; visible countdown unchanged |
| `test/fcv588-v34-source-provenance.test.mjs` | Reconcile older overly broad ARIA-status expectation with the narrower, stronger contract |
| `test/fcv588-v49-a11y-boundary.test.mjs` | New four-test feature/teacher/White Marker boundary suite |

Of **37 pinned runtime sources, exactly 2 differ from V48** (`web/index.html`, `web/app.mjs`); **35/37** remain byte-identical. No FCV model, menu atlas, palette, canvas drawing algorithm, training controls, playback or hardware interface changed.

## Source authority and HOLD ceiling

- [FURUNO FCV-628/FCV-588 Operator's Manual, OME-23890-E, §1.22](https://www.furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/fcv628_fcv588_operators_manual.pdf) describes White Marker color-bar selection with Up/Down, ENTER and Off.
- [FURUNO FCV588/628 Software History](https://www.furunousa.com/-/media/sites/furuno/software_library/software/software/fcv588-628_software_history.pdf) records v2.01 White Marker setting changes, without identifying installed firmware for the target unit.
- Current `Off/White/Gray` choices are **training preview values, not a verified OEM firmware enum**. No OEM font, PDF, photo or firmware was copied into the simulator. Media rights remain HOLD and firmware UNKNOWN.

## TDD and isolated staging

Parent V48 final integrity SHA-256:
`4682a5d195a1e60f6648f41ab9c3b30008bcfcf8d222189aa93ad5465b4bf58b`.

Parent V48 independent postreceipt SHA-256:
`2dd3a50efe1627f42725476269c516e1795d50f3d1da9afb6ffbcf5e6d493d31`.

Staging folder: `staging/fcv588-v49-windows-accessibility/`; original 37/37 runtime SHA pinned from V48. New focused **source-valid RED 2/4 PASS, 2 FAIL** was preserved under `evidence/V49_A11Y_SOURCE_VALID_RED_20261019.log` SHA-256
`badf797629e20ec50cb7b34fa4aebc387e3854ce9b0eda39187eb160d2df888a`.
After the scoped D15 patch, focused V49/V34/V36/V47 tests **29/29 PASS**, log SHA
`7856e081e0b6daf5297417edd02f0e372cb483fdabf7a373c93acf6740ed715b`.

Original stage full Node run was **508/511 PASS, 3 FAIL** because three existing *canonical internal Markdown documents* required by link-resolution tests were omitted from the isolated clone. Original failure log SHA
`b77f217d28d99396130bd92dd5f6b42dcaf1f22f187de1bd28011c5c49080471` remains unchanged. After verifying the absent files were available in canonical, copying only those three internal text fixtures with byte SHA comparison and copying 34 referenced V27/V28 training PNG fixtures with their SHA checks (not OEM media), stage full Node **511/511 PASS**, log SHA
`9e9ef7403ee421826db6ff7e530c6cbbcf523d36c3e4caf0bf9d1ca5895d8773`.
Stage Python **13/13 PASS**, log SHA
`7ca18983054dad58a9a9fdfffea55a391ad26187489d172b8b6243e3d0fb1d48`.

## Source-bound isolated Chrome — independent stage and canonical runs

Both runs exercised **375×812, 1366×768, 1920×1080** Chrome isolated test contexts:

| Check | Staging | Canonical |
| --- | ---: | ---: |
| Deterministic browser assertions | 69/69 PASS | 69/69 PASS |
| Actually loaded HTTP response-body SHA-256 | 105/105 PASS | 105/105 PASS |
| Independently written test PNG SHA | 6/6 PASS | 6/6 PASS |
| Visual BRILL countdown refreshes | PASS | PASS |
| Semantic status remains unchanged during UI timer | PASS | PASS |
| Source-matrix status remains unchanged during UI timer | PASS | PASS |
| Menu/White Marker source boundary and deterministic replay | PASS | PASS |
| Localhost-only requests, no page or console errors | PASS | PASS |

Staged Chrome receipt SHA `fbf533e130a07980ea1a3b6821134a114eea9491b242acbe94e9e186b039c46a`.
Canonical Chrome receipt SHA `49561be4d2c9568da342ca3b28c6763da97862c791c51801e0fa06a8b8b23bec`.
The **12 new PNG** are two different runs of six files each; they are not a fabricated twelve-image single run.

Native Windows CoS Desktop attached Chrome, in a separate test-owned tab at an observed **1912×970** viewport, confirmed D15 ARIA structure, LCD logical 480×640, POWER and BRILL interactions; diagnostic capture *after debugger attachment and reload* saw **35/35 localhost HTTP 200** and zero console errors. This real attached test was **partial**, did not measure exact target native-attached 1366×768/1920×1080 or screen-reader speech, and the connector screenshot ID has no fabricated PNG SHA. Test-owned Chrome tab was closed and owned localhost Node PID 18888 stopped after PID/port/command-line ownership verification. See [V49 actual Desktop partial](../../../docs/qa/FCV588_V49_DESKTOP_MANUAL_PARTIAL_20261019.md).

Canonical localhost HTTP denial probe verified **4/4 disallowed routes denied**, strict CSP including `connect-src 'none'`, and `nosniff`. Original receipt SHA `137726109c6c5dd1a24fad546e0aa96a44b25f7cb912051c2dddace5c05c1ded`.

## Canonical integration and regression

An independent read-only canonical apply gate verified the parent receipts, all 37 preimage SHA, two runtime changes, four allowlisted source/test files, staged Chrome/Node/Python GREEN and zero release promotion. The gate then applied exactly four files. Apply receipt:
`docs/qa/FCV588_V49_CANONICAL_APPLY_20261019.json`;
SHA-256 `b9258439d3749a450cfa81dd24785189907494865b0fbdcb8da9a98f070c71fa`.

- Canonical targeted Node: **29/29 PASS**, log SHA `08813b840c3ea4f428779ac1707dedee8c3e002390dcd7445b5500a6ea67e6d9`.
- Canonical full Node: **511/511 PASS**, log SHA `b793205668ffbd16fb76ee2c5f5f2185740ca6ad04f19771fbec85ab13cfde27`.
- Canonical Python: **13/13 PASS**, log SHA `13c82dfd1a9039f7a1456b798ab42107a858d9223ae351e32785242587c102ff`.

## Outstanding Phase 6 gates and V50 recommendation

The **actual Narrator/NVDA spoken announcements** have **NOT_RUN** status; Chromium DOM/ARIA mutation tests are not speech capture. Genuine OS `window.blur` while POWER is held remains **NOT_RUN** following the V48 two-window Win32 focus test in which `document.hasFocus()` persisted and blur count stayed zero. Attached CoS Desktop exact 1366×768/1920×1080 is **NOT_RUN** despite isolated Chrome viewport checks.

V50 should prioritize **one safe, controlled acceptance dependency**:
1. Real Narrator/NVDA audio in a dedicated QA VM or explicitly approved isolated user test environment, with before/after spoken-utterance evidence and no intrusion into the user's current Windows session.
2. Genuine native window blur while POWER is held with actual `window.blur` observable, or exact attached CoS Desktop 1366×768 and 1920×1080 viewport measurement. Do not fake synthetic focus events or alter user display settings merely to claim PASS.
3. If authoritative lawful FCV-588 hardware/installed-firmware White Marker references become available, decide a separate firmware-specific TDD/profile migration path before modifying the operator event model.

**Phase 6 OPEN. All 65/65 claims HOLD, checklist 14/50, named tasks 6/22, installed firmware UNKNOWN, OEM rights HOLD, hardwareValidated=false, releaseApproval=HOLD.** No claim of 100% OEM likeness or navigation safety is supported by any of these software tests.
