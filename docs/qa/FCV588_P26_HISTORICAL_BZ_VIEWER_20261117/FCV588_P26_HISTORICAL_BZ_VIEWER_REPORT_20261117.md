# FCV588 P26 — Bounded historical-contract Bottom Zoom viewer
Date: 2026-11-17. Scope: F1 PUBLIC_REFERENCE v2, Windows offline classroom D15 only.
VERIFIED: P26_BOUNDED_CANONICAL_POSTAPPLY_PASS_D15_SYNTHETIC_BZ_VIEWER. Production release HOLD.

## Source and behavior
Official OME23890E §1.4.3 PDF p12 / printed p4 confirms Bottom Zoom expands bottom/fish in the LEFT half and tracks bottom in LOWER part. Manual does NOT specify 0.75 OEM pixels or exact font/RGB. zoom.jpg/zoom2.jpg show BL-LF/BL-HF Bottom Lock, NOT BZ; all 8 REFERENCE_ONLY photos unchanged and never served.
P26 browser D15 archive pair import uses unchanged P24 strict v7 sidecar replay and P25 bounded JSON decoder. Generates independent synthetic BZ-left/normal-right canvas from the validated current state; no archival pixel bytes, image data URLs, hardware input or OEM assets. P04_HISTORIC selects legacy centered fraction 0.5; P23_LOWER_BOTTOM selects 0.75 classroom positioning. Fingerprints only drift checks, not provenance authentication.
Must be POWER ON, actual active LF-ZOOM/HF-ZOOM, and Bottom Zoom setting. Genuine frozen pre-P23 LF archive or LF with BZ preference or POWER OFF with LF-ZOOM: VALID REPLAY, NO fabricated historical BZ canvas. No mutation of live session, LCD framebuffer, timers or localStorage. No change to old P24/P25 APIs, replay envelope v7 or active P23 LCD route.

## Evidence
Source-valid RED: missing viewer module; LF with saved BZ preference incorrectly rendered; POWER OFF with retained LF-ZOOM incorrectly rendered. Both model defects fixed and RED preserved. Stage final focused 9/9, full Node 605/605, Python13/13 and isolated Chrome 9/9 with 51/51 actual HTTP source SHA, errors zero, QA port 4227 closed, full live LCD raw RGBA SHA unchanged. Canonical postapply same counts and exact canvas pane hashes. Same current synthetic active-LF-ZOOM replay bytes with TEST-ONLY P04 sidecar vs P23 sidecar yields different BZ-left pixels, identical normal-right pixels. The P04 test-only sidecar is NOT historic provenance.
Guarded apply exactly 3 modified +2 new paths: web/app.mjs, web/index.html, web/styles.css, NEW web/fcv588-archive-bz-viewer.mjs, NEW test/fcv588-p26-archive-bz-viewer.test.mjs. Three preimages in write-once backup ZIP; stale dryrun V1 preserved but NOT used, fresh V2 used. P25 runtime52 preserved except three guarded modifications, new module yields runtime53; OEM JPEG8 unchanged. Independent preapply GO and postapply GO recorded separately.
Original first Chrome attempt FAILED due harness clock tick, fixed harness V2 (not a product defect); V2/V3 and V4 PASS but V2/V3 superseded by latest stricter source gates. Other historical failures and evidence preserved. Neither Chrome QA nor source collection contacts or restarts user server 127.0.0.1:4173 PID1204.

## HOLD / NOT ACCEPTED
No full historical OEM LCD screenshot restoration, arbitrary archival pixel authenticity, hardware/firmware color/geometry validation, pixel-calibrated BZ 75%, OEM rights clearance, production release. Phase6 OPEN, 65/65 public claims HOLD, hardwareValidated=false, firmware UNKNOWN.
Proposed P27: D15-only event-by-event archive timeline with state/contract-bound synthetic frames and bounded navigation; another alternative is manual-backed LF/HF/DUAL visual conformance. Require historical OEM source oracle before claiming exact pixel fidelity.
