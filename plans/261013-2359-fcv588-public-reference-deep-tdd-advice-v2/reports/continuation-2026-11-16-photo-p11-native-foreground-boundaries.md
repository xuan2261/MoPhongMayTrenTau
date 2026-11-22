# FCV-588 — P11 real Windows foreground vs browser focus (2026-11-16)

**Bounded disposition:** `P11_WIN32_FOREGROUND_TRANSFER_PROVEN_BROWSER_BLUR_NOT_VERIFIED_RELEASE_HOLD`. Canonical `C:\Work\MoPhongMayTrenTau`, F1 PUBLIC_REFERENCE v2 synthetic training only. No product code/firmware/hardware/OEM media change, no release or 100%-similarity acceptance.

## Source and independent method

- Parent P10 final SHA `414c0151053bec55271032170e0fba2139fd1627e5fee7524cdf6c1bcf490655`, post SHA `df2cb60996da7f3f557642f329d794198aea9a85ac8fe5084429bee1931c12dc`. Independent source verification P11 baseline SHA `2474185023238fa8f707896f75783a0c11d2e8b1f92f0e36761f59f98e0a00d6`: canonical runtime39/39 and 8/8 original reference-only JPEG SHA unchanged; user server127.0.0.1:4173 PID1204 unchanged. No Git repository claim.
- Independent Win32 focus-method receipt SHA `b9d3586df5bbb1459ee68a478ce70652cd1a99e618edb5bc14c73161f4ef73b9` requires exact Chrome native executable, top-level HWND/PID/foreground **before** POWER down; a separate different Win32 foreground HWND/PID thereafter; only trusted browser `blur` plus POWER cancellation is native acceptance. DOM `document.hasFocus` or `event.isTrusted` in isolation does not prove a physical human action or OS foreground change.

## Actual four QA attempts — ALL prior failure receipts preserved

| Trial | Setup/observed fact | Outcome | SHA-256 |
|---|---|---|---|
| V1 | Exact Chrome HWND discovered but automatic foreground activation denied | `FAILED_OR_BLOCKED` | `278ce6ea6ee9cbb08019b06d7c298a7e274502ec92a57934feada2acbf676f68` |
| V2 | Desktop activation established true Chrome foreground and POWER down; foreground failed to transfer to witness | `FAILED_OR_BLOCKED` | `6da4ac654775d18f4baff20a76c4dd6bedfee8ed67924c1d3c0a6d08e7f59c2c` |
| V3 | Playwright-controlled Chrome FG and test-owned Python witness FG both proven by Win32; POWER pressing; browser still `hasFocus=true`, no post-transfer `window.blur` | `NOT_VERIFIED` | `11e6cebec18c12ff63b34eee1644d30a6bdbeebe53034b2b0204d2073e0f2669` |
| V4 | Standalone Google Chrome with isolated profile + Win32 injected SPACE input; Chrome FG and witness FG both proven; still no Chrome `window.blur` and POWER pressing remains | `NOT_VERIFIED` | `908948ccc7dc5d48b5c4025dfc79571cb3e238ac49ddf09a120febcbde3832d2` |

In V3/V4 the app recorded the initial POWER down edge, and the browser power button held state was observed before Win32 transfer; the actual witness became foreground, but the browser remained logically focused and no observed trusted window-blur event was delivered. **No source-valid FCV-588 application bug was proven**: `web/hold-input.mjs` already subscribes to `windowTarget.blur` and cancels held controls when such a browser event is received. Previous P10 Node17/17 synthetic adapter checks still apply only to their bounded software contract.

No native Narrator/NVDA spoken output, Windows native High Contrast or physical FURUNO instrument input was tested. Win32 injected SPACE is not a human keyboard press. P11 did not patch product runtime or weaken tests. The V4 owned isolated Chrome profile was cleaned after its failed check; QA ports4211,4212,9225 and earlier 4207–4209 closed; port4173 preserved.

## Independent verdict, final seals

- Independent fresh-context reviewer SHA `33df2e66e63ee173a5fca9293da7f2d26e0ed7a96a8ae6280c857b5291658667`: `GO_IMMUTABLE_EVIDENCE_MATCH`, browser native blur `NOT_VERIFIED`, product defect `NOT_ESTABLISHED`. All historical failed receipts preserved, 39/39 runtime and 8/8 reference originals matched.
- `docs/qa/FCV588_P11_NATIVE_FOCUS_BOUNDARIES_20261116/FCV588_P11_NATIVE_FOCUS_FINAL_INTEGRITY_20261116.json` SHA `845b4fe9cf9b184a74ddba91783362e9446c1219d38362c16166d4b3d6a44c87`.
- `docs/qa/FCV588_P11_NATIVE_FOCUS_BOUNDARIES_20261116/FCV588_P11_NATIVE_FOCUS_INDEPENDENT_POSTRECEIPT_20261116.json` SHA `392220f62ae29c2f1bf77b73c90d016b1a3a40e115a8c04612ce59a728b09f98`. This postreceipt is fresh local byte readback binding the independent reviewer, **not** a second native focus acceptance.

## Next meaningful action; no repeated attempt without new oracle

Stop launching the same focus harness: both Playwright-controlled and standalone Chrome with native Win32 key injection reproduced a gap between OS foreground and browser focus reporting. Reopen only after a materially different justified interactive focus-observation technique is available, with separately observed Win32 activation/focus messages and browser event provenance, or a controlled native-human keyboard session. Do not modify `web/hold-input.mjs` without a source-valid RED. A separate actionable stream is Narrator/NVDA real spoken transcript capture with approved loopback and OS High Contrast, or firmware-language/source/physical LCD reference acquisition.

F1 Phase6 `OPEN`; 65/65 public claims `HOLD`; `hardwareValidated=false`; installed firmware `UNKNOWN`; OEM photo rights `REFERENCE_ONLY/HOLD`; `releaseApproval=HOLD`. Full P07 and calibrated active LCD ROI remain open.
