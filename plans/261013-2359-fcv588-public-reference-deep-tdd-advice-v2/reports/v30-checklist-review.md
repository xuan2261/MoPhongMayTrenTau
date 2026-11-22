# V30 review of all 50 checklist entries and 22 named Tasks

Date: 2026-10-16. This is an assessment of the existing v2 plan, not a replacement plan.

## Decision and evidence

No canonical checkboxes are changed in this iteration: 14/50 remain checked and 6/22 named Tasks retain inherited acceptance. The 28% figure counts accepted checklist entries; it is not a software completion percentage or an OEM similarity score. New scoped software evidence is recorded separately from whole-task/phase source, compatibility, rights and instructor gates.

Evidence: [V30 implementation report](./continuation-2026-10-16-v30-integrated-configuration.md), [independent review](./v30-independent-review.md), [current source/receipt/SHA summary](../../../docs/qa/FCV588_V30_EVIDENCE_SUMMARY.json), [V29 recovery snapshot](../../../docs/qa/FCV588_V29_RECONCILIATION_2026-10-16.json).

`RETAINED` below means an inherited accepted item, not newly granted OEM clearance. `OPEN` can contain passed software checks; it does not mean no code exists. Original criterion text and source line locations are preserved.

## Phase 1

| Existing Task | Disposition | V30 assessment |
| --- | --- | --- |
| Task 1.0 — Repair known plan-text regression without weakening fidelity checks | RETAINED ACCEPTED | Inherited accepted text-regression repair; retained. |
| Task 1.1 — Source provenance, rights and extensible evidence ledger | RETAINED ACCEPTED | Inherited accepted source-ledger structure; V30 execution metadata added without rights promotion. |
| Task 1.2 — 64+1 public source/claim trace matrix | RETAINED ACCEPTED | Inherited accepted 64+1 source trace; no feature claim promoted. |
| Task 1.3 — Synthetic Demo and transducer-guard profiles | RETAINED ACCEPTED | Inherited distinct public fixtures retained; optional transaction defect B is separately open. |
| Task 1.4 — Claims, original assets and visible student disclaimer | RETAINED ACCEPTED | Inherited original-art/disclaimer scope retained. |

| Original line | Existing criterion | State retained | Evidence/gap assessment |
| --- | --- | --- | --- |
| phase-01-start.md:49 | Existing 11-source ledger is preserved and extensible; each entry has authorityTier, evidenceMode, access, rights, source branch and no false audited-video timestamp. | CHECKED / RETAINED | Inherited accepted ledger structure preserved; V30 adds scoped execution evidence, not source-rights clearance. |
| phase-01-start.md:50 | Public trace matrix covers 64 operator features plus D15 instructor separately without editing operatorFidelityStatus/targetHardwareEvidenceIds. | CHECKED / RETAINED | Inherited accepted 64+1 separation retained; no operator fidelity or hardware IDs promoted. |
| phase-01-start.md:51 | Default FCV588_PUBLIC_DEMO_UNKNOWN_FW profile has Demo On, no attached equipment, unknown firmware, safe virtual Type; alternate generic600/generic1kW/525STID-PWD are separate test fixtures, not simultaneously present. | CHECKED / RETAINED | Inherited accepted public fixture contract unchanged byte-for-byte in src; optional draft revocation is tracked separately as V30-B. |
| phase-01-start.md:52 | New rights policy distinguishes authorized reading/retention/AI processing/reproduction/redistribution; marks unverified processing permission as project safety HOLD, not a verbatim publisher AI ban. | CHECKED / RETAINED | Inherited rights policy retained; no new permission or publisher AI-ban claim. |
| phase-01-start.md:53 | Student UI visibly states PUBLIC REFERENCE / NOT HARDWARE VALIDATED / TRAINING ONLY; server cannot expose sources/manuals, transcripts or teacher-only private files. | CHECKED / RETAINED | Banner and original-only runtime preserved in the four current Chrome contexts; no release approval. |
| phase-01-start.md:99 | Task 1.0 baseline text-only regression documented and GREEN. | CHECKED / RETAINED | Historical text-regression repair retained; full Node370 provides current regression, not another historical RED. |
| phase-01-start.md:100 | Task 1.1 existing source ledger extended and rigorously graded. | CHECKED / RETAINED | Inherited source grading retained; new metadata explicitly distinguishes current runs from older observations. |
| phase-01-start.md:101 | Task 1.2 public trace created with 64 operator rows + D15 separate. | CHECKED / RETAINED | Inherited trace coverage retained; all65 public claims still HOLD. |
| phase-01-start.md:102 | Task 1.3 profile and distinct virtual transducer conditions valid. | CHECKED / RETAINED | Inherited distinct profile fixtures retained, not a simultaneous all-options hardware profile. |
| phase-01-start.md:103 | Task 1.4 visible banner and source rights guard tested. | CHECKED / RETAINED | Inherited original banner/source boundary retained; runtime/source identity is recorded separately. |

## Phase 2

| Existing Task | Disposition | V30 assessment |
| --- | --- | --- |
| Task 2.1 — Panel geometry and input fidelity | RETAINED ACCEPTED | Inherited original panel/input acceptance retained, not measured hardware. |
| Task 2.2 — Replayable UI clock and MODE selection | OPEN | Timing/candidate/replay regression passes; full source-qualified timing gate remains open. |
| Task 2.3 — POWER, BRILL, RANGE, GAIN and VRM edge cases | OPEN | Physical input/FUNC/BRILL regression passes; complete OEM edge/timing acceptance remains open. |

| Original line | Existing criterion | State retained | Evidence/gap assessment |
| --- | --- | --- | --- |
| phase-02-physical-panel-and-controls.md:42 | Original panel artwork from independently drawn geometry, separate ENTER, TrackPad, POWER/BRILL and two rotary knobs, 480x640 logical LCD; instructor assists stay distinct. | CHECKED / RETAINED | Inherited original-art/input criterion retained; V30 does not claim new physical dimensions. |
| phase-02-physical-panel-and-controls.md:43 | Explicit recorded UI time permits ~6-second MODE/BRILL timeout even when teacher pauses synthetic world; replay and profile versions updated consistently. | UNCHECKED / OPEN | Current full Chrome retains paused-world MODE timing and replay checks; exact OEM timing/source acceptance is not newly established. |
| phase-02-physical-panel-and-controls.md:44 | Power/startup/hold-off behavior, MENU/ESC, RANGE, GAIN+offset and VRM obey manual-supported transitions; FUNC 650ms remains visibly provisional if no better evidence. | UNCHECKED / OPEN | FUNC76 and LCD68 plus full Chrome preserve the existing paths; measured hold/tactile/OEM edge semantics remain unaccepted. |
| phase-02-physical-panel-and-controls.md:45 | F0 tests asserting known-wrong immediate MODE semantics are migrated with source citation and before/after rationale, not disabled. | UNCHECKED / OPEN | No MODE test migration occurred in V30; preserve previous implementation evidence rather than declare a new source-backed migration. |
| phase-02-physical-panel-and-controls.md:75 | Task 2.1 independently drawn/accessible panel and input replay. | CHECKED / RETAINED | Inherited Task2.1 acceptance retained under its original-art scope, not hardware equivalence. |
| phase-02-physical-panel-and-controls.md:76 | Task 2.2 MODE selection and UI clock independently recorded/replayed. | UNCHECKED / OPEN | Current timing/replay regression passes but complete Task2.2 source/phase gate remains open. |
| phase-02-physical-panel-and-controls.md:77 | Task 2.3 power/BRILL/Range/Gain/VRM reference paths and negative states. | UNCHECKED / OPEN | Existing physical-input regressions pass; complete reference-path/negative-state acceptance is not claimed. |

## Phase 3

| Existing Task | Disposition | V30 assessment |
| --- | --- | --- |
| Task 3.1 — Versioned FCV menu atlas and reachability | OPEN | Eight nested editors now semantic and reachable; exact full atlas/firmware branch acceptance incomplete. |
| Task 3.2 — Settings transaction, units and power persistence | OPEN | Integrated stored/draft/cancel/commit/persistence evidence added; V30-B blocks complete transaction acceptance. |
| Task 3.3 — System, transducer and IEC installation-specific gates | OPEN | Ordinary Installation/NMEA guards preserved and tested; revoke-during-draft/regrant requires canonical repair. |

| Original line | Existing criterion | State retained | Evidence/gap assessment |
| --- | --- | --- | --- |
| phase-03-menu-atlas-and-configuration.md:41 | Versioned five-menu Sounder/Display/Alarm/Data/System atlas covers all source-documented Appendix1 nodes or marks gaps explicitly. | UNCHECKED / OPEN | Five roots and eight nested families are reachable; exact Appendix1/firmware choices and gaps are not all independently accepted. |
| phase-03-menu-atlas-and-configuration.md:42 | Menu interaction has cursor, stage, commit/ESC, nested path and persistence only when documented. | UNCHECKED / OPEN | V30 separates stored/draft/selection/help and tests cancel/commit/reload; V30-B proves a remaining canonical revocation transaction defect. |
| phase-03-menu-atlas-and-configuration.md:43 | Installation-only setup and normal System paths are separate; Tankenmaru On disallows NMEA config/port in simulated status. | UNCHECKED / OPEN | Installation NMEA filtering passes ordinary grant/commit/revoke paths; revoke-during-draft/regrant remains V30-B OPEN. |
| phase-03-menu-atlas-and-configuration.md:44 | Synthetic receive/missing/stale NMEA data (IEC 61162-1) never means actual input/output, ship network or navigating aid. | UNCHECKED / OPEN | No real receiver or transport added; full-source byte identity retained. Complete source-specific configuration acceptance remains open. |
| phase-03-menu-atlas-and-configuration.md:74 | Five-menu atlas complete for claimed public revision, with explicit unsupported branches. | UNCHECKED / OPEN | No OEM menu leaf or value expansion; numeric White Line and D04/D09/D14 gaps remain explicit. |
| phase-03-menu-atlas-and-configuration.md:75 | Stage/commit/ESC/persistence and units tested. | UNCHECKED / OPEN | Positive/cancel/persistence/units paths have current Node/Chrome evidence; this is partial coverage, not acceptance of all source-changing transactions. |
| phase-03-menu-atlas-and-configuration.md:76 | §4.10 installation and Tankenmaru/NMEA mutually exclusive guarded states tested. | UNCHECKED / OPEN | Current ordinary NMEA exclusivity checks pass; the independently reproduced stale-draft option path prevents a complete guarded-state acceptance. |

## Phase 4

| Existing Task | Disposition | V30 assessment |
| --- | --- | --- |
| Task 4.1 — Stable raw sonar ports and deterministic scenario fixtures | OPEN | Raw-source bytes preserved; new tests confirm display-only transactions do not mutate world/sonar. |
| Task 4.2 — LF/HF/DUAL/Zoom layouts, processing and Picture Advance | OPEN | V28/V29 mode/rate/legend/FUNC behavior retained; numeric White Line excluded and other OEM processing gaps remain. |
| Task 4.3 — ACCU-FISH, Bottom Discrimination and RezBoost guarded states | OPEN | No new acoustic/transducer/firmware evidence; current guards retained, no conformance promotion. |

| Original line | Existing criterion | State retained | Evidence/gap assessment |
| --- | --- | --- | --- |
| phase-04-sonar-views-and-advanced.md:40 | LF/HF/DUAL and BL/BZ/MZ zoom mode display/header/scale transitions match published descriptions while sensor content remains synthetic. | UNCHECKED / OPEN | LF/HF/Zoom/NAV rendering preserved by full regression and images; exact OEM mode geometry/acoustic equivalence remains unverified. |
| phase-04-sonar-views-and-advanced.md:41 | Picture Advance all 8 steps, Stop and processing controls operate only in documented contexts; world and session time remain independent. | UNCHECKED / OPEN | Eight picture-rate semantics retained; FUNC regression passes, but no new complete OEM processing-context oracle. |
| phase-04-sonar-views-and-advanced.md:42 | ACCU-FISH/RezBoost/BDS never enabled merely by Demo mode or generic 600W power rating; guard named transducer + operating parameters. | UNCHECKED / OPEN | Named/generic capability algorithms unchanged; V30 is not a new per-parameter or firmware certification. |
| phase-04-sonar-views-and-advanced.md:43 | Original Canvas/SVG graphics are independent art; no manufacturer screenshot, video frame or proprietary acoustic algorithm shipped. | UNCHECKED / OPEN | All V30 artwork is original code; no media imported. Whole-phase source/reviewer acceptance remains separate from asset policy. |
| phase-04-sonar-views-and-advanced.md:73 | Raw world/sensor invariant proven over projection changes. | UNCHECKED / OPEN | New configuration tests prove raw observations/world unchanged for edited display settings; retain this as scoped software evidence, not a full phase sign-off. |
| phase-04-sonar-views-and-advanced.md:74 | All claimed display modes and eight Picture Advance states tested. | UNCHECKED / OPEN | Existing mode/speed tests remain in full Node370; no complete per-feature OEM acceptance promoted. |
| phase-04-sonar-views-and-advanced.md:75 | Advanced options validated per named virtual transducer, depth/speed/installation and firmware source guard. | UNCHECKED / OPEN | No new transducer/firmware evidence; advanced-function conformance stays HOLD. |

## Phase 5

| Existing Task | Disposition | V30 assessment |
| --- | --- | --- |
| Task 5.1 — Alarm conjunction, causes, acknowledge and simultaneous profiles | OPEN | Effective alarm banner/footer consistency repaired; exact status assertions strengthened; canonical notice E remains open. |
| Task 5.2 — Synthetic NAV, data boxes and waypoint CRUD | OPEN | NAV box configuration integrated; existing waypoint/no-data contracts preserved, C11 still partial. |
| Task 5.3 — System Demo, diagnostics and safe restore | OPEN | LCD/BRILL/reset/reload regression passed; synthetic-only diagnostics retained, no OEM sign-off. |

| Original line | Existing criterion | State retained | Evidence/gap assessment |
| --- | --- | --- | --- |
| phase-05-alarms-nav-demo-diagnostics.md:42 | ALARM1-5 conditions have documented within-profile AND, cross-profile independent activation, mute vs cause-clear and persistent threshold settings. | UNCHECKED / OPEN | V30 distinguishes committed enable/effective cause/ACK and removes disabled banners without ticking; exact alarm limits/sounds and V30-E notice accuracy remain open. |
| phase-05-alarms-nav-demo-diagnostics.md:43 | NAV1/NAV2/waypoints support missing or stale synthetic data, valid/invalid inputs and reversible modal workflows. | UNCHECKED / OPEN | NAV box draft/cancel/commit is tested without a fake receiver; full NAV/waypoint/source coverage and lesson acceptance remain incomplete. |
| phase-05-alarms-nav-demo-diagnostics.md:44 | System Demo is distinct from teacher-generated scenario; all controls operative while capability guards still apply. | UNCHECKED / OPEN | Demo/capability logic is byte-identical to V29 and full regression passes; no full source-profile certification. |
| phase-05-alarms-nav-demo-diagnostics.md:45 | Diagnostics, LCD test and restore are clearly SIMULATED_ONLY without real software version, real ship data or hardware I/O. | UNCHECKED / OPEN | LCD68 and full Chrome preserve synthetic diagnostics and no hardware readings; original diagnostic patterns are not OEM-certified. |
| phase-05-alarms-nav-demo-diagnostics.md:75 | Alarm profiles reproduce AND cause logic, acknowledge and clear. | UNCHECKED / OPEN | Alarm review RED->GREEN and exact-token/Canvas checks strengthen display correctness; canonical notice defect E and full operator approval remain open. |
| phase-05-alarms-nav-demo-diagnostics.md:76 | NAV/waypoint operations and missing/stale data tested. | UNCHECKED / OPEN | Existing source-validity/waypoint tests plus V30 NAV editor are regression evidence, not complete C11. |
| phase-05-alarms-nav-demo-diagnostics.md:77 | Demo/Diagnostics/Restore fully synthetic and safe. | UNCHECKED / OPEN | Synthetic restore/reset/reload and LCD regression pass; independent source/course approval is absent. |

## Phase 6

| Existing Task | Disposition | V30 assessment |
| --- | --- | --- |
| Task 6.1 — Full trace, rights and source/claim audit | OPEN | No full independent rights/source audit; all65 claims remain HOLD. |
| Task 6.2 — Static UI/security and actual browser operation | OPEN | Current four-viewpoint Chrome/source/body/harness/image evidence complete for V30; code review A/C/D closed, B/E open. |
| Task 6.3 — Replayable course lessons and conditional acceptance | OPEN | Seven existing D15 lessons retained and relevant full-suite scoring regression passes; independent instructor acceptance absent. |

| Original line | Existing criterion | State retained | Evidence/gap assessment |
| --- | --- | --- | --- |
| phase-06-conformance-classroom-qa.md:42 | All publicly claimed FCV behaviors have source/document section or actually audited video timestamps and per-profile success/cancel/negative tests; 64 FCV and D15 distinct. | UNCHECKED / OPEN | All65 claims remain HOLD; no new video frame timestamps or complete per-profile source/cancel/negative acceptance. |
| phase-06-conformance-classroom-qa.md:43 | Public banner exact: PUBLIC REFERENCE / NOT HARDWARE VALIDATED / TRAINING ONLY; no restricted source/media in runtime or packaging. | UNCHECKED / OPEN | Banner visible in current images and runtime contains original code only; independent rights/packaging release acceptance is still not granted. |
| phase-06-conformance-classroom-qa.md:44 | Real Windows browser smoke checks page load, controls, keyboard, hold, focus and responsive layout with console/network captured AFTER attach and reload. | UNCHECKED / OPEN | Four exact Chrome contexts capture console/network/source/body/harness identity, plus53 images. This executed software requirement has stronger evidence; whole Task6.2/phase disposition stays open for known findings and prior gates. |
| phase-06-conformance-classroom-qa.md:45 | Completed individual training lessons can receive PUBLIC_REFERENCE_CONFORMANT only after source/rights/replay/browser/reviewer evidence. Overall hardware equivalence remains HOLD. | UNCHECKED / OPEN | No lesson is promoted PUBLIC_REFERENCE_CONFORMANT; source/rights/instructor approval remains absent. |
| phase-06-conformance-classroom-qa.md:75 | 64 FCV + D15 source/claim audit and independent rights review. | UNCHECKED / OPEN | Independent review covered V30 code, not a full64+1 rights audit. Do not conflate the two. |
| phase-06-conformance-classroom-qa.md:76 | Node static coverage and real browser smoke with attach-before-reload diagnostics. | UNCHECKED / OPEN | Node370 and source-bound real Chrome passed; open B/E and complete phase prerequisites prevent overall acceptance. |
| phase-06-conformance-classroom-qa.md:77 | Reviewed conditional lessons and honest report; unknowns visible, hardware HOLD. | UNCHECKED / OPEN | Current report exposes known findings and hardware HOLD; independent instructor lesson sign-off not obtained. |

## Phase 7

| Existing Task | Disposition | V30 assessment |
| --- | --- | --- |
| Task 7.1 — Second-device inert subscriber and replay isolation | OPEN | Existing inert-device/world/replay code unchanged; full historical migration acceptance not claimed. |
| Task 7.2 — Future-variant HOLD and safe hardware-upgrade documentation | OPEN | Future model/firmware identification and hardware-upgrade evidence remain HOLD. |

| Original line | Existing criterion | State retained | Evidence/gap assessment |
| --- | --- | --- | --- |
| phase-07-shared-world-and-future-devices.md:38 | One world clock, named deterministic sensor streams and isolated device-specific state are proven by repeatable tests. | CHECKED / RETAINED | Inherited accepted single-world invariant retained; every src byte matches V29 and new display tests preserve world observations. |
| phase-07-shared-world-and-future-devices.md:39 | Replay rejects mismatched active device set/profile/version while preserving previous FCV-only historical fixtures via explicit format migration. | UNCHECKED / OPEN | No format migration was made; strict existing replay regressions pass, but the complete historical migration requirement is not newly accepted. |
| phase-07-shared-world-and-future-devices.md:40 | AIS R5 SUPREME vs SOLID, FAR-2127 controller, MDC-2060 revision, NS4000 version and J2000 identity remain independent holds until confirmed. | UNCHECKED / OPEN | All future variant identities stay HOLD; no new future-device UI/research completion. |
| phase-07-shared-world-and-future-devices.md:62 | FCV raw world/sensor/replay invariant under second inert device. | CHECKED / RETAINED | Inherited inert-observer invariant retained; no changes to device-runtime or sensor stream. |
| phase-07-shared-world-and-future-devices.md:63 | Strict unknown model/firmware variants stay HOLD; explicit upgrade route documented. | UNCHECKED / OPEN | No new verified future-model upgrade path, so this remains open. |

## Priority for the next integrated batch

P0 execution priority: canonical source-option revoke/regrant transaction consistency (finding V30-B, severity P1), with a deliberate profile/replay compatibility decision and the existing advice boundary. Include P2 notice-label accuracy V30-E. Do not add new OEM values, White Line percentages/Edge or hardware transports.
