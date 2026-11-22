/**
 * P27 D15-only bounded archive event timeline.
 * Full P24/P25 archive is validated BEFORE any partial replay. A selected
 * prefix is an instructor-only derived synthetic preview, NOT a re-labelled
 * original archive or evidence that intermediate LCD pixels were captured.
 *
 * No network, browser storage, device I/O, live session or OEM imagery.
 */
import {decodeFcv588ArchivePair} from "./fcv588-archive-import.mjs";
import {replayFcv588Archive} from
  "../src/devices/fcv588/archive-compat.mjs";
import {getFcvReplayAdapter} from "../src/devices/fcv588/replay-compat.mjs";
import {TRAINING_SCENARIO} from "../src/core/scenario.mjs";
import {createSession,dispatch,sessionHash} from
  "../src/core/session.mjs";
import {fingerprint} from "../src/core/protocol.mjs";
import {projectFcv588ArchiveBZSession} from "./fcv588-archive-bz-viewer.mjs";

const LIMIT=2000;

/** A closed-over, validated archive; callers can only choose step indexes.
 * Recompute deterministic prefix, rather than keeping 2000 bulky snapshots
 * or trusting truncated envelope bytes as an original signed archive.
 */
export function createFcv588ArchiveTimeline(envelopeText,sidecarText){
  const summary=decodeFcv588ArchivePair(envelopeText,sidecarText);
  const envelope=JSON.parse(envelopeText);
  const sidecar=JSON.parse(sidecarText);
  const {session,presentationContract}=replayFcv588Archive(
    TRAINING_SCENARIO,envelope,sidecar);
  if(summary.sessionHash!==sessionHash(session) ||
     summary.presentationContract!==presentationContract ||
     envelope.events.length>LIMIT)
    throw new Error("P27 full archive replay identity drift");
  const adapter=getFcvReplayAdapter(envelope.profileRevision);
  const total=envelope.events.length;
  // All objects stay private inside this closure. Original v7 envelope and
  // its authoritative finalSessionHash are never re-authored or re-labeled.
  function select(index){
    if(!Number.isSafeInteger(index) || index<0 || index>total)
      throw new RangeError("P27 event index outside validated replay log");
    let prefix=createSession(adapter,TRAINING_SCENARIO);
    for(let i=0;i<index;i++){
      const event=envelope.events[i];
      const {seq,tick,schemaVersion,...payload}=event;
      if(seq!==i+1 || tick!==prefix.worldState.simTick ||
         schemaVersion!==session.meta.schemaVersion)
        throw new Error("P27 prefix source event order/schema drift");
      prefix=dispatch(prefix,adapter,payload,TRAINING_SCENARIO);
      // Byte-semantic equality after reducer serializes the event back:
      // dispatch may reject/normalize a bad or unsupported input.
      const recorded=prefix.events[i];
      if(fingerprint(recorded)!==fingerprint(event))
        throw new Error("P27 prefix event reserialization drift");
    }
    const prefixHash=sessionHash(prefix);
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
