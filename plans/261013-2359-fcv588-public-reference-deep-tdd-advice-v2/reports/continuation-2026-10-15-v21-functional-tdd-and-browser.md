# FCV-588 F1 PUBLIC_REFERENCE — V21 substantive development and QA

Date: 2026-10-15. **Runtime/code GO for the scoped synthetic behaviors;
PUBLIC_REFERENCE_CONFORMANT, independent classroom lesson review, media
redistribution, hardware equivalence and release remain HOLD.** This is a
continuation of the **only** active seven-phase plan:
plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/plan.md.
No project recreation, Git init/commit/push, deployment, external marine
equipment, RF link or NMEA receiver/transmitter was used.

## Verified source and execution identity

| Item | Current observed V21 |
| --- | --- |
| Windows workspace | C:\Work\MoPhongMayTrenTau (no .git) |
| Existing HTTP service | http://127.0.0.1:4173/ (PID 36768 preserved) |
| FCV profile | F1-public-reference-15; PUBLIC_REFERENCE; firmware null |
| Settings | schemaVersion14, localStorage settings.v14 |
| Deterministic core | f1-core-5, event schema5, replay envelope5, scenario7, multi-runtime3 |
| Source manifest | 14772f98e1aa03ac9a11ed2da96d225f4a976c0d0160f11bf2968ba1b9955ed2 |
| Source digest check | **32/32 original runtime files matched each of two independent V21 Chrome receipts** |
| QA script integrity | desktop/helper and mobile Python SHA-256 recorded and checked unchanged |
| Release approval | HOLD |

The V20 manifest 5951b875...76bb and profile14/schema13 are historical
only. A behavior change to an existing saved NAV data-box field and
conditional System menu UI justified deliberate profile15/schema14:
old settings and replay contracts are rejected, never silently upgraded.
The new UI does not introduce sensor or transport permissions.

## Real behaviors implemented with regression evidence

| Feature/group | Actual before | V21 synthetic implementation, not an OEM claim | Specific TDD/verification |
| --- | --- | --- | --- |
| C11 TIME TO GO | Menu selectable, always rendered NO DATA | Selected synthetic waypoint + fresh typed Own position + positive synthetic Own speed gives HH:MM (SIM EST); source/stale/zero/no destination negative cases remain NO DATA and world/replay unchanged | test/fcv588-public-nav-box-config.test.mjs, RED on NO DATA then GREEN |
| D14 receiver status | Negative latitude/longitude displayed as N/E with minus signs, and out-of-range finite coordinates accepted | One shared synthetic position validator and S/W formatter for NAV and receiver; unknown/invalid/fake external data rejected, never labelled real NMEA | test/fcv588-public-receiver-status.test.mjs, hemisphere RED then GREEN |
| D09 optional Tankenmaru | Only bounded option On/Off and NMEA/MARK guards, no visible documented default reference | Under explicit nonpersistent D15 option fixture + virtual On only: read-only LCD modal describing manual §2.9 Output Off, Pic Sync Yes and Sub Clutter 4; transport NONE/NO RF; fixture revoke closes the modal and returns guards | test/fcv588-public-system.test.mjs + actual Chrome D09 details on desktop/mobile |
| D09 MENU/ESC dispatch | V21 first implementation of new modal missed dispatcher; physical MENU left operator stranded outside System | Routed modal through canonical special-overlay handler; physical MENU/ESC returns to System and FUNC row stays operable; edited draft ownership remains semantic-ID bound | Preserved first V21 FAIL_QA receipt; focused unit RED/26 targeted GREEN; 4 Chrome viewports PASS |
| Replay / persistence | Profile14/settings13 would reinterpret the new visible projection | Explicit profile15/settings14 revision and old profile/schema fail-closed; canonical restore event and session hash replay preserved | test/fcv588-public-persistence.test.mjs RED then GREEN; multidevice and core tests included in full suite |
| QA evidence provenance | Desktop receipt originally lacked runner SHA; old mobile runner imported helper changed after its receipt | Record SHA-256 of desktop runner and mobile runner + imported shared verifier before browser actions and reject changes before PASS | 3 source-harness unit tests plus existing four response-body tests: 7/7 GREEN |
| Phone interaction coverage | Previous mobile smoke checked hit sizes/TrackPad/System only | Real Chrome touch now drives D09 teacher grant, details, physical MENU/ESC and source revoke, alongside all 12 device + 16 teacher touch targets >=44px | test/fcv588-public-browser.test.mjs RED then GREEN, V21 mobile receipts |

The work preserves display-only transformations, one world tick, inert
observer stream, bounded capabilities, alarm/waypoint/Trip source guards
and training-scoped teacher fixtures. Unchanged features A17, B18/B19,
D10 and the separate D15 scoring subsystem were independently inspected;
old identified defects already corrected were not reimplemented. Exact
manufacturer acoustic/color/tactile semantics remain unverified.

## Final integrated checks after the last source change

- **npm run check: 293 tests, 293 PASS, 0 FAIL, exit 0.**
- **Python source-body / QA runner integrity: 7/7 PASS.**
- **node tools/build_fcv588_public_menu.mjs --check: PASS; 67 entries.**
- **node tools/build_fcv588_public_acceptance.mjs --check: PASS, 64+D15.**
- **python tools/build_fcv588_public_trace.py --check: PASS, 64+D15.**
- **node tools/verify_public_runtime_assets.mjs: PASS, 32 recursively scanned original web/src files, no restricted media/symlinks.**
- **python tools/verify_reference_manuals.py: PASS_AVAILABLE_ASSETS_WITH_GAPS**, 24 PDF plus two ZIP digests verified, 197171462 bytes; three historical remote acquisition gaps noted; not licensed for redistribution.
- **ak plan validate ... --json --no-interactive: valid=true.**
- **ak plan parse ... --json --no-interactive: 7 phases, 50 checklist, 10 checked, one phase done.**

## Actual Google Chrome acceptance (not DOM-faked or HEAD-only)

These are isolated **real Google Chrome executable** Playwright contexts.
Browser response bodies were captured on requestfinished, hashed and
checked against the same local preflight/postflight runtime source
manifest for every completed request. Each runner records its exact
Python script digest(s), checked unchanged before PASS. No external
origin/HTTP/console failures occurred.

| Context | Result | Bodies SHA-256 verified | Unique paths | Aggregate body digest |
| --- | --- | ---: | ---: | --- |
| Desktop 1366×768 | PASS | 60/60 | 30 | f69e9acb4d7a4a55c8ab214ff86f9841455a149f787ff3bb967b4a8d30381ffd |
| Desktop 1920×1080 | PASS | 60/60 | 30 | 1194eb7204b48ed361ba4c3ad343d7a4ec0508bf173ef2dae89a89d7b6162c4d |
| Mobile 360×800 emulated touch | PASS | 30/30 | 30 | 99cc85c932f316b7101fa6d9d8ee52894dae04c9fffaa6ec93c15309be8a7650 |
| Mobile 390×844 emulated touch | PASS | 30/30 | 30 | 39525230d1b3544fa31e61e8ca016e8bd117f322edf1cc9117e66fa049ffea50 |

Receipts:

- docs/qa/FCV588_CHROME_VIEWPORT_V21_RECEIPT.json
- docs/qa/FCV588_CHROME_MOBILE_V21_RECEIPT.json
- Original preserved first failed attempt:
  docs/qa/FCV588_CHROME_VIEWPORT_V21_PRE_FIX_FAIL_RECEIPT.json

Both passing receipts have source-manifest digest
14772f98e1aa03ac9a11ed2da96d225f4a976c0d0160f11bf2968ba1b9955ed2,
preflight SOURCE_TREE_IDENTITY_PASS, postflight SOURCE_TREE_STABLE_PASS,
qaHarnessSourceIdentity.status PASS_UNCHANGED. Exact script SHA-256:
desktop/sharedChromeVerifier
2e1fe07a15884f906577aa54d520c7d07749ae16b01dc5956fb5402464dac3c7,
mobileRunner
1ca1f640abbd59136241115a4de98f106a03aef9f0738df6b4a4ca3ff1ed206a.

Six original full-page screenshots are saved and visually inspected:
docs/qa/screenshots/fcv588_public_v21_1366x768.png,
fcv588_public_v21_1920x1080.png,
fcv588_public_v21_1920x1080_nav2_configured.png,
fcv588_public_v21_1920x1080_tankenmaru_details.png,
fcv588_public_v21_mobile_360x800.png,
fcv588_public_v21_mobile_390x844.png.
Their heights may exceed the actual measured viewport because of full-page
capture. Mobile reflow stacks original LCD and controls for training,
explicitly labeled NOT OEM face geometry. No copyrighted OEM artwork
was pasted into the original Canvas/DOM/CSS.

## Existing 7 phases, 22 named Task units, 50 acceptance entries

This is the **observed file-owned plan status**, not a claim that only Phase1
has code. A complete phase cannot be checked without all of its own
source, positive/negative/cancel/replay, browser, review and rights gates.
The model-specific untouched checkboxes below are therefore intentional,
not a reassignment or replacement of this plan.

| Phase | Named Task units | Accepted checkboxes | Current behavior/evidence | Remaining gate |
| --- | ---: | ---: | --- | --- |
| 1 Public evidence/rights/profile | 5 | 10/10 DONE | Curated OME/profile/manual ledger, public scope frozen | Hardware/rights still held as explicit future limits |
| 2 Physical panel and controls | 3 | 0/7 OPEN | Original 233×270 reference-ratio bezel, 480×640 LCD, POWER/MODE/GAIN/RANGE/BRILL/FUNC/TrackPad, hold/cancel and Chrome QA | Whole-phase task-specific TDD/manual-oracle acceptance and independent sign-off not yet evidenced as complete |
| 3 Five menus/settings | 3 | 0/7 OPEN | Five-root atlas 67 annotated entries, staging/commit/ESC, semantic reindex guard, schema14 storage/replay | Every entry's OEM placement/options and complete per-row source/cancel proof not certified |
| 4 Sonar/advanced modes | 3 | 0/7 OPEN | LF/HF/DUAL/Zoom, graphical synthetic echo, 8/16 palette, named transducer capability checks | No physical sensor or validated echo image/firmware-oracle comparison; unsupported advanced semantics stay partial |
| 5 Alarms/NAV/System | 3 | 0/7 OPEN | ALARM1–5, waypoint/destination/Arrival/Trip, C11 TTG, D09 modal, D10 faults, D14 source-safe receiver | D04 RIGHTS_HOLD/NOT_IMPLEMENTED; C11/D09/D14 remain partial; real inputs and hardware/source rights absent |
| 6 Conformance and D15 | 3 | 0/7 OPEN | 293 green tests, D15 attempt/session hash/replay, four real Chrome contexts with 32-file integrity | Full 65-row source-backed per-feature receipts, individual lesson reviewer sign-off and redistribution rights not obtained |
| 7 Shared world/variant isolation | 2 | 0/5 OPEN | One world tick, typed inert observer, strict device set/profile fingerprints, compatible single-replay migration | Unknown future device variants/firmware and historical incompatible F0 migration/reviewer acceptance not cleared |

**Total 10/50 checked (20%) and Phase1 DONE; six later phases remain
OPEN despite considerable implemented synthetic behavior.** The phase
files have **22 named Task headings: 5 in the accepted Phase1 and 17
in Phases2–7 not formally closed**. This 5/22 count is a phase-level
acceptance accounting, not a count of code features newly written.
No synthetic unit-test count automatically promotes their separate gates.
No new plan was created.

## 64 FCV features + separate D15 implementation classification

Generator and source trace individually account for all **64 A01–D14
operator identifiers plus one D15 instructor identifier**. The latest
reviewed feature-allowlist checkpoint is deliberately conservative:

- 60 FCV operator IDs and D15: OPERABLE_SYNTHETIC_SUBSET
  (partial actual state/display paths; neither full OEM coverage nor
  independently approved operator course).
- C11, D09, D14: MENU_ONLY_PARTIAL, with additional V21 observable
  synthetic paths above, yet no full firmware/source/right coverage.
- D04: NOT_IMPLEMENTED (licensed alternate-language assets, reboot
  semantics and verified firmware behavior unavailable).
- All 65: claimDecision HOLD; device-register releaseApproval HOLD.

The status JSON references feature/domain/targeted scenarios with
sourceStatus and rightsDecision per ID. It is **not** a substitute for
independent feature-by-feature signed/manual oracle certification.

## Non-FCV manual and public simulator search

Existing sources/manuals/ARCHIVE_COVERAGE.json remains
ACCOUNTED_WITH_HOLDS: FAR-2127 manuals archived but RCU version unknown;
MDC-2060 Rev14/Rev15 sources exist but KODEN rights/controller version
not selected; NS4000 v2 historical only, v3 rights/access/version HOLD;
KODEN J2000 exact identity HOLD, not assigned an invented source; AIS R5
SUPREME versus SOLID not selected. A separate read-only research supplement
compares engineering workload and public OpenCPN, radar_pi, and Bridge
Command repositories without copying their source/media or treating them
as FCV-588/FAR-2127 OEM emulators:
docs/research/MARITIME_DEVICE_SIMULATOR_LANDSCAPE_2026-10-15.md.

## Objective remaining HOLD and admission advice

1. Gain allowed, version-specific OEM/public observations for D04 and
   full C11/D09/D14; never substitute synthetic values for real NMEA,
   partner display output or installed firmware.
2. Add ID-scoped positive, negative, cancel, replay and real browser
   evidence for the remaining individual features, then independent
   source/lesson/rights reviewer approval before any public-release
   promotion.
3. Complete Phase2–7 admission checklists one gate at a time, only when
   all original phase task Success/Verify clauses are evidenced. Current
   profile15/settings14 and V21 common source identity remain the stable
   baseline for future work.
4. A claim of **100% hardware equivalence** additionally requires
   real unit/firmware/transducer/controller identification, lawful imagery,
   measured key/menu/timing/pixel/echo comparison and independent
   manufacturer-level or suitably qualified hardware evaluation.
   None can be inferred from this public-reference-only simulation.

No dedicated, targetable Kongming supervisor was discoverable in this
host; **no Kongming approval is claimed**. The already-performed ordinary
independent read-only review caught the D09 overlay exit P1, repaired
by TDD and rerun, but it is not advice-mode supervisor sign-off.
The saved plan remains the canonical source of acceptance truth.
