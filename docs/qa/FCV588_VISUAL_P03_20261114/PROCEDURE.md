# FCV-588 Visual P03 — final integrity and independent postreceipt

Scope: software/source QA for the P03 synthetic echo rasterization only. This procedure does **not** certify OEM fidelity, installed firmware, hardware behavior, media rights, or release approval.

## Write-once sequence

1. Require the guarded canonical apply receipt and backup to remain byte-identical:
   - `P03_BEFORE_APPLY_20261114.zip` SHA-256 `13091e895bd670a54a5ca7d04d36c56f76f3311fa8b9971ac7a43ba731092bba`.
   - `P03_CANONICAL_GUARDED_APPLY_20261114.json` SHA-256 `80244905d3090a6c7891ec7b4de7f3d6583835ba3df9f8983ac063776543912f`.
2. Pin the P02 parent receipts:
   - final SHA-256 `15ff0baab0b8bbe213c52857b630341a426305a7cf64eae9c07d1ac55f447d53`.
   - independent postreceipt SHA-256 `ce4a103a52940d41f453e0a67c5cc2f7ef43a3ce16ee149461140b5bb68bd405`.
3. Require the fresh canonical test logs: Node `535/535 PASS`, Python `13/13 PASS`, and verify their exact hashes through `p03_final_integrity.py`.
4. Require the stage browser V2 receipt SHA-256 `0ad1664795693a4d5d8977b68adc1b81906e4d6d893439172710f870a06798bf` and canonical browser receipt SHA-256 `61aac8d09e48e5aa948b9622b44e2516e848d2604928a423c7b7bbfa3f6dbcae`.
5. Browser evidence must be PASS and source-stable, contain the exact 9-case matrix, load the rasterizer with its canonical SHA, have zero console/page/request/external/body-read errors, verify every screenshot hash, and deny all eight original JPG URLs with HTTP 404.
6. Compare the 39 P03 runtime paths from the guarded apply manifest byte-for-byte between staging and canonical. The path set must equal the 38 P02 runtime paths plus only `web/fcv588-echo-rasterizer.mjs`; among the 38 common paths only `web/app.mjs` may differ from P02.
7. Re-hash all eight original JPGs. They remain `REFERENCE_ONLY_CLEARANCE_NOT_OBTAINED`; no copy or derivative is created by this procedure.
8. Re-read `docs/evidence/fcv588-public-implementation-status.json`: `hardwareValidated=false`, `rightsClearance=false`, `releaseApproval=HOLD`, no installed firmware assertion, and all 65 operator/teacher rows remain `claimDecision=HOLD`.
9. Run once from the repository root:
   `python docs/qa/FCV588_VISUAL_P03_20261114/p03_final_integrity.py`
   The script refuses to overwrite the final receipt.
10. After the final receipt exists, create/run the independently pinned `p03_independent_postreceipt.py`. It re-reads the final receipt and all critical evidence from disk and writes a separate postreceipt with exclusive-create semantics.

## PASS meaning

`P03_VISUAL_SOFTWARE_QA_PASS_RIGHTS_HARDWARE_RELEASE_HOLD` means the guarded P03 source integration, fresh test evidence, stage/canonical runtime match, actual canonical browser-loaded source, screenshots, photo denial, and filesystem evidence are internally consistent. Rights, hardware, firmware, OEM conformity, Phase 6 and release remain HOLD/open.
