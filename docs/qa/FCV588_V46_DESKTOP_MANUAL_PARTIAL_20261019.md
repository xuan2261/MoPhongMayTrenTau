# FCV-588 V46 — CoS Desktop Chrome manual Colors/D15 partial check

**Date:** 2026-10-19. **Scope:** actual attached Chrome tab with real button clicks at locally served canonical simulator http://127.0.0.1:4232/, source and UI only.

## Test-owned session

- Browser ID: `07ad2767-7d6e-4a32-94cd-6d4388d2c3a0`.
- Tab ID: `07ad2767-7d6e-4a32-94cd-6d4388d2c3a0:1626496614`.
- Attached pageId: `9cdbe534-b4ca-498f-9a84-26a9eb2198b9`.
- Observed DOM viewport **1912×970**, not 1366×768 or 1920×1080 native attached resize.
- Input: genuine browser-action click POWER, four D15 +1-second training steps, MENU/ESC, TrackPad RIGHT (Display) and DOWN (Colors). Not a synthetic `dispatchEvent()` operation.

Observed canonical read-only DOM after clicks:

| Evidence | Observed |
| --- | --- |
| Active menu title | `Display` |
| Selected operator row | `▶ Colors` |
| Row aria-current | `true` |
| Source grade | `TRAINING_PALETTE_PREVIEW_FIRMWARE_UNKNOWN` |
| D15 source cue hidden | `false` |
| D15 source title | `Display > Colors · xem trước lớp học` |
| D15 source detail | Explains the FURUNO v2.01 history, 8/16-color **training simulation**, and that installed FCV-588 firmware and OEM LCD colors remain unverified |
| D15 cue nested inside the face | `false` |
| LCD overlay operator wording | Displays `Colors`, not `Colors · SIM` |

Attached Chrome screenshot reference: **2b70820c-5886-4f0b-87f8-ad22fe49afb4**, native bitmap 1600×812, scaling 0.8368200836820083. This is a connector screenshot ID, **not a saved canonical PNG** and no imagined SHA was assigned to it.

CoS browser console capture since attachment showed **0 errors**, **0 dropped entries**. CoS network capture observed one late GET favicon 200 only; it did **not** capture all initial loading responses because attachment occurred after loading. Browser-loaded runtime-body SHA evidence comes **only** from separate project-native Playwright runs (210/210 each stage and canonical).

The test-owned tab returned `closed:true`; the separately owned localhost QA server 4232 was stopped. No user-owned tab, desktop display settings, real sensor or ship hardware was changed.

## Strict limitations

This is DOM/UI observation, **not** real screen-reader spoken-output capture or an independently calibrated OEM LCD screenshot. Exact CoS native 1366×768 and 1920×1080, genuine OS-window blur under held key, Narrator/NVDA speech, installed FURUNO firmware and proprietary media redistribution rights are **NOT_RUN/UNKNOWN/HOLD**.

**Phase 6 OPEN; 65/65 claims HOLD, checklist 14/50, named tasks 6/22, hardwareValidated=false and releaseApproval=HOLD.**
