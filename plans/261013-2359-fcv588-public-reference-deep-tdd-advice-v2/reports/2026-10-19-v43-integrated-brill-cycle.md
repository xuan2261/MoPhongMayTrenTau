# FCV-588 V43 — Integrated OEM BRILL reflected-cycle TDD

**Date:** 2026-10-19. **Scope:** a bounded PUBLIC_REFERENCE offline simulator behavior change; user-authorized GPT-6 scoped self-review, NOT an independent reviewer or a claim that the ChatGPT client effort setting was tool-confirmed.

## Objective and actual change

The FURUNO FCV-628/588 Operator's Manual OME-23890-E §1.3 describes a repeated short POWER/BRILL sweep reversing at peak 9, while canonical V42 applied modulo 10 (9→0). V43 implements **9→8→7→...→0→1→...→9**, preserves first open at 9, stages preview until commit, and keeps six-second UI inactivity, MENU/ESC, ENTER, canceled power hold and deterministic replay.

Exact manufacturer source: https://www.furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/fcv628_fcv588_operators_manual.pdf §1.3. Source decision and gaps are recorded in ../../../docs/research/FCV588_V43_OEM_BRILL_SOURCE_ATLAS_20261019.md.

Canonical changes approved by the V43 stage manifest and GPT-6 decision consist of:
- Runtime: src/devices/fcv588/model.mjs (transient stepDirection and reversible BRILL short-key cycle); src/devices/fcv588/profile-version.mjs (F1-public-reference-21); src/core/lessons.mjs (D15 LEARN-07 from 9→0 to 9→8); web/app.mjs (out-of-device instructor migration wording from profile20 to profile21). **4/37 runtime sources changed; 33 unchanged V42 SHA.**
- Live evidence metadata ONLY: docs/evidence/device-register.json (profile revision and updatedAt), docs/evidence/fcv588-public-implementation-status.json (profile revision). All 65 existing HOLD rows unpromoted.
- Regression tests: four existing related Node test files updated for the accepted revised contract and one new independent 6-test OEM BRILL regression file. **11 canonical files total.**

No modifications to sensor observations, core session/replay/event schema, settings schema v18, LCD hardware labels, CSS, firmware, OEM media rights or actual hardware connections. Old profile20 replay and persisted settings are not silently reinterpreted. A separately explicit profile19 settings migration remains implemented and its instructor notification now accurately identifies profile21.

## Evidence chronology

1. V42 final and postreceipt SHA were read back exactly; canonical runtime 37/37 and QA ports verified before cloning. Stage exact V42 runtime 37/37; 16 historical original-training fixture PNGs copied with 16/16 SHA; stage baseline receipt SHA da1937af6036cd6d225b15e859343530e4e138e2f7bb3f580eaacf21aa91442b.
2. An initial test import error (nonexistent export FCV588_LESSONS) exited before assertions and was preserved as TEST HARNESS STOP; original SHA 652aa71e180fb33603e237a7b79085cf6c8929bdb167336bf57cdab0b5883f5c. Narrow corrected import rerun gave **0/6 behavior tests PASS**, **6/6 RED** for the intended discrepancy and profile/lesson mismatches, log SHA 6d4bd973b00a1d2df721fa649c3a7262f0157885d62ea4500f83d17fe17b39aa.
3. After scoped GPT-6 staging GO, targeted Node **66/66** GREEN SHA 919911acd8bf235cc20253dd5629a90c7a43ba32450e9be655f19be271ad1eac.
4. Original full staged Node **482/484 PASS, 2 FAIL** because two active metadata records still declared profile20; its log SHA 267a8191bbcfca1c093de09b5650c8b037ac8adcdfb3d4caa56c4b7074327083 preserved. Stage repaired only those metadata labels after root-cause GO: targeted 10/10 and full **484/484 PASS**.
5. Instructor migration message was synchronized outside the LCD, then a new full staged Node **484/484 PASS** (SHA 949e98c18b033ec5d7e1ab200f3b4a00ad080d6dd843d5fdb6c577565b9da224) and Python **13/13 PASS** (SHA 8dc0b204083dbff27bcf2358ff8d04362f64add3418cadace5ce142558a4060c).
6. Stage headless Chrome via actual installed Chrome/Playwright **102/102**, 245/245 loaded body SHA, 12 PNG. Stage receipt SHA e163fce6c89bbf1b6877c75884c5b3869a62438d5d4127ed2d9d22ef77a9f7e3. Visual review of desktop and responsive mobile simulated device-frame screenshots showed Brill preview 8, without invented teacher labels.
7. First canonical preflight was stopped BEFORE copying due to the stage manifest's invalid literal trailing \n; original manifest retained with SHA 56a867debdf3196e5d5d1fd7c99753ac7f6a7043142422f0ef339e56cf7e8965. A valid-json write-once corrected manifest SHA a3b2ab6420bce6c026025861888f2cebb03ab8435e293f49f385916359906d19 read back 11 approved files and 37 source hashes. No blind rerun or modification of the original failed artifact.
8. Canonical copy of precisely 11 files occurred after V42 final/postreceipt/preimage 37/37 guards and GPT-6 scoped GO. Apply receipt SHA fc57b5563294c68ac3aea835e31fe13231ab825124a45eb193577d4162be3674; postcopy runtime **37/37** match.
9. Canonical targeted Node **66/66**, log SHA 1681a5183cf78c619a967992edd8915fd600168c72ba15674d9e43efd93c5d03; full Node **484/484**, SHA fb7ca6119f23aed5b2c29a97fd68f37a9c06865ebd84a840b0534f0eb85d004f; Python **13/13**, SHA 840b05a4b3db06c86e9788023772b87bad51a9dbf0eaabf9864bdebe56b697c2.
10. Canonical Chrome separate run **102/102**, **245/245 browser response body SHA**, **12/12 images**, receipt SHA bc40fca348f551ae1aa557b40ab566144c491ac55a2dcf8c5f64260b523df865. HTTP security root 200, CSP connect-src none/nosniff, four negative routes denied (404,404,403,405), receipt SHA d233e3e94b466d55efbbeb8165a60106fc59ef75140a95410ae4261a1d2de660.
11. Owned temporary QA port 4225 was stopped and 4226 was no longer listening at later readback; no external real sonar, GPS/NMEA, serial, USB or RF transports were used.

## Acceptance and follow-up

The above passes apply to locally tested software only. Manufacturer pixel geometry, installed firmware, actual physical timing, media redistribution rights, genuine OS window blur and Narrator/NVDA spoken output remain unverified. Headless Chrome 1366×768 and 1920×1080 are NOT native attached CoS Desktop resized sessions. GPT-6 self-review is not an independent OEM reviewer.

Phase 6 OPEN. **65/65 claims HOLD, 14/50 checklist, 6/22 named tasks**, hardwareValidated=false, releaseApproval=HOLD, firmwareInstalled=UNKNOWN. V43 software-only milestone is ready for postdocumentation/full integrity/readback verification, not a maritime equipment release.

**Proposed V44:** source-verify mixed BRILL/TrackPad progression, operator timing and LCD interactions without extrapolating firmware-specific pixels; complete outstanding native Windows accessibility/blur checks separately when genuine facilities exist.
