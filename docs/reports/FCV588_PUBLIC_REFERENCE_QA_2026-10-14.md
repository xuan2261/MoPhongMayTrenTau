# FCV-588 Public Reference — QA closure, 14 Oct 2026

**Workspace:** C:\Work\MoPhongMayTrenTau
**Scope:** source/plan research and verification only. No new full FCV simulator features, no hardware matching, and no distribution approval.

## Observed results

| Verification | Observed result | Boundary |
| --- | --- | --- |
| `npm run check` | **47/47 PASS**, exit code 0 | Verifies existing F0 contracts and plan/research guards; **not** 47 authentic Furuno training workflows |
| `node --test test/public-reference-plan.test.mjs` | **6/6 PASS**, exit code 0 | Verifies 7 plan phases, links, RED/GREEN/REFACTOR/Failure Protocol, source statuses and official brochure metadata |
| `ak plan validate C:\Work\MoPhongMayTrenTau\plans\261013-1428-fcv588-public-reference-complete-operator --json --no-interactive` | `valid: true`, exit code 0 | Structural validation only; not official Kongming-supervised advice or human operator sign-off |
| `python tools/verify_reference_manuals.py --write-receipt` | `PASS_AVAILABLE_ASSETS_WITH_GAPS`, validation_failures 0 | **24 PDF + 2 ZIP** verified; includes one 6-page brochure nonmanual. J2000 and NS4000 newer version still unresolved |
| Public video | YouTube original page opened; **22:56** player duration | Frame capture timed out. **No timed control-action observations verified** |

## Files and corrections from this continuation

- **New:** `docs/research/FCV588_PUBLIC_UI_REFERENCE_MATRIX_2026-10-14.md`. Fourteen public UI reference areas crosswalk official manuals/spec to tests; no third-party images are reproduced.
- **Updated:** `docs/research/FCV588_PUBLIC_MEDIA_EVIDENCE_2026-10-13.md` and `docs/reports/FCV588_PUBLIC_REFERENCE_REPLAN_2026-10-13.md`.
- **Archived:** manufacturer FCV588 brochure `sources/manuals/FCV-588/FURUNO_FCV588_Brochure_Manufacturer_Reference.pdf`, 6 pages, SHA-256 `2f10fab1b47cfd9019ef2d1975e295a2edbcc5ecc4c4baeaa2eab76de7855498`.
- **Superseded:** two broken FURUNO brochure URLs returning 404. The [FURUNO USA brochure](https://www.furunousa.com/-/media/sites/furuno/document_library/documents/brochures/brochures/fcv588_brochure.pdf) was verified HTTP 200 as PDF; the NauticExpo and reseller pages returned 403 to direct HEAD (image index remains informative but lower-grade).
- **Corrected:** Demo On behavior: internal echoes/no physical transducer yet all control keys operative per OME §2.8. Advanced feature menus depend on a source-supported **virtual transducer** selection; do not indiscriminately disable them because hardware is absent or enable them all.
- **Hardened plan:** all seven phases include a RED-test stub/bootstrap rule so a missing module/syntax error cannot masquerade as a meaningful expected RED failure. Phase2 explicitly migrates provisional F0 tests (for example immediate MODE cycle) when they contradict manufacturer behavior, with source citation.
- **Updated:** current public-reference plan phase01/04 and README. Previous hardware-target plan remains intact.
- **Updated:** `test/public-reference-plan.test.mjs` with manufacturer-brochure, media-status and Demo/guard verification (two additional test cases).

## Public-reference plan state

`plans/261013-1428-fcv588-public-reference-complete-operator/plan.md` is the **current** 7-phase, **67-task** plan created with the native `ak plan` CLI; none of its implementation tasks has been marked complete. Its published intent is an operator-interface training application matching **publicly documented** FCV-588 controls and behavior. It is not an identical copy of a particular classroom machine/firmware. The separate older hardware-target plan `plans/261013-1319-fcv588-full-fidelity-simulator/plan.md` is deferred.

**Skill execution honesty:** packaged `ak-plan` v2.2.2 guidance was read. Deep scouting and TDD plans were authored and tested, and native `ak 3.0.0-beta.17` scaffold/validate commands were executed. The --advice handover task schema and STOP-on-failure text were applied, but a true Kongming-supervised --advice run **was not possible**, because no targetable Kongming subagent was available. This is an advice-compatible plan, not a verified supervised-advice execution.

## Remaining blockers, separated by what they block

- **Does not block development:** missing classroom photos/Diagnostics, real firmware/transducer, tactile feel, precise pixel font/color and authentic OEM sonar physics. Public-reference profile must make unknowns explicit.
- **Blocks a feature's public-reference completeness claim:** a missing/contradictory authoritative source, rights to process/reproduce necessary media, an unverified video timestamp, or an unimplemented student workflow. Such a feature must remain SOURCE_GAP/RIGHTS_HOLD/CONFLICT_HOLD or SIMULATED_APPROXIMATION.
- **Blocks hardware-equivalence claim:** lack of actual device-specific firmware/configuration and real-unit comparison. This claim is **outside** the new plan.
- **Outside FCV scope:** AIS R5 (SUPREME/SOLID unselected), NS4000 v3 licensed manual access, KODEN J2000 identity; all remain explicitly held in manual archive coverage.
- **Independent final adversarial re-review:** two read-only reviewer messages were requested; their current responses had not been confirmed at the time of this file. Do not present an independent GO verdict until it is actually received.

## Next action

**Phase 1:** create only the source/evidence ledger, PUBLIC_DEMO_UNKNOWN_FW profile, variant/rights matrix and their RED→GREEN tests, with no copyrighted media in browser output. Then Phase 2: correct MODE selector, POWER countdown, BRILL cycling and RANGE/Gain/VRM behavior against the official manual, updating provisional old tests as documented. Further phase execution is planned but **not reported as completed**.
