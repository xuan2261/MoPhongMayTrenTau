# V53 — Source/rights + accessibility review (PARTIAL, 2026-10-22)

**Authoritative V53 PARTIAL report.** Replaces earlier draft with an erroneous manually transcribed V52 final SHA. The original draft remains preserved for provenance.



**Disposition:** V53 PARTIAL_QA_WITH_INCONCLUSIVE_DYNAMIC_A11Y; NOT a release, V53 final seal, OEM conformity, or screen-reader speech pass. Phase 6 OPEN; 65/65 claims HOLD; 14/50 checklist; 6/22 accepted named tasks.

## Checkpoint, method and scope

- Canonical C:\Work\MoPhongMayTrenTau; current plan plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/plan.md.
- Parent V52 FINAL SHA 4650306d6c088fc19eaa09b66922faaf29712015ae9a2f8fdf5795d2e780107f (independently read back from V52 final file).
- Parent V52 independent post SHA 410966989a000ac7553f2085b13474dd6d5ac686a35df516f824a03a4ebb4608.
- 37/37 V52 runtime SHA matched before QA; zero runtime or firmware changes. Evidence only on C; damaged D disk NOT used.

## All 65 source/rights features

Primary machine audit: V53_ALL_65_CLAIMS_SOURCE_RIGHTS_AUDIT_20261022.json and V53_SOURCE_RIGHTS_AUDIT_ORIGINAL_20261022.log, with exact per-feature identifiers and source/rights/test references.

- 65/65 feature IDs map across trace, implementation and research draft: 64 operator features and D15 teacher platform. Zero cross-ledger conflicts of sourceStatus, rightsDecision, scope, domain, manualRefs and publicSourceIds.
- 11 source IDs known; 143/143 testReferences exist. File existence is NOT per-feature OEM acceptance.
- Operator rights remain curated written notes only. All 64 operator source grades are curated/not-behavior-verified. D15 is platform-only.
- Research draft: 53 OPEN, 12 SIMULATED_APPROXIMATION. Implementation: 61 operable synthetic subsets, 3 menu-only partial and 1 not implemented.
- Test evidence classification: 52 DOMAIN_SMOKE_NOT_PER_ROW_CONFORMANCE and 13 TARGETED_SCENARIO_TEST_NOT_OEM_CONFORMANCE. No individual claim promoted.
- 19 guard expressions depend on firmware; four additional menu coverage entries remain SOURCE_GAP. Video metadata sources PUB-FCV-007/008 have zero verified frames.
- Priority gaps: C11 NAV, D04 Language, D09 Tankenmaru, D14 NMEA. B07 White Marker remains a classroom enum with firmware UNKNOWN.
- Manufacturer rights: fresh public FURUNO USA Terms of Use and FCV588 support pages were consulted in this turn, without downloading/copying OEM media. Public URLs are not redistribution licenses. The project policy separates retain / aiProcess / reproduce / redistribute permissions.
  Official links: https://www.furunousa.com/en/terms_of_use and https://www.furunousa.com/en/support/FCV588.

## Bounded AX/ARIA in isolated Chrome

- Headless Chrome 1366x768, 35/35 local HTTP200, no observed console/page errors, 13 filtered AX/status/button nodes pre/post. D15 operator-guidance-announcement has role=status, aria-live=polite and aria-atomic=true outside LCD; the visibly changing guidance group itself is NOT live. Tab and Shift+Tab focus were observed from key-menu to pad-up and back.
- The V2 screenshot displayed STARTUP 2/4. Its zero live-region/help mutations cannot validate BRILL countdown because startup had not finished. V2 is only static AX/DOM evidence, not temporal or spoken QA.
- Initial AX helper generation produced a zero-byte file and was not executed; evidence is preserved. V3 source-corrected startup wait failed because the application's CSP blocks Playwright wait_for_function string eval. Original log preserved; no app source error inferred.
- V4 replaced the two waits with Playwright locator conditions, reached active POWER input, but its assertion allowing <=1 live-region write for an ENTIRE POWER CLICK failed. The assertion is overbroad: real pointerdown enters the power-hold semantic state and pointerup moves to Brill (two valid semantic title transitions). It is NOT evidence of repeated countdown-based ARIA announcements.
- Source-level reducer probe V53_SEMANTIC_TITLE_REDUCER_PROBE_20261022.json independently shows two such semantic transitions. In a held POWER state, UI ticks from 2.75s to 2.50s change visual summary but leave semantic title stable. The generic projectFcvInstructorMeta fallback for a Brill overlay is not the live Brill presentation route; web/app.mjs routes valid Brill controls through projectFcvControl and renderControlChrome. Therefore no proven D15 product defect follows from the helper fallback wording.
- V4 did not save the individual browser mutation strings before its assertion. True Chrome temporal spoken or no-spam acceptance remains INCONCLUSIVE / NOT_RUN; the error logs are preserved without weakening and rerunning the failed condition.

## Canonical regression

- Existing Node targeted accessibility, hold, trace, claims and course: 48/48 PASS.
- Full npm run check: 511/511 PASS.
- Python unittest: 13/13 PASS.
- No product changes; V52 prior source-body SHA 70/70 remains its own preserved checkpoint.

## Remaining acceptance blockers and next work

- Narrator/NVDA actual spoken utterances: NOT_RUN; no approved isolated Windows speech QA environment is available.
- Genuine Windows/Chrome window.blur during POWER hold: NOT_RUN; do not synthesize events or mark PASS when prerequisite does not occur.
- Firmware installed on real FCV-588: UNKNOWN; manufacturer rights for distributed assets: HOLD; independent reviewer: NOT_OBTAINED; hardwareValidated=false.
- Phase 6 OPEN; 65/65 claims HOLD; releaseApproval=HOLD.

Next: first design a revised time-scoped AX test that captures each actual semantic title transition separately from each 250-ms countdown tick and writes raw bounded mutation sequences before evaluating. Require source-valid RED/GO before any behavior change. Actual spoken Narrator/NVDA and OS blur acceptance still need explicitly approved, isolated Windows QA. Rights/installed-firmware evidence and independent per-feature review remain required for any public lesson/release.

This is a QA/documentation checkpoint only; no real vessel data, hardware control, OEM media redistribution or backup operation occurred.

