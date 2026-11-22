/**
 * P14 exact-revision replay dispatch, not implicit replay migration.
 *
 * Original profile21 sessions use their frozen reducer/menu/adapter. New AP-1
 * profile22 sessions use the active reducer. Core replay still verifies the
 * full schema, event metadata, source profile fingerprint and final hash.
 * Neither path invents an OEM firmware version or connects real hardware.
 */
import {replay} from "../../core/session.mjs";
import {FCV588_ADAPTER} from "./adapter.mjs";
import {FCV588_PROFILE21_ADAPTER} from "./adapter-profile21.mjs";

const PROFILE_ADAPTERS=Object.freeze({
  "F1-public-reference-21":FCV588_PROFILE21_ADAPTER,
  "F1-public-reference-22":FCV588_ADAPTER,
});

export function getFcvReplayAdapter(profileRevision){
  if(typeof profileRevision!=="string" ||
      !Object.hasOwn(PROFILE_ADAPTERS,profileRevision)){
    throw new TypeError("unsupported FCV-588 replay profile revision");
  }
  return PROFILE_ADAPTERS[profileRevision];
}

/** Caller gets a version-matched legacy or current Session, never re-labels
 * an old event stream as a new revision to force a successful replay. */
export function replayFcv588Envelope(scenario,envelope){
  const adapter=getFcvReplayAdapter(envelope?.profileRevision);
  return replay(adapter,scenario,envelope);
}
