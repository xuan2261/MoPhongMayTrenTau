# P16 — Windows native accessibility fact gate

Date: 2026-11-17  
Reviewer: worker-18  
Mode: independent READ-ONLY fact audit  
Canonical root: `C:\Work\MoPhongMayTrenTau`

## Verdict

**Native accessibility PASS is not established.** The current evidence supports a small set of verified passive Windows facts, while actual Narrator/NVDA speech, native High Contrast rendering, target-app UIA traversal, and POWER cancellation on a genuine browser `window.blur` remain `NOT_RUN`, `BLOCKED`, or `NOT_VERIFIED` as specified below.

P15 canonical software integrity is intact and is only the source baseline for this audit. Fresh P16 readback matched all `50/50` runtime SHA entries in `FCV588_P15_LCD_GEOMETRY_FINAL_INTEGRITY_20261116.json`; the new P15 geometry test also matches its sealed SHA. No CSS, source, test, browser, process, server, Narrator/NVDA state, or Windows accessibility setting was changed.

## Evidence bindings

- P15 final integrity: `a6aa5038292e5d1d3da20170f9bbed1804ee5262e749cb9b4e5cf53207deafed`.
- P15 independent postreceipt: `2ed3ad94a844142bfa401fbdf1a2003597ed01ab0393f5bfb9a9a57297539cfe`.
- P11 native-focus final integrity: `845b4fe9cf9b184a74ddba91783362e9446c1219d38362c16166d4b3d6a44c87`.
- P11 independent postreceipt: `392220f62ae29c2f1bf77b73c90d016b1a3a40e115a8c04612ce59a728b09f98`.
- P15 native-boundary triage: `bd831f8c30dd2399914626ceb2ed7f1ba1e3b861f0d2a547a9eb3820a8fd0f37`.
- Protected user server observed unchanged: `127.0.0.1:4173`, PID `1204`, process `node`.

## Passive Windows facts observed on 2026-11-17

| Area | Classification | Read-only fact | Acceptance boundary |
|---|---|---|---|
| Windows environment | **VERIFIED** | Windows 10 Pro for Workstations `10.0.18363`, build `18363`, 64-bit. | Environment identity only. |
| P15 canonical source | **VERIFIED** | Runtime seal rehash `50/50`; `test/fcv588-p15-uniform-lcd-css.test.mjs` SHA `2a750cb43e2ffd965eb1266046b45aad30da692312db1e172faa0acd73d162b0`. | Software integrity, not native accessibility. |
| Narrator installation | **VERIFIED** | `C:\Windows\System32\Narrator.exe` exists; version `10.0.18362.1 (WinBuild.160101.0800)`; SHA `85ce3785d41289c9648efa06c7d2fe69f295b590ca6aec722efb97138ca71ed4`; Authenticode `Valid`; Narrator registry key exists. | Does not prove speech output. |
| Narrator runtime / spoken output | **NOT_RUN / BLOCKED** | Narrator process was not running. No audio or authoritative transcript channel was captured. | Exact words, order, pronunciation, verbosity, live-region timing and interruption behavior remain unverified. DOM/UIA text must not be substituted for speech. |
| NVDA | **BLOCKED / NOT_RUN** | No executable found at the four bounded standard paths; no matching uninstall registry entry; no NVDA process running. | Native NVDA browse/focus/speech QA requires an approved installed or portable executable first. |
| Windows High Contrast state | **VERIFIED_OFF** | Read-only registry `HKCU\Control Panel\Accessibility\HighContrast` reported `Flags=126`; `HCF_HIGHCONTRASTON` bit is false and availability bit is true. | Current state is known to be OFF; native High Contrast rendering is therefore **NOT_RUN**. |
| Native High Contrast rendering | **BLOCKED / NOT_RUN** | P16 did not change accessibility settings. P10's forced-colors result remains Chrome emulation only. | Enabling High Contrast is necessary for native visual acceptance unless a separately prepared session is already in that state. |
| UI Automation platform | **VERIFIED** | `UIAutomationClient` and `UIAutomationTypes` load; desktop root is `ControlType.Pane`; root children were readable without moving focus. | Confirms passive UIA observation capability, not target-app accessibility quality. |
| Existing foreground UIA tree | **VERIFIED_PASSIVE_MECHANISM_ONLY** | The already-foreground window was readable through UIA: `ControlType.Window`, 454 descendants, one Document, 135 Buttons and five TabItems. | This window belonged to Helium's `chrome.exe`, not a uniquely identified `MoPhongMayTrenTau` QA Chrome window, so these counts are not product evidence. |
| Target-app UIA tree | **NOT_RUN / BLOCKED_NO_TARGET_WINDOW** | Read-only enumeration found zero top-level Chrome windows whose title matched `MoPhongMayTrenTau`. P16 did not launch, attach to, activate, or take ownership of Chrome. | No target-specific native UIA names/roles/focus state are accepted from this run. |
| Win32 foreground observation | **VERIFIED_PASSIVE_MECHANISM_ONLY** | Two immediate read-only `GetForegroundWindow()` snapshots returned the same HWND `5769834`, PID `25584`, process `chrome`; executable path identifies Helium. | Demonstrates passive foreground observation only. No focus transition or target Chrome ownership occurred. |
| Historical P11 Win32 focus transfer | **VERIFIED_HISTORICAL_PARTIAL** | P11 V3/V4 proved target Chrome foreground before POWER automation input and a real Win32 switch to a test-owned witness HWND/PID. | No post-switch trusted browser `window.blur` was observed and POWER remained pressing. Native POWER blur cancellation remains **NOT_VERIFIED**. |
| Browser-only accessibility assertions | **VERIFIED_BROWSER_ONLY** | Existing source/tests cover D15 tab semantics, keyboard routing, generic focus-visible rules, synthetic blur cancellation and Chrome forced-colors emulation. | These are not Narrator/NVDA speech, native High Contrast, or native blur acceptance. |

## What can be verified without UI disruption

The following are suitable for repeatable read-only fact collection because they do not require browser activation, input injection, process changes, or Windows setting changes:

1. Rehash the exact canonical runtime/test/evidence files and protected server identity.
2. Inspect Narrator/NVDA executable existence, version, signature, installation registry entries and running/not-running state.
3. Read current High Contrast registry/state flags without modifying them.
4. Load UI Automation and read the desktop root or an already-existing uniquely identified target HWND using `AutomationElement.FromHandle`, without invoking focus, selection, click or value patterns.
5. Read `GetForegroundWindow()` / PID / executable identity as a passive snapshot. This may prove who currently owns foreground, but cannot itself create or certify a blur/refocus sequence.

Target-specific UIA inspection is feasible without UI disruption **only if** a uniquely identifiable `MoPhongMayTrenTau` browser HWND already exists. In this P16 snapshot none existed, so the correct status is `NOT_RUN`, not a forced browser launch or ownership action.

## What cannot be verified under the current no-disruption constraint

### Narrator spoken output

Actual speech cannot be accepted while Narrator is not running and no synchronized system-audio/transcript evidence exists. UIA `Name`, DOM `aria-label`, live-region strings or accessibility-tree text are semantic expectations, not observed Narrator utterances. Status: **BLOCKED / NOT_RUN**.

### NVDA output

No NVDA installation or known portable path is present in the bounded checks. Status: **BLOCKED / NOT_RUN**.

### Native Windows High Contrast rendering

The OS is currently not in High Contrast mode, and P16 is prohibited from changing the setting. Existing Chrome forced-colors emulation remains browser-only evidence. Status: **BLOCKED / NOT_RUN** for native rendering.

### POWER native `window.blur` cancellation

P16 performed no focus transfer and took no Chrome ownership. Historical P11 V3/V4 prove the Win32 foreground-transfer portion but did not produce the required browser `window.blur`. Native POWER cancellation therefore remains **NOT_VERIFIED**. No product defect or native PASS should be inferred from P16.

## Smallest future fact gates

- **Passive target UIA gate:** if an isolated QA session already has exactly one target browser window open, bind its HWND/PID/executable and read the UIA tree without activating it. Verify expected control roles/names as native accessibility-tree evidence only. Do not call this screen-reader speech verification.
- **Narrator gate:** requires an explicitly interactive QA session with Narrator already/explicitly started, bounded keyboard traversal, synchronized UIA focus events, actual render-audio capture, and human-verified transcript. Without audio/transcript, remain `NOT_RUN`.
- **High Contrast gate:** run only in a separately authorized QA session where High Contrast may be enabled and later restored, or in a session already configured that way before QA. Record OS state plus native screenshots/focus traversal. Do not promote Chrome emulation.
- **POWER blur gate:** use the materially different operator-driven physical focus-transfer method documented in P15 native triage; P16 intentionally does not repeat P11's focus-driving automation.

## Final classification

`VERIFIED`: P15 canonical integrity, Narrator installation/signature, NVDA absence on bounded paths/registry, current High Contrast OFF state, UIA API/root-tree readability, passive Win32 foreground observation, and historical P11 Win32 foreground-transfer facts.

`NOT_RUN`: target-app UIA tree in this session, Narrator spoken output, NVDA speech/browse/focus QA, native High Contrast rendering, and any new POWER blur/refocus run.

`BLOCKED`: Narrator spoken-output acceptance without an authorized interactive audio/transcript run; NVDA until an approved executable exists; native High Contrast while OS-setting changes are prohibited and the current state is OFF; target-app native UIA facts while no uniquely identifiable target window exists and browser ownership/launch is prohibited.

No native accessibility PASS is claimed.
