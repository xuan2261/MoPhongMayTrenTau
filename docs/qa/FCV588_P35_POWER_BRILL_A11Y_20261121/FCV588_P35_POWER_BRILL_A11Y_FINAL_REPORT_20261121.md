# P35 — POWER/BRILL accessible Name correction (21/11/2026)
Decision: GO_BOUNDED_ACCESSIBLE_NAME_SOFTWARE_QA / NO_GO_RELEASE. releaseApproval=HOLD.

## Source-backed symptom
- Canonical web/index.html:99 originally described only generic power/brightness and long-press-to-off; omitted short press to boot and open/advance BRILL.
- OME-23890-E §§1.1–1.3 and V40/V43 source atlases support both gestures. Current src/devices/fcv588/model.mjs:858–870 already implements short OFF=>booting, short ON=>BRILL and long=>off. Wording is authored accessibility copy, not a verified OEM Vietnamese phrase.
- First stage RED attempt failed from a harness regexp boundary, preserved; corrected source-valid RED failed on missing POWER/BRILL identity; stage GREEN 1/1.

## Changes and observed gates
- Guarded canonical apply exactly web/index.html (one aria-label literal) and new test/fcv588-p35-power-brill-a11y.test.mjs. Preimage backed up by SHA before apply. No model/input/profile/replay, visible BRILL, firmware, or renderer changes.
- Test-owned stage browser V1 failed setup by defaulting to user-owned port4173 and exited; V2 reached all assertions but failed to print Unicode JSON in cp1252; V3 used port4295 and an ASCII-safe log, PASS one exact browser role/button name, HTTP HTML bytes/source hash, no page errors/external requests, owned port cleaned. Failed logs preserved, never counted as PASS.
- Canonical focused Node 15/15 and npm run check 618/618 PASS, includes syntax checks. Two independent read-only reviewers gave bounded GO for the exact copy; no OEM visual proof.
- User listener 127.0.0.1:4173 PID1204 unchanged. P33/P34 postreceipt SHA and installed P31 EXE+ASAR SHA unchanged.

## Remaining limits and next
- Installed Electron P31 v0.0.3 retains the original label; no rebuild/sign/publish. P35 only improves canonical web source.
- Narrator/NVDA spoken output has not been verified; human acceptance ur_asb15jf1xdyv is OPEN, see P32 guide. Do not infer spoken PASS from HTML/DOM/UIA.
- F1 Phase6 OPEN, 65/65 claims HOLD, firmware UNKNOWN, hardwareValidated=false, OEM rights/releaseApproval HOLD.
- Next independent work with evidence value (not a release gate): current-profile22 live LF-ZOOM/HF-ZOOM Bottom Zoom bounded browser QA on isolated source. No pixel OEM calibration claimed.
