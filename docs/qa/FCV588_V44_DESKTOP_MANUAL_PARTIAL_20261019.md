# FCV-588 V44 — CoS Desktop attached Chrome mixed BRILL / TrackPad partial audit

**Date:** 2026-10-19. **Scope:** Windows Chrome attached background tab on localhost port 4228, created and closed by this V44 session. Offline simulator; no real transducer, NMEA, GNSS, RF, serial or USB transport.

## Observed session

- Browser ID: c5b19428-0c81-4425-b853-290dfe1f5325.
- Dedicated tab ID: c5b19428-0c81-4425-b853-290dfe1f5325:1626496586 (created here; closed after QA).
- Attached page ID: ebb88ef5-e635-4b46-8ee4-42b44cc0994d.
- Actual DOM viewport: **1912×970**, not the required exact 1366×768 or 1920×1080 native viewport.
- Real native browser clicks and read-only DOM inspection, not synthetic events.
- OEM §1.3 explicitly permits left/right Brill adjustment, but does not specify the combined TrackPad-to-short-BRILL sweep direction.

After actual POWER boot, the LCD top line read AUTO_R G:AF LF x1. Real browser clicks and immediate DOM readbacks gave:

| Native click | Committed / preview | Overlay |
| --- | --- | --- |
| BRILL opens | 9 / 9 | Brill |
| TrackPad LEFT | 9 / 8 | Brill |
| TrackPad RIGHT | 9 / 9 | Brill |
| Short BRILL again | 9 / 8 | Brill |
| TrackPad LEFT | 9 / 7 | Brill |

Connector screenshot ID: **226cb956-1e09-4c68-8221-b67d2f158f06**. Screenshot was 1600×812 at scale 0.8368200836820083. This is a connector image reference; no canonical PNG or imaginary SHA is claimed.

## Time-sensitive qualification

After latency between screenshot and input tools the dialog had timed out. An ENTER click then occurred **after** the dialog closed, so that attempt was **NOT counted** as ENTER commit PASS and did not prove a product defect.

A fresh, immediate sequence subsequently observed:

- BRILL reopened at current 7, draft 7.
- LEFT selected current 7, draft 6.
- ENTER closed the overlay immediately.
- BRILL reopened and showed committed 6, draft 6.
- MENU/ESC closed the overlay.
- Instructor replay button returned **REPLAY PASS**, with 393 logged steps at readback.

Browser console errors captured since attachment: **0**; no dropped entries. The connector captured only one late favicon GET HTTP200. Since capture attached after initial page load, it **cannot** validate all initial network resource bytes. The independently source-bound Playwright Chrome QA verifies 210 actual response-body hashes in each six-viewport run.

## Ownership and limits

The dedicated CoS Desktop tab was closed, and the owned localhost port 4228 server was stopped. These observations do not establish OEM pixel equivalence, hardware behavior or actual mechanical key timing.

**NOT_RUN:** attached native CoS Desktop exact 1366×768 and 1920×1080 viewports, Narrator/NVDA actual spoken output, genuine Windows OS-window blur under held key, manufacturer firmware identity or independent hardware reviewer.

**Phase 6 OPEN, 65/65 claims HOLD, 14/50 checklist, 6/22 named tasks, hardwareValidated=false, releaseApproval=HOLD.**
