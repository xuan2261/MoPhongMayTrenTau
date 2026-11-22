# FCV-588 V38 — Chrome exact viewports and Desktop manual accessibility evidence

**Date:** 2026-10-18. **Release decision: HOLD.**
Actual training UI in localhost only; no maritime device, serial,
NMEA receiver, transducer or external origin. This report separates
**CoS Desktop attached-browser** evidence from **Playwright-managed
Chrome exact viewport** evidence.

## A. Attached Desktop Chrome — partial

- Existing user's original localhost tab `...:1626496519` was left
  intact. One new background browser tab was opened and attached:
  `9b6c5c17-11cb-4be1-bac2-126953616052:1626496548`,
  initial pageId `efe2999f-0e17-4197-be94-54e8f2894c39`.
- Before reload, browser console and network buffers were cleared.
  Then the attached tab was reloaded and a new snapshot confirmed
  `readyState=complete` with pageId
  `80dfddf8-eb4f-4498-abf9-5aaa1ca07c9a`.
- Actual `window.innerWidth/innerHeight` = **1912×970**,
  `documentElement.scrollWidth=1912`, LCD logical
  `480×640`; the three h4 C11/D09/D14 headings and source live
  region were outside the physical device-frame.
- Post-attachment reload capture: **35/35 HTTP 200** requests,
  all under `http://127.0.0.1:4173/`, all finished; **0 console
  errors** on readback. This record does **not** assert SHA body
  retrieval from CoS Desktop, unlike the separate Playwright receipt.
- Native Desktop screenshot reference
  `cea48635-25a3-4809-afe7-751b6beea7d3`, reported bitmap
  1600×812 at scale 0.8368200836820083; **not exported to a
  workspace PNG**. Avoid calling this a saved image artifact.
- A request for changing window dimensions was **tool-blocked before
  execution**. No 1366×768 or 1920×1080 viewport was observed
  within this Desktop session. Do not reclassify that operation as
  a successful native resize, or as a product UI failure.

**Desktop Phase 6 exact-viewport requirement: NOT_RUN / HOLD.**
Prior V37 live input evidence at the same unchanged runtime remains
separate and is not repeated or reattributed as a V38 run.

## B. Independent real Google Chrome through Playwright — PASSED

Isolated Chrome v155.0.8059.80, **one browser launch with two
fresh contexts**, `deviceScaleFactor=1`, `locale=vi-VN`,
`reduced_motion=reduce`, no shared user storage. Actual viewport
values were measured in each page rather than inferred from requests.

| Chrome context | Tested viewport | Browser assertions | Actual response bodies SHA matched | Screenshot SHA |
| --- | --- | ---: | ---: | ---: |
| Context 1 | **1366×768** | **17/17 PASS** | **35/35** | 3/3 |
| Context 2 | **1920×1080** | **17/17 PASS** | **35/35** | 3/3 |
| **Total** | | **34/34** | **70/70** | **6/6** |

Preflight and postflight separately compared all **37/37**
eligible browser-served runtime assets, every byte bound to the
unchanged canonical V36/V37 source manifest; the browser harness SHA
itself remained unchanged during successful execution.

The Chrome run exercised, at both sizes: first-Tab focus, short POWER
boot and four simulation ticks, Enter/ESC menu behavior after POWER
ON, logical LCD 480×640, no horizontal document overflow, separate
D15 source matrix, empty isolated localStorage, reduced-motion
configuration, teacher synthetic Own fixture, real Chromium
`Input.dispatchTouchEvent` touchStart/touchCancel for FUNC without
stuck pressed state, actual Enter-down held over 3 seconds and release
to POWER OFF, and deterministic replay. This proves browser
interaction under these specific controlled Chrome contexts, **not
physical touchscreen/key travel, ship data or OEM fidelity**.

### Browser first-run STOP and recovery provenance

Initial original runner (preserved):
`staging/fcv588-v38-waypoints-source-browser/tools/v38_exact_viewports_playwright.py`,
SHA `67fe264870ffc240a5e7e025548e397b4659f3d821aa9b5b4fbf42b408a30ac8`.
Its write-once receipt
`evidence/V38_EXACT_VIEWPORT_CHROME_20261018.json`
recorded **exit 1**, `1366x768 KEYBOARD_ENTER_OPENS_MENU`.
Root cause: the test attempted MENU before boot, while POWER OFF.
An explicit GPT-6 decision
`evidence/V38_CHROME_ATTEMPT1_GPT6_GO_20261018.md`
permitted **only** the harness sequencing correction.

Second runner was created under a **different name**, not edited
over the failed runner:
`tools/v38_exact_viewports_playwright_attempt2.py`,
SHA `679992f37e9e9bd75a9791b5dba9cd4ac66de253acd0b60dee71381d6ceb193e`.
Its write-once successful receipt:
`evidence/V38_EXACT_VIEWPORT_CHROME_ATTEMPT2_20261018.json`,
SHA-256
`d0d009c4f4048a9a45fde64ad21b54853d0c21226e0312f7fa2d1f341d1ca119`.
All six screenshot files are located under
`staging/fcv588-v38-waypoints-source-browser/evidence/screenshots/`.
The 1366 running and 1920 initial shots were actually opened for
qualitative inspection; the other four were checked by SHA rather
than claimed individually viewed.

## C. Real screen reader speech — NOT_RUN

Windows Narrator executable was found, but no Narrator spoken output
was recorded or heard through a verifiable test facility. NVDA was
not found at common installed paths. It would be misleading and
intrusive to turn on a screen reader in the user's active desktop
and declare it passed from an ARIA snapshot. Only DOM/accessibility
semantics, status text and keyboard focus are software-verified.

The separate requirement for **real OS-window blur while a physical
hold is in progress** was not reproduced in this browser run.
Native Chrome touchCancel was exercised through CDP and cannot be
substituted for an actual user device or OS-window blur audit.

## Remaining Phase 6 and OEM HOLDs

1. Controlled Desktop **attach-before-reload at the two exact
   requested Windows viewports**, including measured dimensions,
   screenshots and console/network since reload.
2. A verifiable Narrator/NVDA read-aloud session of D15 headings,
   announcements, focus and non-repetition; held-key OS blur.
3. Independent source/rights review for all 64 FCV features plus
   D15, firmware revision, permitted media reuse and per-lesson
   acceptance. No original OEM artwork was added to runtime.

**Phase 6 OPEN; 65/65 public claims HOLD; hardwareValidated=false;
releaseApproval=HOLD.** No OEM likeness percentage can be inferred
from these assertions.
