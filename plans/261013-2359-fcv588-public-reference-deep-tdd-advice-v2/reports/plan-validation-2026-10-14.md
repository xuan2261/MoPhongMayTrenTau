# FCV-588 public-reference v2 — plan validation and red-team receipt

**Date:** 2026-10-14. **Scope:** Planning artifact only, not operator conformance or product release. **Workspace:** `C:\Work\MoPhongMayTrenTau`.

## Tool / skill provenance

| Operation | Actual result | Boundary |
| --- | --- | --- |
| Read `ak-plan` packaged skill v2.2.2 plus deep, TDD-compatible and advice references | Confirmed; workflow contract read | Reading guidance is not invoking its native slash command |
| Windows `ak --version`, `ak plan create --help` | `ak 3.0.0-beta.17`; create supports scaffold flags, **not** `--deep --tdd --advice` | Never say these flags ran through CLI |
| Windows `ak plan create fcv588-public-reference-deep-tdd-advice-v2 --basedir ... --json --no-interactive` | CLI created directory `261013-2359-fcv588-public-reference-deep-tdd-advice-v2` | New plan, old plans untouched |
| Six Windows `ak plan add-phase` commands | Seven phase files total; all generated stubs read before authoring | No implementation tasks were checked off |
| Phase 1 source and code scout | `reports/phase-01-scout.md`, actual code and source locations | Two CoS read-only scouts delivered evidence; not Kongming |
| Local subagent `kongming` supervisor | **NOT_EXECUTED**: no targetable Kongming/delegate API | `--advice` is an artifact-format adaptation only |
| New v2 four-persona red-team agent attempts | Two previously used workers could not be awakened for v2 review; two newly spawned worker chats failed to deliver reports | **INDEPENDENT_V2_REVIEW_NOT_VERIFIED**. This document's red-team sweep is prime's desk review, not four independent agent approvals |

## Live verification results

| Check | Observed result | Interpretation |
| --- | --- | --- |
| `ak plan validate <v2-dir> --json --no-interactive` | `valid: true` (exit 0) | Valid AgentKit file structure only |
| `ak plan parse <v2-dir> --json --no-interactive` | 7 phases, 50 unchecked Markdown checkboxes, 0 done, 0% | There are **22 executable `### Task` units**, not 50 completed jobs |
| `node --test test/fcv588-public-replan.test.mjs` | 5/5 PASS (exit 0) | Phase fields, RED/GREEN/REFACTOR, links and claims checked statically |
| `python tools/verify_reference_manuals.py` | `PASS_AVAILABLE_ASSETS_WITH_GAPS`; 24 PDFs, 2 ZIPs, 0 validation failures | Archive integrity, not AI-processing or redistribution license |
| `python tools/build_fcv588_feature_register.py --check` | `PASS: 65-feature research register matches current inventory` | 64 FCV rows + D15, not implemented-operator proof |
| `npm run check` | **FAIL**: 56 tests, 55 PASS, 1 FAIL at `test/public-reference-plan.test.mjs:95` | Existing v1 planning test expects old literal phrase `blanket-disable`; v2 Task1.0 explicitly owns this baseline semantic-test repair. No simulator runtime code altered |

The v2 source-check suite initially reported three formatting/test expectation failures during drafting. These were corrected, and its **latest** run returned all five PASS. The general `npm run check` remains failing and must not be called green.

## Four-lens desk red-team — not a substitute for independent/Kongming supervision

| Lens | Evidence and failure mode | Resolution / residual |
| --- | --- | --- |
| Security adversary / fact checker | `tools/server.mjs:38-63` limits GET/HEAD to /web and /src; `sources/manuals/MANIFEST.json:24-107` retains restricted manufacturer PDFs. Copying photos/PDFs into web assets would leak rights-restricted material | Plan Phase1 Task1.4 and Phase6 Task6.1/6.2 prohibit copied bytes, require explicit banner and HTTP/asset checks. Residual copyright/AI-processing permission remains HOLD |
| Failure analyst / flow tracer | `src/core/protocol.mjs:41-85` lacks independent UI event; `src/core/session.mjs:66-70` couples device and world ticking, while `web/app.mjs:243-245` pauses world ticks; a ~6-second dialog could hang or become replay-nondeterministic | Phase2 Task2.2 now requires a recorded `ui-tick` and explicit replay/profile version migration, plus RED paused-world tests. Design unimplemented |
| Assumption destroyer / scope auditor | `docs/evidence/fcv588-public-evidence-ledger.json:1-241` already has 11 sources but `FCV588_FEATURE_REGISTER_DRAFT.json` only holds hardware fidelity fields; a guessed firmware/transducer branch could incorrectly certify public claims | Phase1 Tasks1.1–1.3 separate source authority/evidence mode, public trace (64+1), virtual variants and right status; physical hardware status remains unchanged |
| Scope and contract verifier | `src/core/session.mjs:101-147` binds replay envelopes to profile/scenario; with a second device, complete multi-device envelope hash changes even when FCV observation stays identical | Phase7 test oracle corrected to require FCV-only raw and event substream hashes identical; full multi-device envelope uses device-set identity and may differ. No AIS R5 UI until variant identified |

### Whole-plan consistency sweep

- Eight files reread: `plan.md` and all seven `phase-*.md`; reviewed `reports/phase-01-scout.md`.
- Checked phase dependencies, 22 task headings, exact RED/GREEN/regression commands, local Markdown links, 64 FCV + D15 separation, virtual Transducer Type restrictions, Demo and BDS guards, browser attach-before-reload, no real NMEA/serial/RF interface, restricted rights and F0 revision migration.
- Reconciled stale Phase1 heading, evidence ledger already exists, 11-source limit vs extensibility, and Phase7 multi-device envelope hash criterion.
- **Unresolved implementation blockers:** full `npm run check` must first be repaired in Phase1 Task1.0; video-frame observation not available; installed firmware/transducer unknown; rights permission incomplete; real browser smoke not yet run; no native Kongming supervision.
- **Unresolved planning verification gap:** independent new-v2 four-persona red-team reports could not be obtained. Earlier two read-only scouts informed drafting but did not sign off on finalized v2 files.

## Verdict

**GO — structural, test-backed, evidence-led plan authoring.** The new plan's files are internally checkable, and the authoring task has been completed with a best-effort adaptation of the `--deep`, `--tdd`, `--advice` skill guidance.

**NOT EXECUTED — native `/ak-plan --deep --tdd --advice` with Kongming.** There is no evidence of genuine slash dispatch or Kongming counsel in this runtime; the limitation is material and must be disclosed.

**NO GO — claim of F1 implementation, full Node regression green, real browser acceptance, public OEM/hardware fidelity certification, or independent final-v2 red-team approval.** Those are separate gates and remain pending.
