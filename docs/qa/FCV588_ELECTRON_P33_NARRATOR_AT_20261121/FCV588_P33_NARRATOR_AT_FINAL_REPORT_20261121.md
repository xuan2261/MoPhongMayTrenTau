# P33 — Native UI Automation accessibility on installed P31, 2026-11-21

**Decision:** GO_BOUNDED_QA_EVIDENCE / NO_GO_RELEASE. releaseApproval=HOLD.

## Verified native Windows scope

- Installed FCV588 Synthetic Training POC UNRELEASED v0.0.3: EXE SHA 79512e2b520a590e19cd1893c19b0a6fd1c79abb56efcd9c5e83e7613a4fa5fd; ASAR SHA eb35c1a385fa468c6b2db27b51f8ec2c33032a03098ad51f8d6bb5e1edb99190.
- P33 V1 preserved: status FAILED_CLEANUP, 4 native actions, 7 UIA focus events, 0 live-region events, snapshot reported 1 process. Subsequent independent read-only check observed 0. V1 was not rewritten or retroactively passed.
- P33 V2 uses a separate test script, QA profile and CreateNew receipt. Result: PASS_NATIVE_UIA_FOCUS_SURROGATE; 90 UIA descendants; focusable native Buttons GAIN, MODE, POWER; native focus sequence GAIN -> MODE -> POWER observed through 5 UIA focus events; POWER Invoke OFF -> BOOTING successful; 4 native actions PASS; 0 scoped live-region events, which is acceptable without a confirmed live-region mutation.
- V2 QA-owned installed executable processes: four PIDs captured, bounded termination poll, 0 remaining at receipt and separate read-only recheck. Narrator 0; user HTTP listener 127.0.0.1:4173 PID1204 unchanged.
- P28–P32 10 final/post parent SHA files individually checked against sealed expected values; installed P31 EXE and ASAR unchanged. No production source, installer, canonical src/web/test or earlier receipt modified by this P33 run.

## Limits and blockers

- UIA focus-event delivery, accessible Name and Invoke response are NOT spoken Narrator output. Narrator and NVDA were not launched by P33. Spoken speech remains NOT_YET_VERIFIED / BLOCKED_HUMAN_SPEECH_CONFIRMATION; no human-heard utterance receipt. 0 live-region events is not a spoken-state PASS.
- The V1 cleanup result is a failed snapshot; the V2 bounded polling fix succeeded. Race-condition root cause is plausible but not independently demonstrated by scheduling trace.
- P32 signing remains BLOCKED_NO_LOCAL_CODE_SIGNING_CREDENTIAL; code signing remains NotSigned. P32 idle CPU/private-memory comparison remains INCONCLUSIVE; no new benchmark.
- Firmware UNKNOWN, synthetic data, hardwareValidated=false, 65/65 claims HOLD, Phase6 OPEN, no OEM-conformance or 100%-fidelity claim.
- No signed release, production deployment, Narrator preference change, audio capture, Windows service change or additional installer build.

## Next meaningful action

For audible accessibility acceptance, a human listener can use the existing P32_NARRATOR_HUMAN_ACCEPTANCE_20261121.md on this real Windows host and record exactly heard GAIN/MODE/POWER speech. Without such evidence, do not upgrade the speech gate. If distribution is not planned, return to core simulator work rather than duplicating release tests.