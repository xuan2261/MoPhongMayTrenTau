/** Slim backward-compatibility re-export for archived profile21 settings codec. */
import {
  FCV_LEGACY_SETTINGS_STORAGE_KEY,
  FCV588_PROFILE21_BUNDLE,
} from "./legacy-profile-factory.mjs";

export const FCV_SETTINGS_STORAGE_KEY = FCV_LEGACY_SETTINGS_STORAGE_KEY;
export const validateFcvSettings = FCV588_PROFILE21_BUNDLE.validateSettings;
export const encodeFcvSettings = FCV588_PROFILE21_BUNDLE.encodeSettings;
export const decodeFcvSettings = FCV588_PROFILE21_BUNDLE.decodeSettings;
export const decodeFcvProfile19Settings = FCV588_PROFILE21_BUNDLE.decodeProfile19Settings;
