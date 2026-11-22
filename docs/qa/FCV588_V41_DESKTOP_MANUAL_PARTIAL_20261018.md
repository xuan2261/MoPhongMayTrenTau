# V41 — CoS Desktop attached Chrome partial manual evidence

**Date:** 2026-10-18. **Environment:** actual attached Windows Chrome through CoS Desktop, independent FCV-588 offline training simulator at `http://127.0.0.1:4222/`. **Classification:** one observed native viewport, not complete Phase 6.

## Observed sequence

1. Existing user tab `9b6c5c17-11cb-4be1-bac2-126953616052:1626496519` for localhost port 4173 was preserved and not operated. A **new** background tab was created at `9b6c5c17-11cb-4be1-bac2-126953616052:1626496560`, initial pageId `35854742-be37-43ea-bddd-c7e70a3d765d`.
2. Console/network capture was cleared after first attachment, then the page reloaded. The first read after reload was inspection-only; it was explicitly **re-attached** and returned pageId `b05158b2-e906-4a99-b127-2515a98d05ff`. Captured request metadata was read after this reattachment. No assertion is made about pre-attachment events or response-body hashes in this recorder.
3. Actual button input clicked POWER and then used four true CoS Desktop `browser_action` click events on the instructor's `+1 giây giả lập` step button. A stale pre-POWER DOM ref was rejected before the first step; the operator took a fresh snapshot for each subsequent click. Four new click actions were accepted. **This was a browser tooling reference issue, not a demonstrated simulator defect.**
4. With a fresh DOM ref, `browser_action(key=Enter)` focused/activated the physical `MENU/ESC` button and opened the Sounder menu. Read-only browser DOM evaluation confirmed the exact current `Sounder` title; menu row `▶ Pic. Advance : 1x`; second row `Interference : Auto`; no `Picture Advance` or `Interference Rejection` row; and button text `MENU/ESC`.
5. Actual viewport was **1912×970**, document `scrollWidth=1912`, logical LCD Canvas **480×640**, `#key-menu` retained keyboard focus and D15 remained outside `.device-frame`. A real `browser_action(key=Escape)` closed the LCD overlay; readback reported `overlayHidden=true`.
6. Browser network readback listed **35/35 finished HTTP 200 localhost requests**, zero failed entries, zero dropped records. Browser console error capture contained **0** entries. This metadata is not a Desktop response-body SHA; independent Playwright isolated Chrome runs verified 210 HTTP bodies by hash for each stage/canonical run.
7. The connector screenshot after menu opening returned screenshotId `48c9654e-6e67-4929-ba07-eb385c8033cb`, actual bitmap **1600×812** scaled from live viewport by **0.8368200836820083**. This connector image was **not** saved as a canonical PNG or assigned an invented filesystem SHA. After review, the tab created by this session was explicitly closed. The owned temporary Node QA server PID 22904 was verified on port 4222 and stopped; the user-owned tab was left undisturbed.

## Unfulfilled gates

- Actual CoS Desktop **1366×768 and 1920×1080** viewports: **NOT_RUN**. Isolated Playwright exact dimensions are separate automated test coverage.
- Genuine OS-window blur while a device key is held: **NOT_RUN**; no synthetic event substitutes.
- Narrator/NVDA **spoken speech output** and independent human reviewer: **NOT_RUN**. DOM accessibility names do not count as speech evidence.
- OEM hardware/installed firmware/pixel geometry/media rights: **HOLD**.

**Decision:** limited Desktop manual observation PASS for the stated controls only. Phase 6 remains OPEN, 65/65 claims and release HOLD; no acceptance/checklist promotions.
