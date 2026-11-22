---
title: FCV588 V27 LCD rendering and visual atlas
date: 2026-10-15
summary: "Verified display-only fixes, four Chrome viewports and receipt-derived geometry; OEM acceptance remains HOLD."
---

# FCV588 V27 LCD rendering and visual atlas

## What happened
Continued the sole FCV-588 v2 plan in this Windows workspace. Actual Chrome reproduced 13 expected LCD/menu rendering assertion failures per viewport before changes. The same probe passed 17/17 per viewport after the fixes.

## Changes
Added a pure LCD presentation module for immediate Brill draft luminance, the existing five diagnostic color patterns, and semantic main-menu rows/categories/choice previews. Kept physical input reducers, world time, settings schema and canonical replay unchanged. Exported the normalized visual atlas from the executed receipts, without treating simulator coordinates as hardware measurements.

## Verification
Final npm run check: 333/333 PASS, no failures or skipped tests. Python: 11/11 PASS (7 browser-integrity and 4 atlas checks). Full real Chrome passed 1366x768, 1920x1080, 360x800 and 390x844, with actual response-body verification and stable source/harness receipts. Runtime manifest: 2b9003590613d42aba72bf98aa33d4cb4f4d5a6ae173c9328f5329e4b38545ed. Generators, recursive runtime assets, archive integrity and plan validation passed within their stated scope. All 17 new GREEN/full-suite screenshots were opened.

## Decision and next step
Retain profile19/settings18/core7/event5/replay7/scenario7/multi-runtime4. Canonical acceptance remains 14/50 checkboxes, 6/22 named Tasks, Phase1 only completed. All 65 feature claims and release remain HOLD. Exact OEM geometry, menu navigation, fonts, colors, independent review and hardware validation are not established. Continue from the V27 report and measured simulator atlas; do not copy OEM assets or promote unsupported claims.

AgentWiki publish skipped.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
