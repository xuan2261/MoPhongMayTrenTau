# FCV-588 P19 — Edge browser keyboard + native Windows QA readiness (2026-11-17)

## Decision

**VERIFIED / PASS_BROWSER_ONLY**: installed Microsoft Edge `157.0.4341.60`, test-owned port4219, **39/39** scoped ARIA/D15/keyboard/POWER focus-loss checks, **39/39** actual HTTP response bodies SHA match canonical source, no JavaScript page errors and no external requests. Test-owned server exited. P18 Chrome V2 remains previously sealed evidence; this P19 run does not repeat full P15/P16 suites.

**NATIVE_ACCESSIBILITY = BLOCKED / NOT_ACCEPTED**. No actual Narrator/NVDA utterance, native UIA for uniquely bound headed simulator Chrome/Edge window, native High Contrast rendering, or genuine OS-driven `window.blur` while POWER pressed was captured. The Edge check moves *button focus* to FUNC within headless browser and is not a Win32 foreground switch. A zero-detail `HTMLElement.click()` is programmatic activation, not observed native UIA Invoke or Narrator.

## New measured browser scope

- D15 tablist and 5 named tabs/panels: ARIA names and controls mapping, initial selected session tab, ArrowLeft/Right, End/Home, focus movement, Tab-to-panel, one visible panel, no machine event on instructor Escape or ArrowUp.
- Actual browser-keyboard adapter events through Playwright: Space down on POWER, `.pressing` true, move focus to FUNC, `.pressing` false and down→cancel, Space keyup emits no duplicate; no validation error. This test starts in a powered-off synthetic browser state; it is not a physical POWER shutdown test.
- Single synchronous zero-detail programmatic click on POWER creates exactly one down/up pair and clears pressing. Timers can affect event counts across separate calls in a powered-on hold overlay; never generalize these selected results beyond this source and fixture.
- `39` unique actual browser-loaded HTTP response paths, all response SHA equal on-disk canonical bytes at run and final seal, zero JS errors/external requests. No OEM JPEG served by this test server; P16 earlier gate retains its 404 evidence.

## Native readiness (read-only)

- Direct Windows preflight: Windows 10 Pro for Workstations `10.0.18363`; `Containers-DisposableClientVM` **Disabled**; `Microsoft-Hyper-V-All` **Disabled**, `Get-VM` command unavailable. Narrator and NVDA not running; HighContrast Flags `126` = OFF. There is no currently verified separate Windows QA session suitable for native acceptance.
- Independent READ-ONLY isolation review further observed: hypervisor absent, VMware installed with zero running VMs and registered guests listed as Linux/Ubuntu only; no known ready Windows guest. This does not establish that no other unregistered Windows VM exists. No instance was launched or altered.
- Independent READ-ONLY source/Edge oracle review inspected source/P18/P19 checks and found no source-valid defect; noted the P19 browser Space POWER focus-loss/cancel path is distinct from P18 Chrome V2 click test. These reviewer messages are in-session analysis, **not** independent OEM/native acceptance receipts.

## Source/provenance and change control

Parent P18 final SHA `57a6b279e76438373433160b56002f84edd401775b0f03eb4a8834b0240f02ee`; P18 independent postreceipt SHA `cc8c4b70482dd1151b5c0553715e207c636e3af814092c6b76f998fe3510f04a`. P19 Edge runner and receipt SHA are pinned in P19 final JSON. **50/50** canonical runtime and **8/8** OEM reference-only JPEGs rehashed exact. Source valid RED: none; no code/test patch, staging fix, canonical apply or full Node/Python rerun justified. Test-owned QA port4219 closed; user server 127.0.0.1:4173 PID1204 protected.

`F1 PUBLIC_REFERENCE v2`, synthetic training only, Phase6 OPEN, 65/65 claims HOLD, hardwareValidated=false, installed OEM firmware UNKNOWN, OEM rights not cleared, releaseApproval=HOLD. No physical device/OEM release conclusion.

## Specific next action (not another passive audit)

Provision or designate an **authorized isolated Windows QA session** with a uniquely bound headed Chrome/Edge simulator HWND/PID and operator control. First run a **genuine OS foreground-transfer POWER-hold gate** with synchronized Win32 foreground and browser `window.blur`, exact down→cancel event stream and power/status unchanged; record original failure if prereq absent. Separately use actual Narrator audio + human-verified transcript and UIA FocusChanged on 5 D15 tabs; NVDA requires approved executable; native High Contrast requires allowed isolated setting and restoration. Do not alter shared desktop accessibility settings to force a PASS.
