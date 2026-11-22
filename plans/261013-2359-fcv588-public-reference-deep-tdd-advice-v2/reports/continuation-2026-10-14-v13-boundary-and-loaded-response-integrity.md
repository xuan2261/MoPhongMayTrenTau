# FCV-588 PUBLIC_REFERENCE V13 — lesson-boundary and browser-loaded source integrity

**Date:** 2026-10-14.  **Workspace:** `C:\Work\MoPhongMayTrenTau`.
**Decision:** engineering regression/checkpoint **PASS**; public course,
rights, physical/hardware, OEM and overall phases 2–7 acceptance **HOLD**.

## Starting state and scope

Verified the existing V12 code, saved receipt and unchanged localhost process
before editing. `npm run check` returned **255/255 PASS**, the active plan
remained 7 phases / 22 named `### Task` units / 50 checkboxes, with only Phase1
10/10 checked. No Git repository, commit, branch, push, deployment, new server,
real sensor or device connection was created. Existing manuals, V11/V12 screenshots,
receipts and plans were preserved.

Independent V12 red-team review identified three Important technical gaps:
nonzero D15 lesson boundaries permitted caller omission of start-session hash;
inert observer `inspect` accepted a fake array with custom fields unrepresented
by array fingerprint; pre/post-source matching could not prove that *actual*
Chrome network response bodies matched the source between those checks.

## TDD repairs

1. **D15 teacher lesson scoring — `src/core/lessons.mjs`.** Added an explicit
   fail-closed contract: every `startSeq > 0` is invalid unless accompanied
   by a non-empty `startSessionHash`. The existing prefix-replay comparison
   then detects reuse of a start boundary from a different same-length session.
   The browser teacher path had already supplied the fingerprint and remains
   unchanged. Existing positive tests were amended to supply the actual
   session hash rather than silently depend on the old optional argument.
   New negative test reproduced a false pass with omitted hash, then GREEN.
2. **Observer and fingerprint — `src/core/device-runtime.mjs` and
   `src/core/protocol.mjs`.** Observer inspect accepts only plain non-array
   records (including null-prototype data records), and still requires exactly
   `kind=inspect` and a bounded `label`. `stableSerialize` now rejects arrays
   with non-index own keys, getters, sparse holes or custom/symbol properties;
   hashes of ordinary dense arrays are unchanged. A spoofed array with
   `.kind`/`.label` and missing-data-array tests first failed, then GREEN.
   The test-only multi-device format remains **v3**, pinned to the named inert
   stream schema. It is not an AIS transponder or a real sonar receiver.
3. **Chrome actually loaded source bytes —
   `tools/fcv588_chrome_viewport_acceptance.py`.** The existing V12 preflight
   and postflight SHA-256 checks remain. New per-browser `requestfinished`
   handlers capture and hash each actual response body *before navigation or
   reload*. The receipt can only PASS when every completed body matches the
   pinned preflight per-file digest, the body count equals the response count,
   mandatory modules loaded, no foreign runtime path appeared and no body
   capture/HTTP/console/network failure occurred. This rejects a malicious or
   accidental transient mid-run byte swap even if pre/post remain identical.
   Pure Python tests cover a normal manifest, temporary swapped bytes,
   missing/failed body capture, foreign/missing paths. RED was a named failing
   assertion for missing implementation; GREEN **4/4**.

Node tests before patches failed on the newly named assertions; affected
GREEN suite **38/38**. Final actual `npm run check` **259/259 PASS, 0 fail,
exit 0**. This count is test cases, not 259 FCV functions. Python syntax
check and separate Python response-integrity unittest **4/4 PASS**.

## Real Chrome V13 acceptance

`python tools/fcv588_chrome_viewport_acceptance.py` ran actual isolated
Google Chrome against the existing `127.0.0.1:4173` training server.
New receipt (V12 remains historical):
`docs/qa/FCV588_CHROME_VIEWPORT_V13_RECEIPT.json`.

- Source `preflight=SOURCE_TREE_IDENTITY_PASS` and
  `postflight=SOURCE_TREE_STABLE_PASS`, with **30** public app source assets
  byte-for-byte matched. Source manifest SHA-256:
  `4ad93c45b717efebb23500b24bd596eb61f29b74bd6a2aa1122f861c2fc5b7fa`.
- **1366×768 PASS** and **1920×1080 PASS**, actual measured Chrome viewports,
  logical LCD **480×640**, no horizontal overflow. Each isolated browser
  context started with **zero localStorage keys**, then D02 setting persistence
  was verified after reload.
- Each viewport captured **56 localhost-only responses**, of which **56
  actual response bodies matched** their expected SHA-256 and **28 unique
  runtime paths** appeared. No JavaScript console errors, failed requests,
  HTTP errors or outside-loopback URLs.
- Both exercised POWER boot/long hold, MODE 6000-ms UI-clock selector,
  TrackPad repeat, native Chromium pointer release/cancel and CDP touchCancel,
  D02 eight-slot training range edit/commit/replay/reset/reload, D10 teacher
  simulated fault. The 1366-width viewport exercised D15 RANGE lesson
  scoring; 1920-width exercised C11 NAV2 Box1 and NO DATA output.
- Saved, verified PNG screenshots:
  `docs/qa/screenshots/fcv588_public_v13_1366x768.png`,
  `docs/qa/screenshots/fcv588_public_v13_1920x1080.png`,
  `docs/qa/screenshots/fcv588_public_v13_1920x1080_nav2_configured.png`.
  Captures use `full_page=True`: bitmap height can exceed physical viewport.
  These images are original simulator artwork, not OEM-owned captures.

## Source, feature and phase gates after V13

- Archive verification: **24 PDFs + 2 ZIP files**, **197171462 bytes**,
  no integrity failures, **3 known acquisition gaps**. Retained restricted
  reference status; no redistribution rights derived from those hashes.
- Feature register and trace checks: **64 FCV operator features + separate
  D15**; menu and acceptance generators `--check` PASS. Coarse implementation
  checkpoint: **61 synthetic subsets**, **3 menu-only partial** (C11/D09/D14),
  **1 not implemented** (D04 language/reboot). All 65 claim decisions HOLD;
  none is manufacturer-verified or per-row `PUBLIC_REFERENCE_CONFORMANT`.
- AgentKit `plan validate` PASS, `plan parse`: **7 phases, 50 checkboxes,
  10 checked, 20%**, only Phase1 done; 22 named task units are separate.
  Unaccepted Phase2–7 source/reviewer gates were not falsely checked.
- A separate **independent strict READ-ONLY V13 code review** returned
  **scoped GO** for these three specific V12 remediations, with no introduced
  Critical/Important bug found; that review performed no code edit/test.
  It is **not Kongming**, an OEM sign-off or a public-release GO.

Remaining source/permission gates include D04 OEM language resources/reboot
semantics, C11 wind/bearing/heading input oracle, D09 full Tankenmaru output
protocol, D14 external IEC/NMEA receiver transport (prohibited here), exact
calibration/firmware/transducer/display behavior, physical touchscreen and
OS-window focus/blur tests, time-verified public video reference geometry,
per-feature browser/cancel/negative/replay receipts and independent rights/
lesson reviewer approval. Product remains **PUBLIC_REFERENCE PARTIAL / HOLD**.

### Bounded first-party public-source triage

The publicly indexed FURUNO product and support pages confirm FCV-588 as a
480×640, 50/200 kHz model and list current downloadable operator manuals and
guide revisions. Links for future rights-graded review (no protected asset
copied into this runtime):

- https://www.furuno.com/en/products/fishfinder/fcv-588/index.html
- https://www.furunousa.com/en/support/fcv588

These public product pages do **not** establish a particular user's installed
firmware, clearance to redistribute French/Spanish/OEM language materials,
the full external interface protocol, or any classroom/hardware approval.
No new restricted-source PDF was ingested into the served application.
