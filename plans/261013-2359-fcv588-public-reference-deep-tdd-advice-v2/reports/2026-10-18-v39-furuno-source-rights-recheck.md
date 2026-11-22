# FCV-588 V39 — dated manufacturer source and reuse-rights recheck

**Research date:** 2026-10-18. **Scope:** official manufacturer public pages, version/media-rights boundaries for the *offline classroom simulator*. No OEM materials were incorporated into the runtime, and no physical marine device was contacted.

## Result

The manufacturer still provides an identifiable FCV-588 product reference, operator-manual entry, software-history document and a current general catalogue entry. **None establishes the actual installed firmware/transducer/optional hardware on the user's target unit.** The Furuno USA Terms of Use explicitly restrict reuse of the site's copied materials for business/commercial/public purposes without written consent. Consequently all firmware-specific behavior, manufacturer imagery/video/manual redistribution and exact-pixel claims remain **HOLD**. No source identified during this check establishes a right to copy OEM artwork into the simulator.

## Primary evidence — verified public pages

| Source | Current public observation | Limits for this project |
| --- | --- | --- |
| [FURUNO FCV-588 official product](https://www.furuno.com/en/products/fishfinder/fcv-588/index.html) | Identifies model FCV-588, 8.4-inch 480×640 LCD, 270×233×158 mm display unit, 50/200 kHz; lists Operator's Manual (English) last updated **2025-08-18** and General Catalog 2026 last updated **2026-08-05** | Published dimensions/variants are not actual classroom panel measurements, a firmware version, or pixel/layout rights |
| [Furuno USA FCV588 support](https://www.furunousa.com/en/support/FCV588) | Marks FCV588 **No Longer Available** and lists NMEA0183 as a *real product* supported data type; provides manual documents and software-history reference | Does not mean the offline simulator is connected to NMEA or can transmit/receive vessel data. Do not replace FCV-588 with recommended FCV800 menu behavior |
| [FCV588/628 software history](https://www.furunousa.com/-/media/sites/furuno/software_library/software/software/fcv588-628_software_history.pdf) | Historical summary lists initial **v1.05** and September 2016 **v2.01**, which added 8/16 Colors, changed White Marker and added a research-only Echo menu | Release note is not proof which of these (or another) version is installed in an individual classroom unit |
| [Furuno USA Terms of Use](https://www.furunousa.com/en/terms_of_use) | Publisher reserves copyright/trademark rights, grants limited site access and restricts reproducing/redistributing text/images/audio/video copied from the site for public, business or commercial purposes without written consent | Public accessibility of a photo, brochure or PDF is **not permission** to embed that material into runtime or distribute a derived course |
| [Furuno USA software terms](https://www.furunousa.com/en/get_support/software) | Published software update terms limit the upgrade binaries to specified hardware use and reserve proprietary rights | Do not install/download/decompile firmware to obtain artwork/menu behavior; the project does not require firmware code |

The FURUNO product/brochure information describes multiple languages, including Vietnamese, but the currently **unknown installed firmware and the rights to reproduce its resources** do not establish a usable `D04 Language` menu/language-pack contract. It is important not to overwrite the simulator's existing `SOURCE_GAP` and `RIGHTS_HOLD` based on a marketing-language list.

## Decision: preserve boundaries and prioritize next evidence

1. Keep `hardwareValidated=false`, `firmwareInstalled=null`, source/rights claim holds, and `releaseApproval=HOLD`. UI artwork remains independently authored; teacher warnings remain outside the simulated instrument.
2. For improved OEM fidelity, acquire the *exact applicable model and installed version* and a properly authorized close front-panel reference or clearly permissioned screenshots/video frames. Only then compare dimensions, labels, menu paths and observed LCD states claim-by-claim.
3. If OEM assets are needed in deliverables, obtain publisher consent appropriate to the distribution setting. Documentation is for technical reference; no automatic media copying is authorized.
4. Do not call compatibility with NMEA hardware a feature of the offline implementation, and do not expand to FCV-800 because the support page suggests that newer model.

**Review type:** GPT-6 desk research against current official public pages, **not** independent manufacturer's acceptance or legal counsel. No individual FCV/D15 claim was promoted.
