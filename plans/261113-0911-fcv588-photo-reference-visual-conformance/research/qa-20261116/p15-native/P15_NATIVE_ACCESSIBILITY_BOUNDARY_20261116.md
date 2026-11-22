# P15 — Windows native accessibility/focus boundary triage

Date: 2026-11-16  
Reviewer: worker-18  
Mode: READ-ONLY triage; one write-once QA report only  
Canonical root: `C:\Work\MoPhongMayTrenTau`

## Result

Current product source and browser QA are sufficient to keep native accessibility testing meaningful, but they do **not** certify native screen-reader speech, Windows High Contrast, or POWER cancellation on a genuine browser `window.blur`.

P14 canonical is unchanged at review time: all 50 runtime paths rehash exactly against `FCV588_P14_VERSIONED_REPLAY_FINAL_INTEGRITY_20261116.json` (`50/50 EXACT_SHA256`). The P14 final-integrity file currently hashes to `195d0737b602196bddb5971964500dabab41d19eaee08b5b620e97f26089e99e`; its independent postreceipt hashes to `2dfeb190a2160fb4e6f24988fa7d054b2dd0098f14c378901068cef6321b8754`.

P11 remains correctly bounded: V3 and V4 proved actual Win32 Chrome foreground ownership before POWER down and a real foreground switch away from Chrome to a different HWND/PID, but Chrome still reported `document.hasFocus() === true`, no post-POWER trusted browser `window.blur` was observed, and the POWER hold remained active. Native POWER blur cancellation therefore remains `NOT_VERIFIED`; those runs are not a browser-blur PASS and do not establish a source-valid product defect.

## Evidence classification

| Area | Status | What is actually established | Native boundary / source gap |
|---|---|---|---|
| P14 canonical bytes | **VERIFIED_ACTUAL** | Fresh P15 readback matches P14 runtime manifest `50/50`; P14 software Node/Python/Chrome evidence remains the sealed software baseline. | Native accessibility remains outside P14 acceptance. |
| POWER hold adapter source | **VERIFIED_SOURCE/BROWSER_CONTRACT** | `web/hold-input.mjs` registers button blur and `window.blur` cancellation; synthetic unit fixture proves delivered blur produces `down -> cancel` and clears `.pressing`. | This does not prove Windows/Chrome will deliver the native browser blur in the tested environment. No app-source gap is demonstrated. |
| POWER native foreground setup | **VERIFIED_ACTUAL_NATIVE_PARTIAL** | P11 V3/V4 proved Chrome HWND/PID/executable foreground before POWER input and a later Win32 foreground switch away from Chrome. | Browser `window.blur` delivery/cancel remains **NOT_VERIFIED**. P11 used automation/injection, not a human physical keyboard. |
| POWER keyboard input in P11 | **VERIFIED_ACTUAL_AUTOMATION_INPUT** | V3/V4 produced one POWER keydown and visible pressing/event-count increase in real Chrome. | V3 used browser keyboard automation; V4 used Win32 keyboard injection. Neither is physical-human input evidence. |
| D15 five-tab keyboard behavior | **VERIFIED_ACTUAL_BROWSER** | P07 Chrome receipts at 375x812, 1366x768 and 1920x1080 traverse all five D15 tabs and end with `d15-tab-sources`; source implements ArrowLeft/ArrowRight/Home/End, roving `tabindex`, `aria-selected`, focus movement, and prevents FCV shortcut routing from `.training-panel`. | This verifies browser behavior, not Narrator/NVDA speech or physical-human keyboard provenance. |
| D15 semantics / ARIA | **VERIFIED_SOURCE** | Five `role=tab`, five `role=tabpanel`, tab/panel bindings, polite atomic status regions, and non-global LCD live region are present. | Exact screen-reader utterance/order is an external observation oracle; it cannot be inferred from DOM/ARIA alone. |
| Narrator availability | **VERIFIED_NATIVE_READINESS** | Windows Narrator executable exists, signature/hash/version were observed; UI Automation APIs are available. | Actual Narrator speech/transcript is **NOT_RUN / BLOCKED**. No trustworthy transcript channel was found; source labels are not a substitute for observed speech. |
| NVDA | **NOT_RUN / BLOCKED** | P08/P10 found no NVDA executable, process or uninstall registration on bounded standard paths. | Requires approved NVDA installation or known portable path before any native speech/browse/focus-mode QA. |
| Windows High Contrast | **NOT_RUN** | P08 read-only registry observation found High Contrast OFF. Current CSS has generic focus-visible/focus-within rules and no explicit `forced-colors` or `prefers-contrast` rule. | P10 only verified Chrome `forced-colors` emulation at one viewport. Native Windows High Contrast rendering remains untested. |
| Chrome forced-colors emulation | **VERIFIED_BROWSER_ONLY** | P10 emulation showed `forced-colors` match, POWER visible with solid 3px focus outline, five D15 tabs/panels present, and no page errors at 1366x768. | Emulation is not evidence that Windows native High Contrast was enabled or visually acceptable. |

## Current source bindings

- `web/hold-input.mjs` — `2d2f13800e77f1b01eadf3808c935d4bc0f3b78cf24f42aeb5cf14275de2d086`
- `web/instructor-tabs.mjs` — `0cb956f9b940f619468c3cf6c31e8d4fcad1758054c35ac1df839c2da26b5800`
- `web/keyboard-shortcuts.mjs` — `f80cb8558844703fa9ac0e9b4a4cf29a558164d3f738e083f36b9aa644052ddb`
- `web/index.html` — `6918d1b5e587034c5253977dd42dec87e8e47ae604bd26388b7389846cc74847`
- `web/styles.css` — `2925f129251caf72a71c846484d2f4facbb1d02d6480309b98d8399e800f4660`
- `test/hold-input.test.mjs` — `22387a216648038f06f2174a0621b0058d3696fc1f05ecb2aa1cd0e87ce00bc4`
- `test/fcv588-device-focus.test.mjs` — `cfc5aff3ee1f835cceb2c91ff37dcd04f8097674acf2bf3803af398623856250`
- `test/fcv588-public-keyboard.test.mjs` — `56f836480f384ecf7a67cb97b31756eb7d64d6cf7a27053e0b9b6ca8c79b256d`

## Smallest decisive native focus test that does not repeat P11

Priority test: **operator-driven physical focus transfer with passive observation only** on an isolated QA Windows desktop/session.

This test must deliberately avoid the P11 mechanism that already failed or produced ambiguous browser focus behavior: no `SetForegroundWindow()` to a test-owned witness, no Playwright `bring_to_front`, no Win32 keyboard injection, no automation-driven window activation, and no synthetic `blur` dispatch.

Minimal sequence:

1. Start a QA-owned loopback page in an isolated Windows QA session; bind the run to exact P14/runtime/source/browser hashes. A passive observer may record timestamps, `GetForegroundWindow()` HWND/PID snapshots and browser focus/blur state, but it must never request or force focus.
2. Human operator brings Chrome to foreground normally, physically tabs to `#key-power`, records visible event count `N`, and physically holds Space. Accept precondition only if POWER becomes visibly `.pressing` and event count becomes `N+1`.
3. While Space remains physically held and before the long-hold threshold, the operator uses the normal Windows shell path to switch to a pre-existing benign window, preferably by a real mouse click or Alt+Tab. No Python witness helper is created and no foreground API is called.
4. Passive evidence must show foreground actually left the Chrome HWND/PID. Browser evidence must independently record a real `window.blur` after POWER-down. The UI must then show `.pressing` cleared, event count exactly `N+2`, and power/status unchanged.
5. Release Space while Chrome is still backgrounded. Event count must remain `N+2`. Return to Chrome manually and perform one fresh short POWER key press/release to prove no stranded hold remains.

Acceptance split is intentionally fail-closed:

- Win32 foreground changed **and** browser `window.blur` observed **and** `N -> N+1 -> N+2`, pressing clears, power/status unchanged: native POWER blur cancellation can be marked **VERIFIED** for that environment/run.
- Win32 foreground changed but no browser `window.blur`: classify **ENVIRONMENT/BROWSER FOCUS GAP** again and stop. Do not rerun the same method repeatedly and do not call it a product defect.
- Browser `window.blur` is observed but `.pressing` stays set or cancel event/state is wrong: this is the first condition that would support a **source-valid product defect** in the blur-cancel path.

Feasibility: **HIGH with an authorized isolated interactive Windows session**. It needs only human input plus passive logging; it does not require OS accessibility-setting changes, a helper foreground window, or injected keyboard/focus control. The current P15 session is intentionally read-only, so this test is **NOT_RUN** here.

## Smallest screen-reader / contrast checks

### Narrator

Feasible next native check: operator starts Narrator in an isolated QA session, then performs one short physical-keyboard D15 traversal: focus `d15-tab-session`, ArrowRight to Help, End to Sources, Home back to Session. Capture actual system-render audio and a synchronized UIA `FocusChanged` timeline. A human-verified transcript must be derived from captured audio, not from DOM labels.

Status now: **NOT_RUN / BLOCKED for auditable spoken output**. The blocker is evidence capture, not DOM readiness. UIA can prove which accessible object had focus but cannot prove the exact words, ordering, pronunciation, verbosity or interruption behavior Narrator emitted.

### NVDA

Status now: **BLOCKED / NOT_RUN**. No bounded install/path was found. The smallest valid future test begins only after an approved NVDA executable exists; then use Speech Viewer plus the same short D15 keyboard path and bind output to NVDA version/configuration and source hashes.

### Windows High Contrast

Status now: **NOT_RUN**. Chrome forced-colors emulation is only browser evidence. A native test requires temporarily enabling Windows High Contrast in an explicitly authorized QA session, then checking POWER focus visibility, selected D15 tab, menu selected/disabled rows, text/background legibility and focus recovery. Because P15 forbids OS setting changes, this remains blocked from execution in this review.

## Browser-only assertions that must not be promoted to native PASS

1. Synthetic `EventTarget` blur in `test/hold-input.test.mjs` proves handler semantics only after a blur is delivered.
2. P07 Chrome D15 keyboard traversal proves browser tab/focus behavior, not physical-human input or screen-reader speech.
3. P10 Chrome forced-colors emulation proves one emulated rendering path, not Windows High Contrast state.
4. DOM roles, accessible names, `aria-live`, UIA `Name` and focus properties are expected semantics; they are not Narrator/NVDA transcripts.
5. `KeyboardEvent.isTrusted`, automation keydown, Win32 injected keydown and native foreground HWND evidence do not individually prove a physical-human key event or a browser `window.blur`.

## Recommendation

Do not repeat P11 V1-V4 focus-driving automation. The next useful native focus run should be a single operator-driven physical window switch with passive logging and explicit stop conditions above. Narrator can be tested separately with a short D15 path if actual audio capture and human transcript verification are available. NVDA and native High Contrast stay blocked until their respective executable/authorization prerequisites exist.

No product runtime, tests, user Chrome, Windows accessibility setting, process/server, P11/P14 evidence or original reference image was modified by this review.
