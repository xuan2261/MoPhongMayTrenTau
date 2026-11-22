# P14 — Independent final V2 all-historical source gate

Date: 2026-11-16  
Reviewer: worker-21  
Mode: READ-ONLY independent source/evidence review  
Stage: `C:\Work\MoPhongMayTrenTau\_p14_stage_20261116`

## Final verdict

**CANONICAL APPLY: GO.**  
**ALL-HISTORICAL PROFILE21 REPLAY + DEVICE-LCD MENU SEMANTICS: GO.**  
**ACTIVE PROFILE22 / AP-1 PATH: GO.**  
**RELEASE / OEM / HARDWARE CLAIMS: HOLD.**

No concrete source blocker remains for the guarded P14 canonical apply under the all-historical scope established by this phase.

The two blockers from `P14_FINAL_REEVALUATION_20261116.md` are now closed in source, not merely masked by tests:

1. the legacy profile21 reducer no longer reaches active profile22 menu semantics through navigation or the other reviewed device-semantic dependencies;
2. historical main-menu LCD projection now dispatches by explicit profile revision and rejects unsupported revisions.

The gate is conditional only in the normal preimage-guard sense: apply must use the reviewed 38-path allowlist against the exact canonical preimages and stage hashes. This GO is **not** release approval and does not change F1 PUBLIC_REFERENCE limitations, firmware status, hardware validation, or rights HOLD.

## 1. Evidence rehash

The supplied final artifacts rehash exactly:

- full Node final: `P14_STAGE_FULL_NODE_ALL_HISTORICAL_V3_20261116.txt`  
  SHA-256 `72bfeefc7647d4823850c7acc53d0e88003c96379f8aef0f091fa8c8cb429350`  
  result: **577/577 PASS, 0 fail, 0 skipped/todo**;
- Python final: `P14_STAGE_PYTHON_ALL_HISTORICAL_V2_20261116.txt`  
  SHA-256 `2f5a3f61ac2a5874edaedbf6516269de18c251e44faa5ff4124d8bdaa45579a0`  
  result: **13/13 OK**;
- Chrome final: `P14_STAGE_CHROME_ALL_HISTORICAL_V4_20261116.json`  
  SHA-256 `895420e2de501648719729807700fa75ecaddc9f1cb01af736091311875f95d0`;
- runtime50 seal: `P14_STAGE_RUNTIME50_PREAPPLY_INTEGRITY_20261116.json`  
  SHA-256 `29890c775bac1ba8785dd87b8adfb7d67be9fdfdbcb973cff67fe77ed0c76dff`;
- guarded preimage backup ZIP: `P14_GUARDED_PREIMAGE_BACKUP_ALL_HISTORICAL_V2_20261116.zip`  
  SHA-256 `b2b2c8ecdd55f7dc96506ef988506420274d0f1b9ea4e7fde788ff029eb5b747`.

I independently executed the read-only guarded dry-run script `p14_guarded_apply_dryrun_all_historical_v2.py`. It returned **PASS**, with:

- 38 allowlisted changed paths;
- 17 modifies;
- 21 creates;
- exact backup ZIP SHA;
- exact runtime50 seal SHA;
- exact browser receipt SHA;
- canonical user server observed only as `127.0.0.1:4173`, PID 1204;
- `applied:false`.

The dry-run script performs only file/hash/ZIP/preimage checks and listener inspection. It does not mutate canonical or stage and sends no network request.

## 2. Exact runtime50 inventory

The runtime50 receipt contains **50 runtime rows**. Fresh independent readback of every row against `_p14_stage_20261116` is **50/50 exact SHA match**.

The seal records:

- canonical baseline runtime count: 39;
- new served runtime count: 11;
- changed existing runtime count: 6;
- canonical apply: `NOT_APPLIED`;
- hardware validated: `false`;
- installed firmware: `null`;
- rights clearance: `false`;
- release approval: `HOLD`.

The five V2 archive additions that close the former transitive blocker are sealed in runtime50:

- `alarms-profile21.mjs` — `8a47fd2cec411077fcc670a29c6260298a4662f627c44cda2271f42b0f241b7b`
- `calibration-profile21.mjs` — `b62432a2ef05aee299d1bc95645b55377f6a424009dd1e701a60fc4901b13d06`
- `capabilities-profile21.mjs` — `589ff3e711277468465e4cbe45943be234be767a85ed4dfd5539a52a9b7182db`
- `navigation-profile21.mjs` — `579fda7b401a6ecbda81a7bdd58b4057c5c7ba41fbdec03ff4ee9f5af1c8c37f`
- `units-profile21.mjs` — `287cab7b52fc296d64af41bed1601e65ef232e9890bdf0d3b554ed7ab4bf5f21`

The previously present archived modules are also sealed, including legacy adapter, menu, model, revision, replay router and settings codec.

## 3. Profile21 transitive dependency closure

The previous NO_GO was correct because `model-profile21.mjs` imported shared `navigation.mjs`, which in turn imported NAV constants from the active atlas.

That path is now closed.

Fresh source inspection shows:

```text
adapter-profile21.mjs
  -> model-profile21.mjs

model-profile21.mjs
  -> menu-atlas-profile21.mjs
  -> alarms-profile21.mjs
  -> navigation-profile21.mjs
  -> settings-profile21.mjs
  -> profile-version-profile21.mjs
  -> calibration-profile21.mjs
  -> units-profile21.mjs

navigation-profile21.mjs
  -> units-profile21.mjs
  -> menu-atlas-profile21.mjs

alarms-profile21.mjs
  -> navigation-profile21.mjs

menu-atlas-profile21.mjs
  -> capabilities-profile21.mjs

settings-profile21.mjs
  -> menu-atlas-profile21.mjs
  -> profile-version-profile21.mjs
  -> calibration-profile21.mjs
  -> units-profile21.mjs
  -> shared core protocol fingerprint only
```

The semantic archive is therefore no longer dependent on the active profile22 menu atlas for NAV behavior.

Independent canonical-vs-archive diffs are appropriately narrow:

- archived adapter differs from canonical profile21 adapter only by importing `model-profile21.mjs` and exporting the legacy symbol name;
- archived model differs from canonical profile21 model only by rebinding the six reviewed device-semantic imports to profile21 modules;
- archived navigation differs only by rebinding units/menu imports to profile21 modules;
- archived settings differs only by rebinding menu/revision/calibration/units imports;
- archived menu atlas differs only by rebinding capability resolution to `capabilities-profile21.mjs`;
- archived alarms differs only by rebinding navigation to `navigation-profile21.mjs`;
- archived calibration, units and capabilities are byte-identical copies of the canonical profile21 originals;
- archived profile revision is byte-identical to canonical `F1-public-reference-21`.

This closes the concrete transitive NAV blocker found in the prior review without changing historical profile21 state shape, event shape or adapter profile hash.

## 4. All six frozen profile21 replay fixtures

All six stage fixtures rehash exactly to both the runtime50 seal and their separate write-once QA copies.

| Fixture | Byte SHA-256 | Events | `meta.profileHash` | Final session hash | Content fingerprint |
|---|---|---:|---|---|---|
| Selection | `d795b05494618c2e4482598b1e98a65e63bb9aa67e367bf266782e66d1a803dd` | 9 | `f0-fnv1a32-f2d5289b` | `f0-fnv1a32-b7e35e70` | `f0-fnv1a32-b93e124e` |
| Editing | `07553d5bb42e0830e5938f9b1879fbed74a621634f3c5b194e2ce38ae18412dd` | 10 | `f0-fnv1a32-f2d5289b` | `f0-fnv1a32-138abeb4` | `f0-fnv1a32-336863c3` |
| NAV1 | `a6086514bd01985178c006213e255d7d50afe4696266994a4ad0c73a5e87346b` | 13 | `f0-fnv1a32-f2d5289b` | `f0-fnv1a32-3e46462e` | `f0-fnv1a32-460d29de` |
| NAV2 | `da97774bb74ace7d55687eccabf30fc792cac9d5ffdb6290a7d14bae6ce34798` | 14 | `f0-fnv1a32-f2d5289b` | `f0-fnv1a32-37f4868c` | `f0-fnv1a32-d24577ef` |
| Data Source | `c35fff983ab301b7efd6db771cdf6e8b92e1dda551930b81174d05ac4ee6953c` | 17 | `f0-fnv1a32-f2d5289b` | `f0-fnv1a32-ecc515d3` | `f0-fnv1a32-df56c9d2` |
| NMEA committed | `b7d844b666e9309822decdc3b92eb8b86e333403a544816cbf937fd95560fc7a` | 19 | `f0-fnv1a32-f2d5289b` | `f0-fnv1a32-ef61e8e1` | `f0-fnv1a32-80843fcc` |

Every fixture declares exactly `F1-public-reference-21`.

The final Node log shows all six fixture regressions PASS. The four new NAV/Data cases additionally prove:

- NAV1 committed third box remains `DEPTH` and projects the expected three labels;
- NAV2 preserves `SPEED (STW)` and historical waypoint `WP001`;
- Data source cursor retains semantic ID `data.tripSource`;
- committed NMEA trip source remains `NMEA` and, without receiver data, historical NAV2 TRIP remains `NO DATA` rather than leaking Own data.

Each old envelope replays through the legacy adapter with its exact old session hash and is rejected by the active profile22 adapter at the profile/contract boundary.

The two original Sounder fixtures are unchanged from the previous verified byte SHAs and still preserve `sounder.whiteMarker` selection/edit target.

## 5. Historical LCD presentation is revision-aware

The former presentation blocker is closed for the device main-menu LCD path.

`web/lcd-presentation.mjs` now imports both active and archived menu providers plus the active profile revision. Its main-menu projector is:

```js
projectFcvMainMenu(state,{profileRevision=FCV588_PUBLIC_PROFILE_REVISION}={})
```

and dispatches:

- `F1-public-reference-21` -> archived profile21 menu provider;
- current active revision (`F1-public-reference-22`) -> active AP-1 menu provider;
- any unsupported revision -> throws `TypeError("unsupported FCV-588 presentation profile revision")`.

The default remains active22 for the normal live application, preserving existing callers.

Two dedicated historical presentation tests are green:

1. the same numeric Sounder cursor resolves to White Marker under profile21 and Clutter under profile22, while an unsupported revision is refused;
2. the frozen profile21 selection envelope is replayed first, then rendered using `restored.profileRevision`, and the selected LCD row is exactly `sounder.whiteMarker`, explicitly not Clutter.

This is the source-level correction required by the prior NO_GO. It does not mutate historical state or add a discriminator into the profile21 session hash.

Non-blocking scope note: `lcd-instructor-meta.mjs` remains an active/current-session instructor projection and is not wired into the archived replay presentation path. The reviewed all-historical LCD contract here is the device main-menu presentation that previously reinterpreted the numeric row. If a future feature promises historical reconstruction of instructor-only metadata, that feature should receive the same explicit profile dispatch before being claimed compatible.

## 6. No weakening of canonical tests

Fresh inventory:

- canonical test modules: **90**;
- stage test modules: **94**;
- canonical test modules removed: **0**;
- added P14 modules: **4**:
  - `fcv588-p14-frozen-historical-fixtures.test.mjs`
  - `fcv588-p14-frozen-nav-replay.test.mjs`
  - `fcv588-p14-historical-presentation.test.mjs`
  - `fcv588-p14-versioned-menu-replay.test.mjs`
- canonical test modules modified: **9**, exactly the already reviewed profile-revision/rebaseline set.

Assertion-count comparison for those nine files is non-decreasing:

```text
fcv588-p04-bottom-provenance.test.mjs          35 -> 35
fcv588-public-lcd-presentation.test.mjs        46 -> 52
fcv588-public-persistence.test.mjs             30 -> 30
fcv588-public-v31-compatibility.test.mjs       25 -> 25
fcv588-v43-oem-brill-triangle.test.mjs         36 -> 36
fcv588-v44-brill-pad-contract.test.mjs         52 -> 52
fcv588-v46-colors-oem-firmware-boundary.test.mjs 32 -> 32
fcv588-v47-white-marker-firmware-boundary.test.mjs 43 -> 46
fcv588-v49-a11y-boundary.test.mjs              24 -> 26
```

Direct diff inspection confirms:

- six equal-count files only advance the active-profile expectation from 21 to 22 where appropriate;
- LCD presentation replaces stale numeric Sounder positions with semantic-ID navigation and adds selected/edit-entry assertions;
- V47 replaces numeric White Marker/unrelated row positions with semantic IDs and adds exact identity checks;
- V49 replaces hidden `itemIndex:5` dependence with semantic White Marker lookup and strengthens the instructor cue to exact firmware-unknown status.

The V2 additions contribute the four frozen NAV/Data tests and two historical presentation tests; final suite growth from 571 to 577 is exactly consistent with those six new tests.

## 7. Browser evidence

Fresh parsing of `P14_STAGE_CHROME_ALL_HISTORICAL_V4_20261116.json` gives:

- checks: **10/10 PASS**;
- source bodies: **82 per viewport**;
- loaded body rows: **164/164 exact SHA match**;
- page errors: **0**;
- receipt errors: **0**;
- AP-1 Sounder 13-row order: PASS at 375x812 and 1366x768;
- legacy profile21 settings raw retention at boot: PASS at both viewports;
- eight OEM reference JPEG URLs: **8/8 HTTP 404**;
- test-owned port server cleanup: PASS / `serverExited=true`.

This review did not run or control a browser.

## 8. F1 / HOLD boundary remains intact

The active revision is `F1-public-reference-22`; archived replay remains `F1-public-reference-21`. Neither identifier is an installed firmware claim.

Stage evidence remains explicitly bounded:

- `docs/evidence/device-register.json`: FCV profile22, implementation status `F1_PUBLIC_REFERENCE_PARTIAL`, release `HOLD`;
- `docs/evidence/fcv588-public-implementation-status.json`: `profileClass:"PUBLIC_REFERENCE"`, profile22, `hardwareValidated:false`, `firmwareInstalled:null`, `rightsClearance:false`, `releaseApproval:"HOLD"`, real hardware equivalence `OUT_OF_SCOPE_HOLD`;
- implementation claims throughout the status ledger remain `HOLD`;
- White Marker choices remain disclosed as a simplified training preview rather than verified OEM enum/firmware behavior;
- original reference JPEG rights remain reference-only and the browser gate verifies they are not served.

Therefore canonical apply does not promote P14 into hardware validation, installed-firmware identification, OEM visual equivalence, redistribution rights, or release approval.

## 9. Guarded apply safety

The revised allowlist/backup contains exactly **38 changed canonical paths**:

- 17 modify operations with exact canonical preimage SHA/bytes;
- 21 create operations that must not already exist canonically.

The backup ZIP contains the manifest and exact preimages for the 17 modifications; the independent dry-run verifies ZIP CRC/content, canonical preimages, stage target hashes, create-path non-collision, evidence SHAs, original reference files, and the protected server ownership without applying anything.

Dry-run result observed by this reviewer:

```json
{"dryRun":"PASS","fileCount":38,"modifyCount":17,"createCount":21,"preimageZipSha":"b2b2c8ecdd55f7dc96506ef988506420274d0f1b9ea4e7fde788ff029eb5b747","stageSealSha":"29890c775bac1ba8785dd87b8adfb7d67be9fdfdbcb973cff67fe77ed0c76dff","browserSha":"895420e2de501648719729807700fa75ecaddc9f1cb01af736091311875f95d0","userServer":{"LocalAddress":"127.0.0.1","LocalPort":4173,"OwningProcess":1204},"applied":false}
```

## 10. Exact gate table

| Gate | Decision |
|---|---|
| runtime50 inventory / source freeze | **GO — 50/50 exact** |
| Node final | **GO — 577/577** |
| Python final | **GO — 13/13** |
| Chrome final | **GO — 10/10, 164/164 bodies** |
| original two Sounder historical fixtures | **GO — exact old bytes/hashes unchanged** |
| NAV1 historical replay | **GO** |
| NAV2 historical replay | **GO** |
| Data-source historical replay | **GO** |
| committed NMEA historical replay | **GO** |
| profile21 transitive NAV/menu dependency | **CLOSED / GO** |
| profile21 alarms/calibration/units/capabilities archive binding | **GO** |
| historical device-LCD main-menu semantics | **CLOSED / GO** |
| unsupported presentation revision | **FAIL-CLOSED / GO** |
| test weakening | **NO** |
| profile22 AP-1 current path | **GO** |
| F1 PUBLIC_REFERENCE / release boundary | **PRESERVED; RELEASE HOLD** |
| guarded backup + dryrun | **GO** |
| canonical apply | **GO** |
| release | **HOLD** |

## Final decision

**Independent CANONICAL APPLY GO** for the exact P14 V2 staged bytes and the exact 38-path guarded allowlist/preimage set reviewed here.

There is **no concrete blocker** remaining in the requested all-historical profile21 replay/device-LCD scope. The earlier NAV transitive and historical LCD blockers are source-fixed and covered by pinned historical fixtures plus dedicated regressions.

After apply, the appropriate next gate is a post-apply readback/integrity seal proving canonical bytes equal the reviewed stage/allowlist and re-running the bounded acceptance checks. That post-apply seal is not a prerequisite for this pre-apply GO; it is the evidence required to prove the apply was executed exactly as authorized.

Release remains **HOLD**.
