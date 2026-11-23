/**
 * Parameterized frozen historical FCV-588 profile factory (pre-P1 semantics).
 *
 * Eliminates the 10-file `*-profile21.mjs` copy-paste duplication while keeping
 * BOTH `F1-public-reference-21` (original Sounder row order) and
 * `F1-public-reference-22` (AP-1 Sounder row order, pre-P1 initialSettings and
 * pre-P1 reducer) byte-for-byte deterministic for sealed replay fixtures.
 */
import {fingerprint} from "../../core/protocol.mjs";
import {resolveFcvCapability} from "./capabilities.mjs";
import {FCV_CALIBRATION_FIELDS} from "./calibration.mjs";
import {FCV_UNIT_FIELDS,formatFcvDepth,formatFcvTemperature,formatFcvSpeed,
  formatFcvDistance} from "./units.mjs";

export const FCV_MENU_CATEGORIES = Object.freeze([
  "Sounder", "Display", "Alarm", "Data", "System",
]);

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

export const FCV_RANGE_BANK_FIELDS=Object.freeze(
  ["5","10","20","40","80","150","200","300"]
    .map((defaultValue,i)=>Object.freeze({
      key:"rangePreset"+(i+1),label:"Range "+(i+1),defaultValue,
      choices:Object.freeze(["5","10","20","40","80","150","200","300"]),
      manualSection:"§2.2",sourceStatus:"SYNTHETIC_TRAINING_VALUES_UNVERIFIED",
    })));

export const FCV_NAV_BOX_OPTIONS=Object.freeze([
  "Off","DEPTH","SPEED (STW)","WIND","TEMPERATURE","TRIP",
  "ODOMETER","POSITION","COURSE",
  "SPEED (SOG)","RANGE","BEARING","HEADING","BAROM PRESS","TIME TO GO","XTE",
]);

export const FCV_NAV_BOX_DEFAULTS=Object.freeze({
  NAV1:Object.freeze(["SPEED (STW)","WIND","Off","Off"]),
  NAV2:Object.freeze(["DEPTH","TEMPERATURE","TRIP","ODOMETER"]),
});

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

const SOUNDER_PROFILE21 = [
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
];

const SOUNDER_AP1 = [
  ["pictureAdvance","Pic. Advance",speed,"§1.10"],
  ["zoomMode","Zoom Mode",["Bottom Lock","Bottom Zoom","Marker Zoom"],"§1.4"],
  ["shift","Shift",numeric(0,30),"§1.9"],
  ["interference","Interference",["Auto","High","Medium","Low","Off"],"§1.11"],
  ["colorErase","Color Erase",numeric(0,50),"§1.13"],
  ["clutter","Clutter",numeric(0,100),"§1.12"],
  ["whiteLine","White Line",yesNo,"§1.22"],
  ["whiteMarker","White Marker",["Off","White","Gray"],"§1.22"],
  ["tvg","TVG",["Low","Medium","High"],"§1.22"],
  ["smoothing","Smoothing",yesNo,"§1.22"],
  ["bottomZone","Bottom Zone",["Narrow","Standard","Wide"],"§1.22"],
  ["txPower","TX Power",["Auto","10%","20%","30%","40%","50%",
    "60%","70%","80%","90%","100%","Off"],"§1.22"],
  ["txRate","TX Rate",["1","2","3","4","5","6","7","8","9","10",
    "S","Max"],"§1.22"],
];

const SHARED_GROUPS = {
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

export function getLegacyInstallationMenu(state={}) {
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

// Historical pre-P1 navigation helpers (uncalibrated NAV boxes preserved for profile21 tests)
export const createLegacyNavigationState=()=>({
  waypoints:[],destinationId:null,nextWaypointNumber:1,
  tripNm:0,odometerNm:0,
});
export function advanceLegacyTrainingTrip(state,speedKn,elapsedSeconds){
  if(!Number.isFinite(speedKn)||speedKn<0||
     !Number.isInteger(elapsedSeconds)||elapsedSeconds<1||elapsedSeconds>20)
    return state;
  const incrementNm=speedKn*elapsedSeconds/3600;
  return {...state,tripNm:state.tripNm+incrementNm,
    odometerNm:state.odometerNm+incrementNm};
}
export const isValidLegacySyntheticPosition=p=>p && p.source==="SYNTHETIC_FIXTURE" &&
  Number.isFinite(p.lat) && p.lat>=-90 && p.lat<=90 &&
  Number.isFinite(p.lon) && p.lon>=-180 && p.lon<=180;
export const isValidLegacySyntheticSpeed=speedKn=>
  Number.isFinite(speedKn) && speedKn>=0;
const validAngle=degrees=>Number.isFinite(degrees) && degrees>=0 && degrees<360;
export const formatLegacySyntheticPosition=p=>"SIM "+
  Math.abs(p.lat).toFixed(4)+"°"+(p.lat>=0?"N":"S")+" "+
  Math.abs(p.lon).toFixed(4)+"°"+(p.lon>=0?"E":"W");
export function legacyDistanceNmBetween(a,b){
  if(!isValidLegacySyntheticPosition(a)||!isValidLegacySyntheticPosition(b))return null;
  const radians=Math.PI/180;
  const dLat=(b.lat-a.lat)*radians;
  const dLon=(b.lon-a.lon)*radians;
  const h=Math.sin(dLat/2)**2+
    Math.cos(a.lat*radians)*Math.cos(b.lat*radians)*Math.sin(dLon/2)**2;
  return 3440.065*2*Math.asin(Math.min(1,Math.sqrt(h)));
}
const validateName=name=>{
  if(typeof name!=="string" || !name.trim() || name.length>8)
    throw new RangeError("invalid waypoint name");
  return name.trim();
};
export function addLegacyWaypoint(state,{name,position}={}) {
  if(!isValidLegacySyntheticPosition(position)) throw new Error("synthetic waypoint position missing");
  if(state.waypoints.length>=20) throw new RangeError("waypoint limit 20");
  const id="WP"+String(state.nextWaypointNumber).padStart(3,"0");
  const waypoint={id,name:validateName(name),position:{...position}};
  return {...state,nextWaypointNumber:state.nextWaypointNumber+1,
    waypoints:[...state.waypoints,waypoint]};
}
export function editLegacyWaypoint(state,id,{name,position}={}) {
  if(!state.waypoints.some(w=>w.id===id)) throw new Error("unknown waypoint");
  if(position!==undefined && !isValidLegacySyntheticPosition(position)) throw new Error("invalid synthetic position");
  return {...state,waypoints:state.waypoints.map(w=>w.id===id
    ? {...w,name:name===undefined?w.name:validateName(name),
      position:position===undefined?w.position:{...position}}:w)};
}
export function deleteLegacyWaypoint(state,id) {
  if(!state.waypoints.some(w=>w.id===id)) throw new Error("unknown waypoint");
  if(state.destinationId===id) throw new Error("destination waypoint protected");
  return {...state,waypoints:state.waypoints.filter(w=>w.id!==id),
    destinationId:state.destinationId};
}
export function setLegacyDestination(state,id) {
  if(id===null) return {...state,destinationId:null};
  if(!state.waypoints.some(w=>w.id===id)) throw new Error("unknown waypoint destination");
  return {...state,destinationId:id};
}
export function projectLegacyFcvTravelValues(navState,settings){
  const externalTrip=settings?.tripSource==="NMEA";
  return {
    tripNm:externalTrip?null:
      Number.isFinite(navState?.tripNm)?navState.tripNm:null,
    odometerNm:Number.isFinite(navState?.odometerNm)?navState.odometerNm:null,
    tripSourceStatus:externalTrip?"NO EXTERNAL RECEIVER":"SYNTHETIC OWN",
  };
}
export function projectLegacyNavData(sample,mode,{
  simTick=0,staleAfterTicks=10,units="Metric",speedUnit="kn",
}={}) {
  const noData=status=>({status,boxes:[
    {label:"POSITION",value:"NO DATA"},{label:"SPEED",value:"NO DATA"},
  ],trainingOnly:true});
  if(!sample || !isValidLegacySyntheticPosition(sample.position) ||
      !Number.isInteger(sample.observedAtTick)) return noData("NO_DATA");
  if(simTick-sample.observedAtTick>staleAfterTicks ||
      simTick<sample.observedAtTick) return noData("STALE_DATA");
  const pos=formatLegacySyntheticPosition(sample.position);
  const boxes=mode==="NAV1"
    ? [{label:"POSITION",value:pos},
      {label:"DEPTH",value:Number.isFinite(sample.depthM)
        ? formatFcvDepth(sample.depthM,units)+" (SIM)":"NO DATA"}]
    : [{label:"POSITION",value:pos},
      {label:"SPEED",value:isValidLegacySyntheticSpeed(sample.speedKn)
        ? formatFcvSpeed(sample.speedKn,speedUnit)+" (SIM)":"NO DATA"},
      {label:"COURSE",value:validAngle(sample.courseDeg)
        ? sample.courseDeg.toFixed(0)+"° (SIM)":"NO DATA"}];
  return {status:"SYNTHETIC_DATA",boxes,trainingOnly:true};
}
export function projectLegacyFcvManualNavBoxes({
  mode="NAV1",simTick=0,sample=null,navState=null,settings=null,
  sonarDepthM=null,units="Metric",tempUnit="C",speedUnit="kn",
  distanceUnit="NM",staleAfterTicks=10,
}={}){
  if(!["NAV1","NAV2"].includes(mode))throw new RangeError("unknown NAV view");
  const observed=sample?.observedAtTick;
  const valid=isValidLegacySyntheticPosition(sample?.position) && Number.isInteger(observed) &&
    Number.isInteger(simTick) && simTick>=observed &&
    simTick-observed<=staleAfterTicks;
  const stale=Number.isInteger(observed) && simTick-observed>staleAfterTicks;
  const sim=value=>value===null?"NO DATA":String(value)+" (SIM)";
  const depth=Number.isFinite(sonarDepthM)
    ?sim(formatFcvDepth(sonarDepthM,units)):"NO DATA";
  const speed=valid && settings?.speedSource!=="NMEA" &&
      isValidLegacySyntheticSpeed(sample.speedKn)
    ?sim(formatFcvSpeed(sample.speedKn,speedUnit)):"NO DATA";
  const temp=valid && settings?.tempSource!=="NMEA" &&
      Number.isFinite(sample.temperatureC)
    ?sim(formatFcvTemperature(sample.temperatureC,tempUnit)):"NO DATA";
  const travel=projectLegacyFcvTravelValues(navState,settings);
  const distance=field=>valid && Number.isFinite(travel[field])
    ?sim(distanceUnit==="NM"?travel[field].toFixed(3)+" nm":
      formatFcvDistance(travel[field],distanceUnit)):"NO DATA";
  const position=valid?formatLegacySyntheticPosition(sample.position):"NO DATA";
  const course=valid && validAngle(sample.courseDeg)
    ?sim(sample.courseDeg.toFixed(0)+"°"):"NO DATA";
  const fieldIsTyped=field=>valid &&
    Object.hasOwn(sample?.fieldSources??{},field) &&
    sample.fieldSources[field]==="SYNTHETIC_FIXTURE";
  const sog=fieldIsTyped("speedOverGroundKn") &&
      isValidLegacySyntheticSpeed(sample.speedOverGroundKn)
    ?sim(formatFcvSpeed(sample.speedOverGroundKn,speedUnit)):"NO DATA";
  const bearing=fieldIsTyped("bearingDeg") && validAngle(sample.bearingDeg)
    ?sim(sample.bearingDeg.toFixed(0)+"°"):"NO DATA";
  const heading=fieldIsTyped("headingDeg") && validAngle(sample.headingDeg)
    ?sim(sample.headingDeg.toFixed(0)+"°"):"NO DATA";
  const pressure=fieldIsTyped("barometerHPa") &&
      Number.isFinite(sample.barometerHPa) && sample.barometerHPa>0
    ?sim(sample.barometerHPa.toFixed(1)+" hPa"):"NO DATA";
  const crossTrack=fieldIsTyped("crossTrackNm") &&
      Number.isFinite(sample.crossTrackNm)
    ?sim(formatFcvDistance(sample.crossTrackNm,distanceUnit)):"NO DATA";
  const destination=navState?.waypoints?.find(waypoint=>
    waypoint.id===navState.destinationId);
  const rangeNm=valid && destination
    ?legacyDistanceNmBetween(sample.position,destination.position):null;
  const waypointRange=Number.isFinite(rangeNm)
    ?sim(distanceUnit==="NM"?rangeNm.toFixed(2)+" nm":
      formatFcvDistance(rangeNm,distanceUnit)):"NO DATA";
  const ownSpeedKn=valid && settings?.speedSource!=="NMEA"
    ?sample?.speedKn:null;
  const minutes=Number.isFinite(rangeNm) && Number.isFinite(ownSpeedKn) &&
    ownSpeedKn>0 ?Math.ceil(rangeNm*60/ownSpeedKn):null;
  const timeToGo=Number.isSafeInteger(minutes) && minutes>=0 &&
    minutes<=99*60+59
    ?String(Math.floor(minutes/60)).padStart(2,"0")+":"+
      String(minutes%60).padStart(2,"0")+" (SIM EST)"
    :"NO DATA";
  const values={"SPEED (STW)":speed,WIND:"NO DATA",DEPTH:depth,
    TEMPERATURE:temp,TRIP:distance("tripNm"),ODOMETER:distance("odometerNm"),
    POSITION:position,COURSE:course,"SPEED (SOG)":sog,
    RANGE:waypointRange,BEARING:bearing,HEADING:heading,
    "BAROM PRESS":pressure,"TIME TO GO":timeToGo,XTE:crossTrack};
  const defaults=FCV_NAV_BOX_DEFAULTS[mode];
  const boxes=defaults.map((fallback,i)=>{
    const selected=settings?.[mode.toLowerCase()+"Box"+(i+1)];
    const label=FCV_NAV_BOX_OPTIONS.includes(selected) &&
      (i>=2 || selected!=="Off")?selected:fallback;
    const labelled=label==="BEARING" && settings?.bearing==="Mag"
      ?"BEARING (MAG)"
      :label==="WIND" && settings?.windSpeedDirection==="Apparent"
        ?"WIND (APPARENT)"
        :label;
    return {label:labelled,value:values[label]??"NO DATA"};
  }).filter(item=>item.label!=="Off");
  return {status:valid?"SYNTHETIC_DATA":stale?"STALE_DATA":"NO_DATA",
    boxes,trainingOnly:true,hardwareValidated:false,
    sourceClass:"SIMULATED_ONLY"};
}

function matchLegacyCondition(condition, sensor) {
  if (condition.enabled === false) return true;
  switch (condition.kind) {
    case "depthRange":
      return Number.isFinite(sensor.bottomDepthM) &&
        sensor.bottomDepthM >= condition.min && sensor.bottomDepthM <= condition.max;
    case "fishPresent":
      if(typeof sensor.fishPresent!=="boolean" ||
         sensor.fishPresent!==condition.value)return false;
      if(condition.syntheticType){
        if(condition.syntheticType==="ACCU-FISH"){
          if(sensor.accuFishAvailable!==true)return false;
        }else if(sensor.fishCategory!==condition.syntheticType)return false;
        const levels={Low:0.25,Medium:0.55,High:0.8};
        if(!Number.isFinite(sensor.fishStrength) ||
           sensor.fishStrength<(levels[condition.level]??1))return false;
      }
      return true;
    case "bottomType":
      return typeof sensor.bottomType === "string" &&
        sensor.bottomType === condition.value;
    case "temperatureRange":
      return Number.isFinite(sensor.temperatureC) &&
        ((sensor.temperatureC >= condition.min &&
          sensor.temperatureC <= condition.max)!==(condition.outside===true));
    case "speedRange":
      return isValidLegacySyntheticSpeed(sensor.speedKn) &&
        ((sensor.speedKn >= condition.min &&
          sensor.speedKn <= condition.max)!==(condition.outside===true));
    case "arrivalRange":
      return Number.isFinite(sensor.arrivalDistanceNm) &&
        Number.isFinite(condition.maxNm) && condition.maxNm>0 &&
        sensor.arrivalDistanceNm<=condition.maxNm;
    default:
      return false;
  }
}

function evaluateLegacyAlarms(profiles = [], observation = {}, previous = null) {
  const activeIds = profiles.filter(p => p.enabled && Array.isArray(p.conditions) &&
    p.conditions.some(c => c.enabled !== false) &&
    p.conditions.every(c => matchLegacyCondition(c,observation))).map(p => p.id);
  const acknowledgedIds = (previous?.acknowledgedIds ?? [])
    .filter(id => activeIds.includes(id));
  return {
    activeIds,
    acknowledgedIds,
    visualActive: activeIds.length > 0,
    audible: activeIds.some(id => !acknowledgedIds.includes(id)),
    sourceClass: "SYNTHETIC_TRAINING_CAUSES",
  };
}

function acknowledgeLegacyAlarms(state) {
  return {...state, acknowledgedIds: [...state.activeIds], audible: false};
}

export const FCV_LEGACY_SETTINGS_STORAGE_KEY=
  "mophongmaytrentau.fcv588.public-reference.settings.v18";
const SETTINGS_SCHEMA_VERSION=18;

export function createLegacyFcv588Profile({
  revision,
  sounderOrder = "profile21",
  includeMenuEntryOrderIds = false,
} = {}) {
  const group = {
    Sounder: sounderOrder === "ap1" ? SOUNDER_AP1 : SOUNDER_PROFILE21,
    ...SHARED_GROUPS,
  };
  const menuEntries = Object.freeze(FCV_MENU_CATEGORIES.flatMap(category =>
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

  function getMenuItems(category, state = {}) {
    if (!FCV_MENU_CATEGORIES.includes(category)) return [];
    const entries = menuEntries.filter(entry => entry.category === category);
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

  const choicesMap=new Map(menuEntries
    .filter(item=>item.kind==="choice")
    .map(item=>[item.settingKey,item.choices]));
  for(let n=1;n<=5;n++){
    for(const field of FCV_FISH_ALARM_FIELDS){
      const key="alarm"+n+field.key[0].toUpperCase()+field.key.slice(1);
      choicesMap.set(key,field.choices);
    }
  }
  for(const field of FCV_RANGE_BANK_FIELDS)choicesMap.set(field.key,field.choices);
  choicesMap.set("windowRatio",["25","30","35","40","45","50","55","60","65","70","75"]);
  for(const field of FCV_CALIBRATION_FIELDS)choicesMap.set(field.key,field.choices);
  for(const field of FCV_UNIT_FIELDS)choicesMap.set(field.key,field.choices);
  for(const mode of ["NAV1","NAV2"]){
    for(let i=0;i<FCV_NAV_BOX_DEFAULTS[mode].length;i++){
      choicesMap.set(mode.toLowerCase()+"Box"+(i+1),
        i<2?FCV_NAV_BOX_OPTIONS.filter(option=>option!=="Off"):
          FCV_NAV_BOX_OPTIONS);
    }
  }

  function validateSettings(settings) {
    if(!settings || typeof settings!=="object" || Array.isArray(settings) ||
      (Object.getPrototypeOf(settings)!==Object.prototype &&
        Object.getPrototypeOf(settings)!==null)){
      throw new TypeError("invalid settings object");
    }
    const keys=Object.keys(settings);
    if(keys.length===0 || keys.length>choicesMap.size)throw new RangeError("invalid settings size");
    const clean={};
    for(const key of keys){
      if(!choicesMap.has(key))
        throw new TypeError("unknown/unsafe settings key: "+key);
      if(["__proto__","prototype","constructor"].includes(key))
        throw new TypeError("unsafe settings key");
      const value=settings[key];
      if(value===null && key==="draft"){clean[key]=null;continue;}
      if(typeof value!=="string" || !choicesMap.get(key)?.includes(value)){
        throw new RangeError("invalid settings value: "+key);
      }
      clean[key]=value;
    }
    return clean;
  }

  function encodeSettings(settings){
    const safe=validateSettings(settings);
    const body={schemaVersion:SETTINGS_SCHEMA_VERSION,profileClass:"PUBLIC_REFERENCE",
      profileRevision:revision,settings:safe};
    return JSON.stringify({...body,contentFingerprint:fingerprint(body)});
  }

  function decodeSettingsForProfile(input,expectedRevision){
    if(typeof input!=="string" || input.length>12000 || !input)return null;
    try{
      const json=JSON.parse(input);
      if(!json || typeof json!=="object" || Array.isArray(json) ||
        Object.keys(json).sort().join("|")!==["contentFingerprint","profileClass",
          "profileRevision","schemaVersion","settings"].sort().join("|") ||
        json.schemaVersion!==SETTINGS_SCHEMA_VERSION ||
        json.profileRevision!==expectedRevision ||
        json.profileClass!=="PUBLIC_REFERENCE")return null;
      const body={schemaVersion:json.schemaVersion,profileClass:json.profileClass,
        profileRevision:json.profileRevision,settings:json.settings};
      if(json.contentFingerprint!==fingerprint(body))return null;
      return validateSettings(json.settings);
    }catch{
      return null;
    }
  }

  const decodeSettings = input => decodeSettingsForProfile(input, revision);
  const decodeProfile19Settings = input => decodeSettingsForProfile(input, "F1-public-reference-19");

  const profile = Object.freeze({
    id: "furuno.fcv588.cv588e",
    revision,
    ...(includeMenuEntryOrderIds
      ? {menuEntryOrderIds: Object.freeze(menuEntries.map(item=>item.id))}
      : {}),
    manufacturer: "FURUNO",
    model: "FCV-588",
    family: "fishfinder",
    controller: "integrated-controls",
    firmware: null,
    sources: Object.freeze(["FCV-588-OPS-01"]),
    safeOutputs: Object.freeze([]),
  });

  const DISPLAY_MODES = Object.freeze(["NAV1", "LF-ZOOM", "LF", "DUAL", "HF", "HF-ZOOM", "NAV2"]);
  const GAIN_MODES = Object.freeze(["fishing", "cruising", "off"]);
  const MAX_RANGE_INDEX = 7;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const wrap = (n, length) => ((n % length) + length) % length;
  const nextBrillKeyPreview = ({value,stepDirection}) => {
    const direction=stepDirection===-1?-1:1;
    const actual=(value===9 && direction>0)||(value===0 && direction<0)
      ? -direction : direction;
    const next=value+actual;
    return {value:next,stepDirection:next===9?-1:next===0?1:actual};
  };
  const defaultAlarmFields = profileIndex => ({
    bottomEnabled:profileIndex===1||profileIndex===5?"On":"Off",
    bottomFrom:profileIndex===5?"20":"40",
    bottomSpan:profileIndex===5?"80":"20",
    bottomType:profileIndex===1?"Rock":"Off",
    fishType:profileIndex===2?"Fish School":"Off",
    fishLevel:"Low",
    temperature:profileIndex===3?"Inside":"Off",
    tempFrom:"15",
    tempSpan:"6",
    speedType:profileIndex===4?"Inside":"Off",
    speedFrom:"1",
    speedSpan:"9",
    sound:"Sound1",
  });
  const alarmSettingKey=(index,key)=>"alarm"+index+key[0].toUpperCase()+key.slice(1);
  const resetRangeBankOnDepthUnitChange=(before,next)=>
    before.units===next.units?next:{...next,...Object.fromEntries(
      FCV_RANGE_BANK_FIELDS.map(field=>[field.key,field.defaultValue]))};

  // Pre-P1 historical initialSettings (12 keys intentionally absent to match sealed hashes)
  const initialSettings = () => ({
    pictureAdvance: "1x", interference: "Auto", aScope: "Off",
    shift:"0",smoothing:"On",tvg:"Medium",txPower:"Auto",txRate:"10",
    accuFish: "Off", bottomDiscrimination: "Off", rezBoost: "Off",
    tankenmaru: "Off", nmea: "Off", transducer: "GENERIC_600W",
    keySetup: "Pic. Advance",keyBeep:"Off",
    tempGraph:"Off",navData:"Off",battery:"Off",headerInfo:"On",
    windowRatio:"50",zoomRange:"20",blRange:"5",
    palette:"Blue",
    ...Object.fromEntries(FCV_CALIBRATION_FIELDS.map(field=>
      [field.key,field.defaultValue])),
    draft: null, units: "Metric", demo: "On",
    ...Object.fromEntries(FCV_UNIT_FIELDS.filter(x=>x.key!=="units")
      .map(field=>[field.key,field.defaultValue])),
    alarm1: "Off", alarm2: "Off", alarm3: "Off", alarm4: "Off",
    alarm5: "Off",
    arrivalAlarm:"Off",arrivalRadius:"0.1",
    bearing:"True",windSpeedDirection:"True",
    tripSource:"Own",tempSource:"Own",speedSource:"Own",
    ...Object.fromEntries(FCV_RANGE_BANK_FIELDS.map(field=>
      [field.key,field.defaultValue])),
    ...Object.fromEntries(Object.entries(FCV_NAV_BOX_DEFAULTS).flatMap(
      ([mode,fields])=>fields.map((label,i)=>[
        mode.toLowerCase()+"Box"+(i+1),label]))),
    ...Object.fromEntries(Array.from({length:5},(_,i)=>i+1).flatMap(n=>
      Object.entries(defaultAlarmFields(n)).map(([key,value])=>
        [alarmSettingKey(n,key),value]))),
  });

  function alarmProfiles(settings) {
    const profiles=[1,2,3,4,5].map(n => {
      const get=key=>settings[alarmSettingKey(n,key)]??defaultAlarmFields(n)[key];
      const conditions=[];
      if(get("bottomEnabled")==="On")conditions.push({kind:"depthRange",
        min:Number(get("bottomFrom")),max:Number(get("bottomFrom"))+Number(get("bottomSpan"))});
      if(get("bottomType")!=="Off")conditions.push({kind:"bottomType",value:get("bottomType")});
      if(get("fishType")!=="Off")conditions.push({kind:"fishPresent",value:true,
        syntheticType:get("fishType"),level:get("fishLevel")});
      if(get("temperature")!=="Off")conditions.push({kind:"temperatureRange",
        min:Number(get("tempFrom")),max:Number(get("tempFrom"))+Number(get("tempSpan")),
        outside:get("temperature")==="Outside"});
      if(get("speedType")!=="Off")conditions.push({kind:"speedRange",
        min:Number(get("speedFrom")),max:Number(get("speedFrom"))+Number(get("speedSpan")),
        outside:get("speedType")==="Outside"});
      return {id:"ALARM"+n,enabled:settings["alarm"+n]==="On",conditions,
        soundChoice:get("sound"),sourceClass:"SIMULATED_ALARM_PROFILE"};
    });
    profiles.push({id:"ARRIVAL",enabled:settings.arrivalAlarm==="On",
      conditions:[{kind:"arrivalRange",maxNm:Number(settings.arrivalRadius??"0.1")}],
      sourceClass:"SYNTHETIC_ARRIVAL_LESSON"});
    return profiles;
  }

  const modal = (kind, details = {}) => ({kind,...details});
  const WAYPOINT_CHARSET=" ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-";
  function menuOverlay(categoryIndex = 0, itemIndex = 0) {
    return {kind: "menu", categoryIndex, category: FCV_MENU_CATEGORIES[categoryIndex],
      itemIndex, editing: false, draftValue: null, editEntryId:null};
  }
  function restoreSettings(state) {
    return {...state, settings:initialSettings(), demoOn:true,
      rangeMode:"auto",rangeIndex:3,gainMode:"fishing",autoGainOffset:0,
      manualGain:5,brightness:9,
      alarms:evaluateLegacyAlarms([],{}),
      overlay:menuOverlay(4),notice:"Khôi phục thiết lập đào tạo · SIMULATED"};
  }

  function moveWaypointWorkflow(state,event){
    const o=state.overlay;
    if(event.kind==="press" && event.control==="menu"){
      if(["waypoint-name","confirm-waypoint-delete"].includes(o.kind)){
        return {...state,overlay:modal("waypoint-detail",
          {itemIndex:o.itemIndex,fieldIndex:o.fieldIndex??0,fromCategoryIndex:3})};
      }
      if(o.kind==="waypoint-detail"){
        return {...state,overlay:modal("waypoints",
          {purpose:"edit",itemIndex:o.itemIndex,fromCategoryIndex:3,simulated:true})};
      }
      return {...state,overlay:menuOverlay(3),notice:""};
    }
    if(o.kind==="waypoints"){
      if(event.kind==="pad" && event.control==="trackpad"){
        const count=state.navigation.waypoints.length+(o.purpose==="destination"?1:0);
        if(!count)return state;
        const delta=["right","down"].includes(event.direction)?1:-1;
        return {...state,overlay:{...o,itemIndex:wrap(o.itemIndex+delta,count)}};
      }
      if(event.kind==="press" && event.control==="enter"){
        if(o.purpose==="destination"){
          const selected=o.itemIndex===0?null:state.navigation.waypoints[o.itemIndex-1]?.id;
          if(selected===undefined)return {...state,notice:"NO SYNTHETIC WAYPOINT"};
          return {...state,navigation:setLegacyDestination(state.navigation,selected),
            overlay:menuOverlay(3),notice:selected?"DESTINATION "+selected+" (SIM)":
              "DESTINATION OFF (SIM)"};
        }
        const chosen=state.navigation.waypoints[o.itemIndex];
        if(!chosen)return {...state,notice:"WAYPOINTS EMPTY · SIM"};
        return {...state,overlay:modal("waypoint-detail",{
          itemIndex:o.itemIndex,fieldIndex:0,fromCategoryIndex:3})};
      }
      return state;
    }
    if(o.kind==="waypoint-detail"){
      const waypoint=state.navigation.waypoints[o.itemIndex];
      if(!waypoint)return {...state,overlay:menuOverlay(3),notice:"WAYPOINT MISSING"};
      if(event.kind==="pad" && event.control==="trackpad"){
        return {...state,overlay:{...o,fieldIndex:wrap(o.fieldIndex+
          (["down","right"].includes(event.direction)?1:-1),2)}};
      }
      if(event.kind==="press" && event.control==="enter"){
        if(o.fieldIndex===1)return {...state,overlay:modal("confirm-waypoint-delete",{
          itemIndex:o.itemIndex,waypointId:waypoint.id,confirm:false,
          fieldIndex:1,fromCategoryIndex:3})};
        return {...state,overlay:modal("waypoint-name",{
          itemIndex:o.itemIndex,waypointId:waypoint.id,draftName:waypoint.name,
          charIndex:0,fieldIndex:0,fromCategoryIndex:3})};
      }
      return state;
    }
    if(o.kind==="waypoint-name"){
      if(event.kind==="pad" && event.control==="trackpad"){
        if(["left","right"].includes(event.direction)){
          const index=o.charIndex+(event.direction==="right"?1:-1);
          if(index>=o.draftName.length && index<8){
            return {...state,overlay:{...o,draftName:o.draftName+"A",charIndex:index}};
          }
          return {...state,overlay:{...o,charIndex:Math.min(
            Math.max(index,0),o.draftName.length-1)}};
        }
        const current=o.draftName[o.charIndex]?.toUpperCase()??" ";
        const index=WAYPOINT_CHARSET.indexOf(current);
        const next=WAYPOINT_CHARSET[wrap((index<0?0:index)+
          (event.direction==="up"?1:-1),WAYPOINT_CHARSET.length)];
        const draftName=o.draftName.slice(0,o.charIndex)+next+
          o.draftName.slice(o.charIndex+1);
        return {...state,overlay:{...o,draftName}};
      }
      if(event.kind==="press" && event.control==="enter"){
        try {
          const navigation=editLegacyWaypoint(state.navigation,o.waypointId,
            {name:o.draftName.trim()});
          return {...state,navigation,overlay:modal("waypoints",{
            purpose:"edit",itemIndex:o.itemIndex,fromCategoryIndex:3,simulated:true}),
            notice:"WPT NAME SAVED (SIM)"};
        }catch(error){return {...state,notice:"WAYPOINT NAME INVALID: "+error.message};}
      }
      return state;
    }
    if(["confirm-waypoint-delete","confirm-delete-all-waypoints"].includes(o.kind)){
      if(event.kind==="pad" && event.control==="trackpad"){
        return {...state,overlay:{...o,confirm:["right","down"].includes(event.direction)}};
      }
      if(event.kind==="press" && event.control==="enter"){
        if(!o.confirm)return {...state,overlay:
          o.kind==="confirm-waypoint-delete"
            ? modal("waypoints",{purpose:"edit",itemIndex:o.itemIndex,
              fromCategoryIndex:3,simulated:true})
            : menuOverlay(3),notice:"Erase cancelled"};
        if(o.kind==="confirm-delete-all-waypoints"){
          if(state.navigation.destinationId!==null){
            return {...state,overlay:menuOverlay(3),
              notice:"DESTINATION PROTECTED · CLEAR GO TO WPT FIRST"};
          }
          return {...state,navigation:{...state.navigation,waypoints:[]},
            overlay:menuOverlay(3),notice:"ALL WPT ERASED · SIM"};
        }
        try {
          const navigation=deleteLegacyWaypoint(state.navigation,o.waypointId);
          return {...state,navigation,overlay:modal("waypoints",{
            purpose:"edit",itemIndex:Math.max(0,Math.min(
              o.itemIndex,navigation.waypoints.length-1)),fromCategoryIndex:3,
            simulated:true}),notice:"WPT "+o.waypointId+" ERASED · SIM"};
        }catch(error){
          return {...state,overlay:menuOverlay(3),
            notice:"DESTINATION PROTECTED · "+error.message};
        }
      }
    }
    return state;
  }

  function moveSpecialOverlay(state,event) {
    const o=state.overlay;
    if(o.kind==="nav-boxes"){
      const key=o.mode.toLowerCase()+"Box"+(o.itemIndex+1);
      const choices=o.itemIndex<2
        ?FCV_NAV_BOX_OPTIONS.filter(x=>x!=="Off"):FCV_NAV_BOX_OPTIONS;
      if(event.kind==="press" && event.control==="menu")return {...state,
        overlay:o.editing?{...o,editing:false,draftValue:null}:menuOverlay(3),
        notice:""};
      if(event.kind==="press" && event.control==="enter"){
        if(!o.editing)return {...state,overlay:{...o,editing:true,
          draftValue:state.settings[key]??FCV_NAV_BOX_DEFAULTS[o.mode][o.itemIndex]}};
        if(!choices.includes(o.draftValue))return state;
        return {...state,settings:{...state.settings,[key]:o.draftValue},
          overlay:{...o,editing:false,draftValue:null},
          notice:o.mode+" BOX"+(o.itemIndex+1)+" = "+o.draftValue+" · SIM"};
      }
      if(event.kind==="pad" && event.control==="trackpad"){
        const delta=["right","down"].includes(event.direction)?1:-1;
        if(o.editing){
          const position=choices.indexOf(o.draftValue);
          return {...state,overlay:{...o,draftValue:choices[wrap(
            (position<0?0:position)+delta,choices.length)]}};
        }
        return {...state,overlay:{...o,itemIndex:wrap(o.itemIndex+delta,4)}};
      }
      return state;
    }
    if(o.kind==="units"){
      const field=FCV_UNIT_FIELDS[o.itemIndex];
      if(event.kind==="press" && event.control==="menu")return {
        ...state,overlay:o.editing
          ?{...o,editing:false,draftValue:null}:menuOverlay(4),notice:""};
      if(event.kind==="press" && event.control==="enter"){
        if(!o.editing)return {...state,overlay:{...o,editing:true,
          draftValue:state.settings[field.key]??field.defaultValue}};
        if(!field.choices.includes(o.draftValue))return state;
        const settings=resetRangeBankOnDepthUnitChange(state.settings,
          {...state.settings,[field.key]:o.draftValue});
        return {...state,settings,overlay:{...o,editing:false,draftValue:null},
          notice:"UNITS "+field.label+" = "+o.draftValue+" · TRAINING"};
      }
      if(event.kind==="pad" && event.control==="trackpad"){
        const delta=["right","down"].includes(event.direction)?1:-1;
        if(o.editing){
          const index=field.choices.indexOf(o.draftValue);
          return {...state,overlay:{...o,draftValue:field.choices[wrap(
            (index<0?0:index)+delta,field.choices.length)]}};
        }
        return {...state,overlay:{...o,itemIndex:wrap(
          o.itemIndex+delta,FCV_UNIT_FIELDS.length)}};
      }
      return state;
    }
    if(o.kind==="calibration"){
      const field=FCV_CALIBRATION_FIELDS[o.itemIndex];
      if(event.kind==="press" && event.control==="menu")
        return {...state,overlay:o.editing
          ?{...o,editing:false,draftValue:null}:menuOverlay(4),notice:""};
      if(event.kind==="press" && event.control==="enter"){
        if(!o.editing)return {...state,overlay:{...o,editing:true,
          draftValue:state.settings[field.key]??field.defaultValue}};
        if(!field.choices.includes(o.draftValue))return state;
        return {...state,settings:{...state.settings,[field.key]:o.draftValue},
          overlay:{...o,editing:false,draftValue:null},
          notice:"CALIB "+field.label+" = "+o.draftValue+" · SIM"};
      }
      if(event.kind==="pad" && event.control==="trackpad"){
        const delta=["down","right"].includes(event.direction)?1:-1;
        if(o.editing){
          const idx=field.choices.indexOf(o.draftValue);
          return {...state,overlay:{...o,draftValue:field.choices[wrap(
            (idx<0?0:idx)+delta,field.choices.length)]}};
        }
        return {...state,overlay:{...o,itemIndex:wrap(
          o.itemIndex+delta,FCV_CALIBRATION_FIELDS.length)}};
      }
      return state;
    }
    if(o.kind==="window-size"){
      if(event.kind==="press" && event.control==="menu")
        return {...state,overlay:menuOverlay(1),notice:"WINDOW SIZE CANCELLED"};
      if(event.kind==="pad" && event.control==="trackpad" &&
        ["left","right"].includes(event.direction)){
        const delta=event.direction==="right"?5:-5;
        return {...state,overlay:{...o,draftRatio:String(clamp(
          Number(o.draftRatio)+delta,25,75))}};
      }
      if(event.kind==="press" && event.control==="enter")
        return {...state,settings:{...state.settings,windowRatio:o.draftRatio},
          overlay:menuOverlay(1),notice:"WINDOW SIZE "+o.draftRatio+"% · SIM"};
      return state;
    }
    if(o.kind==="range-bank"){
      const field=FCV_RANGE_BANK_FIELDS[o.itemIndex];
      if(event.kind==="press" && event.control==="menu"){
        return {...state,overlay:o.editing
          ?{...o,editing:false,draftValue:null}:menuOverlay(4),notice:""};
      }
      if(event.kind==="press" && event.control==="enter"){
        if(!o.editing)return {...state,overlay:{...o,editing:true,
          draftValue:state.settings[field.key]??field.defaultValue}};
        if(!field.choices.includes(o.draftValue))return state;
        return {...state,settings:{...state.settings,[field.key]:o.draftValue},
          overlay:{...o,editing:false,draftValue:null},
          notice:"Range bank " + (o.itemIndex+1)+" = "+o.draftValue+" m (SIM)"};
      }
      if(event.kind==="pad" && event.control==="trackpad"){
        const delta=["down","right"].includes(event.direction)?1:-1;
        if(o.editing){
          const idx=field.choices.indexOf(o.draftValue);
          return {...state,overlay:{...o,draftValue:field.choices[wrap(
            (idx<0?0:idx)+delta,field.choices.length)]}};
        }
        return {...state,overlay:{...o,itemIndex:wrap(
          o.itemIndex+delta,FCV_RANGE_BANK_FIELDS.length)}};
      }
      return state;
    }
    if(["waypoints","waypoint-detail","waypoint-name",
        "confirm-waypoint-delete","confirm-delete-all-waypoints"].includes(o.kind)){
      return moveWaypointWorkflow(state,event);
    }
    if(event.kind==="press" && event.control==="menu")
      return {...state,overlay:menuOverlay(o.fromCategoryIndex ?? 4),notice:""};
    if(o.kind==="diagnostics") return state;
    if(o.kind==="trip-status")return state;
    if(o.kind==="confirm-trip-reset"){
      if(event.kind==="pad" && event.control==="trackpad")
        return {...state,overlay:{...o,
          confirm:["right","down"].includes(event.direction)}};
      if(event.kind==="press" && event.control==="enter"){
        return o.confirm
          ?{...state,navigation:{...state.navigation,tripNm:0},
            overlay:menuOverlay(3),notice:"TRIP RESET · SYNTHETIC ONLY"}
          :{...state,overlay:menuOverlay(3),notice:"Trip reset cancelled"};
      }
    }
    if(o.kind==="lcd-test" && event.kind==="pad" && event.control==="trackpad") {
      const delta=["right","down"].includes(event.direction)?1:-1;
      return {...state,overlay:{...o,colorIndex:wrap(o.colorIndex+delta,5)}};
    }
    if(o.kind==="confirm-restore") {
      if(event.kind==="pad" && event.control==="trackpad")
        return {...state,overlay:{...o,confirm:["right","down"].includes(event.direction)}};
      if(event.kind==="press" && event.control==="enter")
        return o.confirm ? restoreSettings(state) : {...state,overlay:menuOverlay(4),notice:"Restore canceled"};
    }
    return state;
  }

  function reconcileCapabilityMenu(previous,next){
    const suspended=previous.overlay?.kind==="power-hold";
    const overlay=suspended?previous.overlay.priorOverlay:previous.overlay;
    const replace=(value,message)=>({...next,
      overlay:suspended?{...next.overlay,priorOverlay:value}:value,
      notice:next.notice+message});
    if(overlay?.kind==="tankenmaru-details" &&
        (next.trainingFixture?.tankenmaruOption!==true ||
          next.settings?.tankenmaru!=="On")){
      return replace(menuOverlay(4)," · VIRTUAL TANKENMARU DETAILS CLOSED");
    }
    const inst=overlay?.kind==="installation";
    if(!inst && overlay?.kind!=="menu")return next;
    const entries=state=>inst?getLegacyInstallationMenu(state):
      getMenuItems(overlay.category,state);
    const identity=item=>inst?item?.settingKey:item?.id;
    const before=entries(previous),after=entries(next);
    const selected=identity(before[overlay.itemIndex]);
    const newIndex=after.findIndex(item=>identity(item)===selected);
    const active=after[newIndex];
    const rowsChanged=before.map(identity).join("|")!==after.map(identity).join("|");
    const invalidDraft=overlay.editing && (!active || active.disabled ||
      identity(active)!==overlay.editEntryId ||
      !active.choices?.includes(overlay.draftValue));
    if(!rowsChanged && !invalidDraft)return next;
    return replace({...overlay,
      itemIndex:newIndex>=0?newIndex:0,editing:false,draftValue:null,
      editEntryId:null}," · MENU CHANGED / EDIT CANCELLED");
  }

  function moveMenu(state, event) {
    const o = state.overlay;
    const entries = getMenuItems(o.category, state);
    if (event.kind === "press" && event.control === "menu") {
      return {...state, overlay: o.editing ? {...o,
        editing:false,draftValue:null,editEntryId:null} : null, notice:""};
    }
    if (event.kind === "press" && event.control === "enter") {
      const entry = entries[o.itemIndex];
      if (!entry) return state;
      if (!o.editing) {
        if (entry.disabled) return {...state, notice:entry.disabledReason ?? "SOURCE_GAP"};
        if (entry.id === "system.installation") return {...state,
          overlay: {kind:"installation",category:"Installation",itemIndex:0,
            editing:false,draftValue:null,editEntryId:null}, notice:""};
        if (entry.id === "system.rangePresets")return {...state,
          overlay:modal("range-bank",{itemIndex:0,editing:false,
            draftValue:null,simulated:true,fromCategoryIndex:4}),notice:""};
        if(entry.id==="display.windowSize")return {...state,
          overlay:modal("window-size",{draftRatio:state.settings.windowRatio,
            simulated:true,fromCategoryIndex:1}),notice:""};
        if(entry.id==="system.calibration")return {...state,
          overlay:modal("calibration",{itemIndex:0,editing:false,
            draftValue:null,simulated:true,fromCategoryIndex:4}),notice:""};
        if(entry.id==="system.units")return {...state,
          overlay:modal("units",{itemIndex:0,editing:false,
            draftValue:null,simulated:true,fromCategoryIndex:4}),notice:""};
        if(entry.id==="data.nav1" || entry.id==="data.nav2")return {...state,
          overlay:modal("nav-boxes",{mode:entry.id.endsWith("nav1")?"NAV1":"NAV2",
            itemIndex:0,editing:false,draftValue:null,simulated:true,
            fromCategoryIndex:3}),notice:""};
        if(entry.id==="system.receiverStatus")return {...state,
          overlay:modal("receiver-status",{simulated:true,
            fromCategoryIndex:4}),notice:""};
        if(entry.id==="system.tankenmaruDetails")return {...state,
          overlay:modal("tankenmaru-details",{simulated:true,
            fromCategoryIndex:4}),notice:""};
        if (entry.id === "system.diagnostics")return {...state,overlay:modal("diagnostics",
          {simulated:true,firmwareInstalled:null,fromCategoryIndex:4}),notice:""};
        if (entry.id === "system.lcdTest")return {...state,overlay:modal("lcd-test",
          {colorIndex:0,simulated:true,fromCategoryIndex:4}),notice:""};
        if (entry.id === "system.restore")return {...state,overlay:modal("confirm-restore",
          {confirm:false,simulated:true,fromCategoryIndex:4}),notice:""};
        if (entry.id === "data.waypoint" || entry.id === "data.destination")
          return {...state,overlay:modal("waypoints",
            {purpose:entry.id==="data.waypoint"?"edit":"destination",
            itemIndex:0,fromCategoryIndex:3,simulated:true}),notice:""};
        if (entry.id === "data.deleteAllWaypoint")
          return {...state,overlay:modal("confirm-delete-all-waypoints",
            {confirm:false,fromCategoryIndex:3,simulated:true}),notice:""};
        if(entry.id==="data.trip")
          return {...state,overlay:modal("trip-status",
            {simulated:true,fromCategoryIndex:3}),notice:""};
        if(entry.id==="data.resetTrip")
          return {...state,overlay:modal("confirm-trip-reset",
            {confirm:false,simulated:true,fromCategoryIndex:3}),notice:""};
        if (/^alarm\.alarm[1-5]$/.test(entry.id)){
          return {...state,overlay:modal("fish-alarm",{
            profileIndex:Number(entry.settingKey.slice(-1)),itemIndex:0,
            editing:false,draftValue:null,simulated:true,
          }),notice:""};
        }
        if (entry.kind === "action") return {...state,
          notice: entry.label + ": nguồn/thao tác chuyên biệt ở phase sau; chưa giả lập kết quả."};
        return {...state, overlay: {...o, editing:true,editEntryId:entry.id,
          draftValue: state.settings[entry.settingKey] ?? entry.choices[0]}};
      }
      if(entry.disabled || entry.kind!=="choice" ||
          entry.id!==o.editEntryId || !entry.choices?.includes(o.draftValue)){
        return {...state,overlay:{...o,editing:false,draftValue:null,
          editEntryId:null},notice:entry.disabledReason??"MENU_CHANGED_EDIT_CANCELLED"};
      }
      const settings = resetRangeBankOnDepthUnitChange(state.settings,
        {...state.settings, [entry.settingKey]:o.draftValue});
      const demoOn = entry.id === "system.demo" ? o.draftValue === "On" : state.demoOn;
      const enableBds=entry.id==="display.bottomDiscrimination" &&
        ["Graphic","Probability"].includes(o.draftValue);
      return {...state, settings, demoOn,
        rangeMode:enableBds?"auto":state.rangeMode,
        overlay: {...o, editing:false, draftValue:null,editEntryId:null},
        notice:entry.label + " = " + o.draftValue};
    }
    if (event.kind !== "pad" || event.control !== "trackpad") return state;
    if (o.editing) {
      const entry = entries[o.itemIndex];
      if(entry?.id!==o.editEntryId || entry?.disabled){
        return {...state,overlay:{...o,editing:false,draftValue:null,
          editEntryId:null},notice:"MENU_CHANGED_EDIT_CANCELLED"};
      }
      const delta = ["right","down"].includes(event.direction) ? 1 : -1;
      const choices = entry?.choices ?? [];
      const index = choices.indexOf(o.draftValue);
      return choices.length ? {...state, overlay:{...o,
        draftValue:choices[wrap((index < 0 ? 0 : index) + delta, choices.length)]}} : state;
    }
    if (event.direction === "left" || event.direction === "right") {
      return {...state, overlay:menuOverlay(wrap(o.categoryIndex +
        (event.direction === "right" ? 1 : -1), FCV_MENU_CATEGORIES.length))};
    }
    return {...state, overlay:{...o, itemIndex:wrap(o.itemIndex +
      (event.direction === "down" ? 1 : -1), entries.length)}};
  }

  function moveInstallation(state, event) {
    const o=state.overlay;
    const entries=getLegacyInstallationMenu(state);
    const item=entries[o.itemIndex];
    if(event.kind==="press" && event.control==="menu") {
      return {...state, overlay:o.editing
        ? {...o,editing:false,draftValue:null,editEntryId:null} : menuOverlay(4), notice:""};
    }
    if(!item)return {...state,overlay:{...o,itemIndex:0,editing:false,
      draftValue:null,editEntryId:null},notice:"INSTALLATION_CHANGED_EDIT_CANCELLED"};
    if(event.kind==="press" && event.control==="enter") {
      if(!o.editing) {
        if(item.disabled)return {...state,notice:item.disabledReason??"SOURCE_GAP"};
        if(item.settingKey==="nmea" && state.settings.tankenmaru==="On") {
          return {...state,notice:"NMEA_UNAVAILABLE_WHILE_TANKENMARU_ON"};
        }
        return {...state,overlay:{...o,editing:true,editEntryId:item.settingKey,
          draftValue:state.settings[item.settingKey] ?? item.choices[0]}};
      }
      if(item.disabled || item.settingKey!==o.editEntryId ||
          !item.choices.includes(o.draftValue))return {...state,
        overlay:{...o,editing:false,draftValue:null,editEntryId:null},
        notice:item.disabledReason??"INSTALLATION_CHANGED_EDIT_CANCELLED"};
      const settings=resetRangeBankOnDepthUnitChange(state.settings,
        {...state.settings,[item.settingKey]:o.draftValue});
      if(item.settingKey==="tankenmaru" && o.draftValue==="On") settings.nmea="Off";
      return {...state,settings,demoOn:settings.demo==="On",
        overlay:{...o,editing:false,draftValue:null,editEntryId:null},notice:"Installation: "+item.label};
    }
    if(event.kind==="pad" && event.control==="trackpad") {
      const delta=["down","right"].includes(event.direction)?1:-1;
      if(o.editing) {
        if(item.disabled || item.settingKey!==o.editEntryId)return {...state,
          overlay:{...o,editing:false,draftValue:null,editEntryId:null},
          notice:item.disabledReason??"INSTALLATION_CHANGED_EDIT_CANCELLED"};
        const idx=item.choices.indexOf(o.draftValue);
        return {...state,overlay:{...o,draftValue:item.choices[wrap(idx+delta,item.choices.length)]}};
      }
      return {...state,overlay:{...o,itemIndex:wrap(o.itemIndex+delta,entries.length)}};
    }
    return state;
  }

  function moveFuncOverlay(state,event) {
    const o=state.overlay;
    if(event.kind==="press" && event.control==="menu") {
      return {...state,overlay:null,notice:"FUNC cancelled"};
    }
    if(o.kind==="func-program") {
      if(event.kind==="pad" && event.control==="trackpad") {
        const delta=["down","right"].includes(event.direction)?1:-1;
        return {...state,overlay:{...o,itemIndex:wrap(
          o.itemIndex+delta,FCV_FUNC_TARGETS.length)}};
      }
      if(event.kind==="press" && event.control==="enter") {
        const target=FCV_FUNC_TARGETS[o.itemIndex];
        return {...state,settings:{...state.settings,keySetup:target.label},
          overlay:null,notice:"FUNC Key = "+target.label};
      }
      return state;
    }
    if(o.kind==="func-setting") {
      if((event.kind==="pad" && event.control==="trackpad") ||
        (event.kind==="press" && event.control==="func" && event.hold==="short")) {
        const delta=event.kind==="press" ||
          ["down","right"].includes(event.direction)?1:-1;
        return {...state,overlay:{...o,draftValue:o.choices[wrap(
          o.choices.indexOf(o.draftValue)+delta,o.choices.length)]}};
      }
      if(event.kind==="press" && event.control==="enter") {
        return {...state,settings:{...state.settings,[o.settingKey]:o.draftValue},
          overlay:null,notice:o.label+" = "+o.draftValue};
      }
    }
    return state;
  }

  function moveFishAlarm(state,event){
    const o=state.overlay;
    const index=o.profileIndex;
    const field=FCV_FISH_ALARM_FIELDS[o.itemIndex];
    const key=o.kind==="fish-alarm"
      ?"alarm"+index:field?alarmSettingKey(index,field.key):null;
    const choices=o.kind==="fish-alarm"?["Off","On"]:field?.choices??[];
    if(event.kind==="press" && event.control==="menu"){
      if(o.editing)return {...state,overlay:{...o,editing:false,draftValue:null},
        notice:"ALARM EDIT CANCELLED"};
      if(o.kind==="fish-alarm-setting")return {...state,overlay:modal("fish-alarm",{
        profileIndex:index,itemIndex:0,editing:false,draftValue:null,simulated:true})};
      return {...state,overlay:menuOverlay(2,index-1),notice:""};
    }
    if(event.kind==="press" && event.control==="enter"){
      if(o.editing){
        if(!key || !choices.includes(o.draftValue))return state;
        return {...state,settings:{...state.settings,[key]:o.draftValue},
          overlay:{...o,editing:false,draftValue:null},
          notice:"ALARM"+index+" / "+(o.kind==="fish-alarm"?"Alarm":field.label)+" = "+o.draftValue};
      }
      if(o.kind==="fish-alarm" && o.itemIndex===0){
        return {...state,overlay:modal("fish-alarm-setting",{
          profileIndex:index,itemIndex:0,editing:false,draftValue:null,
          simulated:true}),notice:""};
      }
      return {...state,overlay:{...o,editing:true,
        draftValue:state.settings[key]??choices[0]},notice:""};
    }
    if(event.kind==="pad" && event.control==="trackpad"){
      if(o.editing){
        const delta=["right","down"].includes(event.direction)?1:-1;
        return {...state,overlay:{...o,draftValue:choices[wrap(
          (choices.indexOf(o.draftValue)<0?0:choices.indexOf(o.draftValue))
          +delta,choices.length)]}};
      }
      const size=o.kind==="fish-alarm"?2:FCV_FISH_ALARM_FIELDS.length;
      const delta=["down","right"].includes(event.direction)?1:-1;
      return {...state,overlay:{...o,itemIndex:wrap(o.itemIndex+delta,size)}};
    }
    return state;
  }

  function initialState() {
    return {
      power: "off",
      bootElapsed: 0,
      uiElapsedMs: 0,
      brightness: 9,
      mode: "LF",
      gainMode: "fishing",
      autoGainOffset: 0,
      manualGain: 5,
      rangeMode: "auto",
      rangeIndex: 3,
      vrmVisible: false,
      vrmDepthM: 15,
      settings: initialSettings(),
      demoOn: true,
      trainingFixture:{navigation:false,virtualMounting:false,
        lowBattery:false,systemError:false,tankenmaruOption:false},
      navigation:createLegacyNavigationState(),
      navigationObservation:null,
      syntheticConditions:{depthM:null,speedKn:null,mountCompatible:false,
        mountAligned:false,bottomClassification:null},
      alarms:evaluateLegacyAlarms([],{}),
      overlay: null,
      notice: "",
    };
  }

  const openRange = state => ({...state, overlay: {kind: "range", mode: state.rangeMode, index: state.rangeIndex}, notice: ""});
  const openGain = state => ({...state, overlay: {kind: "gain", mode: state.gainMode, offset: state.autoGainOffset}, notice: ""});
  const cycleGainMode = (mode, steps = 1) => GAIN_MODES[wrap(GAIN_MODES.indexOf(mode) + steps, GAIN_MODES.length)];

  function reduce(state, event) {
    if(event.kind==="restore-settings"){
      if(state.power!=="off")throw new Error("restore-settings only during off/startup");
      const settings={...initialSettings(),...validateSettings(event.settings)};
      if(state.trainingFixture.tankenmaruOption!==true)settings.tankenmaru="Off";
      return {...state,settings,demoOn:settings.demo==="On",
        notice:"PUBLIC REFERENCE LOCAL SETTINGS RESTORED"};
    }
    if(event.kind==="training-fixture"){
      const trainingFixture={...state.trainingFixture,[event.fixture]:event.enabled};
      const settings=event.fixture==="tankenmaruOption" && !event.enabled &&
          state.settings.tankenmaru!=="Off"
        ?{...state.settings,tankenmaru:"Off"}:state.settings;
      const typed=event.sensorObservation??{};
      const virtualSonar=trainingFixture.virtualMounting===true &&
        state.settings.transducer==="525STID-PWD";
      const syntheticConditions=event.fixture==="virtualMounting" ? {
        ...state.syntheticConditions,
        depthM:state.demoOn || virtualSonar ? typed.bottomDepthM??null:null,
        speedKn:virtualSonar || trainingFixture.navigation
          ? typed.speedKn??null:null,
        bottomClassification:state.demoOn || virtualSonar
          ? typed.bottomClassification??null:null,
        mountCompatible:event.enabled,
        mountAligned:event.enabled,
      } : state.syntheticConditions;
      const next={...state,trainingFixture,syntheticConditions,settings,
        notice:"INSTRUCTOR ONLY · "+event.fixture+" "+
          (event.enabled?"SYNTHETIC ON":"OFF")};
      return reconcileCapabilityMenu(state,next);
    }
    const physicalKey=(event.kind==="down" &&
        ["power","func"].includes(event.control)) ||
      (event.kind==="press" &&
        ["power","menu","enter","range","mark","func"].includes(event.control)) ||
      (event.kind==="pad" && event.control==="trackpad") ||
      (event.kind==="push" && event.control==="gain");
    if(state.power==="on" && state.alarms?.audible && physicalKey){
      state={...state,alarms:acknowledgeLegacyAlarms(state.alarms)};
    }
    if (event.kind === "ui-tick") {
      const uiElapsedMs = state.uiElapsedMs + event.elapsedMs;
      const overlay = state.overlay;
      if(overlay?.kind==="power-hold"){
        const elapsedMs=overlay.elapsedMs+event.elapsedMs;
        return {...state,uiElapsedMs,
          overlay:{...overlay,elapsedMs,remainingMs:Math.max(0,3000-elapsedMs)}};
      }
      if (!overlay || !["mode", "brill"].includes(overlay.kind)) {
        return {...state, uiElapsedMs};
      }
      const elapsedMs = overlay.elapsedMs + event.elapsedMs;
      if (elapsedMs < 6000) {
        return {...state, uiElapsedMs, overlay: {...overlay, elapsedMs}};
      }
      if (overlay.kind === "mode") {
        return {...state, uiElapsedMs, mode: overlay.candidate, overlay: null};
      }
      return {...state, uiElapsedMs, brightness: overlay.value, overlay: null};
    }
    if (event.kind==="down" && event.control==="power" && state.power==="on") {
      return {...state,overlay:{kind:"power-hold",elapsedMs:0,remainingMs:3000,
        priorOverlay:state.overlay},notice:"POWER HOLD · release to cancel"};
    }
    if(event.kind==="cancel" && event.control==="power" &&
        state.overlay?.kind==="power-hold"){
      return {...state,overlay:state.overlay.priorOverlay,notice:"POWER HOLD CANCELLED"};
    }
    if (event.kind === "tick") {
      const steps = event.steps ?? 1;
      if (!Number.isInteger(steps) || steps < 1 || steps > 20) throw new RangeError("tick steps must be 1..20");
      if (state.power === "off") return state;
      if (state.power === "booting") {
        const bootElapsed = state.bootElapsed + steps;
        return {...state, bootElapsed, power: bootElapsed >= 4 ? "on" : "booting"};
      }
      const observation=event.sensorObservation;
      if (!observation) return state;
      const navigationObservation=observation.navigation;
      const virtualSonar=state.trainingFixture.virtualMounting===true &&
        state.settings.transducer==="525STID-PWD";
      const sonarAvailable=state.demoOn===true || virtualSonar;
      const externalSyntheticData=state.trainingFixture.navigation===true;
      const destination=state.navigation.waypoints.find(w=>
        w.id===state.navigation.destinationId);
      const arrivalDistanceNm=externalSyntheticData && destination
        ?legacyDistanceNmBetween(observation.navigation?.position,destination.position)
        :null;
      const syntheticConditions={
        depthM:sonarAvailable?observation.bottomDepthM:null,
        speedKn:(virtualSonar || externalSyntheticData) &&
          isValidLegacySyntheticSpeed(observation.speedKn)?observation.speedKn:null,
        bottomClassification:sonarAvailable
          ? observation.bottomClassification??null:null,
        mountCompatible:state.trainingFixture.virtualMounting===true ||
          (observation.virtualMounting?.profileId===
          "FCV588_PUBLIC_FEATURE_525STID_PWD" &&
          observation.virtualMounting?.mountCompatible===true),
        mountAligned:state.trainingFixture.virtualMounting===true ||
          (observation.virtualMounting?.profileId===
          "FCV588_PUBLIC_FEATURE_525STID_PWD" &&
          observation.virtualMounting?.mountAligned===true),
      };
      const bottomFeature=getMenuItems("Display",{
        ...state,syntheticConditions,
      }).find(item=>item.id==="display.bottomDiscrimination");
      const fishFeature=getMenuItems("Display",{
        ...state,syntheticConditions,
      }).find(item=>item.id==="display.accuFish");
      const bottomTypeAvailable=sonarAvailable && state.rangeMode==="auto" &&
        ["Graphic","Probability"].includes(state.settings.bottomDiscrimination) &&
        bottomFeature?.disabled===false;
      const alarmObservation={
        ...observation,
        bottomDepthM:sonarAvailable?observation.bottomDepthM:null,
        bottomType:bottomTypeAvailable?observation.bottomType:null,
        fishPresent:sonarAvailable?observation.fishPresent:null,
        fishStrength:sonarAvailable?observation.fishStrength:null,
        fishCategory:sonarAvailable?observation.fishCategory:null,
        accuFishAvailable:sonarAvailable &&
          state.settings.accuFish==="On" && fishFeature?.disabled===false,
        arrivalDistanceNm,
        speedKn:(virtualSonar || externalSyntheticData) &&
          state.settings.speedSource!=="NMEA" &&
          isValidLegacySyntheticSpeed(observation.speedKn)?observation.speedKn:null,
        temperatureC:(virtualSonar || externalSyntheticData) &&
          state.settings.tempSource!=="NMEA"
          ?observation.temperatureC:null,
      };
      const alarms=evaluateLegacyAlarms(alarmProfiles(state.settings),
        alarmObservation,state.alarms);
      const navigation=externalSyntheticData && state.settings.tripSource==="Own"
        ?advanceLegacyTrainingTrip(state.navigation,observation.speedKn,steps)
        :state.navigation;
      return reconcileCapabilityMenu(state,
        {...state,navigation,navigationObservation,syntheticConditions,alarms});
    }

    if (event.kind === "press" && event.control === "power") {
      if (event.hold === "long") return {...state, power: "off", bootElapsed: 0, overlay: null, notice: ""};
      if (event.hold !== "short") throw new TypeError("power hold must be short or long");
      if (state.power === "off") return {...state, power: "booting", bootElapsed: 0, notice: ""};
      if (state.power !== "on") return state;
      const previousOverlay=state.overlay?.kind==="power-hold"
        ? state.overlay.priorOverlay : state.overlay;
      if (previousOverlay?.kind === "brill") {
        return {...state, overlay: {...previousOverlay,
          ...nextBrillKeyPreview(previousOverlay), elapsedMs: 0}, notice: ""};
      }
      return {...state, overlay: {kind: "brill", value: state.brightness,
        stepDirection: state.brightness===9?-1:1, elapsedMs: 0}, notice: ""};
    }
    if (state.power !== "on") return state;
    if(state.overlay && ["fish-alarm","fish-alarm-setting"].includes(state.overlay.kind) &&
      (event.kind==="pad" || (event.kind==="press" &&
      ["menu","enter"].includes(event.control)))){
      return moveFishAlarm(state,event);
    }
    if(state.overlay && ["func-program","func-setting"].includes(state.overlay.kind) &&
      (event.kind==="pad" || (event.kind==="press" &&
      ["func","menu","enter"].includes(event.control)))) {
      return moveFuncOverlay(state,event);
    }
    if (state.overlay && ["diagnostics","lcd-test","confirm-restore",
        "range-bank","window-size","calibration","units","nav-boxes",
        "receiver-status","tankenmaru-details",
        "trip-status","confirm-trip-reset","waypoints",
        "waypoint-detail","waypoint-name","confirm-waypoint-delete",
        "confirm-delete-all-waypoints"]
      .includes(state.overlay.kind)) return moveSpecialOverlay(state,event);
    if (state.overlay?.kind === "installation" &&
      (event.kind === "pad" || (event.kind === "press" &&
      ["menu","enter"].includes(event.control)))) {
      return moveInstallation(state,event);
    }
    if (state.overlay?.kind === "menu" && (
      event.kind === "pad" || (event.kind === "press" &&
      ["menu","enter"].includes(event.control)))) {
      return moveMenu(state, event);
    }

    if (event.kind === "rotate" && event.control === "mode") {
      if (!Number.isInteger(event.steps) || Math.abs(event.steps) > 20) throw new RangeError("invalid rotation");
      const prior = state.overlay?.kind === "mode" ? state.overlay.candidate : state.mode;
      return {...state, overlay: {kind: "mode",
        candidate: DISPLAY_MODES[wrap(DISPLAY_MODES.indexOf(prior) + event.steps, DISPLAY_MODES.length)],
        elapsedMs: 0}, notice: ""};
    }
    if (event.kind === "rotate" && event.control === "gain") {
      if (!Number.isInteger(event.steps) || Math.abs(event.steps) > 20) throw new RangeError("invalid rotation");
      if (state.gainMode !== "off") return {
        ...state, autoGainOffset: clamp(state.autoGainOffset + event.steps, -5, 5),
        notice: "Auto Gain Offset: " + clamp(state.autoGainOffset + event.steps, -5, 5),
      };
      return {...state, manualGain: Math.round(clamp(state.manualGain + event.steps * 0.5, 0, 10) * 10) / 10, notice: ""};
    }
    if (event.kind === "push" && event.control === "gain") {
      if (state.overlay?.kind === "gain") return {...state, overlay: {...state.overlay, mode: cycleGainMode(state.overlay.mode)}};
      return openGain(state);
    }
    if (event.kind !== "press" && event.kind !== "pad") return state;

    const control = event.control;
    if (control === "range") {
      const bds=getMenuItems("Display",state).find(item=>
        item.id==="display.bottomDiscrimination");
      if (["Graphic","Probability"].includes(state.settings.bottomDiscrimination) &&
          bds && !bds.disabled) {
        return {...state,notice:"RANGE DISABLED · BOTTOM DISCRIMINATION ACTIVE"};
      }
      if (state.overlay?.kind === "range") {
        const o = state.overlay;
        return {...state, overlay: o.mode === "manual"
          ? {...o, index: wrap(o.index + 1, MAX_RANGE_INDEX + 1)}
          : {...o, mode: "manual"}, notice: ""};
      }
      return openRange(state);
    }
    if(control==="func"){
      if(event.hold==="long"){
        const selected=FCV_FUNC_TARGETS.findIndex(target=>
          target.label===state.settings.keySetup);
        return {...state,overlay:{kind:"func-program",
          itemIndex:selected<0?0:selected},notice:""};
      }
      const target=FCV_FUNC_TARGETS.find(item=>item.label===
        (state.settings.keySetup??"Pic. Advance"));
      if(!target)return {...state,notice:"FUNC assignment not in public profile"};
      const category=target.entryId.split(".")[0];
      const grp=FCV_MENU_CATEGORIES.find(name=>name.toLowerCase()===category);
      const entry=getMenuItems(grp,state).find(item=>item.id===target.entryId);
      if(!entry || entry.disabled){
        return {...state,notice:"FUNC: "+(entry?.disabledReason??"SOURCE_GAP")};
      }
      if(entry.id==="data.waypoint"){
        return {...state,overlay:modal("waypoints",
          {purpose:"edit",itemIndex:0,fromCategoryIndex:3,simulated:true}),notice:""};
      }
      if(entry.kind!=="choice" || !entry.choices?.length){
        return {...state,notice:"FUNC: SOURCE_GAP"};
      }
      return {...state,overlay:{kind:"func-setting",label:target.label,
        settingKey:entry.settingKey,choices:entry.choices,
        draftValue:state.settings[entry.settingKey]??entry.choices[0]},notice:""};
    }
    if (control === "menu") {
      if (state.overlay?.kind === "brill") {
        return {...state, brightness: state.overlay.value, overlay: null, notice: ""};
      }
      if (state.overlay) return {...state, overlay: null, notice: ""};
      return {...state, overlay: menuOverlay(), notice: ""};
    }
    if (control === "enter") {
      if (state.overlay?.kind === "range") {
        return {...state, rangeMode: state.overlay.mode, rangeIndex: state.overlay.index, overlay: null, notice: ""};
      }
      if (state.overlay?.kind === "gain") {
        return {...state, gainMode: state.overlay.mode, autoGainOffset: state.overlay.offset,
          overlay: null, notice: ""};
      }
      if (state.overlay?.kind === "brill") {
        return {...state, brightness: state.overlay.value, overlay: null, notice: ""};
      }
      if (!state.overlay && state.alarms.activeIds.length) {
        return {...state,alarms:acknowledgeLegacyAlarms(state.alarms),
          notice:"ALARM ACK · SOURCE CONDITION STILL PRESENT"};
      }
      return state;
    }
    if (event.kind === "pad" && control === "trackpad") {
      const direction = event.direction;
      const o = state.overlay;
      if (o?.kind === "range") {
        if (direction === "left") return {...state, overlay: {...o, mode: "auto"}};
        if (direction === "right") return {...state, overlay: {...o, mode: "manual"}};
        if (o.mode !== "manual") return state;
        const delta = direction === "down" ? 1 : -1;
        return {...state, overlay: {...o, index: clamp(o.index + delta, 0, MAX_RANGE_INDEX)}};
      }
      if (o?.kind === "gain") {
        if (direction === "down") return {...state, overlay: {...o, mode: cycleGainMode(o.mode)}};
        if (direction === "up") return {...state, overlay: {...o, mode: cycleGainMode(o.mode, -1)}};
        const delta = direction === "right" ? 1 : -1;
        return {...state, overlay: {...o, offset: clamp(o.offset + delta, -5, 5)}};
      }
      if (o?.kind === "brill") {
        const delta=["right","up"].includes(direction)?1:-1;
        return {...state,overlay:{...o,value:clamp(o.value+delta,0,9),elapsedMs:0}};
      }
      if (!o && (direction === "up" || direction === "down") &&
          !["NAV1", "NAV2"].includes(state.mode)) {
        const delta = direction === "down" ? 1 : -1;
        return {
          ...state,
          vrmVisible: true,
          vrmDepthM: clamp(state.vrmDepthM + delta, 0, 300),
          notice: "",
        };
      }
      return state;
    }
    if (control === "mark") {
      if(state.settings.tankenmaru==="On")return {...state,
        notice:"MARK DISABLED · TANKENMARU MODE (PUBLIC REFERENCE)"};
      if (state.trainingFixture.navigation !== true ||
        !event.sensorObservation?.navigation?.position) {
        return {...state, notice:"MARK: NO POSITION · giảng viên bật D15 synthetic NAV fixture"};
      }
      try {
        const navigation=addLegacyWaypoint(state.navigation,{
          name:"MARK " + state.navigation.nextWaypointNumber,
          position:event.sensorObservation.navigation.position,
        });
        return {...state,navigation,notice:"MARK "+
          navigation.waypoints.at(-1).id+" · SIMULATED"};
      }catch(err){return {...state,notice:"MARK failed: "+err.message};}
    }
    return state;
  }

  const adapter = Object.freeze({
    id: profile.id,
    revision: profile.revision,
    profile,
    controls: Object.freeze(["power", "menu", "enter", "range", "mark", "func", "trackpad", "mode", "gain"]),
    holdThresholdMs: Object.freeze({power: 3000, func: 650}),
    gestures: Object.freeze({
      power: Object.freeze(["down", "up", "cancel"]),
      menu: Object.freeze(["press"]),
      enter: Object.freeze(["press"]),
      range: Object.freeze(["press"]),
      mark: Object.freeze(["press"]),
      func: Object.freeze(["down", "up", "cancel"]),
      trackpad: Object.freeze(["pad"]),
      mode: Object.freeze(["rotate"]),
      gain: Object.freeze(["push", "rotate"]),
    }),
    initial: initialState,
    reduce,
    probe: state => ({
      power: state.power,
      mode: state.mode,
      rangeMode: state.rangeMode,
      rangeIndex: state.rangeIndex,
      gainMode: state.gainMode,
      manualGain: state.manualGain,
      autoGainOffset: state.autoGainOffset,
      uiElapsedMs: state.uiElapsedMs,
      modeCandidate: state.overlay?.kind === "mode" ? state.overlay.candidate : null,
      vrmVisible: state.vrmVisible,
      vrmDepthM: state.vrmDepthM,
      brightness: state.brightness,
      dialog: state.overlay?.kind ?? null,
    }),
  });

  return Object.freeze({
    profile,
    adapter,
    menuEntries,
    getMenuItems,
    getInstallationMenu: getLegacyInstallationMenu,
    validateSettings,
    encodeSettings,
    decodeSettings,
    decodeProfile19Settings,
    initialState,
    reduce,
  });
}

export const FCV588_PROFILE21_BUNDLE = createLegacyFcv588Profile({
  revision: "F1-public-reference-21",
  sounderOrder: "profile21",
  includeMenuEntryOrderIds: false,
});

export const FCV588_PROFILE22_BUNDLE = createLegacyFcv588Profile({
  revision: "F1-public-reference-22",
  sounderOrder: "ap1",
  includeMenuEntryOrderIds: true,
});

export const FCV588_PROFILE21_ADAPTER = FCV588_PROFILE21_BUNDLE.adapter;
export const FCV588_PROFILE22_ADAPTER = FCV588_PROFILE22_BUNDLE.adapter;
