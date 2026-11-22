# V51 C-only partial QA — 2026-10-22

**Outcome: PARTIAL.** Not a V51 final seal, not Phase 6 acceptance, not firmware/OEM/hardware validation. Scope: localhost-only synthetic FCV-588 training. Zero runtime code changes. V50 original receipts and plan remain unchanged.

## Canonical pin and scope

- Root: C:\Work\MoPhongMayTrenTau.
- V50 final SHA256: 88b6633a7bd8b68e0e3f048319095eb4d1d783e7f91d74fefad05e59770fd36a.
- V50 independent postreceipt SHA256: 1c95c486994004457f16f71fb75f885449f9b3ba00ea75ca348275016fcbb31b.
- Runtime SHA postflight: **37/37 MATCH**. No runtime changes.
- Trace ledger: 64 FCV operator + one D15 teacher claim, **65/65 HOLD**, firmware UNKNOWN, hardwareValidated false, releaseApproval HOLD.

## New software QA (canonical C only)

| Check | Result | Original output |
| --- | --- | --- |
| Node targeted server/hold/browser/V49 a11y tests | **31/31 PASS** | targeted-node.log |
| npm run check full Node suite | **511/511 PASS** | canonical-full-node.log |
| Python unittest | **13/13 PASS** | canonical-python.log |
| Real localhost HTTP negative routes | **5/5 denied** | localhost-negative-routes.json |
| Source SHA integrity | **37/37 match** | Compare to V50 final runtime map |

The HTTP negative set includes docs/QA, restricted manuals source, inherited transcript, a prohibited media path, and POST /. No restricted bytes were read through the server.

## Real CoS Desktop attached browser observations

A separate owned tab was created for http://127.0.0.1:4173/ and attached **before reload**. Observed actual CSS viewport **1912x970** (DPR 1). After reload, **35/35 HTTP 200** responses were localhost-only; **0 nonlocal origins, 0 JS console errors** observed. Screenshot connector ID: a2b50b5b-2ca0-4896-8881-513710132245, client preview scaled to 1600x812. No screenshot PNG was saved and no screenshot SHA exists.

Actual browser interaction observed: POWER ON, MENU/ESC opened Sounder menu, the menu displayed Pic. Advance / Interference / White Marker, Escape closed the menu, and Tab moved focus from MENU to pad-up. The instructor D15 polite live-region was found outside the LCD in DOM; this does NOT establish screen-reader speech.

**NOT_RUN:** CoS Desktop attached actual 1366x768, 1920x1080; real Narrator/NVDA utterance; genuine OS window.blur while POWER held. These are mandatory independent gates and were not approximated using synthetic events, DOM assertions or Playwright emulation. Browser-loaded HTTP response-body SHA was not measured in V51; HTTP 200 is NOT a replacement for this.

The test tab was closed; the owned local server was stopped. Verified 4173 no longer listened. Existing user windows were not resized and no unrelated process was killed.

## C-only data preservation

A local backup on C: was SHA-verified **8091/8091 files**, with **5/5** individual sample restorations. Manifest SHA256: 0375c36847dfab2e4e7c44e9b47817fcd9fe73bc02ec4e81aeb064ff67080932. Source snapshot had 838618223 bytes.

The user warned that another drive is damaged and expressly prohibited its use. The in-progress copy was immediately interrupted; no subsequent accesses or cleanup were made there. Any earlier partially attempted copy is UNVERIFIED. This C backup is on the SAME physical disk as the canonical root, not encrypted/offsite and not sufficient for independent disaster recovery. Raw ChatGPT messages/attachments/settings remain absent; chat deletion is not permitted.

## Required next work / hold

**Phase 6 OPEN; 65/65 HOLD; 14/50 checklist and 6/22 tasks per V50.** Do not issue V51 final/postreceipt seal, promote acceptance, change firmware/OEM artifacts, or edit the V50 sealed sources.

Priority: arrange an encrypted, healthy third destination outside this machine, then verify an independent backup and restore. Continue actual Narrator/NVDA speech, true OS blur and CoS attached exact viewport in an approved isolated Windows QA setup. Missing prerequisites remain NOT_RUN and must not be converted into PASS.
