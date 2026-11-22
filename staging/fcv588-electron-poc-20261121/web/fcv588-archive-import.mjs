/**
 * P25 classroom-only offline archive file parser and validated replay summary.
 * Independent of live session, LCD renderer and browser storage. The sidecar
 * declares visual presentation but is NOT authenticated historical provenance.
 */
import {replayFcv588Archive} from "../src/devices/fcv588/archive-compat.mjs";
import {sessionHash} from "../src/core/session.mjs";
import {TRAINING_SCENARIO,observeSounder} from "../src/core/scenario.mjs";
import {projectFcvZoom} from "../src/devices/fcv588/echo-projection.mjs";

export const ARCHIVE_ENVELOPE_MAX_BYTES=1024*1024;
export const ARCHIVE_SIDECAR_MAX_BYTES=8192;
export const ARCHIVE_MAX_EVENTS=2000;
const UNSAFE_KEYS=new Set(["__proto__","constructor","prototype"]);
const byteLength=text=>new TextEncoder().encode(text).byteLength;
function parseBounded(text,label,limit){
  if(typeof text!=="string" || byteLength(text)===0 || byteLength(text)>limit)
    throw new RangeError(label+" vượt giới hạn dung lượng hoặc rỗng");
  let parsed;
  try{parsed=JSON.parse(text);}catch{throw new TypeError(label+" không phải JSON hợp lệ");}
  let visited=0;
  function scan(value,depth){
    if(++visited>30000 || depth>32)
      throw new RangeError(label+" vượt giới hạn cấu trúc JSON");
    if(value===null || typeof value!=="object")return;
    if(Array.isArray(value)){
      for(const item of value)scan(item,depth+1);
      return;
    }
    for(const key of Object.keys(value)){
      if(UNSAFE_KEYS.has(key))throw new TypeError(label+" chứa khóa không an toàn");
      scan(value[key],depth+1);
    }
  }
  scan(parsed,0);
  return parsed;
}
export function decodeFcv588ArchivePair(envelopeText,sidecarText){
  const envelope=parseBounded(envelopeText,"Replay envelope",ARCHIVE_ENVELOPE_MAX_BYTES);
  const sidecar=parseBounded(sidecarText,"Presentation sidecar",ARCHIVE_SIDECAR_MAX_BYTES);
  if(!Array.isArray(envelope?.events) || envelope.events.length>ARCHIVE_MAX_EVENTS)
    throw new RangeError("Replay envelope vượt giới hạn số sự kiện hoặc sai định dạng");
  // P24 validates exact replay v7 schema, sidecar v1 checksum/binding,
  // profile-specific reducer and final session hash before returning.
  const {session,presentationContract}=replayFcv588Archive(
    TRAINING_SCENARIO,envelope,sidecar);
  let zoomPreview=null;
  if(session.deviceState.settings?.zoomMode==="Bottom Zoom"){
    // Synthetic projection schematic for D15, NEVER an OEM LCD image.
    const obs=observeSounder(TRAINING_SCENARIO,session.worldState,
      {columns:32,rows:81});
    const zoom=projectFcvZoom(obs,session.deviceState,{
      frequencyKhz:50,rows:81,displayContract:presentationContract,
    });
    const fraction=(obs.bottomDepthM-zoom.startDepthM)/zoom.windowDepthM;
    if(Number.isFinite(fraction)){
      zoomPreview=Object.freeze({
        startDepthM:zoom.startDepthM,windowDepthM:zoom.windowDepthM,
        bottomDepthM:obs.bottomDepthM,
        bottomFraction:Math.min(1,Math.max(0,fraction)),
      });
    }
  }
  return Object.freeze({
    profileRevision:session.profileRevision,
    presentationContract,sessionHash:sessionHash(session),
    eventCount:session.events.length,simTick:session.worldState.simTick,
    zoomPreview,
  });
}
