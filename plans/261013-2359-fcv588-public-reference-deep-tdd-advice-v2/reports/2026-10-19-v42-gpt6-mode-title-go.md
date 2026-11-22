# V42 — GPT-6 conditional GO for exact MODE dialog title
Date: 2026-10-19. Supervisor: GPT-6, user-authorized in-chat self-review. This is not an independent OEM or installed-firmware review and the client Extra High setting was not verified by project tools.

## Authority and proven mismatch
The manufacturer-hosted FCV-628/FCV-588 Operator's Manual OME-23890-E section 1.4 illustrates the selection window title as MODE with seven choices. Primary URL:
https://www.furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/fcv628_fcv588_operators_manual.pdf
The canonical V41 read-only LCD projector instead titled this window MODE SELECT, an independently invented suffix. Correcting the literal is source-bounded UI presentation alignment, not physical/menu-pixel calibration or evidence of a specific installed firmware version. No OEM media was copied or reused.

## Executed staged TDD and QA
V41 canonical final receipt SHA 5d60b6c79b6ab7f3e2812e1e17f2226feba626ac60f7b91da78179f140c1f96d.
V42 37/37 runtime source baseline SHA clone; targeted original RED 2 PASS/1 FAIL (actual MODE SELECT vs expected MODE), original log SHA 7471271290b94cadd621b29b546dffb2150bf6b76a53085ed29ad9d0b93b9995 preserved.
Staged literal correction: 3/3 focused GREEN, full Node 478/478 PASS, Python 13/13 PASS. First Python staging run stopped because 16 historical V27/V28 screenshots were missing from fixture copy; exact canonical PNG bytes copied into stage with 16/16 SHA, original fail log preserved. No test assertion or runtime behavior was changed to handle this fixture.
Staged six-context Chrome ran actual keyboard MODE knob rotation, MENU/ESC cancellation, RANGE and BRILL title smoke and replay: 120/120 assertions PASS, 210/210 loaded localhost HTTP response-body SHA, 12/12 PNG SHA; no actual Narrator/NVDA voice and no native OS-window exact viewport evidence.
Staging patch manifest SHA f091119619b5a881b3290922fb6241c19edf249c1ba0a3c02dcf6b8cc2fa4b63 proves exactly one runtime source changed from V41, 36 unchanged.

## Scoped integration permission
GO, conditional upon intact preimage SHA, to copy exactly:
- web/lcd-control-presentation.mjs: old SHA 0881d0567d7921a98085a7914ebc2628e9b2f6d2c23d9a5894e7f97f3bba808f; approved SHA a03cd467b8809ac2f67bc4eed6146c9eb113c1dbbbe1d73493d68e8491c73675.
- test/fcv588-v42-oem-mode-title.test.mjs: new staged test, exact SHA checked before copying.
- New V42 evidence/QA/atlas and roadmap documents later, never overwrite historical receipts.

Do not change core reducer, browser input adapters, schema, profile revision, replay, clocks, settings, D15, LCD geometry/CSS, sensor truth, hardware, rights, firmware settings, claims or release. Verify targeted Node, full Node, Python, Chrome + HTTP source binding, request denials, readback 37 SHA, final docs and postdocument Node. If any Verify fails STOP, retain log and decide narrow GO/NO-GO. Phase 6 OPEN; firmware UNKNOWN; 65 claims HOLD; release HOLD.