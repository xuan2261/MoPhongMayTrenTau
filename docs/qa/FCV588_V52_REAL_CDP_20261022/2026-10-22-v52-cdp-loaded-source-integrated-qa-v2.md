# V52 — Actual Chrome-loaded HTTP source-body SHA completion (2026-10-22)

**Authoritative V52 integrated report.** Supersedes the earlier unsealed draft without -v2 because it included a manually transcribed digest typo. Original draft retained for trace; do not cite it for integrity.

**Outcome: scoped browser/source-integrity QA PASS; Phase 6 and release remain HOLD.** This milestone verifies actual browser response bytes, with zero product code, device, firmware, rights or OEM asset changes. The damaged drive was not used.

## Canonical lineage and source scope

- Project: MoPhongMayTrenTau; root C:\Work\MoPhongMayTrenTau.
- Plan: plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/plan.md; Phase 6 remains OPEN.
- V50 final SHA256: 88b6633a7bd8b68e0e3f048319095eb4d1d783e7f91d74fefad05e59770fd36a.
- Independent V50 postreceipt SHA256: 1c95c486994004457f16f71fb75f885449f9b3ba00ea75ca348275016fcbb31b.
- V51 attached-native partial postreadback SHA256: eba3ab285b843566550cdfa27e067e1f29a6dacd9cd34663d76b115c78757ffc.
- 37/37 canonical runtime SHA match before/after QA. F1-public-reference-21 is a simulator profile, not installed OEM firmware.

## Actual browser-loaded response bytes

V51 attached browser QA recorded 35/35 localhost HTTP200 but truncated three large response bodies: web/styles.css, web/app.mjs, src/devices/fcv588/model.mjs. V52 closes precisely this source-byte SHA gap. An owned localhost Node server at http://127.0.0.1:4261/ and one owned Chrome ran in two isolated contexts.

- Windows runtime: Node 22.22.0, Python 3.11.5, installed Chrome 155.0.8059.86, installed Playwright 1.57.0.
- Two sequential HEADLESS AUTOMATED Chrome contexts: 1366x768 and 1920x1080, DPR=1. Not native CoS Desktop attached; V51 tested those separately.
- CDP attached BEFORE navigation. Network.getResponseBody captured 35/35 completed HTTP200 requests in each context, complete bytes and sizes without the prior 20000-character inspection limit.
- Playwright request.response().body() independently retrieved the same already-loaded response bytes. Browser SHA, body byte lengths, V50 pinned digests and currently stored canonical source bytes all matched for both methods.
- **70/70 CDP-loaded response SHA PASS and 70/70 Playwright-loaded response SHA PASS.** No observed external network origin, incomplete request or console/page error.
- The three formerly missing V51 bodies are now SHA-verified at BOTH viewports; all file-level digests and source sizes reside in V52_FULL_LOADED_RESPONSE_20261022.json.
- Two new headless automation PNG screenshots have been opened and visually inspected. They are QA reference images, not OEM visual benchmarks; their SHA is recorded in the results JSON.

## New evidence files

All paths below are relative to docs/qa/FCV588_V52_REAL_CDP_20261022/.

| Artifact | Purpose |
|---|---|
| v52_full_browser_response_capture.py | Self-authored source-bound runner; SHA d303a32458f8f254a3f68fa126859b7b1e10be2729bff49f132220e6e1041b05 |
| V52_FULL_LOADED_RESPONSE_20261022.json | Two 35-response CDP plus Playwright source-bound logs; SHA 87da3d688560a7846516056c294e7b05c9f6845a0258e67706c3ad3effdb686a |
| V52_CDP_RUN_ATTEMPT1_20261022.log | Owned V52 runner result, exit 0 |
| V52_OWNED_SERVER_20261022.log | Owned localhost Node service output |
| V52_CHROME_CDP_AUTOMATED_1366x768_20261022.png | Headless viewport reference PNG |
| V52_CHROME_CDP_AUTOMATED_1920x1080_20261022.png | Headless viewport reference PNG |
| V52_CANONICAL_TARGETED_NODE_20261022.log | Node targeted tests 58/58 PASS |
| V52_CANONICAL_FULL_NODE_20261022.log | Canonical full Node 511/511 PASS |
| V52_CANONICAL_PYTHON_20261022.log | Python unittest 13/13 PASS |

Before running V52, the historical V50 native runner SHA was checked against locked receipt: d6084c8e3bd44ddf4e58251f1763143a7e0f0b4f5ccda3549385fd6f284ff352. The new runner was parsed, hashed and executed with already installed dependencies; no installation occurred.

## Mandatory gaps remain unpromoted

- 64 FCV operator + D15 platform claims all HOLD (65/65). Rights clearance false; reviewerSignoff NOT_OBTAINED.
- hardwareValidated=false, releaseApproval=HOLD, firmwareInstalled=null/UNKNOWN.
- Narrator/NVDA REAL spoken utterances = NOT_RUN. Narrator exists but was not activated on the user's ordinary desktop. NVDA CLI not observed and no approved isolated accessibility VM available.
- Genuine Chrome window.blur while POWER held = NOT_RUN. Earlier real HWND foreground switch did not generate browser window.blur. No synthetic blur is treated as PASS.
- OEM geometry, firmware-specific choices, actual transducer, physical controls and media rights remain UNKNOWN/HOLD.

**Phase 6 OPEN, 65/65 HOLD, checklist 14/50, accepted named tasks 6/22**. Counts of software tests are not a percentage of OEM fidelity or authorization to release.

## Next bounded milestone

Use an authorized isolated Windows QA environment to capture audible Narrator/NVDA utterances at D15 status-title changes and verify visual countdown updates do not repeat spoken announcements. Reproduce an actual OS/browser window.blur while POWER is held, record real HWND focus, page blur count and cancellation/replay, and keep NOT_RUN if the event cannot be induced naturally. Individual feature and rights/reviewer acceptance requires separate lawful evidence; do not promote claims.

This document is a software/browser QA report, not a final release. A separate milestone integrity receipt and independent readback will be authored only after postdocument tests pass.

