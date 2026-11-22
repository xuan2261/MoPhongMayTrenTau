---
title: FCV588 V28 official visual reference corrections
date: 2026-10-15
summary: "Source-observed placement corrections, TDD and four-viewport Chrome evidence; hardware conformance remains HOLD."
---

# FCV588 V28 official visual reference corrections

## What happened
Viewed the actual official FURUNO USA front, Bottom Disc and White Line gallery images in the connected browser. Used qualitative placement observations only; no OEM pixels or font files were imported into the simulator.

## Changes
Replaced the original U-frame with an independently drawn central pedestal, moved the small brand label into the LCD surround, placed sonar depth at lower left and lifted it only for a painted eligible BDS panel, rendered one vertical original-palette legend, and displayed the committed picture rate. A follow-up actual-painter test reproduced a top range-label collision and verified its correction. Kept reducers, input contracts, settings and replay versions unchanged.

## Verification
Reference TDD: 34 expected visual failures and 20 baseline passes, followed by 54/54 GREEN. A distinct FINAL probe after the label correction passed 54/54. Existing LCD regression passed 68/68 on V28. Final full Node 342/342 and Python 13/13 passed. Full Chrome passed all four required viewports, with actual response-body SHA verification and stable source/harness receipts. All 25 final-state screenshots were opened. Runtime manifest: 79eb71132e233571b3f45454f55095c73292343ce7134405f38d4caa5ba65ab3. Historical V27 atlas and intermediate receipts were retained; a separate V28 atlas was exported and checked.

## Decision and next step
No source/rights/firmware or hardware-equivalence gate was promoted. Plan remains 14/50 checkboxes, 6/22 named Tasks, Phase1 alone completed; all65 claim decisions and release HOLD. Continue the source-backed White Line/menu adjustment review without guessing values or treating one image as full firmware proof. No Git, install/update, server restart, real hardware interface or deployment was performed. Independent reviewer and Kongming approval remain unverified.

AgentWiki publish skipped.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
