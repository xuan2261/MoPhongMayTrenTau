# FCV-588 V37 — GPT-6 narrow GO for additional negative-vector tests

**Date:** 2026-10-18. **Decision:** GO, **test-file-only integration**.

## Authority and protected boundary

The user authorized GPT-6 in this ChatGPT session as GO/NO-GO
supervisor for verification and minimal fixes. This is **self-review, not an
independent reviewer**, and does not attest the client's Extra High setting.
Canonical V36 remains the public-reference baseline: SHA-256
`d7d7c3eba806317d6690f2d4cb91cc15eed6c705b16ab1519ed4621f168ebafe`.
All 37 runtime source SHA values were checked against the V36 receipt
before this decision and match. No V37 runtime/product edits are approved.

## Test contract and observed stage evidence

- Staging: `staging/fcv588-v37-negative-vectors`; 37/37 runtime bytes
  match canonical V36 (frozen baseline copy receipt SHA
  `45877af2faca62ca660f6e3581b377b749703a3e139bf7aa30fc09d5931e09e3`).
- Candidate: `test/fcv588-v37-negative-vectors.test.mjs`; SHA-256
  `dd9bdfec132f84c67b88ec1f1a159b2248eec80526af09c58478f611a1f2b7eb`.
- Four actual deterministic integration checks passed on the staged source:
  C11 MARK order/destination and replay; C11/D14 NMEA-selected absent receiver
  and unavailable ETA; D09 virtual option revoke/regrant while POWER suspends a
  draft, no RF, replay; D14 trip/temp/speed NMEA preferences across POWER and
  future data fail-closed. Targeted first 4/4, exit 0.
- Controlled **staging-only** mutation `transport:"NONE"` to
  `transport:"NMEA"` in `receiver-status.mjs` produced the **expected RED**
  (2 PASS, 2 FAIL, exit 1 on exact NONE-versus-NMEA assertions), preserved at
  `evidence/V37_MUTANT_TRANSPORT_RED_20261018.log` SHA
  `7c235c1cd0395a91663c253e2f0ae1f9ee80feed3ea8e2eedf952dd022b33774`.
  This is an intentionally injected test defect, **not a product Verify failure**.
  The stage was restored byte-exactly, 37/37 source SHA matched the original
  V36 baseline, and restored test execution passed 4/4, exit 0, log SHA
  `4b9086daa2bc3d1f3d51cd535a902656e33522b03e8fa117bcc6b8cc2c4d35b5`.

## GO scope and required gates

1. Copy **only** the verified new V37 test into canonical `test/`, but only if
   the canonical target does not yet exist and stage SHA is exactly pinned.
2. Validate its target SHA and independently rerun targeted Node, full
   `npm run check` and Python tests against canonical source; preserve separate
   write-once V37 execution logs and investigate any actual failure.
3. Reconfirm runtime SHA 37/37 unchanged; do not update device profile, settings,
   replay or event schema; do not rewrite historical V36 evidence.
4. Phase 6 manual/browser, screen-reader real speech and exact OEM
   firmware/rights remain independently gated, even if all new tests PASS.

**No authorization:** feature/reducer/frontend changes, hardware interfaces,
new physical receiver, OEM media/runtime copying, Git operations, release,
claim promotion, or independent-review PASS.

**Standing release decision:** `releaseApproval=HOLD`,
`hardwareValidated=false`, 65/65 claims HOLD; checkpoint 14/50 checklist and
6/22 accepted tasks remain unchanged absent separate evidence.
