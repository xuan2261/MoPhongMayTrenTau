# V25 — recovered checkpoint, not a new test execution

The uploaded continuation brief identified an unfinished V25 documentation
handover. This report closes that documentation gap without relabeling old
evidence as newly executed work or certifying the changed V26 runtime.

## Recovered and rechecked before V26 edits

Workspace: `C:\Work\MoPhongMayTrenTau`, no Git repository. The existing
loopback server at `http://127.0.0.1:4173/` was retained; PID 24060 was observed
at recovery, not assumed from historical PID 36768.

Fresh local and HTTP-served hashes matched both historical receipts exactly:

- `docs/qa/FCV588_CHROME_VIEWPORT_V25_RECEIPT.json`
- `docs/qa/FCV588_CHROME_MOBILE_V25_RECEIPT.json`

All 32 runtime files matched the common V25 manifest
`340d306cf40b47b69266a7a26dd7a0e0c4687269736e0397ffee35813bf9783b`.
The desktop runner/shared helper hash was
`4b5f330bf00d5a964a46087d7d69438c3d0f5493f6ae279fcef8b561d3d1ade4`;
the phone runner hash was
`2612b71b954b237f24e78bc6c5f03541bd2eedb99db919c9fa3a59334e0ac790`.

## Historical V25 result and version boundary

The recovered records report 324/324 Node tests and 7/7 Python integrity
tests passing. The fresh work here was source/receipt identity verification,
not a rerun of those historical test commands.

| Historical Chrome viewport | Status | Actual response bodies hashed |
| --- | --- | ---: |
| 1366 x 768 | PASS | 61 |
| 1920 x 1080 | PASS | 61 |
| 360 x 800 | PASS | 30 |
| 390 x 844 | PASS | 30 |

The profile is F1-public-reference-19, settings schema18/key v18,
core f1-core-7, event schema5, replay envelope7, scenario7 and inert
multi-runtime4. The original V25 desktop White screenshot was opened during
recovery. The V25 source, screenshots and receipts are historical after the
V26 HTML/CSS/read-only dial projection changes.

## Still unaccepted

Seven scored D15 lessons are synthetic classroom functions, not an OEM
certificate. The operator register remains 60 synthetic subsets, three
partial rows C11/D09/D14 and one unimplemented source/rights-dependent D04;
D15 is a separate 65th row. All claim decisions remain HOLD.

No independent post-V25 final reviewer or Kongming approval was obtained.
No phase/checklist was accepted solely because the recovered tests passed.
Continue from the [V26 engineering report](continuation-2026-10-15-v26-panel-projection.md),
not from a renamed V25 receipt.
