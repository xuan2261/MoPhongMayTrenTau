# FCV588 P32 — Windows accessibility, CPU/RAM and signing readiness (2026-11-21)

**Outcome:** P32 bounded investigation and receipts completed on the real Windows host. **NO_GO for production/external distribution. releaseApproval=HOLD, Phase6=OPEN.** P31 0.0.3 remains installed, runtime unchanged.

## Scope and test evidence

| Gate | Observed | Status |
| --- | --- | --- |
| P31 native accessibility | P31 independently sealed UIA/Tab/POWER/Win32 evidence, 3/3 control names exposed | VERIFIED (reused unchanged P31) |
| Narrator/NVDA spoken output | Narrator executable present, NVDA absent in standard locations; no human listening or audio transcript | BLOCKED_HUMAN_SPEECH_CONFIRMATION |
| CPU and private RAM screen | 3 paired serial P30/P31 runs each, same Windows, 5-second warmup + 5-second POWER OFF idle sample; QA profiles only | VERIFIED raw numbers; effect INCONCLUSIVE |
| Code-signing installed EXE, uninstaller and NSIS | All NotSigned; SignTool available; 0 local Code Signing certificates in CurrentUser/My and LocalMachine/My | BLOCKED_NO_LOCAL_CODE_SIGNING_CREDENTIAL |
| Signed download, SmartScreen and third-party EDR | Not attempted without authorized publisher identity/signed build | NOT_YET_VERIFIED |

## Bounded benchmark results, no performance PASS

- P30 CPU median 1.836% (range 0–2.069); P31 median 4.056% (range 0.52–4.873), percentage of **one logical core**, all 4 exact-executable Electron processes.
- P31 minus P30 paired mean CPU difference 1.848 percentage points; 95% paired t interval [-1.293, 4.989], n=3 pairs.
- P30 private memory median 263.408 MiB (range 260.82–275.076); P31 261.629 MiB (range 260.453–264.158).
- P31 minus P30 paired mean private-memory difference -4.355 MiB; 95% paired t interval [-23.964, 15.255].
- **Explain-the-number verdict: INCONCLUSIVE.** Limiter: 3 short pairs, POWER OFF idle only, no background host CPU quiet gate, QA profiles reused by arm, active LCD/UIA/Narrator end-to-end overhead unmeasured. Every interval crosses zero. No claim of speedup, slowdown, performance acceptance or resource saving.
- Analysis attempt1 ENOENT caused only by a wrongly encoded Windows root in the analysis helper; fixed and a separate successful analysis receipt was written. Failure note retained.

## Signing and spoken-audio blockers

- Windows SDK SignTool exists and can be used when proper publisher approval and an organization-controlled code-signing credential or service are provided. Do not invent self-signed certificates, private key contents or SmartScreen PASS.
- Microsoft SignTool documents SHA-256 file digest and RFC 3161 SHA-256 timestamping for signing. Signing must apply to a *new* candidate and be independently verified/sealed; it changes binary hashes. Signed files can still require SmartScreen reputation; EV no longer guarantees a first-download bypass.
- Existing Narrator binary is not proof of audible output. Current UIA Name/Focus evidence is not a screenreader speech transcript. A concise bounded human test checklist is in P32_NARRATOR_HUMAN_ACCEPTANCE_20261121.md, not claimed completed.

## Preservation and next action

- Eight sealed P28/P29/P30/P31 final/postreceipt SHA hashes matched at start and during P32 finalization. P31 EXE and ASAR hashes remain exact. No P32 repackage, installer install/uninstall, cert mutation, Narrator launch or OS network changes.
- User port 127.0.0.1:4173 and pre-existing sessions were excluded; only P30/P31 benchmark app processes were started, then closed.
- Complete the three short human Narrator listening checks on the installed P31; identify approved publisher/identity and obtain a trusted signing credential **only if distribution is actually desired**. If sustained classroom performance is a product requirement, conduct an active-LCD matched benchmark on representative classroom Windows hardware, not more idle micro-tests on this host.
- **Do not release** without actual signed build, signature chain and timestamp validation, distribution-channel test and independent authorization.
