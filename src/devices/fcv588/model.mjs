/**
 * FCV-588 training subset, based on FURUNO FCV-628/588
 * Operator's Manual, operation §§1.1–1.8 (see docs/evidence/FCV-588.md).
 * Not a complete reproduction of any hardware firmware.
 */
import {FCV_MENU_CATEGORIES,FCV_MENU_ENTRIES,FCV_FUNC_TARGETS,FCV_FISH_ALARM_FIELDS,
  FCV_RANGE_BANK_FIELDS,FCV_NAV_BOX_OPTIONS,FCV_NAV_BOX_DEFAULTS,
  getFcvMenuItems,getInstallationMenu} from "./menu-atlas.mjs";
import {evaluateFcvAlarms, acknowledgeFcvAlarms} from "./alarms.mjs";
import {createNavigationState, addWaypoint, editWaypoint, deleteWaypoint,
  setDestination,advanceTrainingTrip,distanceNmBetween,
  isValidSyntheticSpeed} from "./navigation.mjs";
import {validateFcvSettings} from "./settings.mjs";
import {FCV588_PUBLIC_PROFILE_REVISION} from "./profile-version.mjs";
import {FCV_CALIBRATION_FIELDS} from "./calibration.mjs";
import {FCV_UNIT_FIELDS} from "./units.mjs";
export const FCV588 = Object.freeze({
  id: "furuno.fcv588.cv588e",
  revision: FCV588_PUBLIC_PROFILE_REVISION,
  // Profile22 checksum binds the exact semantic cursor order. A subsequent
  // reorder must not pass existing profile22 replay as unchanged behavior.
  menuEntryOrderIds: Object.freeze(FCV_MENU_ENTRIES.map(item=>item.id)),
  manufacturer: "FURUNO",
  model: "FCV-588",
  family: "fishfinder",
  controller: "integrated-controls",
  firmware: null,
  sources: Object.freeze(["FCV-588-OPS-01"]),
  safeOutputs: Object.freeze([]),
});

export const DISPLAY_MODES = Object.freeze(["NAV1", "LF-ZOOM", "LF", "DUAL", "HF", "HF-ZOOM", "NAV2"]);
export const GAIN_MODES = Object.freeze(["fishing", "cruising", "off"]);
const MAX_RANGE_INDEX = 7;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const wrap = (n, length) => ((n % length) + length) % length;
// FURUNO OME-23890-E §1.3: repeated BRILL presses reflect at 0 and 9.
// Direction belongs to the transient dialog, not the sensor/world model.
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
// Operator manual §2.2: switching depth units restores the eight RANGE slots.
// Values here remain bounded PUBLIC_REFERENCE classroom presets, not OEM tables.
const resetRangeBankOnDepthUnitChange=(before,next)=>
  before.units===next.units?next:{...next,...Object.fromEntries(
    FCV_RANGE_BANK_FIELDS.map(field=>[field.key,field.defaultValue]))};
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
  // FURUNO operator manual §1.21. "Own" is an explicit classroom sensor
  // fixture; choosing NMEA never fabricates a connected external navigator.
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
  // Separate synthetic arrival alarm is independent from all ALARM1–5 fish
  // condition conjunctions; never asserts reception of actual GNSS data.
  profiles.push({id:"ARRIVAL",enabled:settings.arrivalAlarm==="On",
    conditions:[{kind:"arrivalRange",maxNm:Number(settings.arrivalRadius??"0.1")}],
    sourceClass:"SYNTHETIC_ARRIVAL_LESSON"});
  return profiles;
}

const modal = (kind, details = {}) => ({kind,...details});
const WAYPOINT_CHARSET=" ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-";
function restoreSettings(state) {
  return {...state, settings:initialSettings(), demoOn:true,
    rangeMode:"auto",rangeIndex:3,gainMode:"fishing",autoGainOffset:0,
    manualGain:5,brightness:9,
    alarms:evaluateFcvAlarms([],{}),
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
        return {...state,navigation:setDestination(state.navigation,selected),
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
        const navigation=editWaypoint(state.navigation,o.waypointId,
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
        const navigation=deleteWaypoint(state.navigation,o.waypointId);
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

function menuOverlay(categoryIndex = 0, itemIndex = 0) {
  return {kind: "menu", categoryIndex, category: FCV_MENU_CATEGORIES[categoryIndex],
    itemIndex, editing: false, draftValue: null, editEntryId:null};
}

/**
 * An option appearing/disappearing must not silently reassign an active menu
 * cursor or carry a staged value into the different row at the old index.
 * Preserving an entry ID is distinct from claiming an installed OEM option.
 */
function reconcileCapabilityMenu(previous,next){
  // POWER cancellation restores priorOverlay. Reconcile that suspended
  // transaction too, without changing the held key or its countdown.
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
  const installation=overlay?.kind==="installation";
  if(!installation && overlay?.kind!=="menu")return next;
  const entries=state=>installation?getInstallationMenu(state):
    getFcvMenuItems(overlay.category,state);
  const identity=item=>installation?item?.settingKey:item?.id;
  const before=entries(previous),after=entries(next);
  const selected=identity(before[overlay.itemIndex]);
  const newIndex=after.findIndex(item=>identity(item)===selected);
  const active=after[newIndex];
  const rowsChanged=before.map(identity).join("|")!==after.map(identity).join("|");
  // A stable row ID is not a stable capability. Loss of permission/fixture
  // must cancel the canonical draft, not just hide its visual editor.
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
  const entries = getFcvMenuItems(o.category, state);
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
  const entries=getInstallationMenu(state);
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

/** Operator-driven alarm configuration; profile edits stay in device settings. */
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

export function initialFcv588State() {
  return {
    power: "off", // off | booting | on
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
    // Instructor D15 fixture, not a menu on the physical FCV-588.
    trainingFixture:{navigation:false,virtualMounting:false,
      lowBattery:false,systemError:false,tankenmaruOption:false},
    navigation:createNavigationState(),
    navigationObservation:null,
    // Selecting a named virtual type is never proof of a mounted/aligned probe.
    syntheticConditions:{depthM:null,speedKn:null,mountCompatible:false,
      mountAligned:false,bottomClassification:null},
    alarms:evaluateFcvAlarms([],{}),
    overlay: null,
    notice: "",
  };
}

function openRange(state) {
  return {...state, overlay: {kind: "range", mode: state.rangeMode, index: state.rangeIndex}, notice: ""};
}

function openGain(state) {
  return {...state, overlay: {kind: "gain", mode: state.gainMode,
    offset: state.autoGainOffset}, notice: ""};
}

function cycleGainMode(mode, steps = 1) {
  return GAIN_MODES[wrap(GAIN_MODES.indexOf(mode) + steps, GAIN_MODES.length)];
}

export function reduceFcv588(state, event) {
  if(event.kind==="restore-settings"){
    if(state.power!=="off")throw new Error("restore-settings only during off/startup");
    const settings={...initialSettings(),...validateFcvSettings(event.settings)};
    // Stored operator preference never proves a physical Tankenmaru option.
    // Fresh teacher sessions must explicitly declare the D15 virtual fixture.
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
  // Operator manual §1.18: any physical key silences an audible alarm.
  // Keep the underlying visual cause and perform the key's normal action.
  // Timers, synthetic world ticks and wheel-only detents do not represent
  // a silencing keypress.
  const physicalKey=(event.kind==="down" &&
      ["power","func"].includes(event.control)) ||
    (event.kind==="press" &&
      ["power","menu","enter","range","mark","func"].includes(event.control)) ||
    (event.kind==="pad" && event.control==="trackpad") ||
    (event.kind==="push" && event.control==="gain");
  if(state.power==="on" && state.alarms?.audible && physicalKey){
    state={...state,alarms:acknowledgeFcvAlarms(state.alarms)};
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
      ?distanceNmBetween(observation.navigation?.position,destination.position)
      :null;
    const syntheticConditions={
      depthM:sonarAvailable?observation.bottomDepthM:null,
      speedKn:(virtualSonar || externalSyntheticData) &&
        isValidSyntheticSpeed(observation.speedKn)?observation.speedKn:null,
      bottomClassification:sonarAvailable
        ? observation.bottomClassification??null:null,
      // Only a separately declared typed training fixture may assert these.
      mountCompatible:state.trainingFixture.virtualMounting===true ||
        (observation.virtualMounting?.profileId===
        "FCV588_PUBLIC_FEATURE_525STID_PWD" &&
        observation.virtualMounting?.mountCompatible===true),
      mountAligned:state.trainingFixture.virtualMounting===true ||
        (observation.virtualMounting?.profileId===
        "FCV588_PUBLIC_FEATURE_525STID_PWD" &&
        observation.virtualMounting?.mountAligned===true),
    };
    const bottomFeature=getFcvMenuItems("Display",{
      ...state,syntheticConditions,
    }).find(item=>item.id==="display.bottomDiscrimination");
    const fishFeature=getFcvMenuItems("Display",{
      ...state,syntheticConditions,
    }).find(item=>item.id==="display.accuFish");
    const bottomTypeAvailable=sonarAvailable && state.rangeMode==="auto" &&
      ["Graphic","Probability"].includes(state.settings.bottomDiscrimination) &&
      bottomFeature?.disabled===false;
    // A disabled demo is not evidence of a real connected sounder or navigator.
    // Mask unavailable sensor fields before computing safety-training alarms.
    const alarmObservation={
      ...observation,
      bottomDepthM:sonarAvailable?observation.bottomDepthM:null,
      // §1.18 bottom-type alarm cannot identify seabed without Bottom Disc.
      bottomType:bottomTypeAvailable?observation.bottomType:null,
      fishPresent:sonarAvailable?observation.fishPresent:null,
      fishStrength:sonarAvailable?observation.fishStrength:null,
      fishCategory:sonarAvailable?observation.fishCategory:null,
      accuFishAvailable:sonarAvailable &&
        state.settings.accuFish==="On" && fishFeature?.disabled===false,
      arrivalDistanceNm,
      speedKn:(virtualSonar || externalSyntheticData) &&
        state.settings.speedSource!=="NMEA" &&
        isValidSyntheticSpeed(observation.speedKn)?observation.speedKn:null,
      temperatureC:(virtualSonar || externalSyntheticData) &&
        state.settings.tempSource!=="NMEA"
        ?observation.temperatureC:null,
    };
    const alarms=evaluateFcvAlarms(alarmProfiles(state.settings),
      alarmObservation,state.alarms);
    const navigation=externalSyntheticData && state.settings.tripSource==="Own"
      ?advanceTrainingTrip(state.navigation,observation.speedKn,steps)
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
    const bds=getFcvMenuItems("Display",state).find(item=>
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
    const group=FCV_MENU_CATEGORIES.find(name=>name.toLowerCase()===category);
    const entry=getFcvMenuItems(group,state).find(item=>item.id===target.entryId);
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
    if (state.overlay) return {...state, overlay: null, notice: ""}; // cancel other edits
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
      return {...state,alarms:acknowledgeFcvAlarms(state.alarms),
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
      // The existing six-second training timer measures inactivity, not the
      // age of the first opening. A clamped adjustment is still an operation.
      const delta=["right","up"].includes(direction)?1:-1;
      return {...state,overlay:{...o,value:clamp(o.value+delta,0,9),elapsedMs:0}};
    }
    // Manual §1.7: ▲/▼ move VRM outside menus; not active in NAV views.
    // F0 step size is illustrative pending physical-device measurement.
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
    // Manual §1.1 explicitly disables MARK when Tankenmaru is installed.
    if(state.settings.tankenmaru==="On")return {...state,
      notice:"MARK DISABLED · TANKENMARU MODE (PUBLIC REFERENCE)"};
    if (state.trainingFixture.navigation !== true ||
      !event.sensorObservation?.navigation?.position) {
      return {...state, notice:"MARK: NO POSITION · giảng viên bật D15 synthetic NAV fixture"};
    }
    try {
      const navigation=addWaypoint(state.navigation,{
        name:"MARK " + state.navigation.nextWaypointNumber,
        position:event.sensorObservation.navigation.position,
      });
      return {...state,navigation,notice:"MARK "+
        navigation.waypoints.at(-1).id+" · SIMULATED"};
    }catch(err){return {...state,notice:"MARK failed: "+err.message};}
  }
  return state;
}
