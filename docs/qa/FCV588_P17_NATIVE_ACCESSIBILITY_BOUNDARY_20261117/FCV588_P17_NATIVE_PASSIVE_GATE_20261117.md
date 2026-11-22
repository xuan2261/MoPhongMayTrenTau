# P17 — Native accessibility passive gate (2026-11-17)

Status: `VERIFIED_PASSIVE_ONLY / NATIVE_ACCEPTANCE_BLOCKED`. Scope: read-only inspection of current Windows session; no app/browser/source/OS settings changes, no accessibility runtime acceptance.

## Authority and preimage
- P16 final SHA-256: `d40287d951c887581ce3a1d1776ed7707add77c7393c86362fc13ef03000ab90` (direct Get-FileHash match).
- `canonicalRuntime50SHA256`: 50/50 exact SHA matches, drift=0.
- P15 final and independent postreceipt: filenames resolved by matching their pinned SHA in P16 final.
- P16 native independent review and source compatibility review: both hashes match P16 final.
- Protected user HTTP server: 127.0.0.1:4173 PID 1204, remained LISTEN; ports 4214, 4215, 4216, 4217 not LISTEN in read-only snapshots.

## New passive Windows observation
- Narrator.exe is present, Narrator running processes: 0. Actual speech = `NOT_RUN`.
- NVDA running processes: 0, executable in two standard installation paths: 0. Other portable locations are not exhaustively checked. Actual speech = `NOT_RUN`.
- High Contrast registry Flags=126, OFF (no native High Contrast run). Native rendering = `NOT_RUN`.
- UIAutomationClient/UIAutomationTypes loaded; desktop root ControlType.Pane, 14 immediate children. This is platform capability ONLY, not target-app UIA PASS.
- Read-only EnumWindows found one visible window whose *title* matches keyword FCV588, HWND 16647698, PID 12896, title `FCV588_GiaoDienThucTeMay2016`. Crosscheck of Win32 process identity yielded `explorer.exe` at `C:\Windows\Explorer.EXE`: this window is **NOT** an independently identified Chrome/Edge simulator target. Its UIA contents are therefore excluded from product acceptance. No uniquely identified simulator target window is established by this probe.
- Win32 POWER-hold genuine browser `window.blur` not attempted, not observed; `NOT_YET_VERIFIED`.
- One initial exploratory EnumWindows PowerShell probe terminated with exit code 1 due to reserved PowerShell automatic variable `$PID` assignment in callback. A second read-only probe using `$windowProcessId` exited 0. The first error is tooling/harness-only, not a simulator defect; retain both tool transcripts.

## Decision
No new source-valid defect; no synthetic accessibility PASS and no runtime fix. P17 native acceptance remains `BLOCKED`: Narrator speech needs explicitly authorized interactive session and synchronized audible/transcript evidence; NVDA needs approved executable; native High Contrast needs isolated authorized settings; POWER cancel needs operator-driven genuine focus transfer and actual browser blur; target UIA needs uniquely identifiable Chrome/Edge simulator window. P16 Chrome/Edge browser PASS remains unchanged and does not imply native Windows accessibility acceptance.

No new Node/Python/Chrome product regression run was needed because canonical runtime is byte-identical. OEM, hardware and production flags remain `HOLD`; Phase 6 OPEN, 65/65 feature claims HOLD. No independent native GO or postreceipt is claimed.