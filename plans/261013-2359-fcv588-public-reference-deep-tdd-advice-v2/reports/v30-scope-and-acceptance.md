# V30 scope lock — integrated configuration LCD workflows

This iteration belongs to the existing v2 plan, especially Tasks 3.1/3.2,
5.1/5.2 and 6.2. It does not start a replacement plan or approve those phases.

## Recovery completed before implementation

All nine previously pending V29 full-suite screenshots were opened using
native vision. Both full receipts, the LCD receipt and FUNC GREEN match the
current 33-file runtime manifest
`b9c769e9023cd3746dd5303f3e15796464e06ad6405f0e388bef0cea1e4a0590`.
FUNC RED correctly records the older V28 source, not the current runtime.
The earlier blocked command remains NOT_EXECUTED; the newly authorized
local reconciliation actually exited 0. No historical Chrome run was replayed.
See `docs/qa/FCV588_V29_RECONCILIATION_2026-10-16.json` for original receipt
hashes, nine screenshot hashes and a verbatim snapshot of all 50 checklist
entries and 22 named Tasks. Acceptance remains 14/50 and 6/22.

## Priority decision

A13 configuration navigation is a P0 dependency of Units, Range Bank,
Calibration, NAV boxes, alarm profiles, Installation and FUNC programming.
Unlike the repaired V29 FUNC editor, these paths still render help as menu
rows, lack a separate bounded choice window and do not expose stored versus
draft values separately. Desktop lesson controls also appear wider than their
inner panel in the newly opened V29 images; measure before changing CSS.

The authoritative references are the existing independently written OEM
oracle notes (§1.18, §1.19, §1.21, §2.2, §2.5, §2.6, §4.10), source-graded
atlas and actual reducer/codec contracts. New primary-source search did not
provide additional operator details; third-party manual transcriptions were
not accepted. This is an original presentation/interaction repair, NOT new
evidence of exact OEM menu geometry or key-sequence conformance.

Other priorities remain gated: D04 language needs usable source/reboot rules;
D09/D14 need optional interface/receiver evidence; numeric White Line/Edge
is explicitly excluded. Acoustic algorithms, main-menu navigation semantics,
defaults, range limits and all profile/settings/event/replay versions stay
unchanged. No real receiver, USB, serial, RF or ship interface is permitted.

## Fixed design brief

Register: Product, existing training instrument.
Scene: Learners operating physical keys on desktop or enlarged phone reflow.
Direction: Preserve the V28 face and V29 FUNC; make configuration state readable.
Color/type: Reuse existing light LCD dialog, blue title, selected-row styles and
Consolas/system fonts. No OEM font, screenshot or palette extraction.
Signature: Real field rows, separate stored/draft values and persistent key help.
Dials: variance 1/10, motion 1/10, density 7/10; no new animation.

## Acceptance before code

1. Eight existing overlay families expose only their actual operator rows:
   range-bank, units, calibration, nav-boxes, fish-alarm, fish-alarm-setting,
   installation and func-program. No help/source text is a selectable row.
2. Choice editors show at most seven ordered values, exactly one selected
   draft and separately identified committed/draft values. Physical TrackPad
   remains the sole navigation owner; the projection never dispatches.
3. ENTER/cancel, source HOLD, optional NMEA row filtering, alarm enabled/cause/
   acknowledgement distinctions, saved settings, power/reset/reload and replay
   retain their existing meanings. Source notes do not assert actual sensors.
4. Selected field/choice, transaction and key help fit the LCD at all four
   required viewports; desktop lesson controls fit their own panel. Keep
   mobile 44px controls, portrait 480x640 logical LCD and instructor separation.
5. Actual browser RED must fail the newly specified presentation assertions,
   not import/navigation/setup. Existing commit/cancel/replay must characterize
   as working. Then GREEN and full affected regressions on distinct V30 outputs.

Unexpected completed-verification failures invoke the phase Failure Protocol.
No missing independent reviewer/Kongming result can be called approval.

## Initial harness setup error — retained, not product RED

`python tools/fcv588_configuration_visual_regression.py --stage red` exited 1.
All four contexts stopped before any assertion: `.lesson-panel` matched two
sections and Playwright correctly rejected the ambiguous evaluate target.
The original `FCV588_CONFIGURATION_V30_RED_RECEIPT.json` and log are retained.
No runtime file had changed. This is a pre-implementation harness authoring
error, not the required behavioral RED or a failed completed-product gate.
The actual HTML has one `section[aria-labelledby="lesson-panel-title"]`;
the corrected probe uses that explicit intended target. Attempt 2 writes
distinct receipt/image paths. No assertion or production expectation changed.
