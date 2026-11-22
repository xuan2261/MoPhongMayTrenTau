# P36 — Chrome LIVE LF-ZOOM/HF-ZOOM Bottom Zoom QA (2026-11-22)

Decision: PASS_BOUNDED_LIVE_BOTTOM_ZOOM_QA / NO_GO_RELEASE, releaseApproval=HOLD.

## Authority and risk scope
P28 canonical node tests and its source review of OME-23890-E section 1.4.3 establish Bottom Zoom on the left, normal pane on the right, and a bottom return in the lower portion. The manual does not establish exact OEM pixel geometry; classroom bottom fraction 0.75 is not an OEM oracle. P28 previous live LCD Chrome covered LF/DUAL/HF but not LF-ZOOM/HF-ZOOM. P36 tests just that incremental current-profile22 live gap, not historical screen reconstruction.

## Actual QA outcome
- Canonical Node focused current-source P28+P23 7/7 PASS. Negative archived wrong Zoom Mode and POWER OFF are covered there. No redundant full-suite rerun.
- Isolated copied canonical stage: 54/54 runtime files individually SHA-identical before/after, no canonical edit. Chrome headless configured viewports 1366x768 and 1920x1080; LF-ZOOM (50 kHz) and HF-ZOOM (200 kHz), 4/4 PASS.
- Genuine page interactions: teacher pause, short POWER and five synthetic ticks to on, native MODE knob keyboard changes and automatic UI modal commit. Matched world tick 0005; off-screen hidden, LCD canvas intrinsic 480x640, left and right image regions nonempty/nontrivial, central 2px separator detected, LF/HF pane RGBA hashes differ.
- Each Chrome case loaded 52 localhost source paths and checked real response bodies against pinned bytes (208/208). Four screenshots saved and SHA rehashed. All eight OEM JPEG paths 404, zero JS errors and zero external HTTP. A genuine >3s POWER hold returned POWER OFF with off-screen cover visible.
- Owned test server port4296 was closed after the browser. User listener 127.0.0.1:4173 PID1204 unchanged. Installed P31 Electron EXE/ASAR unchanged.
- Original P28–P35 reports/receipts remain untouched; prior parent chain P28–P35 was independently checked. P36 adds only staging runner/source mirror and new QA report/receipts.

## Limits and next
Screenshots prove synthetic classroom behavior, not calibrated FURUNO RGB, fonts, bezel, seabed geometry, acoustic physics or firmware. Configured headless browser viewports are not independent evidence for physically resized Windows desktop monitors. The archived wrong-setting fail-closed condition does not mean a valid live Bottom Lock screen should be blank.
No code defect found within P36 test scope, so no product change, Electron rebuild or signing. Audible Narrator remains BLOCKED_HUMAN_SPEECH_CONFIRMATION until a person hears and records it under P32 guide; human step ur_asb15jf1xdyv was still OPEN at P36 start. F1 Phase6 OPEN; all 65 public claims HOLD, firmware UNKNOWN, hardwareValidated=false, media rights and releaseApproval HOLD.
Next meaningful action is the human Narrator gate or rights-cleared, calibrated OEM reference capture; avoid duplicate synthetic QA without an identified risk.
