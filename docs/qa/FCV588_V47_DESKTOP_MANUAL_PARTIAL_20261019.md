# FCV-588 V47 — Real attached CoS Desktop White Marker partial QA

**Date:** 2026-10-19. **Scope:** local Windows Chrome tab attached to the canonical offline training web application at `http://127.0.0.1:4234/`. This is a real browser interaction observation, not FCV-588 hardware/firmware acceptance.

## Session ownership and observed input

- Browser ID: `07ad2767-7d6e-4a32-94cd-6d4388d2c3a0`.
- Test-owned tab ID: `07ad2767-7d6e-4a32-94cd-6d4388d2c3a0:1626496621`.
- Attached page ID: `18a88a3f-ee5e-4e6a-b6ec-8c39bc5349e0`.
- Real observed DOM viewport: **1912×970** (not exactly native attached 1366×768 nor 1920×1080).
- Native browser actions: click POWER; click D15 `+1 giây giả lập` four times; click MENU/ESC; click TrackPad DOWN five times to select White Marker. Then ENTER, TrackPad RIGHT twice, MENU/ESC cancel, and instructor replay check.

## Read-only DOM observation

| Finding | Actually observed |
| --- | --- |
| Active LCD menu | `Sounder` |
| Selected LCD row | `▶ White Marker` |
| Row source grade | `TRAINING_WHITE_MARKER_PREVIEW_FIRMWARE_UNKNOWN` |
| Selected aria-current | `true` |
| D15 source cue | visible |
| D15 heading | `Sounder > White Marker · xem trước lớp học` |
| D15 explanation | Mentions FURUNO §1.22 color bar/Up-Down/ENTER/Off and that current White/Gray choices are independently simulated training values while installed firmware is unknown |
| D15 nested inside machine face | `false` |
| Operator LCD source caveat | Not printed on LCD |
| Replay after edited draft/cancel | `REPLAY PASS`, 118 logged steps at readback |

Attached connector screenshot ID: **23dda81b-b098-42de-b5cb-9381aee8b6bd**; connector bitmap 1600×812, scale 0.8368200836820083. The screenshot was not saved as a canonical PNG. **No SHA is claimed for the connector screenshot ID.**

Console errors observed **since debugger attachment**: 0, with 0 dropped entries. Network capture since attachment contained only one late localhost favicon request (HTTP200). It does **not** establish browser source-body integrity for initial page loading; that requirement was independently validated by the separate source-bound Chrome/Playwright runs, each with 210 actual loaded-response SHA checks.

The dedicated test tab returned `closed:true`. The owned localhost 4234 QA server was stopped; no user-owned tab, foreground window, Windows display setting or Narrator process was altered.

## Limits and acceptance

This is a DOM/visual interaction check only. Real screen-reader spoken output, attached native exact 1366×768 / 1920×1080 resizes, genuine OS-window blur during held key, installed FCV-588 firmware, OEM menu-choice/colorimetry equivalence, physical hardware operation and redistribution rights remain **NOT_RUN / UNKNOWN / HOLD**.

**Phase6 OPEN, all 65 claims HOLD; checklist 14/50, named tasks 6/22; hardwareValidated=false, releaseApproval=HOLD.**
