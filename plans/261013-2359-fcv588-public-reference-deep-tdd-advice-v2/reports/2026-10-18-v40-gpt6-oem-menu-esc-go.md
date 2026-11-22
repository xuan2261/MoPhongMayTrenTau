# V40 — GPT-6 bounded integration GO for OEM MENU/ESC text

**Date:** 2026-10-18. **Supervisor:** GPT-6 in the user's ChatGPT
session, as expressly authorized for evidence-backed GO/NO-GO.
This is a **self-review**, not OEM endorsement, independent reviewer
approval or a verified client Extra High setting.

## Source and staging evidence

- **Manufacturer operator reference:** [FURUNO FCV628/FCV588
  Operator's Manual OME-23890-E, §1.1](https://www.furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/fcv628_fcv588_operators_manual.pdf),
  control 1 visibly names `MENU/ESC`. The original V39
  `web/index.html` operator face displayed `MENU` with a line break
  and `ESC`; its flattened accessible name was `MENUESC`.
- V39 canonical integrity receipt SHA:
  `35d2f106c60186d29f89fc159945b6530084a0822d2f3ea98fec0fa261600bce`.
  Stage cloned **37/37 runtime assets** from V39 SHA,
  with test/server support files pinned.
- Initial new-test RED 1/2 failed on a malformed test selector
  (word boundary after quote), not an FCV product assertion.
  The failed log was preserved and root cause verified independently;
  `V40_ORIGINAL_RED_CHECKER_STOP_GPT6_GO_20261018.md` documented
  permission to correct **only** the selector.
- The corrected RED then failed **on the exact target mismatch**,
  `expected MENU/ESC; actual MENUESC`, exit 1, 1/2 passing.
  Both failed logs remain write-once.
- Staged correction changed exactly the one HTML button content:
  `MENU<br><span>ESC</span>` -> `MENU/ESC`.
  The corrected new Node test passed **2/2**, exit 0.
- Six isolated Chrome viewports **320×720, 375×812, 768×1024,
  1366×768, 1440×900, 1920×1080** passed **84/84 checks**;
  **210/210** actual browser response SHA and **12/12** own-source
  screenshots SHA verified. No clipping of the OEM key label,
  no body horizontal overflow; Enter/ESC/menu/replay remained functional.
  No CSS adjustment was required.
- New CoS Desktop Chrome tab attached before reload: real viewport
  **1912×970**, native keyboard Tab focus, exact accessible
  `MENU/ESC`, text fit; 35 localhost HTTP200 requests, zero
  console errors. It is not an exact-viewport Desktop gate
  or real screen-reader spoken output.
- Frozen V40 staging manifest SHA
  `a5d2de2778ec76e49ea955b1fd962aaf35d2ddee40290ba14b68314ded114eef`
  proves **one changed runtime file**:
  `web/index.html` old SHA
  `7ec574436566e10e32064455dc3e8b0e53d1449723d53781d1b6e2f22e97340d`,
  new SHA
  `cb9b5c40f61c5d1da9fa2e6b96a60f2210556b9e0af211ef33a6b443ef44d5b2`.
  New test SHA is
  `05a0f65efc116961f775c95d66e84c08d3f9da0b0bd223baf343358e9f178ec3`.

## Scoped decision

**GO** only for:

1. Verify canonical V39 source, verify that its original HTML contains
   the one pinned markup, confirm no preexisting V40 test path.
2. Apply a **single exact HTML replacement** to canonical
   `web/index.html` without altering any other byte; copy only
   `test/fcv588-v40-oem-menu-label.test.mjs` by matching its
   staged SHA.
3. Recompare all 37 canonical runtime SHA to the V40 target
   manifest (36 unchanged, one verified HTML), then run targeted
   Node, full Node/Python, selected fresh canonical Chrome/
   source-body/HTTP tests, screenshot SHA and documentation
   postcheck.
4. Keep original V39 receipts and both V40 failed-test logs
   unmodified; report actual QA outcome by a new V40 receipt.

**NO-GO** for any bezel-size/angle/color/font guess, OEM photo or
manual asset copying, firmware/replay/schema changes, extra
teacher labels on LCD, independent reviewer PASS, connecting
real marine I/O, commit/push/PR/merge or course release.

**Standing:** Phase 6 OPEN, 65/65 feature claims HOLD,
14/50 checklist, 6/22 accepted tasks, `hardwareValidated=false`,
`releaseApproval=HOLD`. A source-grounded control label
improvement is not an OEM pixel-equivalence percentage.
