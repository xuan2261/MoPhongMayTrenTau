/**
 * Bounded, offline-only LOCAL storage codec. This is not an authentication or
 * anti-tamper boundary; validation rejects unknown/unsafe option keys and values
 * before they enter an event-sourced FCV training session.
 */
import {fingerprint} from "../../core/protocol.mjs";
import {FCV_MENU_ENTRIES,FCV_FISH_ALARM_FIELDS,FCV_RANGE_BANK_FIELDS,
  FCV_NAV_BOX_OPTIONS,FCV_NAV_BOX_DEFAULTS} from "./menu-atlas.mjs";
import {FCV588_PUBLIC_PROFILE_REVISION} from "./profile-version.mjs";
import {FCV_CALIBRATION_FIELDS} from "./calibration.mjs";
import {FCV_UNIT_FIELDS} from "./units.mjs";

export const FCV_SETTINGS_STORAGE_KEY=
  "mophongmaytrentau.fcv588.public-reference.settings.v18";
const SETTINGS_SCHEMA_VERSION=18;
const choices=new Map(FCV_MENU_ENTRIES
  .filter(item=>item.kind==="choice")
  .map(item=>[item.settingKey,item.choices]));
for(let n=1;n<=5;n++){
  for(const field of FCV_FISH_ALARM_FIELDS){
    const key="alarm"+n+field.key[0].toUpperCase()+field.key.slice(1);
    choices.set(key,field.choices);
  }
}
for(const field of FCV_RANGE_BANK_FIELDS)choices.set(field.key,field.choices);
choices.set("windowRatio",["25","30","35","40","45","50","55","60","65","70","75"]);
for(const field of FCV_CALIBRATION_FIELDS)choices.set(field.key,field.choices);
for(const field of FCV_UNIT_FIELDS)choices.set(field.key,field.choices);
for(const mode of ["NAV1","NAV2"]){
  for(let i=0;i<FCV_NAV_BOX_DEFAULTS[mode].length;i++){
    choices.set(mode.toLowerCase()+"Box"+(i+1),
      i<2?FCV_NAV_BOX_OPTIONS.filter(option=>option!=="Off"):
        FCV_NAV_BOX_OPTIONS);
  }
}

export function validateFcvSettings(settings) {
  if(!settings || typeof settings!=="object" || Array.isArray(settings) ||
    (Object.getPrototypeOf(settings)!==Object.prototype &&
      Object.getPrototypeOf(settings)!==null)){
    throw new TypeError("invalid settings object");
  }
  const keys=Object.keys(settings);
  if(keys.length===0 || keys.length>choices.size)throw new RangeError("invalid settings size");
  const clean={};
  for(const key of keys){
    if(!Object.hasOwn(choices,key) && !choices.has(key))
      throw new TypeError("unknown/unsafe settings key: "+key);
    if(["__proto__","prototype","constructor"].includes(key))
      throw new TypeError("unsafe settings key");
    const value=settings[key];
    if(value===null && key==="draft"){clean[key]=null;continue;}
    if(typeof value!=="string" || !choices.get(key)?.includes(value)){
      throw new RangeError("invalid settings value: "+key);
    }
    clean[key]=value;
  }
  return clean;
}

export function encodeFcvSettings(settings){
  const safe=validateFcvSettings(settings);
  const body={schemaVersion:SETTINGS_SCHEMA_VERSION,profileClass:"PUBLIC_REFERENCE",
    profileRevision:FCV588_PUBLIC_PROFILE_REVISION,settings:safe};
  return JSON.stringify({...body,contentFingerprint:fingerprint(body)});
}

function decodeSettingsForProfile(input,profileRevision){
  if(typeof input!=="string" || input.length>12000 || !input)return null;
  try{
    const json=JSON.parse(input);
    if(!json || typeof json!=="object" || Array.isArray(json) ||
      Object.keys(json).sort().join("|")!==["contentFingerprint","profileClass",
        "profileRevision","schemaVersion","settings"].sort().join("|") ||
      json.schemaVersion!==SETTINGS_SCHEMA_VERSION ||
      json.profileRevision!==profileRevision ||
      json.profileClass!=="PUBLIC_REFERENCE")return null;
    const body={schemaVersion:json.schemaVersion,profileClass:json.profileClass,
      profileRevision:json.profileRevision,settings:json.settings};
    if(json.contentFingerprint!==fingerprint(body))return null;
    return validateFcvSettings(json.settings);
  }catch{
    return null;
  }
}

/** The ordinary decoder never accepts another profile implicitly. */
export function decodeFcvSettings(input){
  return decodeSettingsForProfile(input,FCV588_PUBLIC_PROFILE_REVISION);
}

/** Explicit V30 -> V31 committed-setting import. Schema18 values are unchanged.
 * This is NOT replay migration, an editor draft, or a virtual-option grant.
 * Validate the original profile19 fingerprint before returning any values.
 */
export function decodeFcvProfile19Settings(input){
  return decodeSettingsForProfile(input,"F1-public-reference-19");
}

/** Explicit settings-only import from archived profile21.
 * Re-validates the exact legacy profile fingerprint and current allowed
 * setting values; never migrates a replay envelope or an in-progress editor.
 */
export function decodeFcvProfile21Settings(input){
  return decodeSettingsForProfile(input,"F1-public-reference-21");
}
