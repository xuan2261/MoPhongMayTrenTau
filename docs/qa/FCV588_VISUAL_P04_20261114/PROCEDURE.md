# FCV-588 P04 bounded integrity — 2026-11-14

These are **write-once** source- and QA-bound software receipts, NOT certificates of OEM conformity, media redistribution rights, maritime hardware compatibility or release approval.

1. `p04_final_integrity.py` must run from the Windows workspace after the guarded P04 canonical apply, fresh Node/Python canonical tests and fresh seven-case canonical Chrome test. It pins P03 parent seals, P04 backup/journal/allowlist, 39 runtime SHA, staged/canonical actual-loaded browser response bodies, screenshots, eight source-photo SHA, and all 65 HOLD claims. A failed assertion never creates the final JSON.
2. After the final SHA is known, pin it in `p04_independent_postreceipt.py` and perform a separate read-only re-verification; the only new output is its exclusive-created postreceipt JSON.
3. Do not overwrite original P02/P03/V57 receipts, RED/FAILED logs, source photos or staging folders. Do not change runtime after either seal without a new approved scope and fresh QA.

**Scope:** P04 selected Bottom Lock relative/flat display, DUAL readout across divider and NAV box hierarchy only. Staging/canonical Chrome seven cases cover five 1366×768 screens, one 375×812 DUAL and one 1920×1080 NAV2. Remaining seven-mode / three-zoom / full viewport matrix, OEM exactness, installed firmware, physical controls, real hardware and source-photo redistribution rights stay OPEN/HOLD. A medium-severity potential synthetic false-BL anchor from a future broad near-bottom fish-only return still needs separate negative tests; not observed in the bounded current training scenario.
