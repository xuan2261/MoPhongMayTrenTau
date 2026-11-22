# FCV-588 V35 — GPT-6 supervision and staged integration decision

**Date:** 2026-10-18. **Scope:** F1 PUBLIC_REFERENCE, source-grade
instructor-side D15 panel for C11/D09/D14 only. **No release authorization.**

## Evidence and request

The user expressly approved GPT-6 supervision replacing the unavailable
Kongming route in the active F1 v2 plan. This approval is for evidence-based
GO/NO-GO on development and verification; it is not independent Kongming
counsel and does not claim that Extra High effort was independently inspected.

Canonical V34 post-integration receipt:
docs/qa/FCV588_V34_POSTINTEGRATION_INTEGRITY_20261018.json
reports 36 source assets, Node 433/433, Python 13/13, Chrome 330/330
across five viewports, 75 SHA-matched screenshots, 36 HTTP asset hashes
and four denied paths. All 36 canonical source hashes were reverified
unmodified at this V35 checkpoint.

V35 isolated root: staging/fcv588-v35-c11-d09-d14-instructor/.
The new stage adds a read-only web/fcv588-training-source-matrix.mjs
and edits only web/index.html, web/styles.css, web/app.mjs.
No change to any of the 23 src/ reducer, scenario, event, storage, replay
or receiver modules. No foreign GPS/NMEA/serial/RF I/O, live sensor feed,
new OEM pixels, machine menu, or HTML injection is introduced.

### Verified staged evidence

- Node targeted V2: **37/37 PASS**; log SHA-256
  8eaaf929e1a10cf031f615f0393143a13a96adeda024411171452d58b1ca2afd.
- Chrome V2: **115/115 checks PASS**, five viewports
  1366×768, 1920×1080, 360×800, 390×844, 320×720.
  25 PNG images individually SHA-verified. Browser receipt SHA-256
  3a9652e8e31cb6029945f7c5426b55c6d37e8f9f22a76012852189dfe7a9108e.
- HTTP loopback served files **37/37 SHA match**, denied paths **4/4**,
  QA port closed; no remote I/O.
- V35 review patch passed git apply --check --verbose **exit 0**.
- Patch from canonical V34 to staged V35: **four web files**, SHA-256
  66a98472daeee684479670da40e04f075c3af2dbc6421c63d8c76ace17d9d832,
  with manifest evidence/V35_C11_D09_D14_D15_PATCH_MANIFEST.json.
- Frozen V34 canonical source and all four V35 staged output hashes match
  their manifests immediately before proposed integration.

## Review of the new contract

The three rows are an **external instructor D15** explanation: selected
Waypoint and typed Own source/TTL for C11, the declared virtual option
and mutual exclusion of NMEA for D09, and Own/NMEA source-status truth for D14.
The module calls existing projectFcvTrainingReceiver,
projectFcvTankenmaruTrainingStatus and typed synthetic-position validation.
It does not import dispatch, write session events, alter raw observations,
create new timers, grant equipment options or navigate a real vessel.
Raw state enums are kept only in inert DOM metadata; user-facing labels
are human-readable and kept outside the physical device-frame.
Tests cover virtual-option revoke, missing/stale/future Own samples,
unconnected NMEA, waypoint selection and deterministic replay.

**Known limitations:** Chrome automation has not tested actual
NVDA/VoiceOver spoken output. Typography, panel geometry and source/menu
placement have not been measured against a physical FCV-588.
Neither 64 operator claims nor D15 as a complete capability are accepted
solely by passing this isolated subset. No hardware support is implied.

## GPT-6 decision

**GO — integrate exactly these four V35 web files after saving a preapply
receipt and rechecking all 36 canonical V34 hashes and patch baselines.**
Apply the immutable patch only. If Git on Windows changes CRLF/LF bytes,
normalize only these four files after proving normalized bytes equal the
staged SHA targets; otherwise STOP. Do not edit other sources or old logs.

Before declaring software QA completion, run fresh canonical full Node,
Python, and source-bound Chrome on all five viewports; recheck HTTP bytes,
blocked routes, screenshot SHA, old checkpoint and runtime hashes. Treat
every unexpected Verify failure as a new STOP and record a new disposition
before changes. No auto-commit, push, PR, release, ship I/O or OEM claim.

This record is the documented supervisory GO, not a claim of completed
integration or successful follow-up tests.
