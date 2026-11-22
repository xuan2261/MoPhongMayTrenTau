# P18 — Bounded Chrome accessibility / Windows native boundary (2026-11-17)

## Verdict

**VERIFIED browser-only, native acceptance BLOCKED.** On installed Google Chrome 157.0.8103.79, test-owned localhost QA port 4218 measured D15 keyboard tab navigation, focus routing, instructor isolation, and synchronous zero-detail programmatic native-button activation fallback. Chrome V2: **23/23** checks PASS, **39/39** loaded HTTP body SHA match canonical source, zero JS page errors, zero external requests; QA server exited. No Chromium UIA, Narrator/NVDA spoken words, native High Contrast or physical POWER-window.blur has been accepted by these browser checks.

## Evidence and failure preservation

- Preimage: P16 final SHA `d40287d951c887581ce3a1d1776ed7707add77c7393c86362fc13ef03000ab90`, P17 report SHA `11e1bd67da74818e25a1c6baa94021d9bb79e4e0011c0301bf29bab6ce9480a7`. P15 final/post SHA exact to P16 pinned values. Canonical source **50/50**, original OEM REFERENCE_ONLY JPEG **8/8** exact; no edits.
- `P18_D15_CHROME_KEYBOARD_GATE_20261117.json`: original 22/23 FAIL retained. Observation: POWER `click()` event-count delta was 3 against expected 2. The timer can enqueue a periodic synthetic world tick between two separate Playwright calls used to read counter before/after. This is a harness measurement race, not a demonstrated product defect.
- `P18_D15_CHROME_KEYBOARD_GATE_V2_20261117.json`: replacement independent write-once run (23/23 PASS). Before/click/after counter was read in the **same page JavaScript turn**. This tests a programmatic zero-detail `HTMLElement.click()` contract; it is **not** an actual assistive-technology/UIA Invoke run. It must not be promoted to native accessibility acceptance.
- Port 4218 was test-owned and cleaned after both runs; protected user server 4173/PID1204 was not touched. No screenshots required or created for this keyboard charter.

## Parallel read-only findings

- Source reviewer inspected live `web/instructor-tabs.mjs`, `web/hold-input.mjs`, `web/keyboard-shortcuts.mjs`, `web/index.html`, current tests and P16 native gate; no source-valid accessibility defect found. D15 roving tab and focus are internally coherent; synthetic browser checks do not prove screen-reader speech.
- Native-feasibility reviewer inspected P16/P17 and Windows executable/state facts read-only; Narrator is installed but not running, NVDA executable not found on bounded standard paths, High Contrast OFF. FFmpeg discovered on machine is **not** a substitute for audible Narrator evidence and was not used. No settings, system audio or UI focus was changed by reviewers.

## Native acceptance blockers

- Narrator spoken output: **BLOCKED/NOT_RUN** until a permitted isolated interactive Windows session, unique target Chrome HWND/PID, actual speech-audio capture and human-verified transcript.
- NVDA speech/focus: **BLOCKED/NOT_RUN** until approved portable/installed executable and actual speech evidence.
- Native Windows High Contrast: **BLOCKED/NOT_RUN** while HC OFF and changes to shared Windows setting are prohibited.
- POWER genuine window.blur cancellation: **NOT_YET_VERIFIED**; requires real operator-driven focus transfer yielding browser `window.blur` and a validated down→cancel sequence. Historical P11 foreground switch without browser blur is insufficient.
- Target-app native UIA traversal: **NOT_RUN**; no uniquely bound QA Chrome window, and the FCV588-named Explorer directory window from P17 is not the simulator.

## Scope and release decision

P18 QA-only, **NO_CANONICAL_RUNTIME_CHANGE**. No source-valid RED, no staging patch, no guarded canonical apply, no independent canonical GO required, and no full Node/Python suite rerun (same 50 source SHA). P15 full regression and P16 Chrome/Edge gates are historical sealed evidence, not P18 reruns. `F1 PUBLIC_REFERENCE v2`, synthetic training only. Phase 6 OPEN, 65/65 claims HOLD; firmware installed UNKNOWN, hardwareValidated=false, OEM rights HOLD, releaseApproval=HOLD. Next useful step: authorized isolated Windows native session with target-window binding and real speech/High Contrast/blur oracles; do not repeat passive reports.
