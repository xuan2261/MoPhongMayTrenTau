# V55-B — POWER hold / accessibility integration QA, source-bound only

Date: 2026-10-22 (Asia/Bangkok). Canonical root: C:\Work\MoPhongMayTrenTau.

## Decision and authority

**Result: SCOPED_SOFTWARE_QA_PASS; REAL_WINDOWS_ACCESSIBILITY_NOT_RUN; PHASE6_OPEN.**

Use the canonical F1 PUBLIC_REFERENCE Phase 6 contract, V54 scoped
integrity/postreceipt, and V55 readiness attempt 2. The new V55-B test
exercises the real production JavaScript hold adapter, session dispatcher,
device reducer, and replay envelope **but supplies synthetic Node EventTarget
events**. It is **not** real OS focus transfer, Narrator/NVDA spoken audio,
hardware/firmware verification, or independent manufacturer review.

No application runtime code, accepted feature ledger, source permissions,
system configuration, or previously sealed receipts were changed.
No backup was attempted. No access to the prohibited D: drive occurred.

## Source preflight

The following were rehashed from the live C: workspace:

| Input | Observed |
| --- | --- |
| V50 final and independent post SHA | MATCH / MATCH |
| V54 scoped integrity and independent post SHA | MATCH / MATCH |
| V55 original invalid JSON attempt and validated attempt 2 SHA | MATCH / MATCH; original failure preserved |
| Historical parent files recorded in V54 | 9/9 MATCH |
| Canonical runtime sources recorded in V54 | 37/37 MATCH |
| V54 evidence files | 25/25 MATCH |
| package.json SHA (before/after regression) | b91f5ac1f49e6003c247c4ebac8296e257ee96b7f9e35828e6e27b0ae3d1b6d0 |

## V55-B software QA performed on C:

| Check | Invocation | Result | Boundary |
| --- | --- | --- | --- |
| New synthetic cross-layer hold bridge | node --test docs/qa/FCV588_V55B_SOURCE_UNIT_20261022/v55b_hold_bridge.test.mjs | 5/5 PASS, exit 0 | Fake EventTarget, not genuine OS blur or screen reader |
| Existing focused POWER/ARIA regression | node --test test/hold-input.test.mjs test/fcv588-public-basic.test.mjs test/fcv588-v49-a11y-boundary.test.mjs | 21/21 PASS, exit 0 | Application-owned lower-layer semantics |
| Full Node syntax and tests | npm run check | 511/511 PASS, exit 0 | Software regression only |
| Python unittest | python -m unittest discover -s test -p test_*.py -v | 13/13 PASS, exit 0 | Software/tool regression only |

The new runner proves five **synthetic/unit** event sequences:

1. Blur-like cancellation during a held POWER after a 1,250 ms UI tick
   emits exactly down/cancel, leaves power on, clears the held control,
   and creates a replay-equivalent session.
2. A prior BRILL preview is restored on cancel, even when repeated
   synthetic blur/cancel events arrive.
3. Button focus loss before keyboard keyup produces exactly one cancel.
4. A synthetic stand-in for native assistive click emits one short
   down/up pair and is replayable.
5. A non-cancelled pointer release at 3,001 ms produces the separately
   expected power-off transition and is replayable.

Node v22.22.0 and Python 3.11.5 were observed. The runner's SHA was
checked before execution, and the same SHA was observed immediately after.
All four run logs are separate, write-once files in this directory.

## Real QA environmental gate, observed

Local Windows version was observed as NT 10.0.18363.0, session 1,
physical-system model ASUS Z10PA-D8 Series. The system did not report an
active hypervisor; Windows Sandbox, Hyper-V and VirtualMachinePlatform
optional features were Disabled. The local WindowsSandbox.exe was absent.
Narrator.exe existed but Narrator was not running; no running NVDA process
or NVDA command was observed. No authorization document or verified
independent QA-VM session was identified by this preflight.

**No OS-level tests were executed:** the active session cannot be treated as
an approved isolated accessibility QA host. We did not enable Windows
features, install dependencies, start a screen reader, steal desktop focus,
or inject fake blur into Chrome and describe it as genuine.

Recorded test status:

- Actual spoken Narrator/NVDA utterance and audio capture: **NOT_RUN**.
- Actual Windows/Chrome window.blur during held POWER: **NOT_RUN**.
- Cancellation/replay after such an actual OS focus-loss event: **NOT_RUN**.
- New V55-B attached-native viewport acceptance: **NOT_RUN**.
- Independent instructor/human/OEM review: **NOT_OBTAINED**.

## V55-B real Windows QA protocol — prerequisites for next execution

This is a protocol, **not** a command to change this computer.

**Gate A — authority and environment:** use a separately controlled,
explicitly approved Windows QA VM or equivalent genuinely isolated test
desktop, not the user's ordinary interactive session. Establish guest
OS/build, browser executable and version, audio recording capability,
screen reader and version, rights to install or enable anything missing,
QA test-source identity, input ownership, and safe cleanup. If a
dependency requires new installation or elevated configuration, obtain
separate approval before that action. No OEM binaries/manual assets
need to be installed or redistributed.

**Gate B — immutable source:** rehash the pinned 37 runtime source files,
all parent checkpoints, the new runner and any fresh VM-only recorder
before running. Do not overwrite any V50–V55 logs/receipts. Use new
attempt filenames, capture raw event and audio evidence before verdicts,
and timestamp events with monotonic and wall clocks.

**Gate C — genuine spoken output:** with an approved screen reader
actually running inside the isolated QA desktop, record audible output
and a time-aligned transcript while focusing the POWER control, activating
it, and observing the POWER-hold/BRILL phases. Distinguish keyboard input,
assistive technology activation, ARIA announcement text, and the
spoken utterance actually heard. Check for redundant repeated countdown
speech, but never equate DOM mutations with audio proof. If capture or
audibility cannot be verified, mark **NOT_RUN/INCONCLUSIVE**, not PASS.

**Gate D — genuine OS focus change while held:** use a test-owned
headed Chrome window and a second test-owned OS window in the QA desktop.
Initiate a real primary POWER press/hold, then cause focus to leave the
browser via OS-level user input (not dispatchEvent, CDP synthetic blur,
or source mutation). Record actual window.blur count/time,
document.hasFocus() transition, foreground HWND/PID identity/time,
pointer/key event isTrusted where applicable, D15 visual/semantic
status, adapter event sequence, heldControls and session/replay hashes.
Only if the browser truly receives its focus-loss event is cancel behavior
eligible for PASS/FAIL. If foreground changes without window.blur, the
**prerequisite is unmet**, consistent with previous V45/V48/V50 observations.

**Gate E — no stranded POWER:** after a qualifying real OS blur while
POWER is held, require a single cancel edge, no spurious up/long press
or shutdown, no stuck 'pressing' visual class, and no new effective
hardware action. If BRILL had been previewed previously, require that
prior preview to be restored. Late pointerup, pointercancel,
lostpointercapture or keyup must not cause duplicate events. Replay must
reproduce the final state and source-bound log without adapting old
profile revisions.

**Gate F — close and receipt:** retain first FAIL/STOP evidence, trace
unknown environment limitations separately, run scoped/full Node and
Python checks only when source identities still match, close only
test-owned windows/listeners, and independently reread all new artifact
hashes. Never raise a software QA PASS to OEM, device, installed
firmware, rights, reviewer or release acceptance.

## Remaining canonical gates

- F1 PUBLIC_REFERENCE / TRAINING ONLY / NOT HARDWARE VALIDATED.
- Phase 6: **OPEN**; checklist baseline **14/50**; named tasks **6/22**.
- Feature claims: **65/65 HOLD** (64 operator features + D15 instructor).
- Installed firmware: **UNKNOWN**; hardwareValidated: **false**.
- Rights clearance: **false**; reviewer signoff: **NOT_OBTAINED**.
- Release approval: **HOLD**.

**Next bounded milestone:** obtain an approved isolated Windows QA host
with real spoken-audio capture and OS focus instrumentation, then run
this V55-B protocol as a new, clearly named attempt. If isolation or
capture cannot be provided, hold the real accessibility gate and
continue source/rights evidence collection without changing feature
claims or product runtime.
