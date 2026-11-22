# V31-QA-01 — exact failure and counsel boundary

Date: 2026-10-16. State: **OPEN / AFFECTED VERIFY STOPPED**.
This packet is not a replacement plan, a test repair, or supervisor approval.

## Failed Verify

Phase 2, Task 2.3: integrated basic-control LCD and Range display-unit regression.

The command actually executed was:

```powershell
node --test test/fcv588-public-control-presentation.test.mjs test/fcv588-public-v31-transactions.test.mjs test/fcv588-public-func-presentation.test.mjs test/fcv588-public-config-presentation.test.mjs test/fcv588-public-config-review.test.mjs
```

Complete retained output: `docs/qa/FCV588_V31_CONTROL_UNIT_GREEN.log`.
SHA-256: `93cf5389a6f3fad2dc4c5f420ea2f0943f3e7d85e3831a39589a8a938064f4c9`.
Result: exit 1, 53 tests, 52 passed, 1 failed, 0 skipped.

Failure: `test/fcv588-public-control-presentation.test.mjs:31-35`.
The test named "Range formatting reads existing configured meters and current
depth unit without changing storage" expects `/656 ft/`, but receives
`Auto (thang tự động)`.

The fixture calls `key(boot(),"range")`, then changes a cloned state's units
to Feet and rangePreset4 to 200. It does not stage Manual with TrackPad right.
The actual reducer opens the current Auto state. The new presentation
intentionally does not present a manual preset as the active Auto range.

## Independent read-only diagnosis — not Kongming

The actual existing CoS worker read the retained log and current code. It
confirmed a test-fixture mismatch, not a demonstrated product defect:
`openRange` preserves current Auto; the normal TrackPad-right transition
stages Manual; only Manual's projected text formats the chosen preset.

Its proposed correction, **not applied**, is to drive the real reducer path
with `pad(key(boot(),"range"),"right")`, explicitly assert draftValue
`manual:3`, then assert the converted `656 ft` text. Do not modify the product
to expose a manual preset in Auto merely to make this assertion pass.

The worker also found no new concrete defect in the basic-control help,
summary cleanup or the already-applied reset persistence bookkeeping fix.
Coverage suggestions remain: control-summary cleanup transitions, additional
POWER/tick non-setting storage checks, and tick-driven wrapped BDS loss.
These are not executed tests or new verified bugs.

## Required counsel discovery and actual outcome

The phase's unchanged Failure Protocol requires Kongming counsel before
repairing/rerunning this unexpected failed Verify. The available native
installed binary was observed as `ak 3.0.0-beta.24`.

Read-only discovery actually ran and exited 0:

```powershell
ak --version
ak --help
ak agents --help
ak run --help
ak codex-agent-runtime --help
ak agents list --help
ak agents list --json --no-interactive
ak codex-agent-runtime serve --help
ak codex-agent-runtime serve --list-only --json --no-interactive
```

The ordinary installed-agent inventory returned an empty agents array, while
the Codex runtime discovery listed 16 agent names, including `kongming`.
These are different inventories; the empty array does not prove Kongming is
absent. A connected-tool discovery for `kongming` exposed no callable tool.
An attempted native read of the conventional user-agent definition path was
rejected because it is outside the approved folders. No alternate file-read
route, source copy, permission change, agent installation, runtime bridge or
MCP registration was attempted to work around that rejection.

**Kongming: NAME DISCOVERED; DEFINITION/MODEL/INVOCATION NOT VERIFIED;
COUNSEL INVOCATION NOT_EXECUTED.** The ordinary CoS reviewer was not relabeled
as Kongming. No Fable/Astra tier execution or gate approval is claimed.

## What stopped, and what completed separately

No test or runtime correction was made after this failed Verify was received.
The failing fixture and raw log are preserved. Full Node, Python regression,
the existing full Chrome suites and V31 reruns of the V29/V30 probes were not
started after the failure. They remain NOT_EXECUTED for the V31 source.

The new operator Chrome GREEN probe had already been launched before the
Node failure output was delivered. It completed 284/284 assertions across
the required four viewports without runtime changes during the run. Its
receipt is retained as scoped evidence, not as a substitute for this failed
unit verification. Subsequent work only inspected existing images, reconciled
source/receipt hashes and documented actual results and remaining gates.

## Next authorized action

Obtain counsel through an approved, verifiable Kongming route, or an explicit
user decision changing this plan's supervisor requirement. Then apply the
diagnosed test-only Manual fixture correction, retain the first failed log,
rerun the affected check under a new evidence name, and complete the required
full integration regressions. This proposed sequence has not executed.
