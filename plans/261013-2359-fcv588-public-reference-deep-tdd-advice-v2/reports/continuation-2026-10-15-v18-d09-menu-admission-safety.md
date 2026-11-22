# FCV-588 PUBLIC_REFERENCE v2 — V18 continuation, D09 menu edit ownership

**Observed:** 2026-10-15 on Windows `C:\Work\MoPhongMayTrenTau`.
**Decision:** D09 menu-reindex root cause **CODE/OBSERVED CHROME GO**, feature/source
conformance **HOLD**, classroom course/distribution **HOLD**, hardware/OEM **HOLD**.
No Git, commit, push, deployment, hardware control or real IEC/NMEA/radio connection.

## Preserved baseline, not restarted

- The current active v2 plan remains
  `plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/plan.md`.
  Historical hardware-target and public-v1 plans are unchanged. AgentKit's
  checklist remains **10/50 (20%)**; only Phase1 passed all its own gates.
- Existing loopback training server `127.0.0.1:4173` (observed PID 36768)
  was reused without stopping/restarting. `.git` is absent.
- V14, V15, V16 and V17 browser/test receipts remain historical artifacts.
  Previous interrupted/unpolled processes are not counted as PASS.

## Reviewer-discovered P1 — full TDD remediation

Independent scoped D09 reviewer found **one P1**, no P0: when Tankenmaru
virtual `On` hides `System > NMEA` and `Receiver Status`, a student could stage
an edit to a following item (`FUNC Key` / `Key Beep`) and the instructor could
revoke the optional fixture before ENTER. Restoring those two menu rows shifted
the positional index. The reducer previously committed the old draft to the
new row, e.g. `settings.nmea = 'Pic. Advance'`, leaving an invalid in-memory
settings state and breaking local persistence. The original V17 Chrome proof
checked only the unchanged Tankenmaru row, not its dynamically shifted successor.

**RED reproduced:** A new `test/fcv588-public-system.test.mjs` assertion
failed with `dynamic menu cardinality change must cancel any pending edit`
(`true !== false`), exit 1. The test exercises **both** `FUNC Key` and
`Key Beep` after the option is revoked while their draft is staged.

**GREEN implementation:** `src/devices/fcv588/model.mjs` now uses an
`editEntryId` bound at edit start, validates that the same row/choice is still
editable before `pad` or ENTER commit, and uses `reconcileCapabilityMenu` when
the D15 Tankenmaru entitlement changes the menu's ID set. The current semantic
row stays selected, while a pending edit is canceled and its draft removed.
If the option/choice is unavailable or its ID differs, no settings mutation is
allowed. Tests additionally prove no `settings.receiverStatus` injection,
`settings.nmea` stays `Off`, the settings codec round-trips and replay hashes
match. `test/fcv588-public-system.test.mjs`, along with menu, persistence and
receiver tests: **29/29 PASS** after GREEN.

Because this changes deterministic menu-state semantics, the public profile
was explicitly pinned to `F1-public-reference-14`, and persisted settings to
schema **13**, storage key `mophongmaytrentau.fcv588.public-reference.settings.v13`.
Historical v12 / profile13 settings are rejected; no automatic migration or
reinterpretation is claimed. Core contract `f1-core-5`, event/replay schema5,
scenario7 and multi-runtime3 are unaffected. The conservative `64+D15`
implementation/evidence generator was rerun and retains 60 FCV operator
synthetic subsets, three partial C11/D09/D14, one not implemented D04, plus
separate instructor D15. **Every `claimDecision` remains HOLD.**

## Final full-suite and actual Google Chrome acceptance

- New `npm run check`: **286 tests / 286 PASS / 0 FAIL / exit 0**.
- Actual Google Chrome runner: `python tools/fcv588_chrome_viewport_acceptance.py`.
  Machine-readable receipt:
  `docs/qa/FCV588_CHROME_VIEWPORT_V18_RECEIPT.json`.
- `1366×768` and `1920×1080` both measured at their requested exact browser
  viewport dimensions, 480×640 logical LCD, no horizontal document overflow.
  Each clean isolated context began with `preScenarioStorageKeys=[]`.
- **Both contexts verified 58/58 actual browser-delivered HTTP response
  bodies** against the preflight SHA-256 tree and found 29 unique loaded paths.
  Preflight `SOURCE_TREE_IDENTITY_PASS` and postflight
  `SOURCE_TREE_STABLE_PASS` across all 31 permitted runtime assets. No foreign
  requests, failed requests, JavaScript console or network errors.
- Verified source manifest:
  `e1dca7711d87b449bbeefd8948034973bc9b8d84ce57089cde38e895ff37fe81`.
- Verified captured response-body sequence digests:
  - 1366×768: `cf58a73125f2a1a86949940e9109b6d7022ce5f90c3903a40063b07f5ede1a5c`
  - 1920×1080: `7e2242cbd46b66d38c8a9ee01d587d0aad6ada952808760250cbbfd7f8851010`
- New **trusted browser regression**:
  `ACTUAL_D09_DYNAMIC_MENU_REINDEX_SAFE_EDIT_PASS` at both viewports — operator
  stages FUNC Key while virtual Tank On; instructor revokes the fixture;
  cursor remains on FUNC Key, edit is canceled, the next ENTER cannot corrupt
  NMEA/receiver settings. Both viewports also retain D09 grant/revoke,
  keyboard/pointer hold/cancel, rotary lostpointercapture, POWER long hold,
  D02 persistence, replay and D15 scoring gates. These are actual Chromium
  inputs, not injected DOM `PointerEvent` objects.
- Three full-page Chrome screenshots:
  `docs/qa/screenshots/fcv588_public_v18_1366x768.png`,
  `docs/qa/screenshots/fcv588_public_v18_1920x1080.png`,
  `docs/qa/screenshots/fcv588_public_v18_1920x1080_nav2_configured.png`.
  Full-page image height may exceed the viewport height.

## Source/rights and acceptance boundaries

The manufacturer-hosted operator manual §2.9 (printed p.29) has an indexed
Tankenmaru submenu with Output (shown Off), Pic. Sync (shown Yes), and Sub
Clutter (shown 4). This continuation added independently paraphrased details
to `docs/research/FCV588_MANUAL_ORACLE_REVIEW_2026-10-14.md` after checking
the public search-indexed official PDF excerpt. The *direct* online PDF fetch
returned HTTP 403; it was not a new full manual/media or OEM hardware review.
Actual Output implies a separate radio-linked partner display, so **this
simulator never enables radio output, copies partner video, exposes a real
transmitter or fabricates an installed optional module**. The full Sub Clutter
range, video sync timing, physical cabling and firmware-dependent behavior
remain `SOURCE_GAP` or `NOT_IMPLEMENTED`. D09 stays MENU_ONLY_PARTIAL.

Independent D09 reviewer first returned scoped **NO GO** on the real menu
reindex P1, then re-read the actual remediation and reported **scoped code
GO, no remaining P0/P1 in the assigned D09 surface**. Their read-only review
does not substitute for Kongming supervision, public lesson source/reviewer
sign-off, source/media licensing or hardware validation.

Other unclosed gates: D04 alternative language/reboot rights, D14 actual
IEC/NMEA source semantics, C11 advanced wind/bearing cycle, OEM/calibration/
sonar fidelity, physical/small-phone touch geometry, video frame-level
references, and per-feature independent acceptance. OS physical hardware,
manufacturer certification and distribution rights remain unverified.

**Next safe engineering tasks:** investigate small-viewport hit targets and
menu accessibility with actual measured Chrome; complete source-graded
negative/cancel/display coverage for remaining partial operator features;
obtain independent rights/reviewer decisions before claiming any
`PUBLIC_REFERENCE_CONFORMANT` row. Do not check a whole plan phase unless
*all* of its own gates actually pass. No synthetic subset count is a release
approval or hardware-equivalence score.
