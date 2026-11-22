# FCV-588 V44 — BRILL × TrackPad source-bounded QA

**Date:** 2026-10-19. **Scope:** TEST-ONLY milestone for the offline FCV-588 PUBLIC_REFERENCE simulator. No reducer, firmware, faceplate, LCD, sensor transport, replay event schema or settings revision was changed.

## Source and decision

FURUNO [OME-23890-E §1.3](https://www.furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/fcv628_fcv588_operators_manual.pdf) explicitly permits ◄/► to adjust Brill, repeated POWER/BRILL changes the integer brightness range 0..9 with reflection at the endpoints, and ENTER/MENU/ESC or inactivity close the window. The manual consulted does **not** specify the next repeated-BRILL sweep direction after intervening TrackPad arrows, nor document Brill Up/Down behavior. These are **SOURCE_GAP**, not permission to invent new OEM control semantics.

Read [V44 source atlas](../../../docs/research/FCV588_V44_BRILL_PAD_SOURCE_ATLAS_20261019.md). GPT-6 authorized test-only GO while keeping the profile at F1-public-reference-21, since a firmware-specific mixed-input reducer change lacks a manufacturer oracle.

## Exact scope and artifact provenance

- Preflight readback of [V43 final integrity](../../../docs/qa/FCV588_V43_FINAL_INTEGRITY_20261019.json) SHA-256 **13e713bf6397561a0d42219462fd7c0c5bfb02d0e2aff16b0b8280ca50e8336e** and V43 postreceipt SHA-256 **7abfc97db2816e24a41cc3980e66b08340e407f6954e3ff032cc260ae9e03d14** both matched.
- Canonical and staged runtime source SHA **37/37**, no runtime modification from V43. Stage cloned 16 original training screenshot fixtures byte-identically; no manufacturer PDF, photo, firmware or extracted artwork inserted into runtime.
- Added exactly **one new Node test** to canonical: test/fcv588-v44-brill-pad-contract.test.mjs (seven tests) and one research atlas; V44 plan/report/QA evidence files were also added without changing product source. Canonical apply receipt SHA **b1d9e6a596cbf90e3471eeb2ba655b9520654de9cfc9bd3f2e6665e85534fbe1**.
- The staging validation command initially exited 1 **after creating a valid JSON manifest**, due to a PowerShell property enumeration expression returning a sequence of counts rather than scalar 37. Original manifest SHA **953e2c3761ce1ad383b1a3a08fd4c27c77a9f6921918194fdf22c93c20b9fa4e** was not overwritten. A separately recorded GPT-6 STOP/GO and corrected readback `@($j.sourceHashes.PSObject.Properties).Count` confirmed 37, with no source change.

## Deterministic TDD, mutation and Python

Staged new tests **7/7 PASS** on actual V43 source, then one deliberately corrupted **disposable staging-only** BRILL TrackPad timer assignment failed **6/7 tests**, correctly targeting the intended stale idle-timer behavior. The original mutation RED log SHA **f49f5a34c8c5b33720e4b25bddf45840bcc7038840d8e5aac0f3328adb7fb91d** is preserved. The exact original source bytes were restored, SHA readback matched V43 model.mjs **45ed40e44e0af6434ae3f17249d5f9c52081be77bd7302738b7ac39b37a8db11**, and new tests returned **7/7 GREEN**.

- Staging full Node **491/491 PASS**, Python **13/13 PASS**.
- Canonical targeted Node (V43 + V44) **13/13 PASS**; full Node **491/491 PASS**; Python **13/13 PASS**.
- No changes to F1-public-reference-21, event schema 5, core f1-core-7, replay envelope 7 or settings schema 18. There was no change to synthetic world/sensor state or physical IO.

## Browser and Windows checks

Stage and canonical independent Chrome/Playwright runs each passed **114/114 assertions** on **320×720, 375×812, 768×1024, 1366×768, 1440×900, 1920×1080**, plus **210/210 actually browser-loaded localhost HTTP response-body SHA** and **12/12 source-pinned screenshots** per run. Two stage desktop/mobile snapshots were opened and inspected; Brill draft 7 was visible, D15 external and responsive training layout unchanged.

Actual CoS Desktop attached Chrome at **1912×970** separately observed real POWER/BRILL and TrackPad clicks showing draft sequence 9→8→9→8→7, one immediate ENTER commit followed by readback 6, and REPLAY PASS. A separate delayed ENTER occurred after auto-close and was NOT counted as commit PASS. See [actual attached Desktop partial audit](../../../docs/qa/FCV588_V44_DESKTOP_MANUAL_PARTIAL_20261019.md). Connector screenshot reference is not a SHA-backed workspace PNG; console errors captured after attach: 0.

Canonical localhost HTTP root 200 with `connect-src 'none'` and `nosniff`; negative routes **4/4 denied** (404,404,403,405), QA receipt SHA **58ddf078592ab3793881379f16083eb88e6b24989e76e8b788be6070c37c0590**. No external network or real device transport. Temporary owned ports 4227/4228 stopped after QA.

## Acceptance and V45 candidate

**Phase 6 OPEN, 65/65 claims HOLD, checklist 14/50, named tasks 6/22, hardwareValidated=false, installedFirmware=UNKNOWN, OEM redistribution rights HOLD and releaseApproval=HOLD.** No claim of exact OEM geometry, luminescence, mechanical timing, true sonar accuracy, equivalent hardware or navigation safety.

V45 candidate: prioritize obtaining lawful original FCV-588 firmware identity / operator evidence to settle mixed BRILL TrackPad directional semantics; independently perform OS Narrator/NVDA spoken-output tests, native attached 1366×768 and 1920×1080 viewports, and genuine focus-loss/pointer-cancel holding semantics in an authorized controlled Windows environment. When not available, keep those checks NOT_RUN rather than weakening tests or claiming percent OEM fidelity.
