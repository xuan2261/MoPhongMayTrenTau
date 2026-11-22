import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";

const root=path.resolve(import.meta.dirname,"..","..");
const qa=path.join(root,"docs","qa","FCV588_ELECTRON_P32_RELEASE_READINESS_20261121");
const original=path.join(qa,"P32_P30_VS_P31_WINDOWS_CPU_PRIVATE_MEMORY_V1_20261121.json");
const receipt=path.join(qa,"P32_P30_VS_P31_RESOURCE_ANALYSIS_V1_20261121.json");
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const raw=JSON.parse(fs.readFileSync(original,"utf8"));
assert.equal(raw.status,"PASS_RAW_DATA");
assert.deepEqual(raw.runs.map(x=>x.variant),["P30","P31","P31","P30","P30","P31"]);
assert.equal(raw.appProcessesAfter,0);
assert.equal(raw.runs.length,6);
for(const run of raw.runs){
  assert.ok(run.wallSeconds>=4.5 && run.wallSeconds<8);
  assert.ok(run.cpuPercentOneCore>=0 && run.cpuPercentOneCore<1000);
  assert.ok(run.medianPrivateMiB>100 && run.medianPrivateMiB<1000);
  assert.ok(run.processCounts.length===6 && run.processCounts.every(x=>x===4));
}
const median=xs=>{const s=[...xs].sort((a,b)=>a-b);return s.length%2?s[Math.floor(s.length/2)]:(s[s.length/2-1]+s[s.length/2])/2;};
const mean=xs=>xs.reduce((a,b)=>a+b,0)/xs.length;
const pct=(xs,key)=>xs.filter(x=>x.variant===key);
const arms={
  P30:pct(raw.runs,"P30"),
  P31:pct(raw.runs,"P31")
};
const pairs=[0,1,2].map(i=>{
  const a=raw.runs.slice(i*2,i*2+2);
  const p30=a.find(x=>x.variant==="P30");
  const p31=a.find(x=>x.variant==="P31");
  assert.ok(p30&&p31);
  return {
    pair:i+1,order:a.map(x=>x.variant),
    cpuDifferenceOneCorePct:p31.cpuPercentOneCore-p30.cpuPercentOneCore,
    privateDifferenceMiB:p31.medianPrivateMiB-p30.medianPrivateMiB
  };
});
// n=3 means the 95% t critical value has df=2. Very wide intervals are expected.
const t95df2=4.302652729;
function estimate(xs){
  const point=mean(xs);
  const sd=Math.sqrt(xs.map(x=>(x-point)**2).reduce((a,b)=>a+b,0)/(xs.length-1));
  const halfWidth=t95df2*sd/Math.sqrt(xs.length);
  return {meanDifference:point,paired95PctTInterval:[point-halfWidth,point+halfWidth],nPairs:xs.length};
}
const result={
  schema:"FCV588_P32_RESOURCE_ANALYSIS_V1",
  status:"PASS_NUMERIC_ANALYSIS",
  benchmarkSHA256:sha(fs.readFileSync(original)),
  verdict:"INCONCLUSIVE",
  limiter:"Three short pairs, idle POWER OFF only, host background load not gated; not enough to infer overhead on active LCD or classroom hardware.",
  resources:{
    cpu:{
      metric:"percent of one logical core, all matching Electron processes",
      P30:{median:median(arms.P30.map(x=>x.cpuPercentOneCore)),range:[Math.min(...arms.P30.map(x=>x.cpuPercentOneCore)),Math.max(...arms.P30.map(x=>x.cpuPercentOneCore))]},
      P31:{median:median(arms.P31.map(x=>x.cpuPercentOneCore)),range:[Math.min(...arms.P31.map(x=>x.cpuPercentOneCore)),Math.max(...arms.P31.map(x=>x.cpuPercentOneCore))]},
      effectP31MinusP30:estimate(pairs.map(x=>x.cpuDifferenceOneCorePct))
    },
    privateMemory:{
      metric:"median sum PrivateMemorySize64 of all matching Electron processes in MiB",
      P30:{median:median(arms.P30.map(x=>x.medianPrivateMiB)),range:[Math.min(...arms.P30.map(x=>x.medianPrivateMiB)),Math.max(...arms.P30.map(x=>x.medianPrivateMiB))]},
      P31:{median:median(arms.P31.map(x=>x.medianPrivateMiB)),range:[Math.min(...arms.P31.map(x=>x.medianPrivateMiB)),Math.max(...arms.P31.map(x=>x.medianPrivateMiB))]},
      effectP31MinusP30:estimate(pairs.map(x=>x.privateDifferenceMiB))
    }
  },
  pairs,
  releaseApproval:"HOLD"
};
assert.ok(result.resources.cpu.effectP31MinusP30.paired95PctTInterval[0]<0);
assert.ok(result.resources.cpu.effectP31MinusP30.paired95PctTInterval[1]>0);
fs.writeFileSync(receipt,JSON.stringify(result,null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify({status:result.status,verdict:result.verdict,cpu:result.resources.cpu,privateMemory:result.resources.privateMemory,sha256:sha(fs.readFileSync(receipt))}));
