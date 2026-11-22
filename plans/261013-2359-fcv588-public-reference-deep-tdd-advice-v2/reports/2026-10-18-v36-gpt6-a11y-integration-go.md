# V36 FCV-588 — source-scoped UX/accessibility integration decision

**2026-10-18. Supervisor:** user-approved GPT-6 self-review, in place of
the unavailable Kongming step; this is NOT an independent screen-reader or
external specialist's certification.

## Scope and baseline

Canonical V35 F1 PUBLIC_REFERENCE software QA had 37/37 runtime source SHA,
442/442 Node, 13/13 Python, 450/450 Chrome on five viewports, 100/100
screenshot SHA, and 37/37 HTTP source bytes with 4/4 denied routes.
Its final receipt:
docs/qa/FCV588_V35_FINAL_INTEGRITY_20261018.json.

V36's sole goal is readability and assistive semantics for the separate
D15 C11/D09/D14 instructor panel, not an alteration of the FCV-588 LCD.
The project-derived design brief, measured before images and acceptance
contract are recorded in:
staging/fcv588-v36-instructor-accessibility/evidence/
V36_UX_A11Y_BRIEF_20261018.md.

## Tested staging findings

- Before: 9px status, 10px details, 11px body/card title,
  12px panel header/introduction. Existing contrast was already
  8.4:1–13.73:1, so there was no need to replace the palette.
- After: all six role fonts measured 13–16px, scalable rem units,
  contrast >= 8.4:1 in the checked pairings; 200% root font simulation
  enlarged the matrix text proportionally and did not overflow 320px.
- Three stable h4 headings now name their containing articles in the
  Chrome accessibility snapshot. The matrix remains read-only,
  unfocusable, and outside the device face.
- The single off-device polite/atomic status announces only actual
  C11/D09/D14 status transitions. Simulated world ticks that merely
  update detail text do not repeat the announcement, and initial page
  render is silent. No device timer or replay event was added.

Staging verification already executed and recorded:

- Node 46/46 PASS, log
  evidence/V36_D15_NODE_TARGETED_20261018.log.
- Chrome 189/189 PASS at **1440×900, 768×1024, 375×812, 320×720,
  390×844, 1366×768, 1920×1080**, 21 new PNG and 4 baseline PNG
  each SHA-verified. Browser receipt:
  evidence/V36_D15_A11Y_CHROME_20261018.json.
- Loopback HTTP served source **37/37**, forbidden routes **4/4**.
  No request to an external host; all owned QA ports closed.
- git apply --check V36 patch exit **0**.
- The web/index.html **device-frame slice is character-for-character
  unchanged** from canonical V35; 23/23 core source files match SHA;
  no new navigator.serial, USB, WebSocket, fetch, device parser or RF path.

V36 staged patch changes exactly:
web/index.html, web/styles.css, web/app.mjs,
web/fcv588-training-source-matrix.mjs.

Patch SHA-256:
d9f68cd6dbfeb3cd86bc33b3fbd0894245a4c3da8e827639c856c5ceeb68e9d3
Manifest: staging/fcv588-v36-instructor-accessibility/evidence/
V36_INSTRUCTOR_A11Y_PATCH_MANIFEST.json.

## Limitations and independent review

The reusable external CoS reviewer was requested to assess this change
read-only but its chat could not resume; therefore **NO successful
independent reviewer report is claimed**. GPT-6 performed the available
source, screenshot, DOM, keyboard, responsive, SHA and security-boundary
review directly, as explicitly authorized by the user.

NVDA was not detected at ordinary Windows install locations; Narrator
exists but its actual speech output was not exercised. Chrome accessibility
tree assertions and role=status DOM updates are useful proxies,
**not an NVDA/VoiceOver/JAWS speech certification**.

## GO/NO-GO

**GO:** Integrate only the four verified web files from the frozen V36
patch into canonical V35, after a fresh preapply readback and patch SHA
check. Git-on-Windows may yield CRLF: compare normalized bytes to frozen
staging before normalizing only these exact four paths; STOP on any
non-EOL difference.

Run new post-integration targeted and full Node, Python, dedicated V36
Chrome with DOM/keyboard/200% zoom/response-body checks, existing
V35 dedicated and compatibility Chrome regressions where available,
localhost served-source negatives, image/source SHA and post-document
readback. On any failed Verify: STOP, preserve the log, diagnose, record
a new supervisor GO/NO-GO before a minimal repair and rerun.

**NO-GO:** Release, OEM graphics fidelity assertions, live ship/NMEA/
GPS/serial/RF I/O, third-party screen-reader certification, Git
publication or promotion of any 64+D15 claim without its separate
source/rights and acceptance evidence. HardwareValidated=false,
releaseApproval=HOLD.
