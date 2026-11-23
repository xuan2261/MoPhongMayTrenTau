import * as settingsCodec from "../src/devices/fcv588/settings.mjs";

export const DESKTOP_SETTINGS_TRANSFER_SCHEMA="FCV588_SETTINGS_TRANSFER_V1";
export const DESKTOP_SETTINGS_KEY=settingsCodec.FCV_SETTINGS_STORAGE_KEY;
const PROFILE_DECODERS=Object.entries(settingsCodec)
  .filter(([name,fn])=>/^decodeFcv(?:Profile\d+)?Settings$/.test(name) && typeof fn==="function")
  .map(([,fn])=>fn);
const isValidRaw=raw=>typeof raw==="string" && raw.length<=12000 &&
  PROFILE_DECODERS.some(decode=>Boolean(decode(raw)));

export function exportDesktopSettingsText(raw){
  if(!isValidRaw(raw))throw new TypeError("Cấu hình chưa lưu hoặc không hợp lệ");
  return JSON.stringify({
    schema:DESKTOP_SETTINGS_TRANSFER_SCHEMA,
    trainingOnly:true,
    settingsStorageKey:DESKTOP_SETTINGS_KEY,
    encodedSettings:raw,
  },null,2)+"\n";
}

export function importDesktopSettingsText(text){
  if(typeof text!=="string" || text.length>18000 || !text)
    throw new RangeError("Tệp nhập không hợp lệ hoặc quá 18 KB");
  let doc;
  try{doc=JSON.parse(text);}catch{throw new TypeError("JSON không hợp lệ");}
  if(!doc || typeof doc!=="object" || Array.isArray(doc) ||
     Object.keys(doc).sort().join("|")!==
       ["encodedSettings","schema","settingsStorageKey","trainingOnly"].sort().join("|") ||
     doc.schema!==DESKTOP_SETTINGS_TRANSFER_SCHEMA ||
     doc.trainingOnly!==true || doc.settingsStorageKey!==DESKTOP_SETTINGS_KEY ||
     !isValidRaw(doc.encodedSettings))
    throw new TypeError("Từ chối cấu hình sai schema/profile/fingerprint hoặc có trường lạ");
  return doc.encodedSettings;
}
