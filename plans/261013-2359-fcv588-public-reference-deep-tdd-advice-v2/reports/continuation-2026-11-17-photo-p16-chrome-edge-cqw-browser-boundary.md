# P16 — Chrome/Edge cqw and Windows native boundary (2026-11-17)

**Decision: CURRENT_BROWSER_GO / OLD_BROWSER_SOURCE_GAP / NATIVE_ACCESSIBILITY_NOT_ACCEPTED.**
No canonical runtime or test source changed; P15 final integrity and independent postreceipt retain their exact preimage SHA.

## Evidence and browser support

- Real installed Chrome **157.0.8103.79** and Microsoft Edge **157.0.4341.60** tested sequentially, headless through the existing Playwright 1.57 Windows runner, on a single test-owned local server port4217. **82/82 checks PASS** across 375x812, 1366x768 and 1920x1080, with working `CSS.supports('font-size','3cqw')`, `container-type:inline-size`, uniform 480/640 logical canvas scaling, fixed-size desktop LCD typography, AP-1 13-row Sounder menu, and no horizontal scroll or external requests.
- Exact body evidence **234/234 HTTP SHA** matched the canonical source files. Four screenshots match their receipt SHA and **2/2 Chrome-vs-Edge viewport pairs are identical decoded RGBA pixels**. Eight protected original-photo routes return 404; user server `127.0.0.1:4173` PID1204 untouched, test port4217 closed.
- Real-browser receipt: `plans/261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261117/p16/P16_CHROME_EDGE_CQW_BROWSER_GATE_20261117.json` SHA `049ee483023fe4caf04971d3a4349d8e8d633e5544a2367c94d806cfc8505ca2`.
- Independent source review: `plans/261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261117/p16-compat/P16_CQW_SOURCE_COMPATIBILITY_REVIEW_20261117.md` SHA `d178b8375445352c8eecd1fad1f80142f289266e4ba9f9a1f3284b10e692c05f`. It finds **no current source-valid runtime defect or reason to rebaseline P15**, but older Chromium/WebView without `cqw` and `container-type:inline-size` is **SOURCE_GAP**, not a tested PASS. Source compatibility references: https://caniuse.com/css-container-query-units ; https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries . Chrome/Edge feature support begins at version 105 (external compatibility table, not a locally tested 105 build).
- Unsupported older engines would ignore P15 G2 cqw typography declarations. **No CSS fallback is added** because the project does not yet declare a versioned old-browser support target, and no old browser binary is available for authoritative QA. If explicitly required, stage a source-valid fallback and test on that exact pinned older executable before any guarded canonical change.

## Native accessibility boundary

- Independent Windows readiness evidence: `plans/261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261117/p16-native/P16_NATIVE_ACCESSIBILITY_FACT_GATE_20261117.md` SHA `f726ff6a101a65b03bcc1af3b3d8a0d04d4e9346ae4d788e5bc71ecb55b385ef`.
- Browser/ARIA contracts are not native Narrator speech, NVDA, high contrast or real POWER window.blur delivery. The independent native report's actual statuses take precedence; **none is upgraded to native PASS merely from browser emulation or executable presence**.

## Invariants, unknowns and next practical milestone

- P15 source **50/50 SHA** unchanged; 8 original OEM JPEG unchanged, reference-only and HTTP404. All protected P14/P15 receipts untouched. No Git claims, no release/install, no vessel connection, no OEM property copied into runtime.
- **65/65 claims HOLD**, F1 Phase6 OPEN, firmware installed UNKNOWN, rights and releaseApproval HOLD, hardwareValidated=false. OEM pixel/physical fidelity remains SOURCE_GAP. `2016` photos lack independent EXIF capture timestamp confirmation.
- **Next:** Only if an old Windows browser is a required deployment target, obtain and pin its exact binary/version SHA then test or add a bounded CSS fallback. In a separately authorized non-user QA Windows session, perform operator-observed Narrator/NVDA/native High Contrast and physical keyboard focus/POWER blur tests; never toggle user OS accessibility settings without approval.
