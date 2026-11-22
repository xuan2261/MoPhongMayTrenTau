# FCV588 P24 — Archive presentation sidecar — Final report
Date: 2026-11-17. Scope: F1 PUBLIC_REFERENCE v2, pure offline JS API only.

## VERIFIED
- Two independent read-only reviewers: worker-35, worker-36 BOUNDED_POSTAPPLY_GO; worker-37 bounded stage GO.
- Exactly three NEW canonical files; SHA256 matched exact guarded apply and canonical postapply manifests. No existing canonical source changed by this apply.
- Parent P23 final SHA d5b1bfe16e82948c434c67682f04ba79ae939f89be61af88ede6e7021ec3c74a and independent post SHA 9d94af354d4dffa7d6d8e10736955193f562f55feadc754229934a3eedceb095 remain exact.
- All P23 50/50 runtime source SHA verified unchanged, plus new P24 module 1/1 independently verified; OEM REFERENCE_ONLY 8/8 SHA unchanged.
- Hardened P24 focused 7/7 PASS; stage Node 589/589 PASS; canonical postapply Node 589/589 PASS; 0 fail/skipped, RC0; canonical file-backed old/current archive readback PASS.
- Explicit version-1 four-field sidecar selects P04_HISTORIC for frozen pre-P23 profile22 and P23_LOWER_BOTTOM for new profile22. State-only replay envelope v7 remains unchanged. Missing sidecar rejected for presentation replay.
- Security negative RED retained: non-enumerable presentation field vulnerability was fixed by enumerable-data-property guard; partial contract resolver is private. Fingerprints bind consistent envelope/sidecar only, NOT authentic provenance or resist malicious rewriting.
- Unchanged user listener observed 127.0.0.1:4173 PID1204. No listener at 4226-4228 in read-only snapshot.

## Historical failures retained
- P24_SOURCE_BOUND_SIDECAR_RED: expected missing module.
- P24_STAGE_FIRST_GREEN filename misleading: actual RC1 4 pass/1 fail, synthetic fixture initially all-zero.
- P24_INDEPENDENT_HIDDEN_FIELD_SOURCE_VALID_RED: real source weakness subsequently fixed.
- Worker-35 initial partial-public-resolver NO_GO fixed by making resolver private.
- P24_GUARDED_APPLY_DRYRUN_20261117.json is STALE (old 587 tests/hash); actual guarded apply used dryrun V2. Do not rewrite old evidence.

## NOT IMPLEMENTED / NOT_YET_VERIFIED
- Browser import/export and archived LCD reconstruction; current browser never imports P24 module. No new Chrome run was justified by P24's pure API scope.
- Historical provenance of arbitrary imported envelope/sidecar; OEM pixel-level calibration and firmware/physical hardware conformance.
- P23 Python 13/13 and Chrome validations remain prior source-bound evidence only, not new P24 reruns.
- Do not call the deterministic 0.75 Bottom Zoom fraction an exact OEM pixel measurement.

## HOLD
Phase6 OPEN, 65/65 public claims HOLD, OEM rights unresolved, installed firmware UNKNOWN, hardwareValidated=false, releaseApproval=HOLD. No real vessel IO, package, release or browser integration performed.

## Evidence
- Parent P23 final/postreceipt checked against SHA; P24 guarded apply, stage focused/full Node, canonical full Node, canonical archived-file readback SHA all checked; consolidated machine-readable manifest in the companion FINAL_INTEGRITY JSON.
- P24 implemented API: src/devices/fcv588/archive-compat.mjs. Replay envelope v7 unchanged. Test: test/fcv588-p24-zoom-archive.test.mjs; frozen fixture exact SHA pinned.

## Next bounded proposal — P25
Only after choosing a separate milestone: design offline browser archive import/replay UI with strict schema validation, explicit presentation-contract selection and isolated Chrome QA. Do not infer historical provenance from fingerprint or silently pick P04/P23 from profileRevision/timestamps. Alternatively prioritize manual-backed visual conformance if the objective is tighter OEM appearance.
