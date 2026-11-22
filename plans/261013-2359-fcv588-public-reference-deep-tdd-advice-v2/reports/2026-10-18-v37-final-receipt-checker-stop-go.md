# V37 final integrity preflight — preserved STOP and narrow GPT-6 GO

**Date:** 2026-10-18. **Affected gate:** V37 QA receipt generation,
not the FCV-588 runtime, Node suite, Python suite or browser product.

## Original failed Verify (STOP)

The first write-once receipt-building PowerShell command was executed from
`C:\Work\MoPhongMayTrenTau`. It read current source SHA, staged SHA,
historical Chrome screenshot receipts and newly generated canonical test
logs. Its log validation then stopped with **exit code 1**:

```text
NEW NODE LOG DOES NOT VERIFY docs\qa\FCV588_V37_CANONICAL_TARGETED_20261018.log
```

The tool's stderr reported an explicit thrown exception, not a Node
assertion error. No `docs/qa/FCV588_V37_FINAL_INTEGRITY_20261018.json`
was created; this was checked afterward. The failed command and exception
are preserved in the current session's CoS execution result. The existing
test log was **not** edited. Canonical targeted log SHA-256:
`5fcc0ed87bfc93284654f43e0a332423fe1b6a65b3d43b0d5bb827420e109e45`.

## Exact root cause

The checker required a line `V37_CANONICAL_TARGETED_EXIT=0`
inside each Tee-Object output file. In the original execution shell,
`Tee-Object -FilePath <log>` captured **only the Node process stdout**;
the `Write-Output ('...EXIT='+$code)` call happened *after* the Tee-Object
pipeline. Consequently **none of the four existing Node logs nor the Python
log contains that extra marker**. Their TAP data actually includes the
expected `1..4`, `# tests 4`, `# pass 4`, `# fail 0` (or corresponding
455 figures); the Python log contains `Ran 13 tests` and `OK`.
Their original CoS `exec_command`/`write_stdin` results separately
observed exit code 0. The missing duplicate exit text is a **checker
input-contract error**, not failed product tests.

## GPT-6 disposition

**GO, restricted to a revised checker reading what was actually logged.**
The replacement may validate TAP assertions/counts and hashes from the
immutable original log files, and distinguish the independently observed
process exit status from the text inside those files. It must not pretend
to recover a process return code from an absent line or add synthetic
markers to existing logs. The source SHA checks, 121 original screenshot
byte checks, original V31 failed-log hash and Phase 6/rights HOLD checks
must remain at least as strict. Write the first success receipt to the
same intended *previously absent* V37 filename with `O_EXCL`/write-once
semantics; do not retry by overwriting any prior evidence.

**NO-GO** for weakening software tests, changing runtime code, modifying
historical RED records, declaring an independent review, or promoting any
OEM/rights/release claims.
