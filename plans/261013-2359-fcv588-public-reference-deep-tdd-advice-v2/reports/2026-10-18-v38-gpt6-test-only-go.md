# FCV-588 V38 — GPT-6 GO for one regression-test integration

**Decision time:** 2026-10-18. **Decision:** GO only for
`test/fcv588-v38-waypoint-source-edge.test.mjs`. This self-review
uses the user's approved GPT-6 supervisor substitution, not independent
peer review or a claimed verification of the client's reasoning setting.

## Evidence and protected boundaries

- Canonical baseline is V37 receipt SHA
  `e28f00a94840fecbd43a65967676638201a8729601910203362631efdb7139b1`,
  37 runtime assets unchanged from V36, 23 `src` modules unchanged.
- Isolated staging:
  `staging/fcv588-v38-waypoints-source-browser/`.
  Freeze receipt SHA:
  `c2d583a95bae8cd8125b71be3bf58daa90cd8f3a4b7c6cd47658c9b416d30b62`.
- Candidate test SHA-256:
  `4a49a44c667c951f9def14553fadb6ddaa9d2da629f5f25d42cf2a8d338dea4b`.
  It directly invokes canonical session/reducer/projection and
  replay interfaces and does not introduce external hardware I/O.
- Initial staged targeted test **7/7 PASS**.
  An intentional staging-only mutation of the destination-delete guard
  caused a named **expected RED** (6 PASS/1 FAIL, exit 1) with log SHA
  `8090e4b373037769eb4706798b3f0d07564d61ef6639696adc642be900d0e786`.
  Mutated source was restored exactly by pinned SHA and 7/7 PASS
  on the restored source (log SHA
  `b5cc559016f84b6ac1ff8ead0269d951fcb28416056bd007d4e20ca10a2bd116`).
- Separate browser QA harness first failed because its MENU test ran
  before POWER: `1366x768 KEYBOARD_ENTER_OPENS_MENU: None`, exit 1.
  The original runner, partial receipt, log and screenshot remain
  preserved. GPT-6 scoped GO in staging
  `evidence/V38_CHROME_ATTEMPT1_GPT6_GO_20261018.md` corrected
  only test sequence **in a new script and under new evidence names**,
  not the simulator.
- Chrome V38 Playwright attempt 2 at exact **1366×768** and
  **1920×1080**: **17/17** assertions per viewport (34/34 total),
  **35/35** actual browser response bodies SHA per viewport
  (70/70 total), HTTP 37/37 runtime assets before/after,
  **six new screenshots SHA-verified**. Receipt SHA:
  `d0d009c4f4048a9a45fde64ad21b54853d0c21226e0312f7fa2d1f341d1ca119`.
  Two screenshot previews were actually reviewed by the current agent.
  This is Playwright-managed Chrome, not CoS Desktop window resize.
- CoS Desktop newly attached tab `...:1626496548` captured
  readyState complete and a real 1912×970 viewport, 35 loopback
  HTTP 200 requests and zero console errors after attachment and reload.
  Browser window resize was tool-blocked before execution, not
  counted as a passed 1366×768/1920×1080 **native Desktop** gate.
- Windows Narrator executable exists; there is no observed spoken
  speech/captured audio or user screen-reader validation. NVDA not found
  at common locations. Real accessibility speech remains `NOT_RUN`.

## Narrow GO contract

1. Confirm the new canonical target path does **not** exist and that
   the staged test SHA is exactly the pinned candidate.
2. Copy exactly that **one new test file** to canonical `test/`,
   compare the resulting SHA. No `src` or `web` changes.
3. Run 7 targeted Node tests, `npm run check`, Python unittest,
   and verify all 37 existing runtime SHA values remain identical.
   Preserve fresh write-once V38 logs and source/checker receipts.
4. Record Phase 6 browser/manual and screen-reader speech HOLDs,
   all 65 claims HOLD, checklist 14/50 and accepted tasks 6/22.

**Not authorized:** git commit/push/merge/PR, release, rights changes,
OEM pixel or firmware certification, actual sonar/GPS/NMEA/RF/USB
connections or live system manipulation to manufacture a PASS.
