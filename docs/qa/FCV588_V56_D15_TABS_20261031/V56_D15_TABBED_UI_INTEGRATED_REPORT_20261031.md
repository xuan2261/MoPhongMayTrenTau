# V56 — Five-tab instructor D15 workspace

Date: 2026-10-31 (Vietnam). Canonical root C:\Work\MoPhongMayTrenTau.

**Outcome: V56 scoped software/UI QA PASS, Phase 6 OPEN, 65/65 feature claims HOLD, release HOLD.** This project is F1 PUBLIC_REFERENCE / TRAINING ONLY, not OEM- or hardware-validated. Real Narrator/NVDA speech and genuine Windows blur under POWER remain NOT_RUN.

## User requirement and decision

The user wants several small D15 tabs instead of scrolling through a very long Instructor Control column. At Chrome 1912x970 the original D15 height measured approximately 3230.8 CSS px. This change is instructor UX only, not an FCV physical LCD, sonar, reducer, replay, firmware or rights change.

The account-authoritative **ak-brainstorm v2.9.0 --ultra --advice** instructions were read from the user's Native Skills Hub on Drive. Exactly five independent, read-only generic CoS candidate brainstorms ran in one parallel wave; one different generic verifier selected anonymized **Candidate A**, unchanged, on a five-part 1–20 rubric:

| Candidate | Faithfulness | Source fidelity | Acceptance | A11y/mobile | Tradeoffs | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| A (winner, worker-5) | 19 | 20 | 19 | 17 | 19 | 94 |
| D | 18 | 20 | 18 | 19 | 18 | 93 |
| B | 18 | 20 | 16 | 18 | 18 | 90 |
| C | 16 | 8 | 15 | 18 | 18 | 75 |
| E | 16 | 6 | 14 | 18 | 17 | 71 |

The recommendation keeps both the three *visible* source cards C11/D09/D14 and the two always-mounted polite screen-reader live regions outside inactive panels. Runner-up D scored higher on A11y/mobile, and the 1-point winner margin is LOW. Same-tier gpt-5-6 workers were used; neither an original Kongming agent definition nor Fable/Astra advisory invocation was verified.

ultra: picked=5/5 margin=low unanimous=no rejected_all=no

## Implemented D15 tabs (all existing functions retained)

- **Phiên:** SIM TICK/EVENTS/MODE, instructor telemetry, Pause/Step/Reset/Replay.
- **Trợ giúp:** visual operator guidance, GAIN/MODE +/- assists, usage help, device roadmap.
- **Tình huống:** five synthetic NAV/mount/Tankenmaru/battery/error fixture toggles.
- **Bài học:** seven scored lessons, picker, start attempt, score and result.
- **Nguồn & QA:** three visible C11/D09/D14 source cards, validation status.

Header/provenance remains outside tab panels. The tablist is hidden without JS and all original D15 sections remain visible, preventing content loss on JS failure. With JS: five tab buttons at least 44px high, role=tablist/tab/tabpanel, aria-selected, roving tabindex, inactive hidden panels, Left/Right wrap plus Home/End. Existing nodes/IDs are **moved once, never cloned**, preserving original event handlers and replay semantics. Switching tabs sends no simulator input. Two polite live announcers are moved to a global rail still outside the OEM face.

The D15-only layout is bounded; content of a long active tab can scroll *inside the panel* at short viewport heights. Complete zero vertical scrolling on every phone/zoom is not claimed.

## Measured canonical real Chrome UI

| CSS viewport | Old D15 | New D15 | Document scrollHeight | Horizontal overflow | Status |
| --- | ---: | ---: | ---: | --- | --- |
| 1912x970 | ~3230.8 px | **780 px** | **1201 px** | None | PASS |
| 1366x768 | Tall stacked | **744 px** | **1195 px** | None | PASS |
| 375x812 | Tall stacked | **690 px** | **2388 px** | None | PASS |

Mobile page length remains influenced by the separate reflowed training face above D15. On each viewport: real Chrome keyboard/tab/focus behavior, step and fixture actions, 7 lesson entries, unique original IDs, global live regions, no-JS fail-open, and **36/36 actual browser-loaded HTTP response-body SHA** checks PASS; three screenshot PNG SHA were saved. Browser had zero captured page/console errors.

## TDD and regressions

- Before modifications: canonical Node 511/511, Python 13/13 PASS, 37/37 runtime SHA pinned. Staged baseline focused Node 17/17 PASS.
- TDD RED (write-once): 1/3 PASS + 2 intended missing-tab failures; browser RED 3 viewports missing tabs plus noJS missing fallback.
- Staged focused: original first attempt 19/20 because new CSS had not reached staging; after a new immutable attempt, **20/20 PASS**.
- Staged browser: 3/3 viewports PASS, 36/36 source body SHA per viewport, three PNG, no-JS fallback PASS.
- Guarded canonical copy after staged GREEN: changed preexisting runtime **web/index.html**, **web/styles.css**, **web/app.mjs**; new UI-only module **web/instructor-tabs.mjs**, and a new Node test file. All original other **34/37** runtime hashes unchanged.
- Canonical full Node **514/514 PASS**, Python **13/13 PASS**. Canonical Chrome 3/3 PASS with 36/36 loaded response SHA per viewport.
- Live announcement independent browser probe: while Help panel was hidden and Nguồn & QA was active, Chrome observed semantic live titles **Sounder / MENU** and **Trạng thái mô phỏng**; source polite region remained outside hidden ancestors. Tab changes did not increase simulator event count. No real screen-reader speech is claimed. First live probe saved raw data but failed exit1 due Windows cp1252 final stdout encoding. Original FAILURE is preserved; fresh identical-runner UTF-8 attempt ended exit0, with matching raw semantic status.

## Scope incident and recovery preserved

An unintended early relative apply_patch changed canonical CSS instead of stage before staged GREEN. Canonical CSS was independently verified as exact original 29130-byte prefix (SHA b5284e11f3649652e70211acb9119d74384c9372bba0b986f37108e902105cee) plus precisely 2936 bytes of D15-only CSS, resulting SHA 7a1f18e7de54a71f9b7ac5297baad9b209920b6026a14287a728805a4331bfef; no other canonical source changed at that moment. Write-once STOP evidence and a separate correction of a manually transcribed log SHA were retained. Read-only worker counsel recommended **no blind restore**; only the byte-identical suffix was transferred to staging after verifying prefixes and SHAs. Stage GREEN and Chrome PASS preceded later guarded canonical apply. Canonical CSS was not rewritten during the guarded apply. This process deviation remains a visible QA finding, not silently erased.

## Acceptance boundaries and next action

The simulator remains F1-public-reference-21. No FCV hardware geometry/pixel behavior/installed firmware is validated. Phase6 OPEN, baseline 14/50 checklist items and 6/22 named tasks, 65/65 feature claims HOLD, hardwareValidated=false, rightsClearance=false, reviewerSignoff NOT_OBTAINED, releaseApproval HOLD. No drive D: use or backup, no dependency install/commit/push/deploy.

**Next:** instructor reviews tabs in the already running localhost canonical UI after browser refresh. A later narrow V57 refinement should use actual usability feedback about grouping/labels and screenshot+viewport evidence; Phase6 genuine Narrator/NVDA and real Windows focus remains a separate approved-isolated-QA task.