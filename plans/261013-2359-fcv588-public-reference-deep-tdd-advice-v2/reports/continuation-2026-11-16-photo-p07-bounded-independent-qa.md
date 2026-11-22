# FCV-588 — P07 bounded independent visual QA (2026-11-16)

**Verdict:** `P07_BOUNDED_SOFTWARE_QA_PASS_WITH_SOURCE_GAPS_FULL_PHASE7_AND_F1_PHASE6_OPEN`. This is QA-only against unchanged P04 provenance v3 canonical, not a hardware/firmware/OEM release or acceptance of all public feature claims.

## Verified evidence

- Canonical `C:\Work\MoPhongMayTrenTau`: 39/39 runtime SHA exact P04 sealed parent final `94d9bf997408d8fb51140b723319ea59faefb8122f66233839ad5a8f39b243d2`, post `132facb60daba96a7e7c0cfa38b3e8d8b414e3b852a98e79b14b390620303a9d`.
- P07 pure 480x640 logical geometry: 63/63 matrix cases and 447/447 checks over LF, HF, DUAL, LF/HF ZOOM, NAV1/2 and 3 zoom kinds. The external viewport labels in this pure test are not proof of CSS responsiveness.
- Actual independent Chrome on 375x812, 1366x768, 1920x1080: 13 states each, 39/39 PASS; 36 distinct loaded source body SHA/viewport, 108/108 exact canonical bytes; 39 PNG SHA and byte sizes verified; no browser request/console errors; original OEM photo URLs 8/8 HTTP404. Test-owned 4207 cleaned; existing 4173 left running.
- Security/replay: 12/12 boundaries, 47/47 HTTP negative tests, no active prohibited transport/device network paths, reproducible `F1-public-reference-21` hash `f0-fnv1a32-157a1578`; wrong profile rejected and LF/HF raw sonar hashes stable.
- 8/8 original 2016 reference photographs SHA preserved as `REFERENCE_ONLY`; external D15 keyboard/focus, 5/5 tabs source/Chrome coverage; photo/a11y assessment explicitly `PASS_WITH_SOURCE_GAPS`.
- Fresh post-Chrome canonical full Node **563/563** PASS and Python **13/13** PASS, logs sealed by SHA.
- Independent `worker-1` verified 39 PNG, 108 actual loaded-body rows against freshly hashed canonical source, 39 runtime paths/P04 seals, photo denial and replay; bounded **GO**, receipt SHA `ed6238165799e3094f0c7fa211b296cc7431fd4be3b302262ff6fcfeff5d6933`.

## Write-once authority

- `docs/qa/FCV588_P07_BOUNDED_20261116/FCV588_P07_BOUNDED_FINAL_INTEGRITY_20261116.json` SHA-256 `024dd1d75c7879fe0df88f939739d854a40aa819a459b6e1fbebd186aca91726`.
- `docs/qa/FCV588_P07_BOUNDED_20261116/FCV588_P07_BOUNDED_INDEPENDENT_POSTRECEIPT_20261116.json` SHA-256 `22fc21b744ebedbd5ac4a5998411c3e01f665697fa7fbb2a3726998909775ea6`.
- Exact scoped research receipts, HTTP body/screenshot evidence, all 8 original photo hashes and 39 runtime SHA are bound by final JSON. The postreceipt was produced after an independent fresh readback by the local finalization script and also binds the prior separate worker-1 review. These are two distinct validation methods, **not two independent human reviewers**.

## Limits and outstanding acceptance

- Mobile 375x812 screenshots may be scrolled, not full unscrolled native frame/whole-machine proof. 39 Chrome states are bounded operator coverage, not all combinations; STOP backing-canvas proof inherited from P04 rather than rerun as P07.
- Physical LCD four-corner camera ROI/homography and OEM dimensions/colors/fonts/knob detents/timing **SOURCE_GAP**; 8 OEM photos are reference only and not licensed for redistribution.
- Actual Windows Narrator/NVDA spoken outputs, real OS `window.blur`/refocus while holding POWER, forced-colors review **NOT_RUN**. Exact Vietnamese firmware menu phrase oracle **SOURCE_GAP/HOLD**; installed firmware **UNKNOWN**.
- F1 Phase6 **OPEN**, all 65/65 feature claims **HOLD**, `hardwareValidated=false`, OEM photo rights **HOLD**, `releaseApproval=HOLD`. No percentage or certification of likeness to real FURUNO hardware is claimed.

**Next bounded action:** first prepare legally usable LCD four-corner ROI per photo, recording uncertainty; then separate native Windows screen-reader/blur capture. Do not change OEM language/UI or overwrite current receipts without a source-valid defect.
