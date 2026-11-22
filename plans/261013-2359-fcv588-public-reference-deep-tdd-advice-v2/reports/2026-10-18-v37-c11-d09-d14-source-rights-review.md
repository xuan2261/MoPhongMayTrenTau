# FCV-588 V37 — C11/D09/D14 public-source and rights audit

**Audit date:** 2026-10-18. **Outcome:** the V37 four-case software
negative-vector suite is source-scoped and may remain a classroom test; OEM
behavior/pixel accuracy, installed firmware/options, hardware validation,
media reuse and each claim's formal acceptance **remain HOLD**.

## Actual sources checked

1. Manufacturer product page:
   https://www.furuno.com/en/products/fishfinder/fcv-588/index.html
   — FCV-588 is distinguished from other FCV families; manufacturer lists
   display modes, a 270×233×158 mm enclosure, 8.4-inch display and
   operator's manual last-updated **2025-08-18**. These are device-level
   product claims, **not** exact simulator DOM placement or installed
   firmware.
2. FURUNO USA product support:
   https://www.furunousa.com/en/support/FCV588
   — lists official operator manual, NMEA0183 as a supported real-device
   data type, software-history document and transducer categories.
   The simulation deliberately has **NO** actual receiver and therefore
   cannot interpret product capability as a connected input.
3. Published FURUNO software history:
   https://www.furunousa.com/-/media/sites/furuno/software_library/software/software/fcv588-628_software_history.pdf
   — directly retrievable public one-page release summary records initial
   v1.05 and September 2016 v2.01; v2.01 added Colors 8/16 choices,
   updated White Marker and added an R&D-only Echo menu. This directly
   demonstrates why a simulated menu must not be proclaimed a one-to-one
   installed-firmware contract.
4. Operator manual source URL:
   https://www.furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/fcv628_fcv588_operators_manual.pdf
   — indexed manufacturer PDF table of contents identifies §1.20 waypoint,
   §1.21 NAV data, §2.9 Tankenmaru; the direct fresh PDF `open` request
   returned **HTTP 403**, so the exact current body was **NOT freshly
   retrieved or independently re-read** in this audit. No manual text or
   protected artwork was copied into the runtime.

Existing independently authored workspace registers were re-read:
`docs/research/FCV588_PUBLIC_MEDIA_EVIDENCE_2026-10-13.md`,
`docs/research/FCV588_PUBLIC_UI_REFERENCE_MATRIX_2026-10-14.md`,
`docs/evidence/fcv588-public-evidence-ledger.json`, and
`sources/manuals/MANIFEST.json`. The local manifest describes a separately
archived manufacturer manual reference, but explicitly marks its rights
`RESTRICTED_REFERENCE_ONLY`, `simulator_asset=false`. Merely possessing
an archival reference **does not** prove copyright permission to embed images,
PDF text, fonts or original firmware assets into an app or distribute them.

## Claim-scoped review

| Feature | Tested V37 training invariant | Authority boundary | Decision |
| --- | --- | --- | --- |
| C11 NAV / Waypoint | MARK cannot create a source-less destination; synthetic Own may make an explicitly labeled classroom estimate; selecting NMEA speed masks time-to-go; replay unchanged | Public §1.20–1.21 references exist, but neither LCD pixel placement nor an installed firmware's menu and navigation behavior have been independently observed | `SOURCE_GAP`, OEM `HOLD` |
| D09 Tankenmaru | Explicit virtual entitlement gates On, revocation during POWER-suspended draft cancels the transaction, NMEA rows are excluded while On, no RF | §2.9 and manufacturer option context; virtual fixture does not represent a present real RF option/partner unit | `SOURCE_GAP`, hardware `HOLD` |
| D14 Own/NMEA | All NMEA choices with absent receiver yield NO DATA/NO_EXTERNAL_RECEIVER, no own-data fallback; power/replay deterministic; no transport | Product *supports* NMEA0183 in reality, but classroom software intentionally does not implement a real transport; §4.9/4.10 physical wiring and firmware contexts untested | `SOURCE_GAP`, physical `HOLD` |
| D15 teacher matrix | Read-only status uses synthetic source labels outside equipment face and off LCD | **Application teaching UI**, not an OEM FCV-588 device menu | `TRAINING_ONLY`, release `HOLD` |

These cases protect training-only semantics. They **do not** constitute
independent acceptance of any of the 65 source-level FCV/D15 claims.

## Outstanding acceptance prerequisites

- Resolve actual FCV-588 firmware revision and transducer/optional hardware
  identity (if any) for the user's representative classroom target.
- Examine exact per-feature manual/capture evidence lawfully and reconcile
  any conflicting menu/timing/field behavior before changing the simulator.
- Obtain and record rights clearance before **any** OEM photo/PDF/video or
  original screen artwork is incorporated/distributed, including course media.
- Capture the actual Narrator/NVDA speech and remaining Phase 6 native Chrome
  viewport/gesture cases before declaring browser conformance.

**Release and checklist checkpoint unchanged:** 65/65 claims `HOLD`,
14/50 checklist items, 6/22 named tasks, `hardwareValidated=false`,
`releaseApproval=HOLD`. No OEM-equivalence percentage is inferred.
