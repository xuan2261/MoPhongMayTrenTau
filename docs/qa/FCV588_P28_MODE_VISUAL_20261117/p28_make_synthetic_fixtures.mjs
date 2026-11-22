/** QA-only authored full synthetic sessions; not archived OEM LCD images.
 * No prefixes are converted into replay envelopes or sidecars.
 */
import {createHash} from "node:crypto";
import {writeFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import path from "node:path";
import {createSession,dispatch,createReplayEnvelope,sessionHash}
  from "../../../src/core/session.mjs";
import {TRAINING_SCENARIO as scenario} from "../../../src/core/scenario.mjs";
import {getFcvReplayAdapter}
  from "../../../src/devices/fcv588/replay-compat.mjs";
import {createFcv588ArchiveSidecar}
  from "../../../src/devices/fcv588/archive-compat.mjs";
const folder=path.dirname(fileURLToPath(import.meta.url));
const digest=b=>createHash("sha256").update(b).digest("hex");
const configurations=[
  ["profile22-lf","F1-public-reference-22",0,"P23_LOWER_BOTTOM","LF"],
  ["profile22-dual","F1-public-reference-22",1,"P23_LOWER_BOTTOM","DUAL"],
  ["profile22-hf","F1-public-reference-22",2,"P23_LOWER_BOTTOM","HF"],
  ["profile22-lfzoom","F1-public-reference-22",-1,"P23_LOWER_BOTTOM","LF-ZOOM"],
  ["profile22-hfzoom","F1-public-reference-22",3,"P23_LOWER_BOTTOM","HF-ZOOM"],
  ["profile21-dual","F1-public-reference-21",1,"P04_HISTORIC","DUAL"],
];
const manifest={
  schema:"FCV588_P28_SYNTHETIC_QA_FIXTURES_V1",
  sourceClass:"SYNTHETIC_QA_ONLY_NOT_OEM_NOT_HISTORICAL",
  hardwareValidated:false,historicalAuthentication:false,
  originalHardwarePixels:false,
  P04SidecarHasHistoricProvenance:false,
  fullSyntheticSessionsOnly:true,
  parentP27FinalSHA256:"97232cffc3ad6906beb08022c9c49bc39b6776fe7623bda193ec23605ab5ce3a",
  entries:[],
};
for(const [name,revision,rotation,contract,mode] of configurations){
  const adapter=getFcvReplayAdapter(revision);
  let s=createSession(adapter,scenario);
  const actions=[
    {kind:"restore-settings",settings:{zoomMode:"Bottom Zoom",zoomRange:"10"}},
    {kind:"down",control:"power"},{kind:"up",control:"power"},
    {kind:"tick",steps:4},
    ...(rotation===0?[]:[
      {kind:"rotate",control:"mode",steps:rotation},
      {kind:"ui-tick",elapsedMs:6000},
    ]),
  ];
  for(const action of actions)s=dispatch(s,adapter,action,scenario);
  if(s.deviceState.mode!==mode || s.deviceState.power!=="on")
    throw new Error("unexpected authored synthetic mode "+name);
  const env=createReplayEnvelope(s);
  const sidecar=createFcv588ArchiveSidecar(env,{presentationContract:contract});
  const envelopeFile=name+"-envelope.json",sidecarFile=name+"-sidecar.json";
  const envelopeText=JSON.stringify(env,null,2)+"\n";
  const sidecarText=JSON.stringify(sidecar,null,2)+"\n";
  for(const [filename,bytes] of [[envelopeFile,envelopeText],[sidecarFile,sidecarText]]){
    writeFileSync(path.join(folder,filename),bytes,{encoding:"utf8",flag:"wx"});
  }
  manifest.entries.push({
    name,profileRevision:revision,activeMode:mode,power:"on",
    savedZoomMode:"Bottom Zoom",presentationContract:contract,
    fullSessionHash:sessionHash(s),eventCount:env.events.length,
    envelopeFile,sidecarFile,
    envelopeSHA256:digest(envelopeText),sidecarSHA256:digest(sidecarText),
  });
}
writeFileSync(path.join(folder,"P28_SYNTHETIC_FIXTURE_PROVENANCE_20261117.json"),
  JSON.stringify(manifest,null,2)+"\n",{encoding:"utf8",flag:"wx"});
console.log(JSON.stringify({status:"QA_SYNTHETIC_ONLY",
  sessions:manifest.entries.length,
  manifestSHA256:digest(JSON.stringify(manifest,null,2)+"\n")}));
