import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const html=readFileSync(new URL("../web/index.html",import.meta.url),"utf8");
test("P25 D15 archive replay requires two offline JSON inputs and accessible result",()=>{
  for(const id of ["archive-envelope-file","archive-sidecar-file","archive-replay-button","archive-replay-status","archive-replay-details"])
    assert.match(html,new RegExp('id="'+id+'"'),id+" missing on canonical P24");
  assert.match(html,/Không xác thực nguồn gốc/);
});

import {createSession,dispatch,createReplayEnvelope,sessionHash} from "../src/core/session.mjs";
import {TRAINING_SCENARIO as scenario} from "../src/core/scenario.mjs";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {createFcv588ArchiveSidecar} from "../src/devices/fcv588/archive-compat.mjs";
import {decodeFcv588ArchivePair,ARCHIVE_ENVELOPE_MAX_BYTES,ARCHIVE_SIDECAR_MAX_BYTES,ARCHIVE_MAX_EVENTS} from "../web/fcv588-archive-import.mjs";
const legacy=JSON.parse(readFileSync(new URL("./fixtures/P24_PINNED_PRE_P23_PROFILE22_ENVELOPE_20261117.json",import.meta.url),"utf8"));
const live=()=>{
 let s=createSession(adapter,scenario);
 s=dispatch(s,adapter,{kind:"restore-settings",settings:{zoomMode:"Bottom Zoom",zoomRange:"10"}},scenario);
 return s;
};
const encode=(envelope,contract)=>{
 const sidecar=createFcv588ArchiveSidecar(envelope,{presentationContract:contract});
 return [JSON.stringify(envelope),JSON.stringify(sidecar)];
};
test("P25 frozen historical profile22 replay remains offline and explicitly P04",()=>{
 const [e,s]=encode(legacy,"P04_HISTORIC");
 const before=e;
 const result=decodeFcv588ArchivePair(e,s);
 assert.equal(result.profileRevision,"F1-public-reference-22");
 assert.equal(result.presentationContract,"P04_HISTORIC");
 assert.equal(result.sessionHash,"f0-fnv1a32-a429fc78");
 assert.equal(e,before);
 assert.equal(result.eventCount,legacy.events.length);
 assert.equal(result.zoomPreview,null,"do not invent Bottom Zoom if historical state does not select BZ");
});
test("P25 same valid current envelope selects deterministic P04/P23 synthetic BZ without changing source",()=>{
 const original=live(), envelope=createReplayEnvelope(original), bytes=JSON.stringify(envelope);
 const historic=decodeFcv588ArchivePair(...encode(envelope,"P04_HISTORIC"));
 const current=decodeFcv588ArchivePair(...encode(envelope,"P23_LOWER_BOTTOM"));
 assert.equal(historic.sessionHash,current.sessionHash);
 assert.equal(current.sessionHash,sessionHash(original));
 assert.equal(historic.zoomPreview.bottomFraction,0.5);
 assert.equal(current.zoomPreview.bottomFraction,0.75);
 assert.notEqual(historic.zoomPreview.startDepthM,current.zoomPreview.startDepthM);
 assert.equal(JSON.stringify(envelope),bytes);
});
test("P25 rejects missing, corrupt, swapped, or tampered sidecars without a silent fallback",()=>{
 const [historical,legacySidecar]=encode(legacy,"P04_HISTORIC");
 const [current,currentSidecar]=encode(createReplayEnvelope(live()),"P23_LOWER_BOTTOM");
 assert.throws(()=>decodeFcv588ArchivePair(historical,""),/rỗng|dung lượng/);
 assert.throws(()=>decodeFcv588ArchivePair(historical,currentSidecar),/binding|mismatch|fingerprint/i);
 assert.throws(()=>decodeFcv588ArchivePair(current,legacySidecar),/binding|mismatch|fingerprint/i);
 const tampered=JSON.parse(legacySidecar);tampered.presentationContract="P23_LOWER_BOTTOM";
 assert.throws(()=>decodeFcv588ArchivePair(historical,JSON.stringify(tampered)),/fingerprint/i);
 assert.throws(()=>decodeFcv588ArchivePair(historical,"{"),/JSON/);
 assert.throws(()=>decodeFcv588ArchivePair(historical,JSON.stringify({...JSON.parse(legacySidecar),sidecarVersion:2})),/version/i);
 assert.throws(()=>decodeFcv588ArchivePair(JSON.stringify({...legacy,events:[]}),legacySidecar),/content|replay|mismatch/i);
});
test("P25 size and event-count caps reject hostile classroom files",()=>{
 const [envelope,sidecar]=encode(legacy,"P04_HISTORIC");
 assert.throws(()=>decodeFcv588ArchivePair(" ".repeat(ARCHIVE_ENVELOPE_MAX_BYTES+1),sidecar),/dung lượng/);
 assert.throws(()=>decodeFcv588ArchivePair(envelope," ".repeat(ARCHIVE_SIDECAR_MAX_BYTES+1)),/dung lượng/);
 assert.throws(()=>decodeFcv588ArchivePair(JSON.stringify({...legacy,events:Array.from({length:ARCHIVE_MAX_EVENTS+1},()=>({}))}),sidecar),/sự kiện/);
});
test("P25 reserved JSON keys and excessive nesting rejected before core replay",()=>{
 const [env,sidecar]=encode(legacy,"P04_HISTORIC");
 const injected=env.replace('"envelopeVersion":','"__proto__":{"bad":1},"envelopeVersion":');
 assert.throws(()=>decodeFcv588ArchivePair(injected,sidecar),/khóa không an toàn/);
 let deep="0";for(let i=0;i<40;i++)deep="["+deep+"]";
 assert.throws(()=>decodeFcv588ArchivePair(deep,sidecar),/cấu trúc/);
});
test("P25 UI remains separate from OEM LCD and uses local File API only",()=>{
 const js=readFileSync(new URL("../web/app.mjs",import.meta.url),"utf8");
 const module=readFileSync(new URL("../web/fcv588-archive-import.mjs",import.meta.url),"utf8");
 assert.match(js,/decodeFcv588ArchivePair\(envelopeText,sidecarText\)/);
 assert.match(js,/\.files\?\.\[0\]/);
 assert.match(js,/\.text\(\)/);
 assert.match(js,/archive-replay-status/);
 assert.match(js,/status\.dataset\.state="rejected"/);
 assert.match(js,/delete status\.dataset\[name\]/);
 assert.doesNotMatch(module,/\bfetch\s*\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage/);
 assert.doesNotMatch(js,/session\s*=\s*result\.session/);
});
