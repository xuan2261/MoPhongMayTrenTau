# P15 G1/G2 independent preapply gate

Date: 2026-11-16  
Reviewer: worker-2  
Mode: independent preapply QA; source/test/browser/server execution was not performed  
Canonical root: `C:\Work\MoPhongMayTrenTau`  
Stage root: `C:\Work\MoPhongMayTrenTau\_p15_stage_20261116`

## Final verdict

# CANONICAL APPLY: GO

This is a bounded GO for the exact two-path allowlist only, with the exact preimage/stage hashes below. It does not approve release, hardware fidelity, firmware provenance, rights clearance, or any OEM pixel/physical fidelity claim. The apply remains fail-closed if any pinned preimage, stage file, evidence receipt, review SHA, or protected-port identity changes before execution.

## Independent findings

### 1. Exact stage versus canonical scope — VERIFIED

A fresh filesystem hash comparison over all files under canonical/stage `src`, `web`, and `test` found `158` canonical files, `159` staged files, and exactly two differences:

| Path | Operation | Canonical SHA-256 | Stage SHA-256 |
|---|---|---|---|
| `web/styles.css` | modify | `2925f129251caf72a71c846484d2f4facbb1d02d6480309b98d8399e800f4660` | `ce699bc88586fc0b883ba357661cda4ccb414069127d6ec23aa81a4300d6afeb` |
| `test/fcv588-p15-uniform-lcd-css.test.mjs` | create | absent | `2a750cb43e2ffd965eb1266046b45aad30da692312db1e172faa0acd73d162b0` |

The independent recomputation of all 50 entries in `P15_STAGE_CSS_SOURCE_INTEGRITY_20261116.json` found `50/50` canonical preimages and stage hashes matching, with `0` mismatches. `web/app.mjs`, display layout/model, replay compatibility, input code and every other sealed runtime path remain byte-identical between P14 canonical and P15 stage.

The CSS textual delta is restricted to G1/G2: `.lcd` gains `container-type:inline-size`; the `128/171` bezel ratio remains; the `480x640` canvas changes from `width:100%;height:100%` stretching to an absolutely positioned `width:100%;height:auto` framebuffer centered vertically; the LCD header/demo/depth font rules replace outer-viewport `vw` with `cqw`. No image URL/import, script, API, replay or network behavior is introduced by this delta.

### 2. G1 RED -> GREEN — VERIFIED from existing receipts

Canonical preimage receipt `P15_GEOMETRY_CANONICAL_PREIMAGE_RED_20261116.json`, SHA-256 `4cf7a7959eba4d44b88a5b56b74b6500cb9779b28a1f9ed758aabc3dc5fc1e7a`, records all eight target viewport canvas-aspect checks failing plus the three G2 equal-LCD typography checks failing: 11 expected failures total.

Stage receipt `P15_GEOMETRY_STAGE_FIRST_GREEN_20261116.json`, SHA-256 `2bdec962b416299fec13ed4f37880a6314d200aeecefedef028b21253abbd1be`, records all 13 checks passing. Across `375x812`, `700x900`, `701x900`, `900x900`, `1240x900`, `1241x900`, `1366x768`, and `1920x1080`, the staged canvas client aspect is approximately `0.75000` against intrinsic `480/640 = 0.75`, within the receipt's authored browser-rounding bound. The bezel remains `128/171`; the correction is a small centered letterbox rather than anisotropic canvas scaling.

### 3. G2 / `cqw` behavior and test validity — GO_BOUNDED

The new Node test is a legitimate source-shape guard: it binds intrinsic `480x640` HTML, preserved `128/171` LCD aperture, uniform canvas mapping, `container-type:inline-size`, use of `cqw` for the relevant header/demo/depth font rules, and absence of numeric `vw` in those rules. It does not modify or weaken any existing test; source-tree comparison confirms it is the only new test.

The new test alone is not sufficient browser evidence because it checks CSS text rather than computed layout. The existing real-Chrome stage receipts close that gap. For the equal-size desktop LCD witness (`900`, `1240`, `1241`, `1366`, `1920` widths), staged computed header font is consistently `12.2976px`, depth font `42.2845px`, and depth glyph width `80.984375px`; canonical values varied with outer viewport width. This directly demonstrates that `cqw` and the inline-size container were interpreted by the browser used for the stage evidence.

Source limitation: the receipts do not record a minimum supported Chromium/WebView version. Therefore compatibility with older offline browser engines that do not implement container query length units is **NOT_YET_VERIFIED**. This does not block the exact canonical apply for the browser environment already demonstrated by the stage Chrome evidence; it remains a portability boundary for any older deployment target.

The mobile media rule still contains a fixed-pixel `.depth-indicator strong` fallback/override, but `app.mjs` always sets `data-size` (`state.settings.depthSize ?? "Medium"`), and the more specific staged size rule is `cqw`-based. No outer-viewport `vw` remains in the LCD header/demo/depth rules; remaining `vw` occurrences are page-level `h1` typography outside the LCD.

### 4. Existing stage QA evidence — VERIFIED by receipt inspection, not rerun

The evidence files are present with exact SHA-256 values:

| Artifact | SHA-256 | Recorded result |
|---|---|---|
| geometry contract review | `7fb8e64f82d0c313898afc1d4aaebe75b94afdb23ec7855049eae4182f874a9b` | source review identified G1/G2 |
| stage source-integrity seal | `7afd374b89f0ddce597ba9917dfca7d2af532932a205868cc410267f727326e3` | 50 runtime paths; only CSS modified; one test new |
| allowlist | `d18f8e7a19f6cb82b03eeaecf8acceb16af578842639374f1658adfebcc7e8ec` | exact two paths |
| backup ZIP | `f73e84c94b73943bc26a4d18778f06de05684f183e1f209111610bf415d03e01` | P14 CSS preimage backup |
| full Node log | `1a044253128a8e582e274daba4b82b8e18c4f9ec95c11925be0273e228c8f2eb` | `579/579` pass, `0` fail |
| Python log | `befec37eb6ad716a4623e8efcdf33afe9d41c5df41111ce382c75879e5d1dba2` | `13/13` pass |
| stage Chrome matrix | `f1e7f1d3a80743c4037cf1bf66085527d436be23ea9b3b49fcb0169217d86441` | `103/103` checks, 24 screenshots, 273 HTTP bodies, 0 errors |
| independent visual review | `9f93a54f447181348bcdd93f82374203da8e2ae626c1a5c78afa45fbe11b7d08` | `GO_BOUNDED` |

I did not rerun those tests or launch/drive Chrome. I inspected the receipts and directly viewed representative staged screenshots covering LF, HF, DUAL, LF-ZOOM, HF-ZOOM, NAV1, NAV2 and Marker Zoom at mobile/desktop sizes. No new canvas clipping, pane collapse, header/depth loss, NAV overlap, or DUAL-divider failure was visible in those inspected captures. The independent visual review separately records all 24 captures present and no bounded G1/G2 visual regression.

### 5. Security, replay, HOLD and port ownership — PRESERVED

`src/devices/fcv588/replay-compat.mjs` is byte-identical canonical/stage (`9e9887c9a6b4adad90864f8de82144edaf20146063fc6204dac912120eed11d6`). The recorded full Node run includes replay/session-hash/profile21/profile22 compatibility coverage and passes `579/579`; no replay/runtime JS changed in P15.

The stage Chrome matrix records `103/103` checks, `273` captured HTTP source bodies, `8/8` OEM JPEG routes returning `404`, `pageErrors=[]`, `networkExternal=[]`, and its owned server on port `4216` exited. The full Node log also records the runtime server binary/media fail-closed test passing. Since P15 runtime delta is CSS-only, there is no new executable/network path in the apply scope.

A read-only OS socket enumeration performed for this review sent no HTTP request and found exactly one listener among `4173/4214/4215/4216`: `127.0.0.1:4173`, PID `1204`. Ports `4214`, `4215`, and `4216` were not listening. This matches the guarded apply's protected user-server identity and confirms the test-owned port is no longer active.

The two P14 authoritative receipts required by the apply guard also match their pinned hashes on disk:

- `FCV588_P14_VERSIONED_REPLAY_FINAL_INTEGRITY_20261116.json`: `195d0737b602196bddb5971964500dabab41d19eaee08b5b620e97f26089e99e`.
- `FCV588_P14_VERSIONED_REPLAY_INDEPENDENT_POSTRECEIPT_20261116.json`: `2dfeb190a2160fb4e6f24988fa7d054b2dd0098f14c378901068cef6321b8754`.

The P15 source-integrity seal keeps `releaseApproval: HOLD`, `hardwareValidated: false`, `firmwareInstalled: null`, and `rightsClearance: false`. This review does not promote any of those states.

## Apply boundary

The GO is valid only while all of the following remain true at apply time:

1. canonical `web/styles.css` still hashes to `2925f129251caf72a71c846484d2f4facbb1d02d6480309b98d8399e800f4660`;
2. canonical `test/fcv588-p15-uniform-lcd-css.test.mjs` is still absent;
3. staged CSS/test hashes remain `ce699bc...` and `2a750cb4...` exactly as listed above;
4. allowlist, backup, source-integrity seal, P14 authoritative receipts and independent review inputs remain pinned;
5. protected user server identity remains the guarded `127.0.0.1:4173` process and test-owned ports remain clear;
6. apply touches only the exact two allowlisted paths and remains subject to post-apply QA; release/hardware/firmware/rights stay HOLD.

If any exact preimage or pin drifts, this GO no longer applies and the guarded transaction must fail closed rather than reinterpret the review.

## Source limitations

- This gate proves internal browser/CSS consistency for G1/G2 and preservation of the sealed P14 runtime/replay/security boundaries. It does not prove OEM framebuffer geometry, camera-calibrated pixels, physical dimensions beyond already sourced estimates, real sonar behavior, installed firmware, or hardware equivalence.
- The eight OEM photographs remain `REFERENCE_ONLY`; they are not served or copied by this CSS change.
- The stage evidence establishes `cqw` behavior in the browser used by the receipts, but does not establish compatibility with unspecified older Chromium/WebView builds.
- Screenshot inspection is bounded visual regression evidence; it is not an OEM pixel-diff oracle or a fidelity percentage.
- Node/Python/Chrome results cited here are pre-existing immutable receipts inspected by this reviewer; they were not rerun during this preapply review.

