# V31 independent static review — actual CoS reports

The existing read-only CoS worker was reused for compatibility counsel,
canonical transaction review, basic-control review and failure diagnosis.
The tool reported model `gpt-5-6`, reasoning `xhigh`; these were application
defaults, not an assistant-selected override. The worker did not edit files,
execute commands/tests/browser/network work or create children. These reports
are static review, not Kongming, hardware, rights or release approval.

## Compatibility counsel before code changes

The reviewer read actual profile/settings/session and app restore/persistence
code. It supported a profile19-to20 boundary for changed canonical transitions
and notices, while retaining settings18/core7/event5/replay7/scenario7/multi4.
The normal settings decoder must remain strict; a separately named exact
profile19 decoder must validate the old envelope and return committed values
only. Old replays must reject under profile20. Startup must not rewrite old
storage bytes or infer a virtual-option grant from a saved preference.

This decision is documented before runtime edits in
`v31-scope-and-compatibility.md`. Actual legacy fixtures were captured before
changes. The reviewer did not independently execute their replay/hash checks.

## Canonical transaction and notice review

The reviewer found the implemented reconciliation coherent:

* Main menus use stable entry ID, Installation uses stable settingKey.
  A selected disabled/invalid entry cancels editing even when row IDs remain
  unchanged. Changes reconcile the POWER-hold priorOverlay as well.
* All instructor fixture changes and world-tick capability updates reach the
  same reconciliation. Unrelated valid Units/Calibration drafts survive.
* Installation stages an explicit owner ID and rejects disabled, missing,
  mismatched or invalid choices before commit. Cancel clears ownership.
* BRILL recognized TrackPad adjustments reset the existing inactivity timer.
  Alarm profile enable notices use Alarm, not the threshold field at index1.
* The normal decoder and separate migration decoder do not accept old replay
  semantics or option grants. The unchanged settings vocabulary remains
  schema18, including legitimate ship draft and White Line Off/On.

The worker reported one additional concrete app defect: teacher reset did not
synchronize lastObservedSettings after canonical restore fail-closed a saved
Tankenmaru On preference. A later non-setting input could therefore overwrite
stored bytes with Off. The prime added a browser assertion and observed the
failure before repairing the baseline assignment. Static follow-up confirmed
the assignment exists after reset/restore, without calling setItem.

## Basic-control LCD and retained failure review

Range/Gain help correctly distinguishes ENTER save from MENU cancel. BRILL
correctly states ENTER or MENU saves. MODE does not advertise the currently
inert ENTER as a commit; it describes the existing rotary/timeout and MENU
cancel contract. The renderer only creates inert text DOM. Every dialog
render hides/clears the control summary before selecting a new layout.
No concrete stale-summary or operator-semantics defect was found in this scope.

The subsequent 52-pass/1-fail unit run was independently diagnosed as an
incorrect Auto fixture expecting a Manual preset conversion. Details and the
unapplied proposed correction are in `v31-failure-counsel-packet.md`.
The worker explicitly did not claim Kongming or permission to bypass the
phase Failure Protocol. The failed Verify remains OPEN.

Coverage suggestions, not confirmed new bugs: explicit control-summary
transition tests; reset followed by POWER/tick storage assertions beyond the
observed powered-off MENU probe; world-tick-driven BDS loss while POWER wraps
the editor. A direct wrapped virtual-mount BDS regression was added and passed.

## Disposition

V30-B/E and the related canonical repairs have source review and scoped
executed evidence from the prime. No new concrete product blocker was found
by this static review. The unresolved verification fixture and missing full
regression/counsel gates prevent integrated acceptance. The worker did not
independently rerun any supplied PASS result.
