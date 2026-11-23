/**
 * Pure offline FCV-588 settings transfer (`FCV588_SETTINGS_TRANSFER_V1`) and
 * archive replay pair export helper. No DOM, network, timer, or storage I/O.
 */
import {createReplayEnvelope} from "../src/core/session.mjs";
import {createFcv588ArchiveSidecar} from "../src/devices/fcv588/archive-compat.mjs";
import {FCV588_PUBLIC_PROFILE_REVISION} from "../src/devices/fcv588/profile-version.mjs";
import * as settingsCodec from "../src/devices/fcv588/settings.mjs";

export const FCV588_SETTINGS_TRANSFER_SCHEMA = "FCV588_SETTINGS_TRANSFER_V1";
export const FCV588_SETTINGS_STORAGE_KEY = settingsCodec.FCV_SETTINGS_STORAGE_KEY;
export const FCV588_SETTINGS_TRANSFER_MAX_BYTES = 18000;
export const FCV588_SETTINGS_FILE_NAME = "FCV588-settings-training-only.json";
export const FCV588_REPLAY_ENVELOPE_FILE_NAME = "FCV588-replay-envelope.json";
export const FCV588_REPLAY_SIDECAR_FILE_NAME = "FCV588-replay-sidecar.json";

const TRANSFER_FIELDS = Object.freeze(
  ["encodedSettings", "schema", "settingsStorageKey", "trainingOnly"].sort(),
);
const byteLength = text => new TextEncoder().encode(text).byteLength;

export function decodeAnyFcv588SettingsRaw(raw) {
  if (typeof raw !== "string" || !raw || raw.length > 12000) return null;
  const current = settingsCodec.decodeFcvSettings(raw);
  if (current) {
    return Object.freeze({
      encodedSettings: raw,
      settings: Object.freeze({...current}),
      profileRevision: FCV588_PUBLIC_PROFILE_REVISION,
      legacyRevision: null,
    });
  }
  const legacyDecoders = [
    ["23", "F1-public-reference-23", settingsCodec.decodeFcvProfile23Settings],
    ["22", "F1-public-reference-22", settingsCodec.decodeFcvProfile22Settings],
    ["21", "F1-public-reference-21", settingsCodec.decodeFcvProfile21Settings],
    ["20", "F1-public-reference-20", settingsCodec.decodeFcvProfile20Settings],
    ["19", "F1-public-reference-19", settingsCodec.decodeFcvProfile19Settings],
  ];
  for (const [legacyRevision, profileRevision, decoder] of legacyDecoders) {
    const decoded = decoder?.(raw) ?? null;
    if (decoded) {
      return Object.freeze({
        encodedSettings: raw,
        settings: Object.freeze({...decoded}),
        profileRevision,
        legacyRevision,
      });
    }
  }
  return null;
}

export function exportFcv588SettingsText(settingsOrRaw) {
  let raw;
  if (typeof settingsOrRaw === "string") {
    if (!decodeAnyFcv588SettingsRaw(settingsOrRaw)) {
      throw new TypeError("Cấu hình chưa lưu hoặc không hợp lệ");
    }
    raw = settingsOrRaw;
  } else {
    raw = settingsCodec.encodeFcvSettings(settingsOrRaw);
  }
  return JSON.stringify({
    schema: FCV588_SETTINGS_TRANSFER_SCHEMA,
    trainingOnly: true,
    settingsStorageKey: FCV588_SETTINGS_STORAGE_KEY,
    encodedSettings: raw,
  }, null, 2) + "\n";
}

export function importFcv588SettingsText(text) {
  if (typeof text !== "string" || !text || byteLength(text) > FCV588_SETTINGS_TRANSFER_MAX_BYTES) {
    throw new RangeError("Tệp nhập không hợp lệ hoặc quá 18 KB");
  }
  let doc;
  try {
    doc = JSON.parse(text);
  } catch {
    throw new TypeError("JSON không hợp lệ");
  }
  if (!doc || typeof doc !== "object" || Array.isArray(doc) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(doc)) ||
      Reflect.ownKeys(doc).length !== TRANSFER_FIELDS.length ||
      Object.keys(doc).sort().join("|") !== TRANSFER_FIELDS.join("|") ||
      doc.schema !== FCV588_SETTINGS_TRANSFER_SCHEMA ||
      doc.trainingOnly !== true ||
      doc.settingsStorageKey !== FCV588_SETTINGS_STORAGE_KEY) {
    throw new TypeError("Từ chối cấu hình sai schema/profile/fingerprint hoặc có trường lạ");
  }
  const decoded = decodeAnyFcv588SettingsRaw(doc.encodedSettings);
  if (!decoded) {
    throw new TypeError("Từ chối cấu hình sai schema/profile/fingerprint hoặc có trường lạ");
  }
  return decoded;
}

export function buildFcv588ReplayExportFiles(session, presentationContract = "P23_LOWER_BOTTOM") {
  const envelope = createReplayEnvelope(session);
  const sidecar = createFcv588ArchiveSidecar(envelope, {presentationContract});
  return Object.freeze({
    presentationContract,
    envelope,
    sidecar,
    envelopeFileName: FCV588_REPLAY_ENVELOPE_FILE_NAME,
    sidecarFileName: FCV588_REPLAY_SIDECAR_FILE_NAME,
    envelopeText: JSON.stringify(envelope, null, 2) + "\n",
    sidecarText: JSON.stringify(sidecar, null, 2) + "\n",
  });
}
