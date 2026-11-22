import {open,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createSession,dispatch,sessionHash,createReplayEnvelope} from '../../../src/core/session.mjs';
import {TRAINING_SCENARIO as scenario} from '../../../src/core/scenario.mjs';
import {FCV588_ADAPTER as adapter} from '../../../src/devices/fcv588/adapter.mjs';
import {replayFcv588Envelope} from '../../../src/devices/fcv588/replay-compat.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const events=[{kind:'down',control:'power'},{kind:'up',control:'power',durationMs:100},
 {kind:'tick',steps:4},{kind:'press',control:'menu'},
 ...Array.from({length:5},()=>({kind:'pad',control:'trackpad',direction:'down'}))];
if(adapter.revision!=='F1-public-reference-22')throw Error('Source preimage not profile22');
let s=createSession(adapter,scenario);
for(const e of events)s=dispatch(s,adapter,e,scenario);
const envelope=createReplayEnvelope(s);
const restored=replayFcv588Envelope(scenario,envelope);
if(sessionHash(restored)!==sessionHash(s))throw Error('profile22 current replay mismatch');
const bytes=Buffer.from(JSON.stringify(envelope,null,2)+'\n');
const outfile=path.join(here,'P23_FROZEN_PRECHANGE_PROFILE22_ENVELOPE_20261117.json');
const handle=await open(outfile,'wx');
try{await handle.writeFile(bytes)}finally{await handle.close()}
const meta={schema:'FCV588_P23_PRECHANGE_PROFILE22_REPLAY_FIXTURE_V1',purpose:'Immutable visual-replay migration preimage; no OEM image/firmware',
 profileRevision:s.profileRevision,profileHash:s.meta.profileHash,
 sessionHash:sessionHash(s),events:events.length,envelopeFingerprint:envelope.contentFingerprint,
 envelopeSHA256:createHash('sha256').update(bytes).digest('hex'),
 bytes:bytes.length,selectedMenuIndex:s.deviceState.overlay?.itemIndex};
const metab=Buffer.from(JSON.stringify(meta,null,2)+'\n');
const mh=await open(path.join(here,'P23_FROZEN_PROFILE22_REPLAY_META_20261117.json'),'wx');
try{await mh.writeFile(metab)}finally{await mh.close()}
console.log(JSON.stringify({...meta,metaSHA256:createHash('sha256').update(metab).digest('hex')}));