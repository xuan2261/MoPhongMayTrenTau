# V34 canonical integration EOL mismatch — GPT-6 supervised disposition

## Observed STOP

Date 2026-10-18. The previous byte-verified V31 targeted, full Node,
Python and seven-runner Chrome regressions were green. The V34 aggregated
8-file patch passed `git apply --check` and `git apply --verbose`
reported all eight paths applied cleanly. **However the immediate strict
post-apply SHA check failed first at `web/app.mjs`**, so the integration was
correctly stopped before post-integration tests or a PASS receipt was written.

The subsequent read-only comparison of **all eight** paths demonstrated:

- All eight current files use CRLF line endings, whereas their verified V34
  staging counterparts use LF only.
- For every file `current.replace("\r\n","\n")` equals the staged text,
  character for character. No extra/remove/moved lines, product behavior
  changes, or source mismatch outside line endings were observed.
- Per-file CRLF counts: `app.mjs=1214`, `index.html=184`,
  `styles.css=331`, `lcd-presentation.mjs=140`,
  `lcd-config-presentation.mjs=130`,
  `lcd-control-presentation.mjs=67`,
  `lcd-instructor-meta.mjs=232`, `keyboard-shortcuts.mjs=19`.
- This is a **working-tree EOL representation discrepancy**, not evidence
  of a reducer, DOM, or source-provenance regression. The specific Windows/Git
  setting responsible was not assumed or changed.

## GPT-6 supervisor go/no-go

**GO only to normalize line endings from CRLF to LF on these exact eight
canonical web files**, after validating *all* normalized byte streams against
the frozen staged SHA-256 manifest *before any write*. Do not use generic
recursive line-ending rewrites. Once all eight SHA hashes match the V34
candidate, record a new readback, syntax check, and affected/full post-
integration tests. No other code or product semantics may be changed to
correct this issue.

**NO-GO for declaring V34 integrated or release-ready until exact 8/8 SHA
and new regressions pass.** Retain the original V31 failure log and all V32,
V33 and V34 staging evidence. If any byte-normalization guard fails, STOP
and preserve the observed discrepancy rather than forcing equality.
