# FCV-588 V48 — Phase 6 claim cross-ledger QA and genuine Windows blur gate

Date: 2026-10-19. Scope: F1 PUBLIC_REFERENCE browser-training simulator only; **not** OEM, firmware, physical sonar, accessibility speech, rights, or navigational-hardware acceptance.

## Result

V48 adds exactly **one test-only file** to the canonical repository,
`test/fcv588-v48-phase6-cross-ledger-claims.test.mjs`.
All **37/37 canonical runtime source SHA** remain identical to V47. No reducer, operator menu, LCD, D15 UI, profile21, replay, event/settings schema, image, firmware, physical I/O, or OEM asset was modified.

The new test file exercises three invariants not jointly enforced by the older suites:

1. Exact 65-feature identity across the manufacturer-feature draft register (key `id`), public trace (key `featureId`) and implementation ledger (key `featureId`), maintaining **64 FCV_OPERATOR + instructor-only D15**.
2. Per-feature identity, scope, domain, `manualRefs`, `publicSourceIds`, source resolution, `rightsDecision` and guard correlation; the D15 platform has no invented OEM citation and needs no invented OEM-source unknown.
3. All 65 claims remain HOLD, no course review is promoted, hardware and firmware remain unvalidated/unknown, manufacturer sources are research-only, and B07 White Marker remains a training `Off/White/Gray` preview outside OEM-equivalence claims.

## OEM source boundary

Manufacturer manual [OME-23890-E §1.22](https://www.furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/fcv628_fcv588_operators_manual.pdf) describes selecting echo color on a color bar using Up/Down and ENTER, with Off to restore; the [FCV588/628 software history](https://www.furunousa.com/-/media/sites/furuno/software_library/software/software/fcv588-628_software_history.pdf) says White Marker settings changed with v2.01 (September 2016). Neither proves the target unit's installed firmware, OEM `White/Gray` menu choices, pixel geometry, rights, or hardware behavior. The later FCV600/800 `Marker` UI is a **different model** and is not an FCV-588 firmware oracle.

## Actual Windows focus diagnostic — no native blur acceptance

V48 launched two disposable Playwright-owned headed Chrome windows. Their separate Win32 HWNDs (`45944808`, `3606870`) and native foreground-switch success were observed. The first page nonetheless continued reporting `document.hasFocus()=true` and **0 `window.blur` events**. Test exited **2** with `NOT_RUN_REAL_WIN32_BLUR_NOT_OBSERVED`; this cannot prove a defect or a PASS in the simulator's POWER-hold cancellation. Both owned windows were closed and original foreground HWND `198108` was restored. Narrator/NVDA were not started and display settings were not altered.

- Original diagnostic receipt SHA-256: `0757b2a014fc4b84504e890eb381c3e4f679933723b32bbdb962c265f31bd96a`.
- Original diagnostic log SHA-256: `c87cb52424eef2baf7cd51acdf3eee734babbc4e49b7eae756b1eeac70ff3b92`.
- GPT-6 decision: `staging/fcv588-v48-os-focus-phase6-qa/evidence/V48_OS_BLUR_STOP_GPT6_SCOPED_GO_20261019.md`. This is self-review, not independent OEM approval.

## Test execution and known original STOPs

V48 stage was cloned from pinned V47 source: **37/37 SHA**. First staged cross-ledger run exited **1**, **10/14 PASS** due to the isolated claim-policy fixture omission plus incorrect new-test assumptions about `register.features[].id` and the two legitimate `testEvidenceMeaning` values. Original log SHA-256 `688bb03b9df095801e7e52b4a1670ca39277194b8c1d3d61b474c00bbd366905`. A second stage attempt reached **15/16 PASS**, exit **1**, because D15 correctly has no OEM-source unknowns; log SHA-256 `e3f56432c45cb746048cf052e22d222a2829695b317ba898deaa03550d411787`. Both are recorded as harness/environment STOP, not product defects. Source-aware repairs altered only the new staged test and restored one missing canonical policy fixture, with no assertion weakening of the 64 OEM-source boundaries.

Final **staged targeted Node 16/16 PASS**: log SHA-256
`ae92985f4f7a43ca5219bd77ea770b957c921b5a72dacd3e4afaf32ed6820bc2`.
The first canonical-gate attempt exited before check/apply because patch-tool working directory placed two new files in an unintended nested staging folder. The exact files were moved within the owned staging root with matching before/after SHA, documented in `V48_CANONICAL_GATE_WORKDIR_PATH_STOP_GPT6_GO_20261019.md`. No canonical source was copied during any STOP.

Canonical read-only apply gate passed with 37/37 pinned runtime SHA. Exactly one new test was added, SHA-256 `b2876f5f70d13df231a80ba01f06c506740144a4497207d86be4284a378c6d5d`. Canonical apply receipt SHA-256:
`7d64a96342120189e14083f47405f21e536f6524a93f1ff10e3dc608c794ee1f`.

| Canonical verification | Observed result | Original log SHA-256 |
| --- | --- | --- |
| Targeted Node | **16/16 PASS**, exit 0 | `088bd1ca6991b34d33fade406419d23ca48eaeb11d1f2c102011310c8fc48b6d` |
| Full Node `npm run check` | **507/507 PASS**, exit 0 | `4b3114c7418afff2191b6a3e7bba08662825f0d57cb74ff45eccb4adb81f7131` |
| Python unittest | **13/13 PASS**, exit 0 | `4a813c307e88141d6d11fc302941584b14c2aba9d06f064661134880113a90f4` |

## What V48 does not establish

No new V48 stage/canonical source-bound Chrome UI run or screenshot was made; prior V47 Chrome evidence remains valid **historical evidence on identical runtime bytes**, not a claimed fresh V48 pass. Native attached CoS Desktop exact 1366×768 and 1920×1080, actual Narrator/NVDA spoken output, genuine OS blur while POWER held, firmware identification, rights clearance and independent physical/OEM review remain **NOT_RUN/UNKNOWN/HOLD**.

Phase 6 **OPEN**, all **65/65 claims HOLD**, checklist **14/50**, named tasks **6/22**, `hardwareValidated=false`, releaseApproval **HOLD**. A green Node/Python suite cannot be converted into a percentage of OEM likeness or a course/hardware release decision.

## Next milestone

V49 should address one specifically unverified Phase 6 dependency in a controlled environment: real OS focus loss with visible `window.blur` prerequisite while POWER is held, actual screen-reader spoken announcements without toggling the user's screen reader, or lawful FCV-588 firmware/White Marker operator evidence. If no such controlled proof can be obtained, prioritize read-only trace/rights review and keep those gates HOLD.
