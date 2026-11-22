# FCV-588 V49 — CoS Desktop attached Windows browser (partial) QA

Date: 2026-10-19. Scope: one test-owned background browser tab serving the canonical offline FCV-588 training simulator after V49's scoped D15 accessibility patch. This is **not** a measured OEM/ship display or actual Narrator/NVDA speech acceptance.

## Attachment and source

- Browser ID: `07ad2767-7d6e-4a32-94cd-6d4388d2c3a0`.
- Test-owned tab ID: `07ad2767-7d6e-4a32-94cd-6d4388d2c3a0:1626496629`.
- Attached page after debugger-captured reload: `5ef5c97d-be46-4003-ba03-c496a3d2674f`.
- URL: `http://127.0.0.1:4238/`; exact observed browser DOM viewport **1912 × 970**. This is **not** the requested native-attached 1366×768 or 1920×1080.
- Owned service: Node `tools/server.mjs`, PID `18888`, localhost port 4238. A PID/port/command-line check preceded the explicit owned-process termination. No user-owned process was stopped.
- CoS tab and server were both closed; `4238` was observed without a listener afterward.

## Genuine attached browser observation

- `#operator-guidance role="group"`, not a broad live `status`.
- `#operator-guidance-announcement role="status" aria-live="polite"`; first-render text was empty.
- Announcer was outside `.device-frame`; `#source-matrix-announcement` remained a separate status region.
- `#echo-canvas` logical resolution remained 480×640; no horizontal document overflow at 1912px.
- Test-owned native browser-action clicks reached POWER/BRILL, with observable page state updated to `AUTO_R G:AF LF x1`; the subsequent BRILL dialog was observed. A stale browser element reference was rejected at tool level once, then a fresh snapshot/ref successfully dispatched input. No product error was inferred.
- An attached-page DOM mutation observation made later while the BRILL dialog remained shown recorded zero announcement/help changes in that observation period; **this does not certify no repeated UI-tick updates during active countdown**, because live timer phase was not proven still active. Independent source-pinned isolated Chrome is the test that actually verified `help` ticking while the semantic announcer stayed unchanged.
- After debugger attachment, diagnostic buffers were cleared and the test-owned tab reloaded. Since that reload, `35/35` network request entries were HTTP 200 to `127.0.0.1:4238`, with zero nonlocal requests, zero dropped entries, and **0** observed console errors.
- Screenshot connector ID: `ffaaea69-dda1-4e40-9055-6831b86504cb`, scale `0.8368200836820083`. This connector image was **not saved as a canonical PNG**, and **no guessed SHA** is associated with it.

## Boundaries

The attached CoS browser network panel was used for request/status/origin observation, **not** source-byte SHA proof. Fresh source-byte proof comes from separate stage/canonical Chrome/Playwright runs, each with 105/105 actual loaded HTTP response-body SHA and 69/69 deterministic UI assertions in three isolated contexts.

Actual Narrator/NVDA spoken output, genuine OS-window `window.blur` while POWER is held, exact 1366×768/1920×1080 **CoS Desktop attached** native window checks, real FCV-588 installed firmware, OEM redistribution rights and hardware conformance remain **NOT_RUN/UNKNOWN/HOLD**.

This observation does not elevate the Phase 6 or course-release decision: **Phase 6 OPEN, 65/65 claims HOLD, checklist 14/50, 6/22 named tasks, hardwareValidated=false, releaseApproval=HOLD**.
