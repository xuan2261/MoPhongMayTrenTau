# FCV-588 V47 — White Marker source-grade and firmware decision atlas

**Date:** 2026-10-19. **Scope:** FURUNO FCV-588 offline F1 PUBLIC_REFERENCE training UI only. This does not identify any installed firmware, grant image/software reuse rights, verify colorimetry, or certify hardware/ship equipment.

## Authoritative OEM references

- [FURUNO FCV588/628 Software History](https://www.furunousa.com/-/media/sites/furuno/software_library/software/software/fcv588-628_software_history.pdf): v1.05 was the listed initial release; v2.01 (September 2016) added 8/16 display Colors choices, **modified White Marker settings**, and added a System Echo menu **for research/development use only**. It does not enumerate all revised White Marker settings or prove a particular FCV-588 uses v2.01.
- [FURUNO FCV-628/FCV-588 Operator's Manual OME-23890-E §1.22](https://www.furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/fcv628_fcv588_operators_manual.pdf): the White Marker operator flow selects an *echo color on the color bar* to render white using Up/Down, ENTER sets it, and Off disables it. The Display Colors description lists 8/16/64 options and notes interactions with White Marker. Neither document supplies a licensed, exact RGB lookup table or the actual unit's installed firmware.
- Current simulator palette implementation is **independently authored** and contains a classroom `Off/White/Gray` choice list. The OEM documents do not establish that `White/Gray` are actual firmware menu enum entries.

## V46 baseline and V47 scoped correction

| Contract | Previously | V47 treatment | OEM status |
| --- | --- | --- | --- |
| Operator label `Sounder > White Marker` | Present | Preserve exactly | Manual text confirms label |
| Training selections `Off/White/Gray` | Presented under generic source grade | Preserve for profile21 replay compatibility; explicitly flag **training preview** | `White/Gray` OEM equivalence NOT VERIFIED |
| Menu source grade | `CURATED_REFERENCE_NOT_HARDWARE_VERIFIED` | `TRAINING_WHITE_MARKER_PREVIEW_FIRMWARE_UNKNOWN` | Stronger provenance, no behavior change |
| D15 when White Marker selected | Generic synthetic sonar cue | Clearly describe OEM color-bar method, mock choices and firmware uncertainty **outside LCD** | Instructor-only, non-OEM panel |
| Static source atlas metadata | Generic grade | Reconcile exact new source grade, retain choices/ID/order | Metadata only |
| B07 claim note | Generic behavior under review | Explicit White Marker firmware/source gap, claim remains HOLD | 65/65 claims unchanged |
| Sensor/world/replay/settings/profile | V46 | Byte-identical | No new hardware evidence |
| System Echo R&D menu | Not exposed | Keep not exposed | Manufacturer explicitly restricts to research/development |

## Staged TDD and diagnostic provenance

V46 final SHA-256 `b8080291f753a56aa428bf038de8e98f4f84f13686b415d941f7074fe66f809d` and independent postreceipt SHA-256 `7f8a00fb1be746655a6decffb5551c9019fa777a722c2301879512bcd01cb84c` were verified before staging. The staging clone matched **37/37 runtime source SHA** and copied **16/16 SHA-matched original training screenshot fixtures** only. It did not import FURUNO PDF, firmware, font, images or other proprietary media into runtime.

The new seven-test source/provenance suite initially exposed five real source/D15/B07 mismatches plus test-harness errors (incorrect scenario alias, wrong fingerprint data representation and wrong sonar channel key). Each original failed log and root-cause note is preserved; the final source-valid RED was **2/7 PASS, 5/7 FAIL**, no harness exceptions.

A first staged metadata text edit inadvertently targeted A02 instead of B07 because the same generic note text appears in many claims. A second contextual edit targeted B01. Both errors were detected by **per-featureId structured JSON comparison** and preserved in STOP notes; the final solution restored the original canonical V46 JSON and replaced **only B07.note** with a byte-scoped, uniquely keyed helper. Postchange structured comparison confirmed only B07.note changed and 65/65 claim decisions remain HOLD.

After the bounded source/D15 patch, the seven-test focused suite achieved **7/7 PASS**; targeted tests **48/48 PASS**; full Node **504/504 PASS**; Python **13/13 PASS**. No firmware is identified or rights granted by these outcomes. Additional isolated Chrome UI/actual loaded HTTP-body SHA and screenshot checks are required prior to canonical integration.

## Limitations and recommended V48

The current White Marker operator choices remain a classroom simplification, **not pixel- or menu-equivalent OEM behavior**. The proper color-bar chooser and coupling to 8/16/64 firmware-specific palette values need legally usable installed-firmware/hardware operation evidence before modifying the event-sourced reducer. Genuine Windows focus-loss `window.blur`, Narrator/NVDA spoken output, native attached 1366×768 and 1920×1080 viewport checks, optical colorimetry and independent hardware review are **NOT_RUN/HOLD**.

**Phase 6 OPEN, 65/65 claims HOLD, checklist 14/50, named tasks 6/22, hardwareValidated=false, releaseApproval=HOLD.**
