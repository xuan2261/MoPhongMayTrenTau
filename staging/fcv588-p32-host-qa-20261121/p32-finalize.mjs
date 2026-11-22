import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";

const root=path.resolve(import.meta.dirname,"..","..");
const qa=path.join(root,"docs","qa","FCV588_ELECTRON_P32_RELEASE_READINESS_20261121");
const priorQa=path.join(root,"docs","qa");
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const digest=f=>sha(fs.readFileSync(f));
const parents={
  P28Final:["FCV588_P28_MODE_VISUAL_20261117/FCV588_P28_MODE_VISUAL_FINAL_INTEGRITY_20261117.json","313c323db96f706de07bd28cf3832d19cdcdb0ce7dc41baad0d726e09a27ca95"],
  P28Post:["FCV588_P28_MODE_VISUAL_20261117/FCV588_P28_MODE_VISUAL_INDEPENDENT_SHA_POSTRECEIPT_20261117.json","bb533ff8a36084c579fa33a24a18b914ae61930cf14d0634dc46e10523c24bed"],
  P29Final:["FCV588_ELECTRON_POC_20261121/FCV588_P29_ELECTRON_POC_FINAL_INTEGRITY_20261121.json","3af7f84251e8c838d8db188f521f9b7592eced42a3cd21090e8e878dfccf420c"],
  P29Post:["FCV588_ELECTRON_POC_20261121/FCV588_P29_ELECTRON_POC_INDEPENDENT_SHA_POSTRECEIPT_20261121.json","d63cb400bb7633ac42ee76156af8669c4b967dc8d812cb06769faff4de25e81e"],
  P30Final:["FCV588_ELECTRON_P30_INSTALLER_20261121/FCV588_P30_ELECTRON_INSTALLER_FINAL_INTEGRITY_20261121.json","d3c8d4a1f1be4bb6ee24aa4ad1021e5fa93163b34bfd1bac7c55d0098f694cd2"],
  P30Post:["FCV588_ELECTRON_P30_INSTALLER_20261121/FCV588_P30_ELECTRON_INSTALLER_INDEPENDENT_SHA_POSTRECEIPT_20261121.json","bf1f7b322e795e6ddb83070048ebfc10f3356626a72d224a6026a92dcdeee4a5"],
  P31Final:["FCV588_ELECTRON_P31_NATIVE_A11Y_20261121/FCV588_P31_NATIVE_ACCESSIBILITY_FINAL_INTEGRITY_20261121.json","27dc44249a425f01b6848f58467a88fc02fd90aaa0aa3ec4ad7cc61e8eb60a36"],
  P31Post:["FCV588_ELECTRON_P31_NATIVE_A11Y_20261121/FCV588_P31_NATIVE_ACCESSIBILITY_INDEPENDENT_SHA_POSTRECEIPT_20261121.json","3b535d1eee65b25a91f7f8c542577ffbb3f287af2bc4630ba6b247310728c32c"]
};
for(const [name,[rel,expected]] of Object.entries(parents))assert.equal(digest(path.join(priorQa,...rel.split("/"))),expected,name);
const files={
  rawBenchmark:"P32_P30_VS_P31_WINDOWS_CPU_PRIVATE_MEMORY_V1_20261121.json",
  analyzedBenchmark:"P32_P30_VS_P31_RESOURCE_ANALYSIS_V1_20261121.json",
  signing:"P32_SIGNING_READINESS_V1_20261121.json",
  screenreader:"P32_SCREENREADER_FEASIBILITY_V1_20261121.json",
  humanChecklist:"P32_NARRATOR_HUMAN_ACCEPTANCE_20261121.md",
  analysisAttempt1Failure:"P32_RESOURCE_ANALYSIS_ATTEMPT1_FAILED_20261121.txt"
};
const manifests={}, parsed={};
for(const [key,name] of Object.entries(files)){
  const p=path.join(qa,name);
  assert.ok(fs.existsSync(p),name);
  manifests[key]={name,sha256:digest(p),bytes:fs.statSync(p).size};
  if(name.endsWith(".json"))parsed[key]=JSON.parse(fs.readFileSync(p,"utf8"));
}
assert.equal(parsed.rawBenchmark.status,"PASS_RAW_DATA");
assert.equal(parsed.rawBenchmark.runs.length,6);
assert.equal(parsed.rawBenchmark.appProcessesAfter,0);
assert.equal(parsed.analyzedBenchmark.status,"PASS_NUMERIC_ANALYSIS");
assert.equal(parsed.analyzedBenchmark.verdict,"INCONCLUSIVE");
assert.equal(parsed.analyzedBenchmark.benchmarkSHA256,manifests.rawBenchmark.sha256);
assert.equal(parsed.signing.status,"BLOCKED_NO_LOCAL_CODE_SIGNING_CREDENTIAL");
assert.equal(parsed.signing.signToolPresent,true);
assert.equal(parsed.signing.signingAttempted,false);
assert.equal(parsed.screenreader.status,"BLOCKED_HUMAN_SPEECH_CONFIRMATION");
assert.equal(parsed.screenreader.actualSpokenWordsHeardByHuman,false);
assert.equal(parsed.screenreader.audioRecordingAttempted,false);
const exe=path.join(process.env.LOCALAPPDATA,"Programs","fcv588-synthetic-electron-poc","FCV588-Synthetic-POC.exe");
const asar=path.join(process.env.LOCALAPPDATA,"Programs","fcv588-synthetic-electron-poc","resources","app.asar");
assert.equal(digest(exe),"79512e2b520a590e19cd1893c19b0a6fd1c79abb56efcd9c5e83e7613a4fa5fd");
assert.equal(digest(asar),"eb35c1a385fa468c6b2db27b51f8ec2c33032a03098ad51f8d6bb5e1edb99190");
const reportFile=path.join(qa,"FCV588_P32_RELEASE_READINESS_FINAL_REPORT_20261121.md");
const finalFile=path.join(qa,"FCV588_P32_RELEASE_READINESS_FINAL_INTEGRITY_20261121.json");
assert.ok(!fs.existsSync(reportFile)&&!fs.existsSync(finalFile),"IMMUTABLE_FINAL_ALREADY_EXISTS");
const cpu=parsed.analyzedBenchmark.resources.cpu, mem=parsed.analyzedBenchmark.resources.privateMemory;
const report=`# FCV588 P32 — Windows accessibility, CPU/RAM and signing readiness (2026-11-21)

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

- P30 CPU median ${cpu.P30.median}% (range ${cpu.P30.range.join("–")}); P31 median ${cpu.P31.median}% (range ${cpu.P31.range.join("–")}), percentage of **one logical core**, all 4 exact-executable Electron processes.
- P31 minus P30 paired mean CPU difference ${cpu.effectP31MinusP30.meanDifference.toFixed(3)} percentage points; 95% paired t interval [${cpu.effectP31MinusP30.paired95PctTInterval.map(x=>x.toFixed(3)).join(", ")}], n=${cpu.effectP31MinusP30.nPairs} pairs.
- P30 private memory median ${mem.P30.median} MiB (range ${mem.P30.range.join("–")}); P31 ${mem.P31.median} MiB (range ${mem.P31.range.join("–")}).
- P31 minus P30 paired mean private-memory difference ${mem.effectP31MinusP30.meanDifference.toFixed(3)} MiB; 95% paired t interval [${mem.effectP31MinusP30.paired95PctTInterval.map(x=>x.toFixed(3)).join(", ")}].
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
`;
fs.writeFileSync(reportFile,report,{flag:"wx"});
const integrity={
  schema:"FCV588_P32_RELEASE_READINESS_FINAL_INTEGRITY_V1",
  status:"P32_QA_INVESTIGATION_SEALED",
  signingStatus:"BLOCKED_NO_LOCAL_CODE_SIGNING_CREDENTIAL",
  spokenNarratorStatus:"BLOCKED_HUMAN_SPEECH_CONFIRMATION",
  benchmarkStatus:"PASS_RAW_DATA",
  benchmarkEffectVerdict:"INCONCLUSIVE",
  goRelease:false,
  releaseApproval:"HOLD",
  phase6:"OPEN",
  hardwareValidated:false,
  signedDistributionValidated:false,
  installedVersion:"0.0.3",
  installedExeSHA256:digest(exe),
  installedASARSHA256:digest(asar),
  parents:Object.fromEntries(Object.entries(parents).map(([key, [,hash]])=>[key,hash])),
  receipts:manifests,
  reportSHA256:digest(reportFile)
};
fs.writeFileSync(finalFile,JSON.stringify(integrity,null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify({status:integrity.status,reportSha256:digest(reportFile),finalSha256:digest(finalFile),reportFile,finalFile}));
