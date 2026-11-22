# V30 — Integrated configuration LCD, transaction visibility and alarm consistency

Date: 2026-10-16 (+07:00). Workspace: `C:\Work\MoPhongMayTrenTau`.

**Disposition: bounded V30 implementation and executed regression checks PASS;
known control-state findings OPEN; complete OEM/hardware/course/release HOLD.**
This is not a FINAL product, a 100% equivalence result or phase completion.

## 1. V29 recovery completed before new changes

All nine previously pending full-suite V29 screenshots were opened. The
33-file live workspace matched the V29 FUNC GREEN, LCD, desktop and mobile
receipts. FUNC RED correctly describes the older V28 source. The historical
blocked aggregation remains NOT_EXECUTED; the new user-authorized local
reconciliation actually ran successfully. No historical browser test was
replayed or original receipt overwritten.

Recovery record: `docs/qa/FCV588_V29_RECONCILIATION_2026-10-16.json`.
Its SHA-256 is
`b16ab28e17d95354d243051c0c6a6bf8603fefabf316d4c51e0f2c8286557810`.
It includes original receipt hashes, nine screenshot hashes and the actual
50 checklist entries / 22 Task headings read from all seven phase files.

The existing loopback server was already listening on PID12948; it was kept.
Node v22.22.0 and Python3.11.5 were observed. Git remained absent. No install,
runtime update, server restart, Git operation, deployment or real I/O occurred.

## 2. Why this integrated batch

Configuration navigation is a common dependency of A13/A14, D02/D05/D06,
C01-C04/C11 and the Installation part of D09/D14. The old nested menus still
mixed help with operator rows, lacked a separate stored-versus-draft display
and hid mobile instructions. The fixed V29 short-FUNC editor already showed
that a bounded semantic choice window was viable. Desktop lesson controls
also overflowed their inner panel in the reviewed V29 images and valid RED.

Eight existing overlay families now use one FCV-specific read-only projection:
Range Bank, Units, Calibration, NAV boxes, Alarm profile, Alarm thresholds,
Installation and FUNC assignment. They retain the actual reducer's choices,
ordering and transitions, rather than introducing a universal menu engine.

### Reference comparison and its limits

The following source locations are the existing independently written
manufacturer-manual oracle notes and source-graded atlas, reread this turn:

| Existing reference | V30 change and verified behavior | Still not established |
| --- | --- | --- |
| §2.2, eight ranges | Range1-8 semantic fields, selected slot, stored/draft and consistent selected depth-unit display | Exact OEM range choices and adjustment geometry |
| §2.5, Units | Six actual unit fields; cancel preserves settings, depth-unit commit updates LCD and resets range bank | HR/pb conversion and exact OEM window geometry |
| §2.6, Calibration | Seven existing simulated fields, bounded choices and distinct stored/draft values | Physical calibration, exact firmware ranges and all detection adjustments |
| §1.21, NAV boxes | Existing NAV1/NAV2 field definitions, optional boxes and NO DATA source boundary | Full OEM data-source availability and layout/timing |
| §1.18, alarms | Separate profile enable, threshold drafts, effective cause and ACK; Off removes the banner without a world tick | OEM sounds/timing and complete per-profile lesson acceptance |
| §4.10, Installation | Source-HOLD rows stay visible; optional On hides NMEA and revoke restores it | Complete optional-hardware behavior; stale-draft revocation finding remains open |
| §1.19, FUNC assignment | Current assignment and pending target displayed separately; cancel preserves short FUNC | Measured hold threshold and OEM pixel geometry |

Primary-source searches did not add usable new operator details. Third-party
manual transcriptions were not adopted. No new restricted PDF extraction,
OEM image/font sampling, video-frame audit or firmware identification occurred.
Authority: `docs/research/FCV588_MANUAL_ORACLE_REVIEW_2026-10-14.md`, existing
`menu-atlas.mjs`, actual reducers/codecs and the scoped requirements. The new
layout is original training artwork, not a newly verified OEM screenshot.

## 3. Concrete implementation

`web/lcd-config-presentation.mjs` is new. `projectFcvConfiguration` consumes
the canonical overlay and the existing field definitions. Real operator rows
have stable field keys, one selection and appropriate HOLD state. Help and
source notes are not selectable. A separate transaction area identifies the
stored value and the uncommitted draft. Choice lists use the same seven-value
window as V29 FUNC. Missing stored values are not invented OEM defaults.

`web/app.mjs` renders safe inert DOM rows and keeps the selected field/choice
inside its scrollport. It resets transaction children, datasets, role and
visibility when another overlay opens. The obsolete eight text-rendering
branches were removed. The remaining waypoint workflow was not redesigned.

`web/index.html` adds the transaction region. `web/styles.css` keeps fields,
choices, transaction and help in separate LCD regions on desktop and phone.
The instructor lesson grid uses a shrinkable column so its controls remain
inside their own panel. Existing 44px phone targets and explicit non-OEM
reflow are preserved. Face geometry, physical input adapters and V28 graphics
were not redesigned.

### Alarm review correction

Independent source review found that a committed Off could coexist with
cached active causes until the next world tick. A separate actual RED proved
the new footer could incorrectly display this as an effective active alarm.
The repair adds `projectFcvAlarmPresentation` in `web/lcd-presentation.mjs`.
It derives effective visible alarms from cached causes AND committed On
settings, filters ACK IDs and recomputes audible from that effective set.
Both the Canvas banner and configuration footer consume it. A pending Off
does not suppress an On alarm. Canonical cached causes and replay remain intact.

### Preservation verified by bytes and behavior

The live-source comparison found exactly four changed runtime files:
`web/app.mjs`, `web/index.html`, `web/lcd-presentation.mjs`, `web/styles.css`;
one added runtime file: `web/lcd-config-presentation.mjs`; no removals.
**Every `src/` byte remains identical to V29.** Profile19, settings18,
core7/event5/replay7/scenario7/multi4, sonar algorithms, defaults, menu choices,
instructor scoring and persisted meanings are unchanged. White Line remains
Off/On, with numeric/Edge explicitly SOURCE_GAP.

Pre-change backup: `reports/v30-selected-source-before.zip`, SHA-256
`f881155859f851be42dcb4e58afa9a49388f9856571097c1db2edf39148588e8`.
The separately preserved HTML is `reports/v30-index-before.html`, SHA-256
`1790a1de9f33e9c54c48a77292c3b61cca317107df2e7fb5c9ac214c0198322c`.

## 4. Executed test history, including failures

| Actual execution | Result and meaning |
| --- | --- |
| Initial configuration RED harness | Exit1, zero assertions: ambiguous `.lesson-panel` selector. Setup error, not product RED. Original receipt retained. |
| Corrected configuration RED, attempt2, before runtime edits | 142 expected failed presentation assertions +102 baseline passes; all four contexts completed without execution error. |
| Initial targeted Node suite | 62/62 PASS. |
| Intermediate configuration GREEN attempt2 | 244/244 PASS, before alarm-review correction. Kept as intermediate, not current-source certification. |
| Intermediate full Node / Python | 367/367 Node; 7/7 Chrome-integrity +6/6 atlas Python. |
| Separate alarm review RED | 1 expected failed assertion +1 passing pending-Off characterization; no import/setup failure. |
| Alarm/configuration/FUNC/reference targeted GREEN | 36/36 PASS. |
| Post-review configuration Chrome | 264/264 PASS: 66 per viewport, exact status tokens, actual Canvas banner paint/removal and DOM cleanup. |
| Post-review full `npm run check` | 370/370 PASS, zero fail/skip; exit0. |
| V29 FUNC regression run under V30 output | 76/76 PASS, including Clutter100, Color Erase50 and existing White Line Off/On. |
| LCD/BRILL/main-menu regression under V30 output | 68/68 PASS. |
| Full desktop and mobile Chrome | Both exit0; all four required viewport contexts PASS. |

The 23 added Node tests first passed after their implementation except the
two-test alarm review file's recorded RED. The initial configuration RED is
browser evidence; no artificial unit-test RED is claimed. The setup selector
repair changed only the authored probe and introduced separate attempt paths.

The independent reviewer found permissive substring assertions (`ACTIVE`
inside `INACTIVE`, `ACK` inside `UNACKNOWLEDGED`). These were replaced with
exact token membership and negative assertions in the separate REVIEW run.
No earlier receipt was overwritten or retrospectively reclassified.

## 5. Current source-bound browser evidence

Five completed current receipts match live loopback bytes and current harness
hashes. Their common 34-file runtime SHA-256 is:

`99097efbccc12d8538a041643f22b22d268dadb3e24d9ec9acbc6f718d4c1117`

| Full-suite context | Bodies verified | Distinct paths | Actual body aggregate SHA-256 |
| --- | ---: | ---: | --- |
| 1366×768 | 65 | 32 | `b25b35275e21a9442e70a589f5f3a28576775f38fc163357b50baf68d647a475` |
| 1920×1080 | 65 | 32 | `f6627df25b36ca36a4599bcfdce13e522f690fdbcaf0ab42981ed44847b5282c` |
| 360×800 touch emulation | 32 | 32 | `9e161007435c9d2f4ae02c4204492d098442975cc5d216a694eb3a7e61bcf36d` |
| 390×844 touch emulation | 32 | 32 | `54b7f5f0d973adab98f58df7247f750e5602d369851dba632f707d857125bed1` |

Full-suite harness SHA-256:
desktop/shared `e4f9fb7c890eb9075829930494ff4c1e98ebbf33fcb5b8b797576dd787abd76e`;
mobile `a91569ffe0f183d08bcb26ba9ddd89df2a3a62ba86fdaa6f79ad066624e10575`.
Actual Chrome version recorded by configuration/FUNC/full runners:
155.0.8059.41. The LCD runner did not record its version field; it remains null.

All **53 current-state screenshots** were opened: 24 configuration REVIEW,
12 FUNC GREEN, 8 LCD GREEN and 9 full-suite images. This is separate from the
nine historical V29 images, two valid-RED images and four intermediate-GREEN
Units images also inspected. Full-page image height does not change the exact
viewport. Phone results are browser emulation, not physical touchscreen QA.

The images show readable selected values, separate stored/draft/help, correct
effective alarm Off, preserved FUNC, dark/light contrast, NAV and instructor
separation. An existing incorrect teacher notice label was also observed and
is explicitly recorded below rather than hidden by a broad visual PASS.

Machine-readable summary: `docs/qa/FCV588_V30_EVIDENCE_SUMMARY.json`, SHA-256
`079ed08ebb85136a62b040f93edba4a2d435cede4f965eaa8bab6870b8349b8f`.
It stores receipt, harness, screenshot and runtime hashes, per-context body
identities and unchanged V29 receipt identities. Its `checks:0` for the full
runners means those runners report named steps rather than a `checks` array;
it is not a claim that no assertions executed.

## 6. Review and remaining concrete findings

An actual independent CoS worker performed read-only source review and a
post-repair follow-up. It confirmed A (effective alarm display), C (exact
status assertions) and D (tested DOM transition cleanup) closed in reviewed
code. It did not rerun tests and did not provide Kongming, OEM or release approval.
See `reports/v30-independent-review.md` for evidence locations.

**V30-B, P1 — OPEN:** Tankenmaru draft On survives option revoke/regrant while
the committed setting is Off, in both main menu and Installation. Direct
in-memory reproduction through the existing reducer recorded this in
`docs/qa/FCV588_V30_OPEN_GATE_FINDING.json`. It is not a passing acceptance test.
A correct repair must clear the canonical transaction and deliberately address
profile/replay compatibility; a UI-only counter would conceal the defect.

**V30-E, P2 — OPEN:** The instructor notice after changing an Alarm profile's
On/Off can say `ALARM5 / Bottom From = Off`. The actual profile setting and LCD
status are correct. `model.mjs:595,611` uses a threshold field label for the
profile enable notice; the reviewed desktop `alarm_disabled` screenshot shows
it. This existing canonical notice was not rewritten in a view-only batch.

Broader gaps remain exact OEM menu values/key semantics, firmware branches,
geometry/fonts/colorimetry, acoustic equivalence, Language/reboot, complete
C11/D09/D14, per-feature rights and independent instructor acceptance. No new
source permissions or hardware evidence were obtained. No public feature claim
was promoted; all65 remain HOLD.

## 7. Plan disposition and next batch

The attached review `reports/v30-checklist-review.md` distinguishes inherited
accepted entries, newly strengthened software evidence and remaining gates
for all50 checklist entries and22 named Tasks. Canonical totals remain14/50
checked and6/22 accepted; Phase1 alone is accepted. Passing scoped browser
checks does not close whole source/rights/compatibility/lesson gates.

**Next execution priority P0:** resolve V30-B's canonical option-revocation
transaction, with an explicit profile/replay compatibility decision and the
existing advice gate; include V30-E notice accuracy in that bounded state
consistency batch. Test revoke during draft, regrant, ENTER/cancel, power,
reset/reload and replay in both System and Installation. Preserve White Line
Off/On and do not expand OEM ranges without an authoritative contract.

No background implementation is promised. Further verification results after
documentation reconciliation are recorded separately below when actually run.

## 8. Subsequent documentation-write interruption

After the successful current-source/receipt reconciliation, a command intended
to add `visualCheckpointV30` and the later V29 reconciliation to the evidence
ledger, and to correct two relative links in `v30-checklist-review.md`, returned:

> This tool call was blocked by OpenAI because we couldn't determine the safety status of the request.

The command did not execute: **NOT_EXECUTED**. It was not retried through
another command, patch tool or container. Consequently the ledger still has
its earlier V29 top record; it does NOT yet contain the V30 record described
by this report. The checklist report itself exists with all50/22 assessments,
but its two `../../../../docs/` links should eventually be `../../../docs/`;
those link corrections remain unapplied. Repository-relative paths in this
report and the V30 evidence summary identify the actual existing artifacts.

The implementation, raw test receipts, reviewed screenshots and successful
SHA summary predate that blocked write and remain valid for their observed
scope. This interruption is not a product assertion failure or an additional
PASS. Documentation/ledger reconciliation must not be called complete.

## 9. Executed post-document checks

The subsequent distinct read-only verification chain actually exited0:
`npm run check`370/370, zero fail/skip; Python Chrome-integrity7/7 and atlas6/6;
implementation/menu/trace/feature-register `--check` all PASS; recursive public
runtime asset policy PASS for34 original source files. Log:
`docs/qa/FCV588_V30_POST_DOCUMENT_CHECKS.log`.

These checks do not validate every Markdown hyperlink or complete the blocked
ledger write. The two known checklist-report link errors remain. Wording in
that review about added V30 metadata refers to the separate execution/summary
records, not a successful ledger update. No new plan CLI or journal CLI was
executed. Runtime and browser harnesses were not edited after their completed
current Chrome runs; the later work was documentation and verification only.

## 10. Later V31 documentary reconciliation — 2026-10-16

The user's subsequent explicit continuation authorized completing the missing
V30 ledger metadata and two links. A new scoped patch succeeded and was read
back: `visualCheckpointV30` and the later V29 reconciliation are now present
in the ledger, and the checklist report's two evidence links resolve through
`../../../docs/`. The V31 evidence summary records this successful readback.
The original blocked V30 operation in section8 remains NOT_EXECUTED; it was not
retroactively changed or used as proof of the later write.

V31 subsequently implements the B/E repairs and additional control/state work,
but retains an unexpected new test-fixture failure and full QA/advice HOLD.
See `continuation-2026-10-16-v31-transactions-controls.md`; this addendum is not
a new V30 browser run or an assertion that the V31 integration is accepted.
