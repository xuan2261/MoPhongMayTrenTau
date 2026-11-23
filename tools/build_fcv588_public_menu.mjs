import {readFile, writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";
import {
  FCV_MENU_CATEGORIES,
  FCV_MENU_ENTRIES,
  FCV_FISH_ALARM_FIELDS,
  FCV_RANGE_BANK_FIELDS,
  getInstallationMenu,
} from "../src/devices/fcv588/menu-atlas.mjs";

export const MENU_ATLAS_DEST = fileURLToPath(
  new URL("../docs/evidence/fcv588-public-menu-atlas.json", import.meta.url),
);

export function buildPublicMenuAtlas() {
  return {
    schemaVersion: 2,
    model: "FCV-588",
    profileClass: "PUBLIC_REFERENCE",
    claimCeiling: "CURATED_SOURCE_NOT_HARDWARE_VALIDATED",
    categories: FCV_MENU_CATEGORIES,
    entries: FCV_MENU_ENTRIES,
    installation: getInstallationMenu(),
    rangeBank: {
      sourceDecision: "SYNTHETIC_TRAINING_PRESET_VALUES_UNVERIFIED",
      fields: FCV_RANGE_BANK_FIELDS.map(field => ({
        ...field,
        sourceId: "PUB-FCV-001",
        claimDecision: "HOLD",
      })),
    },
    alarmSettings: {
      profileIds: ["ALARM1", "ALARM2", "ALARM3", "ALARM4", "ALARM5"],
      fields: FCV_FISH_ALARM_FIELDS.map(field => ({
        ...field,
        sourceId: "PUB-FCV-001",
        claimDecision: "SIMULATED_ONLY_NEEDS_OPERATOR_REVIEW",
      })),
    },
  };
}

export function buildPublicMenuAtlasContent() {
  return JSON.stringify(buildPublicMenuAtlas(), null, 2) + "\n";
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const content = buildPublicMenuAtlasContent();
  if (process.argv.includes("--check")) {
    if (await readFile(MENU_ATLAS_DEST, "utf8") !== content) {
      console.error("FAIL: menu evidence register drift");
      process.exitCode = 1;
    } else {
      console.log("PASS: FCV public menu source atlas matches operator code");
    }
  } else {
    await writeFile(MENU_ATLAS_DEST, content);
    console.log("WROTE: FCV menu source atlas (" + FCV_MENU_ENTRIES.length + " entries)");
  }
}
