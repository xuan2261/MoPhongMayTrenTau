# P14 — Versioned Sounder AP-1 / historical profile21 replay guarded apply (2026-11-16)

Status: **CANONICAL SOFTWARE INTEGRATION VERIFIED, F1 PUBLIC_REFERENCE v2 ONLY**. OEM release/installed firmware/hardware/rights/65 claims: **HOLD / OPEN**. This is not an OEM fidelity percentage.

## Source and behavior

- Active simulator `F1-public-reference-22` has exactly the public manual AP-1 order for thirteen Sounder rows; ordered semantic menu IDs are included in active adapter profile hash. A replay from another revision is never silently coerced into profile22.
- Archived `F1-public-reference-21` adapter/model/menu/settings/revision and copied NAV/alarms/calibration/units/capabilities preserve historical reducer dependencies. Explicit `replayFcv588Envelope` selects the correct version and generic core replay still rejects wrong envelope/profile/scenario/fingerprint/final hash.
- Six original profile21 envelopes frozen from the unchanged old canonical bytes: Sounder selection (old White Marker), editor, NAV1, NAV2 waypoint, Data source selection, committed NMEA source. All six byte SHA, profileHash, contentFingerprint and final sessionHash pinned and replayed; no old byte or event rewrite.
- Device main-menu LCD projection accepts an explicit profile revision for historical playback; profile21 row White Marker is not silently shown as profile22 Clutter. Unknown revision fails closed. The ordinary live browser defaults to profile22; there is no general legacy user-import UI or historical instructor-panel reconstruction.
- Schema18 and localStorage `settings.v18` retained; explicit valid old21 or old19 settings import via logged restore-settings; old raw bytes are not rewritten on boot.

## Acceptance and protected evidence

- Final stage: Node **577/577**, Python **13/13**, Chrome **10/10** at 375x812 and 1366x768 with **164/164 loaded HTTP body SHA**; reference-only eight JPEG routes **404**. Runtime stage50 seal SHA `29890c775bac1ba8785dd87b8adfb7d67be9fdfdbcb973cff67fe77ed0c76dff`.
- Independent code-source and preapply gate **CANONICAL APPLY GO**: `p14-test-oracle/P14_FINAL_V2_ALL_HISTORICAL_SOURCE_GATE_20261116.md` SHA `45ae1cc5418e416ce868ee415eb4fec501f535e9fcaf71e8064df60a1b8937ad`.
- Guarded allowlist 38 paths: 17 preimage replacements, 21 new files, zero unrelated delete. Preimage ZIP SHA `b2b2c8ecdd55f7dc96506ef988506420274d0f1b9ea4e7fde788ff029eb5b747`. Apply receipt SHA `82b93e74b055491a3d02dc081ce13fb78f40a1d42fdcfb0b5e1d95d196dd0159`.
- Canonical postapply runtime **50/50 SHA match**, original reference photos **8/8** preserved, user loopback server **127.0.0.1:4173 PID1204** undisturbed. Canonical Node **577/577** log SHA `25c8403864c6b2ada94dfd53deabeb9ffe82382bad547ae9161bb5b2dc1f1e16`; Python **13/13** log SHA `93e80c9b1f98c2fe9518fa2167302cea29b2c29e95dee65db227ebad199c8034`; Chrome **10/10**, **164/164** body SHA receipt `4265bb1ea3393064e95465366d020e2e1901ae153b891b1fca003a574fb378ac`, owned test port 4215 closed.
- Earlier P12/P13 NO_GO/RED logs, old P14 558/569 FAIL and Chrome harness failures retained, not overwritten or relabeled. No Git repository or commit/release.

## Bounded limitations and next milestone

F1 Phase6 remains **OPEN** and **65/65 public claims HOLD**. `hardwareValidated=false`, `firmwareInstalled=null/UNKNOWN`, OEM assets rights and release approval HOLD. Eight 2016 photos remain `REFERENCE_ONLY`; no JPEG/PDF in served runtime. No physical vessel/NMEA/transducer/USB or live signal connectivity. Installed firmware locale and exact OEM pixels/geometry/timing still source gaps. Narrator/NVDA spoken output, native Chrome genuine window.blur while POWER held, and Windows High Contrast remain NOT_VERIFIED / NOT_RUN.

Next: independently rehash P14 canonical final integrity/postreceipt, then undertake separately scoped native accessibility/firmware/photo calibration evidence without changing the public release gate.
