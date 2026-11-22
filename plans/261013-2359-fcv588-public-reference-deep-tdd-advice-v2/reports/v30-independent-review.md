# V30 independent code review — observed worker report

An actual CoS worker, label `V30 configuration read-only review`, read the
current sources and reported findings. The tool observed model `gpt-5-6`,
reasoning `xhigh`. This was read-only source review: no worker edits, commands,
tests, browser runs or child agents. It is not Kongming or OEM/course approval.

## Findings before follow-up repairs

**A — Effective alarm status can contradict committed enable.**
`web/lcd-config-presentation.mjs:21-27` reads cached active IDs even when an
operator has committed Off. `model.mjs:606-611` changes settings, while the
sensor cause is reevaluated only on world tick (`753-823`). The new footer
could say Off / ACTIVE / ACK indefinitely with the teacher clock paused.
Proposed bounded repair: share a read-only effective alarm projection between
the Canvas banner and the configuration footer, filtering disabled profiles.
Do not modify cached observations, reducer, event log or persisted settings.

**B — Pre-existing source-option revocation can resurrect a staged draft.**
`model.mjs:397-415` reconciles only main menus and only when IDs change;
Installation is excluded. Revocation while the committed Tankenmaru value is
Off and the draft is On can hide the editor without canceling its canonical
draft; regrant can reveal that old draft. This is a control-state issue, not a
newly invented OEM behavior. It is outside a presentation-only repair: proper
fixing changes replayable transitions and requires the explicit profile/data
compatibility decision and advice boundary. Preserve it as an open P1 finding;
do not hide it with an independent browser counter or claim source-gate approval.

**C — Two new browser status assertions are too permissive.**
The probe's substring `ACTIVE` also matches `INACTIVE`; `ACK` also matches
`UNACKNOWLEDGED`. Replace these checks with exact tokens and explicit negative
assertions. The actual intermediate receipt strings can be examined, but its
assertion count alone is not proof of these two distinctions.

**D — DOM cleanup currently appears correct but needs stronger regression.**
The app clears transaction children/datasets and recomputes visibility on
every render. Add an actual transition from a visible configuration draft to
a non-configuration overlay and check cleanup. No cleanup bug was asserted.

The reviewer also found correct Installation NMEA filtering and no White Line
or settings-schema changes. System NMEA/Receiver filtering remains covered by
the existing full Chrome suite, not by the new focused configuration probe.

## Disposition while work continues

A receives a separate actual RED test before repair. C/D are strengthened in
a new final-stage probe, without overwriting the earlier setup error, valid
RED or intermediate GREEN receipts. B remains explicitly open pending the
behavior/profile compatibility decision; software tests are not release approval.

## Actual follow-up disposition

The same worker reread the repaired code and reported A/C/D closed for the
reviewed paths. Evidence: `lcd-presentation.mjs:73-91` filters committed On
causes/ACK and recomputes audible; `lcd-config-presentation.mjs:21-28` and
`app.mjs:315-318,525-535` consume it. The separate review tests cover committed
Off with unchanged raw causes, pending Off and mixed acknowledged causes.
The browser's exact middle-dot tokens and actual Canvas pixels no longer
confuse INACTIVE/ACTIVE or UNACKNOWLEDGED/ACK. The configuration-to-Range
transition tests hidden/empty transaction data and reset content semantics.

Prime execution: meaningful alarm RED1 fail/1 pass, targeted GREEN36/36,
configuration REVIEW264/264, full Node370/370, FUNC76/76, LCD68/68 and four
full Chrome contexts passed. The worker did not rerun these executions.

B remains OPEN with a direct in-memory reproduction for both menu kinds.
Prime visual review also recorded V30-E (P2): the pre-existing instructor
notice uses `Bottom From` when the profile's Alarm On/Off is changed
(`model.mjs:595,611`, desktop `alarm_disabled` screenshot). This is not a
wrong stored threshold; it is a wrong canonical notice label, still unfixed.
Neither finding is hidden by the successful scoped regression results.
