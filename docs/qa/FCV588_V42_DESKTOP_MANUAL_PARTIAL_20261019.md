# FCV-588 V42 — Actual CoS Desktop Chrome check (partial)

**Date:** 2026-10-19. **Result:** successful scoped manual keyboard and URL source observation only, **not** Phase 6 native exact-viewport, Narrator/NVDA voice or hardware acceptance.

## Session

- New CoS Desktop browser session ID c5b19428-0c81-4425-b853-290dfe1f5325. Initial tab listing for 127.0.0.1 was empty. A new background tab c5b19428-0c81-4425-b853-290dfe1f5325:1626496570 was created and attached at http://127.0.0.1:4224/, initial pageId 3db23ac0-f5a3-4a28-9bc0-72e3b6364900.
- Console and network recording were cleared before an actual reload. Reloaded pageId 0ef8bf51-f7c3-4efa-b31e-a6c76b4b84d9 was reattached and had readyState complete.
- Native browser_action clicked POWER/BRILL, then clicked teacher +1 simulated second four times using fresh element references. No synthetic DOM event or model state setter was used to simulate operator input.
- Native browser_action key ArrowRight on focused physical #mode-knob opened the MODE selector. Read-only in-browser DOM confirmed: title MODE; exact seven choices NAV1, LF-ZOOM, LF, DUAL, HF, HF-ZOOM, NAV2; highlighted DUAL; control summary current LF, draft DUAL; #mode-knob focus retained.
- Document viewport innerWidth=1912, innerHeight=970 and scrollWidth=1912. Logical LCD canvas=480×640. C11/D09/D14 instructor matrix was outside the device face. Captured console errors zero; network 35/35 completed HTTP200 local 127.0.0.1:4224 requests, zero failed/foreign, dropped zero. CoS metadata is not actual response-body SHA; separate isolated Chrome Playwright runner computed 210 browser body SHA.
- One browser_screenshot returned screenshotId 5a6f0973-149f-4414-a4a6-fd55b7b43416, connector bitmap 1600×812 with scale 0.8368200836820083 from actual viewport. No canonical PNG or file SHA was produced from that connector screenshot.
- **Important timing distinction:** An Escape dispatched after the first MODE dialog's six-second expiration could not prove cancel: the mode had already committed DUAL and Escape opened Sounder. It was **not counted** as a successful MODE cancel. A separate immediate sequence then closed Sounder, rotated MODE from committed DUAL to draft HF, verified dialog title MODE and current=DUAL/draft=HF, immediately pressed Escape, and read back LCD overlay hidden with committed DUAL unchanged. This second native sequence is the actual observed cancel PASS.
- The new tab was explicitly closed. Dedicated local Node server listening on port 4224 was verified to be owned by PID 25448 then stopped. Staging port 4223 was also closed earlier by ownership check. No display settings, Narrator process, real instrument hardware, serial/GPS/NMEA/RF or other user tab were operated.

## Outstanding

The actual CoS Desktop viewport was **1912×970 only**. Isolated Chrome automation validated 1366×768/1920×1080 but does not stand in for *native Windows attached browser viewport* gates. Narrator/NVDA actual spoken speech, genuine OS-window blur under an input hold, firmware identity, physical geometry, copyright/media rights, peer/human signoff are NOT_RUN/HOLD.

**Phase6 OPEN, 65 claims HOLD, hardwareValidated=false and releaseApproval=HOLD.** No manufacturer or real-shipping validation claimed.