# V31 — integrated transactions, compatibility and basic-control LCD

Date: 2026-10-16. Workspace: `C:\Work\MoPhongMayTrenTau`.

**Disposition: IMPLEMENTED WITH SCOPED EVIDENCE; OPERATOR CHROME 284/284 PASS;
LATEST TARGETED NODE 52/53; FULL REGRESSION / ADVICE / RELEASE HOLD.**
This is substantial work under the existing v2 plan, not a new plan, FINAL
checkpoint, whole-project completion, OEM conformance or release approval.

## 1. Recovery and preservation

Before edits, the current 34-file runtime and five V30 receipts/harnesses
matched the V30 manifest exactly:
`99097efbccc12d8538a041643f22b22d268dadb3e24d9ec9acbc6f718d4c1117`.
The actual seven phase files contain 50 checkboxes, 14 checked, and 22 named
Tasks. Historical V28/V29/V30 runs and screenshot reviews were not repeated.

Recovery record: `docs/qa/FCV588_V31_RECOVERY.json`, SHA-256
`6b44cb779aa05f8b9ae323b75b204c34ff2a954bcf1cf49eea5000372318b561`.
Selected source/docs were backed up before edits in
`reports/v31-before-source-and-docs.zip` (125 files), SHA-256
`95c65eac61224dfd5f3258199c1d79a7affa8db78618f9bab1291055cc2d9cd8`.

The existing loopback server was reused; no restart, dependency install,
Git operation, public deployment, physical interface or permission change
was performed. Node22.22.0, Python3.11.5 and Chrome155.0.8059.41 were observed.

## 2. Integrated changes

### Transaction lifetime and capability changes

V30-B was fixed in the canonical reducer, not hidden in another UI counter.
Reconciliation uses stable main-menu IDs and Installation setting keys. A
disabled/invalid active entry cancels its draft, editing flag and owner even
when the list of rows has not changed. Regrant does not revive the canceled
draft; ENTER starts a new edit from the committed value.

The same invariant applies when POWER-hold temporarily wraps priorOverlay,
when the instructor withdraws a compatible virtual mount, and after a world
tick changes capability conditions. Unrelated valid Units/Calibration drafts
are retained. Installation also validates ownership and current choices on
commit and handles missing entries without committing to another field.

This fixes the analogous editable-draft gap for ACCU-FISH, RezBoost and Bottom
Discrimination. It does not add a hardware capability or change sonar logic.
The existing rule that revoking the declared Tankenmaru option forces its
canonical preference Off is preserved; other committed settings survive.

### Alarm notices

V30-E is corrected for ALARM1 through ALARM5. Enabling/disabling a profile
reports `ALARMn / Alarm = On|Off`; editing Bottom From reports that threshold.
The profile switch no longer produces a misleading Bottom From notice.
Threshold values, conjunction/cause/ACK logic and V30's effective Canvas alarm
projection are unchanged. Actual alarm banner pixels and immediate removal
after committed Off were checked by the new Chrome journey.

### BRILL inactivity and basic-control LCD

Recognized BRILL TrackPad adjustments restart the existing six-second
training inactivity interval, including a clamped boundary adjustment. A
change at 5900 ms no longer closes after only another100 ms. The timer is
still recorded UI time, not the world clock or a new independent timer.

Range, Auto Gain, BRILL and MODE now use a compact original semantic LCD
projection with selected rows, current/pending values and specific help.
Range/Gain use ENTER save and MENU cancel. BRILL keeps its existing ENTER
or MENU save behavior and live brightness preview. MODE still uses rotary
selection/automatic timeout and MENU cancel; ENTER is not falsely advertised
as an implemented commit. No MODE transition was invented to match a tooltip.

The control summary is distinct from V30's persisted-setting transaction
summary. It does not claim that volatile Range/Gain/MODE/brightness controls
are persisted by schema18. Summary children/datasets are cleared for each
new overlay. V29 FUNC and V30 configuration renderers are preserved.

### Reset persistence

Independent review discovered an app-local bookkeeping bug in teacher reset:
a fresh session correctly lost its option grant, but the next unrelated input
could rewrite the stored On preference as Off because lastObservedSettings
still described the previous session. The browser RED reproduced this in both
System and Installation journeys. Reset now synchronizes the observation
baseline after canonical restore without calling setItem. Original storage
bytes survive reset and the tested non-setting key; a later real committed
setting change may serialize the new canonical state normally.

## 3. Deliberate compatibility boundary

The runtime profile advances from `F1-public-reference-19` to `-20`. Settings
schema18/storage key18, core7/event5/replay envelope7/scenario7/multi4 and all
setting choices/units/meaning remain unchanged. Profile19 replays are rejected
under profile20; no event log is silently remapped or reinterpreted.

An explicit, separately named decoder imports only exact profile19/schema18
committed settings after checking the original envelope shape, fingerprint,
class, profile and every setting. Normal decode remains strict to profile20.
No menu drafts, events or instructor option grants are migrated. The ship
`settings.draft` remains a legitimate setting, not a transaction draft.

Startup restores these values through an actual logged restore-settings event
and leaves localStorage's original bytes untouched. The first later committed
setting change writes the profile20 envelope. A saved Tankenmaru On never
implies an option grant; a fresh session applies its existing fail-closed Off.

Actual old-profile replay/settings fixtures were captured and hash-pinned
before code edits. See `FCV588_V31_LEGACY_FIXTURE_CAPTURE.json` and
`v31-scope-and-compatibility.md`. Their tests and native storage-reload journey
passed in the observed scopes; full migration/whole-project acceptance remains
separate from these targeted results.

## 4. Actual tests — no aggregate PASS inflation

| Execution | Observed result | Scope |
| --- | --- | --- |
| Initial V31 state/compatibility RED | 20 expected fails, 7 passes; exit1 | V30-B/E, capability draft loss, BRILL idle, new profile/legacy decoder contracts |
| State/compatibility GREEN plus existing basic/persistence tests | 42/42 PASS; exit0 | Before the later control UI and reset bookkeeping fix |
| New operator Chrome RED | 56 fails, 228 passes; exit1 | Missing basic-control UI/help and reset persistence; canonical fixes were already passing characterizations |
| New operator Chrome GREEN | 284/284 PASS; exit0 | 71 checks at each required viewport, final current runtime |
| Latest control/transaction/FUNC/config Node run | 52 PASS, 1 FAIL, 0 skipped; exit1 | Uncorrected Auto fixture expects a Manual preset conversion |
| New module and app syntax checks | exit0 | Not equivalent to full Node regression |
| New Python browser probe compilation | exit0 | Not the Python integrity/atlas suite |
| Implementation generator and its check | write then check exit0 | Profile20 metadata; all65 claims HOLD |
| Existing menu generator check | exit0 | Menu source choices unchanged |

No full `npm run check`, V31 Python13 suite, full desktop/mobile Chrome suites,
or complete V31 rerun of the historical FUNC/configuration/LCD probes occurred
after the current profile change. Their V30 PASS values are historical and
cannot certify the V31 runtime.

The operator GREEN run was launched before the unexpected Node failure output
arrived. It completed normally, without concurrent runtime writes. It does
not erase that failure. All12 current screenshots were opened: Range, BRILL
and MODE at1366x768,1920x1080,360x800,390x844. Three RED1366 screenshots were
also opened. Gain had DOM assertions but no separate saved screenshot.

The Chrome harness uses native click/tap/keyboard holds, typed isolated
contexts and real pixels. Its only storage fixture setup is explicitly
identified as an old committed-settings import, not a physical operator
action or direct application-state injection. All contexts/browser instances
were closed by the completed runner; the pre-existing server remains running.

## 5. Source-bound evidence

Current35-file runtime, confirmed against the GREEN receipt and live loopback:

```text
eed901f4d12c4f7e61ff1825b3898c412428cd8c4210c1f2d5b14050503dbe36
```

Each GREEN viewport completed71 checks and SHA-verified132 actual response
bodies over33 distinct paths, including the intentional reloads. Browser
errors were empty; runtime and harness hashes remained stable. RED/GREEN used
the same probe, shared verifier and old-settings fixture hashes.

| GREEN viewport | Actual browser body aggregate SHA-256 |
| --- | --- |
| 1366x768 | `cf29602dd65e93347fb13fe64e78a4c01386b4d04e4c5c0ba2b3d304b7ff03d3` |
| 1920x1080 | `da925da7bcecc91b033a3c10dd7e51be7eee2ba557a55016e61c83220a899e10` |
| 360x800 | `3f0445d43408f0028ee761a279e7bd912131e11e33b5d35110dd56020d127992` |
| 390x844 | `71382c4fb083bb8fe873201c92420ee05a1c09c26e7871946fba9ce1e937c42c` |

Evidence summary: `docs/qa/FCV588_V31_EVIDENCE_SUMMARY.json`, SHA-256
`a56522b51022a83ac845264e3f35053be6c44400d2063e460e0ae64aadb27372`.
GREEN receipt SHA:
`a99ba9173406cce964bcfb3d54c1d531431e575187f8ad29f83dfd30103e3b20`.

Runtime changes: `src/devices/fcv588/{model,profile-version,settings}.mjs`,
`web/{app.mjs,index.html,styles.css}`; added `web/lcd-control-presentation.mjs`.
No runtime file was removed. Source hashing confirmed unchanged core modules,
sonar/alarms/menu/navigation/capability algorithms, V29/V30 presentation modules
and physical input bindings. White Line remains Off/On.

## 6. Remaining Verify gate

The latest targeted Node run's failing new fixture never stages Manual before
expecting the preset200 m conversion to656 ft. Independent static review
confirmed that the actual Auto text is correct. The proposed test-only
correction has not been applied because the phase Failure Protocol requires
Kongming counsel for unexpected failed Verify checks.

Read-only native CLI discovery found the Kongming name in the Codex runtime
inventory, but no callable connected delegate was exposed and definition/model
access was not verified within approved folders. An out-of-root definition
read was rejected; no alternate read, bridge, registration or installation was
used to work around it. Kongming invocation is NOT_EXECUTED, not absent by
assertion and not replaced with a relabeled ordinary worker. See
`v31-failure-counsel-packet.md` for the exact command/output and next action.

The scope-level B/E fixes are implemented with targeted evidence; integrated
acceptance remains open until the failed fixture and mandatory full regression
are resolved through the allowed gate. No runtime/test fixes followed the
unexpected failure. Later writes are factual evidence/documentation only.

## 7. OEM/source and documentation disposition

Existing curated operator notes, especially FCV-T02 §1.3 inactivity and the
Range/Gain/MODE contracts, were the basis for the control work. The current
official FCV588 product page corroborates conditional Bottom Discrimination
availability; it does not prove cancellation semantics, exact timings or
pixel coordinates. New focused search did not supply further exact operator
details. No new restricted PDF content, OEM image, firmware or video frame
was processed or imported.

The UI remains original training geometry. Precise physical controls/fonts/
colors/timing, installed firmware/transducer and acoustic equivalence are not
verified. D04 language is unimplemented; C11/D09/D14 remain partial. Optional
Tankenmaru is still a synthetic fixture, not RF transport. No hardware input,
output or partner display is present.

V30's missing ledger metadata and two bad checklist-report links have now
been written and read back successfully through a new authorized continuation.
The original blocked V30 operation stays NOT_EXECUTED in history. A separate
V31 assessment covers all50 criteria and22 Tasks; no checkbox is promoted.
Canonical acceptance stays14/50,6/22,Phase1 alone accepted and all65 claims HOLD.

**Next execution priority P0:** resolve V31-QA-01's counsel gate, correct only
the diagnosed Manual fixture, then run the complete affected/full Node and
four-viewport regression matrix with fresh receipt/source/harness evidence.
That sequence is proposed, not executed or promised in the background.
