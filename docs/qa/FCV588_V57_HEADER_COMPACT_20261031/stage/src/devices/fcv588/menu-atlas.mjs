/**
 * FURUNO FCV-588 training menu atlas assembled from separately written curated
 * manual-section notes. The layout/option labels are an evolving PUBLIC_REFERENCE
 * interpretation; this is NOT a licensed firmware extract or a factory menu dump.
 */
import {resolveFcvCapability} from "./capabilities.mjs";

export const FCV_MENU_CATEGORIES = Object.freeze([
  "Sounder", "Display", "Alarm", "Data", "System",
]);
// Original operator workflow re-created from manual §1.19, with atlas IDs.
export const FCV_FUNC_TARGETS = Object.freeze([
  ["Pic. Advance","sounder.pictureAdvance"],
  ["Shift","sounder.shift"],
  ["Interference","sounder.interference"],
  ["Clutter","sounder.clutter"],
  ["Color Erase","sounder.colorErase"],
  ["White Line","sounder.whiteLine"],
  ["White Marker","sounder.whiteMarker"],
  ["WPT List","data.waypoint"],
  ["Bottom Zone","sounder.bottomZone"],
  ["TVG","sounder.tvg"],
  ["Fish Symbols","display.fishSymbol"],
].map(([label,entryId])=>Object.freeze({label,entryId})));
const speed = ["4x","2x","1x","1/2","1/4","1/8","1/16","Stop"];
const yesNo = ["Off","On"];
const numeric = (start, end) =>
  Array.from({length: end - start + 1}, (_, i) => String(start + i));
// D02 source-graded classroom bank: eight positions, not measured firmware values.
// Physical RANGE reads the selected slot; operator may change slots in System.
export const FCV_RANGE_BANK_FIELDS=Object.freeze(
  ["5","10","20","40","80","150","200","300"]
    .map((defaultValue,i)=>Object.freeze({
      key:"rangePreset"+(i+1),label:"Range "+(i+1),defaultValue,
      choices:Object.freeze(["5","10","20","40","80","150","200","300"]),
      manualSection:"§2.2",sourceStatus:"SYNTHETIC_TRAINING_VALUES_UNVERIFIED",
    })));
// §1.21 defaults for two/four selectable NAV data boxes. Ordinary MENU/ENTER
// action rather than an inert value: each output gets a user-configurable slot.
export const FCV_NAV_BOX_OPTIONS=Object.freeze([
  "Off","DEPTH","SPEED (STW)","WIND","TEMPERATURE","TRIP",
  "ODOMETER","POSITION","COURSE",
  // §1.21 data menu: unsupported receiver channels remain visibly NO DATA.
  // Preserve the existing order of earlier training choices for replay tests.
  "SPEED (SOG)","RANGE","BEARING","HEADING","BAROM PRESS","TIME TO GO","XTE",
]);
export const FCV_NAV_BOX_DEFAULTS=Object.freeze({
  NAV1:Object.freeze(["SPEED (STW)","WIND","Off","Off"]),
  NAV2:Object.freeze(["DEPTH","TEMPERATURE","TRIP","ODOMETER"]),
});
// §1.18 Fish Alarm Setting: curated public-reference operator controls.
// Numeric ranges below are bounded classroom inputs, not OEM calibration.
export const FCV_FISH_ALARM_FIELDS=Object.freeze([
  ["bottomEnabled","Bottom",yesNo],
  ["bottomFrom","Bottom From",numeric(0,300)],
  ["bottomSpan","Bottom Span",numeric(1,300)],
  ["bottomType","Bottom Type",["Off","Rock","Gravel","Sand","Mud"]],
  ["fishType","Fish Type",["Off","Fish School","Bottom Fish","ACCU-FISH"]],
  ["fishLevel","Fish Level",["Low","Medium","High"]],
  ["temperature","Temperature",["Off","Inside","Outside"]],
  ["tempFrom","Temp From",numeric(-5,40)],
  ["tempSpan","Temp Span",numeric(1,50)],
  ["speedType","Speed",["Off","Inside","Outside"]],
  ["speedFrom","Speed From",numeric(0,40)],
  ["speedSpan","Speed Span",numeric(1,40)],
  ["sound","Sound",["Sound1","Sound2","Sound3"]],
].map(([key,label,choices])=>Object.freeze({
  key,label,choices:Object.freeze(choices),manualSection:"§1.18",
  sourceStatus:"CURATED_REFERENCE_SIMULATED_VALUES",
})));
const group = {
  Sounder: [
    ["pictureAdvance","Pic. Advance",speed,"§1.10"],
    ["interference","Interference",["Auto","High","Medium","Low","Off"],"§1.11"],
    ["clutter","Clutter",numeric(0,100),"§1.12"],
    ["colorErase","Color Erase",numeric(0,50),"§1.13"],
    ["whiteLine","White Line",yesNo,"§1.22"],
    ["whiteMarker","White Marker",["Off","White","Gray"],"§1.22"],
    ["tvg","TVG",["Low","Medium","High"],"§1.22"],
    ["smoothing","Smoothing",yesNo,"§1.22"],
    ["bottomZone","Bottom Zone",["Narrow","Standard","Wide"],"§1.22"],
    ["txPower","TX Power",["Auto","10%","20%","30%","40%","50%",
      "60%","70%","80%","90%","100%","Off"],"§1.22"],
    ["txRate","TX Rate",["1","2","3","4","5","6","7","8","9","10",
      "S","Max"],"§1.22"],
    ["zoomMode","Zoom Mode",["Bottom Lock","Bottom Zoom","Marker Zoom"],"§1.4"],
    ["shift","Shift",numeric(0,30),"§1.9"],
  ],
  Display: [
    ["aScope","A-Scope",["Off","Normal","Peak"],"§1.14"],
    ["colors","Colors",["8","16"],"§1.22"],
    ["depthSize","Depth Size",["Small","Medium","Large"],"§1.22"],
    ["zoomMarker","Zoom Marker",yesNo,"§1.4"],
    ["accuFish","ACCU-FISH",yesNo,"§1.15"],
    ["bottomDiscrimination","Bottom Disc.",["Off","Graphic","Probability"],"§1.16"],
    ["rezBoost","RezBoost Mode",["Off","Standard","Enhanced"],"§1.17"],
    ["fishSymbol","Fish Symbol",["Off","Fish","Circle"],"§1.15"],
    ["fishSize","Fish Size",["Small","Large"],"§1.15"],
    ["palette","Palette",["White","Blue","Black","Mono","Night"],"§1.22"],
    ["colorBar","Color Bar",yesNo,"§1.22"],
    ["tempGraph","Temp Graph",["Off","Narrow","Wide"],"§1.22"],
    ["windowSize","Window Size",null,"§1.22"],
    ["battery","Battery",yesNo,"§1.22"],
    ["headerInfo","Header Info",yesNo,"§1.22"],
    ["navData","Navigation Data",["Off","Basic","Expanded"],"§1.21"],
  ],
  Alarm: [
    ["alarm1","ALARM1",yesNo,"§1.18"],
    ["alarm2","ALARM2",yesNo,"§1.18"],
    ["alarm3","ALARM3",yesNo,"§1.18"],
    ["alarm4","ALARM4",yesNo,"§1.18"],
    ["alarm5","ALARM5",yesNo,"§1.18"],
    // §1.18 fish/bottom/temp conditions belong inside editable ALARM1-5,
    // not separate no-op toggles. Navigation alarm controls are independent.
    ["arrivalAlarm","Arrival Alarm · SIM",yesNo,"§1.18"],
    ["arrivalRadius","Arrival Radius · SIM",["0.01","0.05","0.1","0.2","0.5","1"],"§1.18"],
  ],
  Data: [
    ["nav1","NAV1 Boxes",null,"§1.21"],
    ["nav2","NAV2 Boxes",null,"§1.21"],
    ["waypoint","WPT List",null,"§1.20"],
    ["destination","Go to WPT",null,"§1.20"],
    ["deleteAllWaypoint","Delete All WPT",null,"§1.20"],
    ["trip","Trip / Odometer · SIM",null,"§1.22"],
    ["resetTrip","Reset Trip · SIM",null,"§2.6"],
    // §1.21 Data-source selectors. "NMEA" means selection of an unavailable
    // external port, NOT permission to open a serial/UDP/real ship interface.
    ["bearing","Bearing",["True","Mag"],"§1.21"],
    ["windSpeedDirection","Wind Spd/Dir",["True","Apparent"],"§1.21"],
    ["tripSource","Trip Source",["Own","NMEA"],"§1.21"],
    ["tempSource","Temp Source",["Own","NMEA"],"§1.21"],
    ["speedSource","Speed Source",["Own","NMEA"],"§1.21"],
  ],
  System: [
    ["rangePresets","Range Presets",null,"§2.2"],
    ["zoomRange","Zoom Range",["5","10","20","40"],"§2.2"],
    ["blRange","B/L Range",["5","8"],"§2.2"],
    ["language","Language",["English"],"§2.4"],
    ["units","Units",null,"§2.5"],
    ["calibration","Calibration",null,"§2.6"],
    ["transducer","Transducer",["GENERIC_600W","GENERIC_1KW","525STID-PWD"],"§2.7"],
    ["demo","Demo",yesNo,"§2.8"],
    ["diagnostics","Diagnostics",null,"§3.7"],
    ["lcdTest","LCD Test",null,"§3.9"],
    ["restore","Restore Defaults",null,"§3.9"],
    ["tankenmaru","Tankenmaru System",yesNo,"§4.10"],
    ["tankenmaruDetails","Tankenmaru Details · SIM",null,"§2.9"],
    ["nmea","NMEA",["Off"],"§4.9"],
    ["receiverStatus","Receiver Status · SIM",null,"§4.9"],
    ["keySetup","FUNC Key",FCV_FUNC_TARGETS.map(target=>target.label),"§2.3"],
    ["keyBeep","Key Beep",yesNo,"§2.3"],
    ["draft","Draft",numeric(0,20),"§2.6"],
    ["installation","Installation Settings",null,"§4.10"],
  ],
};

export const FCV_MENU_ENTRIES = Object.freeze(FCV_MENU_CATEGORIES.flatMap(category =>
  group[category].map(([suffix, label, choices, manualSection]) => Object.freeze({
    id: category.toLowerCase() + "." + suffix,
    category, label,
    menuPath: category + " > " + label,
    manualSection,
    sourceId: "PUB-FCV-001",
    sourceStatus:category==="Display" && suffix==="colors"
      ?"TRAINING_PALETTE_PREVIEW_FIRMWARE_UNKNOWN"
      :category==="Sounder" && suffix==="whiteMarker"
      ?"TRAINING_WHITE_MARKER_PREVIEW_FIRMWARE_UNKNOWN"
      :["data.trip","data.resetTrip","alarm.arrivalAlarm",
      "alarm.arrivalRadius","system.rangePresets","system.receiverStatus",
      "system.tankenmaruDetails"].includes(category.toLowerCase()+"."+suffix)
      ?"SYNTHETIC_TRAINING_MENU_PATH_UNVERIFIED"
      :"CURATED_REFERENCE_NOT_HARDWARE_VERIFIED",
    kind: choices === null ? "action" : "choice",
    choices: choices === null ? null : Object.freeze([...choices]),
    settingKey: suffix,
  })),
));

const installationEntries = [
  ["Language","language",["English"]],
  ["Type","transducer",["GENERIC_600W","GENERIC_1KW","525STID-PWD"]],
  ["Units","units",["Metric","Feet","Fathom"]],
  ["Demonstrate","demo",yesNo],
  ["Tankenmaru System","tankenmaru",yesNo],
  ["NMEA","nmea",["Off"]],
];
const installation = Object.freeze(installationEntries.map(([label,settingKey,choices]) => Object.freeze({
  label, menuPath: "Installation > " + label,
  manualSection: "§4.10", sourceId: "PUB-FCV-001",
  sourceStatus: "CURATED_REFERENCE_INSTALLATION_ONLY",
  settingKey, choices,
})));

export function getInstallationMenu(state={}) {
  // The virtual optional Tankenmaru On mode suppresses NMEA setup on both
  // System and Installation displays; merely disabling its ENTER action is
  // insufficient because the student could still see a contradictory row.
  return installation.filter(item=>
    item.settingKey!=="nmea" || state.settings?.tankenmaru!=="On")
    .map(item=>{
    if(item.settingKey==="language")return {...item,disabled:true,
      disabledReason:"RIGHTS_HOLD_LANGUAGE_ASSETS_AND_REBOOT_SOURCE_GAP"};
    if(item.settingKey==="tankenmaru")return (
      state.trainingFixture?.tankenmaruOption===true
        ?{...item,disabled:false}
        :{...item,disabled:true,
          disabledReason:"SOURCE_GAP_TANKENMARU_OPTION_NOT_DECLARED"});
    return item;
  });
}

/** Keep disabled documented items visible, with explicit reason, never fake success. */
export function getFcvMenuItems(category, state = {}) {
  if (!FCV_MENU_CATEGORIES.includes(category)) return [];
  const entries = FCV_MENU_ENTRIES.filter(entry => entry.category === category);
  const tanken = state.settings?.tankenmaru ?? "Off";
  const type = state.settings?.transducer ?? "GENERIC_600W";
  const capabilityProfile = {
    profileClass: "PUBLIC_REFERENCE", hardwareValidated: false, firmwareInstalled: null,
    virtualTransducerType: type,
    advancedCapabilities: type === "525STID-PWD"
      ? {accuFish:"CONDITIONAL",rezBoost:"CONDITIONAL",bottomDiscrimination:"CONDITIONAL"} : {},
  };
  return entries
    .filter(entry=>entry.id==="system.tankenmaruDetails"
      ?tanken==="On" && state.trainingFixture?.tankenmaruOption===true
      :!["system.nmea","system.receiverStatus"].includes(entry.id) ||
        tanken!=="On")
    .map(entry => {
      if (entry.id==="sounder.shift" && state.rangeMode!=="manual") {
        return {...entry,disabled:true,disabledReason:"SHIFT_UNAVAILABLE_IN_AUTO_RANGE"};
      }
      if(entry.id==="display.windowSize" &&
        (!["DUAL","LF-ZOOM","HF-ZOOM"].includes(state.mode) ||
          ["Normal","Peak"].includes(state.settings?.aScope))){
        return {...entry,disabled:true,
          disabledReason:"WINDOW_SIZE_REQUIRES_SPLIT_WITHOUT_ASCOPE"};
      }
      if(entry.id==="display.windowSize")return {...entry,disabled:false};
      if(entry.id==="system.language")return {...entry,disabled:true,
        disabledReason:"RIGHTS_HOLD_LANGUAGE_ASSETS_AND_REBOOT_SOURCE_GAP"};
      if(entry.id==="system.tankenmaru")return (
        state.trainingFixture?.tankenmaruOption===true
          ?{...entry,disabled:false}
          :{...entry,disabled:true,
            disabledReason:"SOURCE_GAP_TANKENMARU_OPTION_NOT_DECLARED"});
      if (!["display.accuFish", "display.rezBoost", "display.bottomDiscrimination"].includes(entry.id)) {
        return entry;
      }
      const feature = entry.id.split(".")[1];
      const condition = resolveFcvCapability(capabilityProfile, feature,
        {...state.syntheticConditions, draftM: state.settings?.draft === null ? null :
          Number(state.settings?.draft ?? NaN), rangeMode: state.rangeMode,
          allowAutoRangeEnable:feature==="bottomDiscrimination"});
      return {...entry, disabled: !condition.enabled, disabledReason: condition.reason};
    });
}
