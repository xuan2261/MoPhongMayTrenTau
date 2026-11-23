/**
 * P14/P1 exact-revision replay dispatch, not implicit replay migration.
 *
 * Original profile21 and profile22 sessions use their frozen reducer/menu/adapter
 * from legacy-profile-factory.mjs. Active profile23 sessions use the current
 * reducer. Core replay still verifies the full schema, event metadata, source
 * profile fingerprint and final hash.
 */
import {replay} from "../../core/session.mjs";
import {FCV588_ADAPTER} from "./adapter.mjs";
import {
  FCV588_PROFILE21_ADAPTER,
  FCV588_PROFILE22_ADAPTER,
  FCV588_PROFILE23_ADAPTER,
} from "./legacy-profile-factory.mjs";

const PROFILE_ADAPTERS=Object.freeze({
  "F1-public-reference-21":FCV588_PROFILE21_ADAPTER,
  "F1-public-reference-22":FCV588_PROFILE22_ADAPTER,
  "F1-public-reference-23":FCV588_PROFILE23_ADAPTER,
  "F1-public-reference-24":FCV588_ADAPTER,
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
