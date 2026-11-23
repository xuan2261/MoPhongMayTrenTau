/** Slim backward-compatibility re-export for archived profile21 menu atlas. */
import {
  FCV_MENU_CATEGORIES,
  FCV_FUNC_TARGETS,
  FCV_RANGE_BANK_FIELDS,
  FCV_NAV_BOX_OPTIONS,
  FCV_NAV_BOX_DEFAULTS,
  FCV_FISH_ALARM_FIELDS,
  FCV588_PROFILE21_BUNDLE,
} from "./legacy-profile-factory.mjs";

export {
  FCV_MENU_CATEGORIES,
  FCV_FUNC_TARGETS,
  FCV_RANGE_BANK_FIELDS,
  FCV_NAV_BOX_OPTIONS,
  FCV_NAV_BOX_DEFAULTS,
  FCV_FISH_ALARM_FIELDS,
};
export const FCV_MENU_ENTRIES = FCV588_PROFILE21_BUNDLE.menuEntries;
export const getInstallationMenu = FCV588_PROFILE21_BUNDLE.getInstallationMenu;
export const getFcvMenuItems = FCV588_PROFILE21_BUNDLE.getMenuItems;
