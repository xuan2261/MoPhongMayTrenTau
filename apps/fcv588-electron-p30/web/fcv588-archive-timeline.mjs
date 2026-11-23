/**
 * P27 D15-only bounded archive event timeline.
 * Full P24/P25 archive is validated BEFORE any partial replay. A selected
 * prefix is an instructor-only derived synthetic preview, NOT a re-labelled
 * original archive or evidence that intermediate LCD pixels were captured.
 *
 * No network, browser storage, device I/O, live session or OEM imagery.
 */
import {resolveValidatedArchivePair} from "./fcv588-archive-import.mjs";
import {getFcvReplayAdapter} from "../src/devices/fcv588/replay-compat.mjs";
import {TRAINING_SCENARIO,advanceWorld,observeTrainingStatus,
  SENSOR_MODEL_VERSION} from "../src/core/scenario.mjs";
import {createSession,dispatch,sessionHash} from
  "../src/core/session.mjs";
import {fingerprint,classifyHoldTicks,classifyHoldDurationMs} from
  "../src/core/protocol.mjs";
import {projectFcv588ArchiveBZSession} from "./fcv588-archive-bz-viewer.mjs";

const LIMIT=2000;
const CHECKPOINT_INTERVAL=32;

function buildPeriodicCheckpoints(initial,adapter,session,expectedFinalHash){
  const checkpoints=new Map([[0,{
    worldState:initial.worldState,sensorState:initial.sensorState,
    deviceState:initial.deviceState,heldControls:initial.heldControls,
  }]]);
  let worldState=initial.worldState;
  let sensorState=initial.sensorState;
  let deviceState=initial.deviceState;
  let heldControls=initial.heldControls;
  for(let i=0;i<session.events.length;i++){
    const ev=session.events[i];
    if(ev.kind==="tick"){
      worldState=advanceWorld(TRAINING_SCENARIO,worldState,ev.steps??1);
      sensorState={lastWorldTick:worldState.simTick,modelVersion:SENSOR_MODEL_VERSION};
      const sensorObservation=observeTrainingStatus(TRAINING_SCENARIO,worldState);
      deviceState=adapter.reduce(deviceState,{...ev,sensorObservation});
    }else{
      const sensorObservation=observeTrainingStatus(TRAINING_SCENARIO,worldState);
      if(ev.kind==="ui-tick"){
      deviceState=adapter.reduce(deviceState,{...ev,sensorObservation});
    }else if(ev.kind==="down"){
      heldControls={...heldControls,[ev.control]:worldState.simTick};
      deviceState=adapter.reduce(deviceState,{...ev,sensorObservation});
    }else if(ev.kind==="cancel"){
      heldControls={...heldControls};
      delete heldControls[ev.control];
      deviceState=adapter.reduce(deviceState,{...ev,sensorObservation});
    }else if(ev.kind==="up"){
      const heldSince=heldControls[ev.control];
      heldControls={...heldControls};
      delete heldControls[ev.control];
      const threshold=adapter.holdThresholdMs?.[ev.control];
      const hold=ev.durationMs===undefined
        ?classifyHoldTicks(worldState.simTick-heldSince,threshold)
        :classifyHoldDurationMs(ev.durationMs,threshold);
      deviceState=adapter.reduce(deviceState,{
        kind:"press",control:ev.control,hold,sensorObservation,
      });
      }else{
        deviceState=adapter.reduce(deviceState,{...ev,sensorObservation});
      }
    }
    const step=i+1;
    if(step%CHECKPOINT_INTERVAL===0 || step===session.events.length){
      checkpoints.set(step,{worldState,sensorState,deviceState,heldControls});
    }
  }
  const finalCheck={...initial,worldState,sensorState,deviceState,heldControls,
    events:session.events};
  if(sessionHash(finalCheck)!==expectedFinalHash)
    throw new Error("P27 checkpoint replay identity drift");
  return checkpoints;
}

/** A closed-over, validated archive; callers can only choose step indexes.
 * Periodic checkpoints avoid O(N) full-prefix replay on every slider drag while
 * keeping original v7 envelope and finalSessionHash strictly unmodified.
 */
export function createFcv588ArchiveTimeline(envelopeText,sidecarText){
  const validated=resolveValidatedArchivePair(envelopeText,sidecarText);
  const {envelope,session,presentationContract,summary}=validated;
  if(envelope.events.length>LIMIT ||
     summary.presentationContract!==presentationContract)
    throw new Error("P27 full archive replay identity drift");
  const adapter=getFcvReplayAdapter(envelope.profileRevision);
  const total=envelope.events.length;
  const initial=createSession(adapter,TRAINING_SCENARIO);
  const checkpoints=buildPeriodicCheckpoints(initial,adapter,session,summary.sessionHash);
  const prefixHashes=new Map([[total,summary.sessionHash]]);
  // All objects stay private inside this closure. Original v7 envelope and
  // its authoritative finalSessionHash are never re-authored or re-labeled.
  function select(index){
    if(!Number.isSafeInteger(index) || index<0 || index>total)
      throw new RangeError("P27 event index outside validated replay log");
    let prefix;
    if(index===0){
      prefix=initial;
    }else if(index===total){
      prefix=session;
    }else{
      const baseIndex=Math.floor(index/CHECKPOINT_INTERVAL)*CHECKPOINT_INTERVAL;
      const snap=checkpoints.get(baseIndex);
      prefix={...initial,worldState:snap.worldState,sensorState:snap.sensorState,
        deviceState:snap.deviceState,heldControls:snap.heldControls,
        events:session.events.slice(0,baseIndex)};
      for(let i=baseIndex;i<index;i++){
        const event=envelope.events[i];
        const {seq,tick,schemaVersion,...payload}=event;
        if(seq!==i+1 || tick!==prefix.worldState.simTick ||
           schemaVersion!==session.meta.schemaVersion)
          throw new Error("P27 prefix source event order/schema drift");
        prefix=dispatch(prefix,adapter,payload,TRAINING_SCENARIO);
        const recorded=prefix.events[i];
        if(fingerprint(recorded)!==fingerprint(event))
          throw new Error("P27 prefix event reserialization drift");
      }
    }
    let prefixHash=prefixHashes.get(index);
    if(!prefixHash){
      prefixHash=sessionHash(prefix);
      prefixHashes.set(index,prefixHash);
    }
    if(index===total && prefixHash!==summary.sessionHash)
      throw new Error("P27 final timeline hash drift");
    // Important: project only the validated prefix Session. Do NOT
    // create/relabel a partial replay envelope or sidecar as historical.
    const visual=projectFcv588ArchiveBZSession(prefix,presentationContract);
    const event=index>0?envelope.events[index-1]:null;
    return Object.freeze({
      index,total,
      prefixSessionHash:prefixHash,
      fullSessionHash:summary.sessionHash,
      presentationContract,
      profileRevision:envelope.profileRevision,
      worldTick:prefix.worldState.simTick,
      activeMode:prefix.deviceState.mode,
      power:prefix.deviceState.power,
      eventKind:event?.kind??"initial",
      eventControl:event?.control??null,
      eventTick:event?.tick??0,
      derivedPrefixOnly:index!==total,
      visual,
      sourceClass:"SYNTHETIC_TIMELINE_PREVIEW_NOT_ARCHIVED_PIXELS",
    });
  }
  return Object.freeze({
    eventCount:total,profileRevision:envelope.profileRevision,
    presentationContract,fullSessionHash:summary.sessionHash,
    select,
  });
}
