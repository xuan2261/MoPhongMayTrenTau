# FCV-588 V39 — Phase 6 actual speech, native browser and focus audit

**Date:** 2026-10-18. **Result:** Phase 6 OPEN / required manual and speech gates **HOLD**. This is a scoped browser/tool availability and source observation report, not OEM/hardware acceptance.

## Real assistive technology: NOT_RUN

Windows preflight read-only observations:

- `C:\Windows\System32\Narrator.exe` exists, but no `Narrator` process was running.
- NVDA was not present in common program/app-data paths and no `nvda` process was running.
- No dedicated isolated Windows accessibility session with a verifiable speech/audio capture was available in this run.
- Narrator was **not launched** in the user's primary desktop. No reviewer heard or recorded speech of the D15 h4 card headings or source transition live region.

The prior V36 DOM/ARIA snapshots and keyboard/focus regression tests remain useful **software** evidence but **cannot count as actual spoken output PASS**. An isolated screen-reader environment with explicit reviewer/audible-output evidence remains the prerequisite for closing this gate.

## Real attached Windows viewport: NOT_RUN this run

The prior V38 Desktop browser observation recorded an attached Chrome tab at **1912×970**, and its window-resize attempt was blocked by the tool *before execution*. The prior separate actual Google Chrome Playwright tests at **1366×768 and 1920×1080** passed under isolated contexts, but were **not CoS Desktop attached-window resize**. V39 did not forcibly resize a user-owned Windows browser or make any global display-settings changes. No new exact Desktop viewport claim is made.

## Actual V39 isolated Chrome tab focus experiment: FAIL / INCONCLUSIVE

Independent script:
`staging/fcv588-v39-options-navigation-import/tools/v39_browser_tab_focus_audit.py`
(SHA-256 pinned in its JSON receipt). It started one isolated headless Chrome 155.0.8059.80 browser context with canonical source matching **37/37 SHA** and an already running localhost-only server. The intended procedure held the browser's POWER key using Playwright keyboard input, opened a second page in the isolated context, moved that page to the front, and required that Chrome emit a genuine `window.blur` before asserting the FCV held-key cancellation. **No synthetic JavaScript blur event was dispatched.**

Observed first-run result:

```text
FAIL_OR_NOT_RUN_BROWSER_TAB_SWITCH
headless Chrome tab transition did not emit window blur
process exit code: 1
```

Frozen original evidence:

```text
staging/fcv588-v39-options-navigation-import/evidence/V39_BROWSER_TAB_FOCUS_20261018.json
staging/fcv588-v39-options-navigation-import/evidence/V39_FOCUS_CHROME_FIRST_20261018.log
```

This failure occurred on the *browser-event prerequisite*, **before** the application cancellation assertion. Do not classify it as a FCV product regression or as a passed keyboard-blur check. The branch was STOPPED, not silently retried or weakened by injecting `window.dispatchEvent(new Event('blur'))`. It cannot substitute for actual physical Windows OS-window focus loss.

## External source and rights gate

Manufacturer source/rights were rechecked in
`plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/reports/2026-10-18-v39-furuno-source-rights-recheck.md`. Product/manual and software-history links are current public references, but installed firmware is unverified; Furuno USA terms restrict redistribution of its copied content. No OEM media was copied into runtime.

## Next verified acceptance action

Run a **separate, controlled** Windows accessibility and browser manual test with readable/audible Narrator or NVDA output and genuine OS-window focus changes, without disturbing the owner's active desktop. Attach monitoring **before** reload and capture exact measured dimensions, focus/keyboard events, before/after screenshots and console/network. If the environment does not expose those capabilities, preserve `NOT_RUN/HOLD` rather than asserting an automated DOM substitute.

**Current release status unchanged:** `hardwareValidated=false`, `releaseApproval=HOLD`, 65/65 claims HOLD, checkpoint 14/50 and 6/22 accepted tasks.
