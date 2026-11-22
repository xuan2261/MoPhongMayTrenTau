# P20 — Windows native direct QA (2026-11-17)

## Verdict

**VERIFIED native Windows UI Automation (scoped):** real installed Google Chrome 157 was run *headed* on Windows 10, with a unique HWND/PID/executable and `--force-renderer-accessibility`. Native `UIAutomationClient.AutomationElement.FromHandle` returned an app-exposing tree, 115 descendants. D15 tablist exposed `ControlType.Tab`, five named `ControlType.TabItem` with exact Vietnamese labels and stable AutomationIds. POWER and FUNC exposed native `ControlType.Button`, exact accessible Vietnamese names matching live DOM. This is a native **UIA semantics** check, **not** spoken Narrator or NVDA acceptance.

**FAILED required POWER native blur gate:** a separate headed Chrome run proved the test Chrome HWND/PID/exe owned Windows foreground before simulated Playwright Space-down on POWER. The Win32 foreground then **really switched** to the user's original JeikCode Desktop HWND/PID. During that switch Chrome `document.hasFocus()` remained true and no post-down `window.blur` was observed. POWER retained `pressing=true` and event count 2 instead of expected down→cancel (N+2); releasing Space emitted `up` as event 3. The expected window.blur→cancel branch was NOT exercised, and native POWER cancellation is **NOT ACCEPTED**. This observation alone does not prove a source defect: focus delivery under Chrome/Playwright/host is unresolved. No synthetic blur was substituted. Original foreground was restored. Test input was **Playwright browser automation**, not a human physical key press.

## Attempt ledger (preserve all)

- V1 direct Win32: HARNESS_BLOCKED_CHROME_NOT_FOREGROUND; UIA bridge PowerShell invocation failed. Receipt retained.
- V2 direct Win32: HARNESS_BLOCKED_CHROME_HWND_NOT_BOUND; Chrome window enumeration timing variable. Receipt retained.
- V3 direct Win32: interrupted during a Tk witness attempt; Tk child HWND was not its top-level HWND and became unresponsive. No complete V3 receipt was produced; runner and live tool transcript retained. Port/browser were subsequently checked clean. It is not a PASS.
- V4 direct Win32: Chrome and original user window foreground identities fully bound; Chrome→JeikCode foreground switch verified, browser window.blur not observed; failed gate and all event snapshots retained.
- UIA forced renderer attempt 1: harness Unicode reader thread failure; receipt HARNESS_ERROR preserved.
- UIA forced renderer attempt 2: native UIA tree observed, but PowerShell console encoding damaged Vietnamese evidence. Receipt preserved, not used for text acceptance.
- UIA forced renderer attempt 3: native UIA tree observed with exact UTF-8 Vietnamese labels, five D15 tab items, POWER/FUNC native button names. This is the accepted scoped UIA evidence.

## Safety, unchanged artifacts and release

All runs use one test-owned loopback server at 127.0.0.1:4220, isolated Playwright Chrome windows and profiles. No runtime/test/canonical edits, no host accessibility setting toggles, no Narrator/NVDA launch, no OEM source served, and no user server4173 restart. 50/50 canonical runtime SHA, 8/8 original OEM REFERENCE_ONLY photos and P19 final/post SHA were checked before sealing. No full Node/Python regression run (unchanged canonical).

P20 worker attempts for independent read-only audits did not start and cannot count as independent reviewers. This report and postreceipt are prime-owned QA, not independent OEM/hardware acceptance.

`F1 PUBLIC_REFERENCE v2`, synthetic training only; Phase6 OPEN, 65/65 claims HOLD; firmware installed UNKNOWN, hardwareValidated=false, OEM rights HOLD, releaseApproval=HOLD. No production release or percentage of OEM likeness is claimed.

## Next decisive action

Perform one **operator-driven** POWER-hold/physical-focus-switch run on this same Windows PC with browser HWND and actual DOM `window.blur` synchronized, using a bounded timer and passive Win32/UIA observation. If the browser delivers real `window.blur` but the app fails to cancel, classify as source-valid defect and stage minimal RED→GREEN; otherwise retain browser/automation focus gap. Narrator spoken output requires audio/transcript; native High Contrast requires explicitly permitted temporary OS setting change and restoration. Do not repeat Chrome/Edge browser-only tests that already passed.
