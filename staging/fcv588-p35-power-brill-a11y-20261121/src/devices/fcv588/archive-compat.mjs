/**
 * P24 FCV-588 zoom presentation provenance for portable replay envelopes.
 * Archive SIDE-CAR ONLY: never modifies the strict core replay v7 envelope.
 * The fingerprint detects accidental drift; it is NOT authentication or proof
 * that a historical P04/P23 declaration reflects an actual OEM/source capture.
 * Old and new presentation share profile22: never guess zoom pixels from that
 * state-only revision. A missing presentation sidecar fails CLOSED here; the
 * existing replayFcv588Envelope() remains valid for state-only restoration.
 */
import {fingerprint} from "../../core/protocol.mjs";
import {getFcvReplayAdapter,replayFcv588Envelope} from "./replay-compat.mjs";

export const FCV588_ARCHIVE_SIDECAR_VERSION=1;
export const FCV588_PRESENTATION_CONTRACTS=Object.freeze([
  "P04_HISTORIC","P23_LOWER_BOTTOM",
]);
const FIELDS=Object.freeze([
  "sidecarVersion","replayContentFingerprint","presentationContract",
  "contentFingerprint",
]);
const assertPlainFields=(record,fields)=>{
  if(!record || typeof record!=="object" || Array.isArray(record) ||
      ![Object.prototype,null].includes(Object.getPrototypeOf(record)) ||
      Reflect.ownKeys(record).length!==fields.length ||
      !fields.every(key=>{
        const descriptor=Object.getOwnPropertyDescriptor(record,key);
        return Object.hasOwn(record,key) && descriptor?.enumerable===true &&
          Object.hasOwn(descriptor,"value");
      }))
    throw new TypeError("invalid FCV-588 archive sidecar schema/fields");
};
const assertReplayHeader=(envelope)=>{
  if(!envelope || typeof envelope!=="object" || Array.isArray(envelope) ||
      ![Object.prototype,null].includes(Object.getPrototypeOf(envelope)) ||
      typeof envelope.profileRevision!=="string" ||
      typeof envelope.contentFingerprint!=="string" ||
      !/^f0-fnv1a32-[a-f0-9]{8}$/.test(envelope.contentFingerprint))
    throw new TypeError("invalid replay envelope presentation header");
  // This is exact-revision validation only; core replay checks every event,
  // original profile hash and final session hash separately.
  getFcvReplayAdapter(envelope.profileRevision);
};
const assertContract=contract=>{
  if(!FCV588_PRESENTATION_CONTRACTS.includes(contract))
    throw new TypeError("unsupported FCV-588 zoom presentation contract");
};

/** Explicit authoring of a sidecar for an already identified replay origin.
 * Callers must retain independently checked provenance; accepting a declared
 * label here is NOT proof that the envelope existed before the P23 correction.
 */
export function createFcv588ArchiveSidecar(envelope,{presentationContract}={}){
  assertReplayHeader(envelope);
  assertContract(presentationContract);
  const body={sidecarVersion:FCV588_ARCHIVE_SIDECAR_VERSION,
    replayContentFingerprint:envelope.contentFingerprint,presentationContract};
  return Object.freeze({...body,contentFingerprint:fingerprint(body)});
}

/** Never silently infer a historical BZ contract from profileRevision 22.
 * All imported visual archives require an explicit sidecar, including 21.
 * A raw v7 envelope can still be replayed for state-only data elsewhere.
 */
function resolveFcv588ArchivePresentation(envelope,sidecar){
  assertReplayHeader(envelope);
  if(sidecar===null || sidecar===undefined)
    throw new Error("FCV588_ARCHIVE_PRESENTATION_AMBIGUOUS: sidecar required");
  assertPlainFields(sidecar,FIELDS);
  if(sidecar.sidecarVersion!==FCV588_ARCHIVE_SIDECAR_VERSION)
    throw new TypeError("unsupported FCV-588 archive sidecar version/schema");
  assertContract(sidecar.presentationContract);
  if(typeof sidecar.replayContentFingerprint!=="string" ||
      typeof sidecar.contentFingerprint!=="string")
    throw new TypeError("invalid FCV-588 archive fingerprint fields");
  const {contentFingerprint,...body}=sidecar;
  if(contentFingerprint!==fingerprint(body))
    throw new Error("FCV-588 archive sidecar fingerprint mismatch");
  if(sidecar.replayContentFingerprint!==envelope.contentFingerprint)
    throw new Error("FCV-588 archive sidecar replay binding mismatch");
  return sidecar.presentationContract;
}

/** Pure replay plus the selected versioned DISPLAY contract. The event log
 * remains untouched, and the returned selector must be passed to projectFcvZoom.
 * This does not assemble a full OEM LCD screenshot or import arbitrary archives
 * into the live classroom UI. No rights/hardware/firmware inference is made.
 */
export function replayFcv588Archive(scenario,envelope,sidecar){
  const presentationContract=resolveFcv588ArchivePresentation(envelope,sidecar);
  const session=replayFcv588Envelope(scenario,envelope);
  return Object.freeze({session,presentationContract});
}
