/** Original FCV classroom presentation. No state transitions or OEM pixels. */
import {FCV_MENU_CATEGORIES,getFcvMenuItems} from
  "../src/devices/fcv588/menu-atlas.mjs";
import {getFcvMenuItems as getFcvMenuItemsProfile21} from
  "../src/devices/fcv588/menu-atlas-profile21.mjs";
import {FCV588_PUBLIC_PROFILE_REVISION} from
  "../src/devices/fcv588/profile-version.mjs";
import {getFcvDisplayPalette} from "../src/devices/fcv588/display-palette.mjs";
import {shouldRenderFcvSonar} from "../src/devices/fcv588/echo-projection.mjs";
import {formatFcvDepth} from "../src/devices/fcv588/units.mjs";
import {
  isVietnameseFcv,
  localizeFcvMenuHeader,
  localizeFcvCategory,
  localizeFcvMenuLabel,
  localizeFcvChoiceValue,
  localizeFcvNavLabel,
  localizeFcvMenuLegend,
} from "../src/devices/fcv588/i18n.mjs";

export {
  isVietnameseFcv,
  localizeFcvMenuHeader,
  localizeFcvCategory,
  localizeFcvMenuLabel,
  localizeFcvChoiceValue,
  localizeFcvNavLabel,
  localizeFcvMenuLegend,
};

const PICTURE_RATE_LABELS=Object.freeze({
  "4x":"x4","2x":"x2","1x":"x1","1/2":"1/2","1/4":"1/4",
  "1/8":"1/8","1/16":"1/16","Stop":"STOP",
});

/** Header reads the committed setting, never an unconfirmed menu draft. */
export function formatFcvPictureAdvance(settings={}){
  const choice=settings.pictureAdvance??"1x";
  return Object.hasOwn(PICTURE_RATE_LABELS,choice)?PICTURE_RATE_LABELS[choice]:"?";
}

function resolveModeHeaderLabel(state,settings){
  const freq=state.mode?.startsWith("HF")?"HF":"LF";
  const zoomPrefix={"Bottom Lock":"BL","Bottom Zoom":"BZ","Marker Zoom":"MZ"};
  return state.mode==="DUAL"?"LF/HF":
    state.mode?.includes("ZOOM")?(zoomPrefix[settings.zoomMode]??"BZ")+"-"+freq:
    state.mode??"LF";
}

/** Photo-bounded original-art header. Preserves the legacy 1-arg contract. */
export function projectFcvPhotoStatusHeader(state={}){
  if(state.power!=="on")return {text:state.power==="booting"?"STARTUP":"POWER OFF",
    modeLabel:null,batteryStatus:null,sourceClass:"PUBLIC_REFERENCE_DISPLAY"};
  const settings=state.settings??{};
  if(settings.headerInfo==="Off")return {text:"",modeLabel:null,batteryStatus:null,
    sourceClass:"PUBLIC_REFERENCE_DISPLAY"};
  if(["NAV1","NAV2"].includes(state.mode))return {text:"",
    modeLabel:state.mode,batteryStatus:settings.battery==="On"?"NO_HARDWARE_DATA":null,
    sourceClass:"PHOTO_REFERENCE_PRESENTATION_NOT_HARDWARE_VERIFIED"};
  const modeLabel=resolveModeHeaderLabel(state,settings);
  const offset=Number.isFinite(state.autoGainOffset)&&state.autoGainOffset!==0
    ?(state.autoGainOffset>0?"+":"")+String(state.autoGainOffset):"";
  const gain=state.gainMode==="fishing"?"G:AF"+offset:
    state.gainMode==="cruising"?"G:AC"+offset:
    "G:"+(Number.isFinite(state.manualGain)?String(state.manualGain):"--");
  const range=state.rangeMode==="auto"?"AUTO_R":"MAN.R";
  const battery=settings.battery==="On";
  const rate=battery?"":formatFcvPictureAdvance(settings);
  return {text:[range,gain,modeLabel,...(rate?[rate]:[])].join("   "),
    modeLabel,batteryStatus:battery?"NO_HARDWARE_DATA":null,
    sourceClass:"PHOTO_REFERENCE_PRESENTATION_NOT_HARDWARE_VERIFIED"};
}

/** Authentic 2016 FCV-588 blue header bar projection (giaoDien/dual/zoom/nav1/nav2). */
export function projectFcvAuthenticHeader(state={},widgets=null){
  if(state.power!=="on"){
    const text=state.power==="booting"?"STARTUP":"POWER OFF";
    return {visible:true,scope:"full",leftText:text,rightText:"",text,
      modeLabel:null,batteryStatus:null,voltageText:null,
      sourceClass:"PUBLIC_REFERENCE_DISPLAY"};
  }
  const settings=state.settings??{};
  if(settings.headerInfo==="Off"){
    return {visible:false,scope:"hidden",leftText:"",rightText:"",text:"",
      modeLabel:null,batteryStatus:null,voltageText:null,
      sourceClass:"PUBLIC_REFERENCE_DISPLAY"};
  }
  const batteryOn=settings.battery==="On";
  const fallbackVoltage=state.trainingFixture?.lowBattery===true?"11.4V":"13.6V";
  const voltageText=batteryOn?(widgets?.battery?.voltageText??fallbackVoltage):null;
  const rateText=formatFcvPictureAdvance(settings);
  if(["NAV1","NAV2"].includes(state.mode)){
    const slotText=batteryOn?voltageText:rateText;
    return {visible:true,scope:"nav-sonar",leftText:slotText,rightText:"",
      text:slotText,modeLabel:state.mode,
      batteryStatus:batteryOn?"SYNTHETIC_DISPLAY_VOLTAGE":null,voltageText,
      sourceClass:"PHOTO_REFERENCE_PRESENTATION_NOT_HARDWARE_VERIFIED"};
  }
  const modeLabel=resolveModeHeaderLabel(state,settings);
  const offset=Number.isFinite(state.autoGainOffset)&&state.autoGainOffset!==0
    ?(state.autoGainOffset>0?"+":"")+String(state.autoGainOffset):"";
  const gain=state.gainMode==="fishing"?"G:AF"+offset:
    state.gainMode==="cruising"?"G:AC"+offset:
    "G: "+(Number.isFinite(state.manualGain)?String(state.manualGain):"--");
  const range=state.rangeMode==="auto"?"AUTO_R":"MAN_R";
  const leftText=[range,gain,modeLabel].join("   ");
  const rightText=batteryOn?voltageText:rateText;
  return {visible:true,scope:"full",leftText,rightText,
    text:rightText?leftText+"   "+rightText:leftText,
    modeLabel,batteryStatus:batteryOn?"SYNTHETIC_DISPLAY_VOLTAGE":null,
    voltageText,sourceClass:"PHOTO_REFERENCE_PRESENTATION_NOT_HARDWARE_VERIFIED"};
}

/** Original depth-axis lettering from logical 480x640 layout, not camera RGB.
 * A nice 4-interval scale leaves five major labels on a 20m reference image.
 */
export function projectFcvDepthTicks(frame,{
  height=640,top=66,bottom=12,units="Metric",axis="absolute"
}={}){
  const start=frame?.startDepthM??0,range=frame?.rangeM;
  if(!Number.isFinite(start)||!Number.isFinite(range)||range<=0 ||
    !Number.isFinite(height)||!Number.isFinite(top)||!Number.isFinite(bottom)||
    height<=0||top<0||bottom<0||top+bottom>=height)
    throw new RangeError("invalid depth scale range or viewport");
  if(axis==="bottom-lock"){
    if(frame?.zoomMode!=="Bottom Lock")
      throw new RangeError("bottom-lock axis requires Bottom Lock frame");
    const relativeRange=Number.isFinite(frame?.windowDepthM)
      ?frame.windowDepthM:range;
    if(!Number.isFinite(relativeRange)||relativeRange<=0)
      throw new RangeError("invalid Bottom Lock display range");
    const step=relativeRange/5;
    const precision=step<1?Math.min(3,Math.ceil(-Math.log10(step))+1):0;
    const span=height-top-bottom;
    const roundY=value=>span>=10?Math.round(value):value;
    return Object.freeze(Array.from({length:6},(_,index)=>{
      const relative=Number((relativeRange-index*step).toFixed(6));
      return Object.freeze({depthM:relative,y:roundY(top+index/5*span),
        label:formatFcvDepth(relative,units,precision),
        axis:"BOTTOM_RELATIVE"});
    }));
  }
  if(axis!=="absolute")throw new RangeError("unknown depth axis");
  const rawStep=range/4;
  const magnitude=10**Math.floor(Math.log10(rawStep));
  const ratio=rawStep/magnitude;
  const unitStep=([1,2,2.5,5,10].find(choice=>choice>=ratio-1e-10)??10);
  const step=unitStep*magnitude;
  const precision=step<1?Math.min(3,Math.ceil(-Math.log10(step))+1):0;
  const first=Math.ceil((start-1e-9)/step)*step;
  const span=height-top-bottom;
  const roundY=value=>span>=10?Math.round(value):value;
  const ticks=[];
  for(let i=0;i<200;i++){
    const depth=Number((first+i*step).toFixed(6));
    if(depth>start+range+1e-8)break;
    if(depth<start-1e-8)continue;
    const fraction=(depth-start)/range;
    ticks.push(Object.freeze({depthM:depth,
      y:roundY(top+fraction*span),
      label:formatFcvDepth(depth,units,precision)}));
  }
  return Object.freeze(ticks);
}

/** Four evenly spaced minor ticks (4px) between each pair of major depth ticks. */
export function projectFcvDepthSubTicks(ticks=[],subdivisions=5){
  if(!Array.isArray(ticks)||ticks.length<2||!Number.isInteger(subdivisions)||subdivisions<2)
    return Object.freeze([]);
  const minor=[];
  for(let i=0;i<ticks.length-1;i++){
    const y0=ticks[i]?.y,y1=ticks[i+1]?.y;
    if(!Number.isFinite(y0)||!Number.isFinite(y1))continue;
    for(let s=1;s<subdivisions;s++){
      minor.push(Object.freeze({
        y:Math.round(y0+(y1-y0)*(s/subdivisions)),
        widthPx:4,
      }));
    }
  }
  return Object.freeze(minor);
}

const NAV_LABEL_TO_CANONICAL=Object.freeze({
  "VI TRI":"POSITION",
  "DO SAU":"DEPTH",
  "TOC DO (STW)":"SPEED (STW)",
  "TOC DO (SOG)":"SPEED (SOG)",
  "TOC DO":"SPEED",
  "NHIET DO":"TEMPERATURE",
  "HANH TRINH":"TRIP",
  "TONG HANH TRINH":"ODOMETER",
  "TONG H. TRINH":"ODOMETER",
  "HUONG DI":"COURSE",
  "GIO":"WIND",
  "GIO (BIEU KIEN)":"WIND (APPARENT)",
  "KHOANG CACH":"RANGE",
  "PHUONG VI":"BEARING",
  "PHUONG VI (TU)":"BEARING (MAG)",
  "HUONG MUI":"HEADING",
  "AP SUAT":"BAROM PRESS",
  "KHI AP":"BAROM PRESS",
  "THOI GIAN DEN":"TIME TO GO",
  "TG DEN DICH":"TIME TO GO",
  "LECH TUYEN":"XTE",
});

export function canonicalNavBoxLabel(label){
  const upper=String(label??"").trim().toUpperCase();
  return Object.hasOwn(NAV_LABEL_TO_CANONICAL,upper)?NAV_LABEL_TO_CANONICAL[upper]:upper;
}

/** Authentic NAV1/NAV2 LCD box dash notation when a channel has NO DATA.
 * External D15 instructor panels retain explicit NO DATA truth separately.
 */
export function formatFcvNavBoxForLcd(box,settings={}){
  const raw=box?.value;
  const stripped=raw===null||raw===undefined?"NO DATA":
    / \(SIM EST\)$/.test(String(raw))?"NO DATA":
    String(raw).replace(/^SIM (?=\d)/,"")
      .replace(/ \((?:SIM|SIM EST)\)$/,"")
      .replace(/\s*·\s*(?:SIM|SIMULATED|TRAINING ONLY|SYNTHETIC ONLY)(?=\s*(?:$|:))/g,"")
      .trim();
  if(stripped && stripped!=="NO DATA")return stripped;
  const label=canonicalNavBoxLabel(box?.label);
  const speedUnit=settings?.speedUnit??"kn";
  const depthUnit={Metric:"m",Feet:"ft",Fathom:"fm"}[settings?.units]??"m";
  const tempUnit=settings?.tempUnit??"C";
  const distUnit=String(settings?.distanceUnit??"NM").toLowerCase();
  if(label==="POSITION")return "--°--.---' ---°--.---'";
  if(["SPEED (STW)","SPEED (SOG)","SPEED","WIND","WIND (APPARENT)"].includes(label))
    return "--.- "+speedUnit;
  if(label==="DEPTH")return "--.- "+depthUnit;
  if(label==="TEMPERATURE")return "--.- °"+tempUnit;
  if(["TRIP","ODOMETER","RANGE","XTE"].includes(label))return "---.- "+distUnit;
  if(["COURSE","BEARING","BEARING (MAG)","HEADING"].includes(label))return "---°";
  if(label==="BAROM PRESS")return "----.- hPa";
  if(label==="TIME TO GO")return "--:--";
  return "---";
}

/** NAV photos/manual use selectable data boxes as the left data surface.
 * Never invent a global depth fallback when the operator did not select DEPTH.
 */
export function shouldShowFcvGlobalDepth(mode,navBoxes=[]){
  void navBoxes;
  return !["NAV1","NAV2"].includes(mode);
}

/** One vertical strong-to-weak legend, using ONLY our existing RGB palette.
 * Placement follows qualitative gallery evidence; dimensions are original.
 */
export function projectFcvEchoLegend(state,{width=480,height=640,xOffset=0}={}){
  if(!Number.isFinite(width) || width<=0 || !Number.isFinite(height) || height<=0 ||
      !Number.isFinite(xOffset) || xOffset<0 || xOffset+11*width/480>width){
    throw new RangeError("invalid original echo legend bounds");
  }
  if(state.power!=="on" || state.overlay?.kind==="lcd-test" ||
      !shouldRenderFcvSonar(state) || state.settings?.colorBar!=="On")return null;
  const palette=getFcvDisplayPalette(state.settings);
  const x=xOffset+3*width/480,y=64*height/640;
  const bandWidth=8*width/480,bandHeight=160*height/640/palette.length;
  return {sourceClass:"ORIGINAL_TRAINING_ARTWORK",orientation:"vertical",
    order:"strong-to-weak",bands:[...palette].reverse().map((rgb,index)=>({
      x,y:y+index*bandHeight,width:bandWidth,height:bandHeight,rgb:[...rgb],
    }))};
}

export const FCV_TRAINING_LCD_TEST_PATTERNS=Object.freeze([
  ["BLACK",[0,0,0]], ["WHITE",[255,255,255]], ["RED",[255,0,0]],
  ["GREEN",[0,255,0]], ["BLUE",[0,0,255]],
].map(([name,rgb])=>Object.freeze({name,rgb:Object.freeze(rgb)})));

export function projectFcvLcdPresentation(state){
  const overlay=state.overlay;
  const draft=overlay?.kind==="brill"?overlay:
    overlay?.kind==="power-hold" && overlay.priorOverlay?.kind==="brill"
      ?overlay.priorOverlay:null;
  const value=state.power==="on" && draft?draft.value:state.brightness;
  const level=Number.isFinite(value)?Math.max(0,Math.min(9,value)):9;
  const testPattern=state.power==="on" && overlay?.kind==="lcd-test" &&
    Number.isInteger(overlay.colorIndex)
    ?FCV_TRAINING_LCD_TEST_PATTERNS[overlay.colorIndex]??null:null;
  return {brightnessLevel:level,
    // A readable training approximation; not measured OEM photometry.
    luminance:(0.25+0.75*level/9).toFixed(3),testPattern};
}

const isSourceHold=reason=>/RIGHTS_HOLD|SOURCE_GAP|CONFLICT_HOLD|UNVERIFIED/.test(reason??"");

// Both menu entry points project the same bounded window. The canonical
// reducer still owns the complete choice list, ordering, wrap and draft.
function projectChoiceWindow(choices,draftValue){
  const index=choices.indexOf(draftValue);
  const start=Math.max(0,Math.min(index-3,choices.length-7));
  return {total:choices.length,index,
    choices:choices.slice(start,start+7).map(value=>({
      value,selected:value===draftValue})),
    before:start>0,after:start+7<choices.length};
}

// Share the existing V29 window without changing FUNC or main-menu semantics.
export {projectChoiceWindow as projectFcvChoiceWindow};

/** Effective LCD alarms: cached causes remain canonical, but a committed Off
 * preference cannot be shown as an enabled alarm while world time is paused.
 * No draft, observation, acknowledgement or event is changed by this view.
 */
export function projectFcvAlarmPresentation(state){
  const source=state?.alarms;
  const snapshotAvailable=source?.sourceClass==="SYNTHETIC_TRAINING_CAUSES" &&
    Array.isArray(source.activeIds) && Array.isArray(source.acknowledgedIds);
  const activeIds=snapshotAvailable && state?.power==="on"
    ?[...new Set(source.activeIds)].filter(id=>{
      if(typeof id!=="string")return false;
      const key=/^ALARM[1-5]$/.test(id)?id.toLowerCase():
        id==="ARRIVAL"?"arrivalAlarm":null;
      return key!==null && state.settings?.[key]==="On";
    }):[];
  const acknowledgedIds=activeIds.filter(id=>source.acknowledgedIds.includes(id));
  return {snapshotAvailable,activeIds,acknowledgedIds,
    audible:activeIds.some(id=>!acknowledgedIds.includes(id)),
    sourceClass:"SYNTHETIC_TRAINING_DISPLAY_ONLY"};
}

/** Read-only FUNC editor; supports English and Tieng Viet D04 display. */
export function projectFcvFuncSetting(state){
  const overlay=state?.overlay;
  if(state?.power!=="on" || overlay?.kind!=="func-setting" ||
      typeof overlay.label!=="string" || typeof overlay.settingKey!=="string" ||
      !Array.isArray(overlay.choices) || !overlay.choices.length ||
      overlay.choices.some(value=>typeof value!=="string") ||
      !overlay.choices.includes(overlay.draftValue))return null;
  const vi=isVietnameseFcv(state);
  const win=projectChoiceWindow(overlay.choices,overlay.draftValue);
  const choices=vi
    ?win.choices.map(item=>({
      ...item,
      label:localizeFcvChoiceValue(overlay.settingKey,item.value,state.settings),
    }))
    :win.choices;
  const labelText=vi
    ?localizeFcvMenuLabel(overlay.settingKey,overlay.label,state.settings)
    :overlay.label;
  return {title:labelText+" / FUNC",settingKey:overlay.settingKey,
    ...win,choices,
    help:"▲/▼ hoặc FUNC chọn · ENTER lưu · MENU/ESC hủy",
    geometryGrade:"ORIGINAL_REFERENCE_ESTIMATE"};
}

/** Keep operator rows, option choices and classroom instructions distinct. */
export function projectFcvMainMenu(state,{profileRevision=FCV588_PUBLIC_PROFILE_REVISION}={}){
  const items=profileRevision==="F1-public-reference-21"?getFcvMenuItemsProfile21:
    [FCV588_PUBLIC_PROFILE_REVISION,"F1-public-reference-22",
      "F1-public-reference-23","F1-public-reference-24"]
      .includes(profileRevision)?getFcvMenuItems:null;
  if(!items)throw new TypeError("unsupported FCV-588 presentation profile revision");
  const overlay=state.overlay;
  if(state.power!=="on" || overlay?.kind!=="menu" ||
      !FCV_MENU_CATEGORIES.includes(overlay.category))return null;
  const entries=items(overlay.category,state);
  const active=entries[overlay.itemIndex];
  if(!Number.isInteger(overlay.itemIndex) || !active)return null;
  const vi=isVietnameseFcv(state);
  const menuHeader=localizeFcvMenuHeader(state.settings);
  const localizedCategory=localizeFcvCategory(overlay.category,state.settings);
  const rows=entries.map((entry,index)=>{
    const selected=index===overlay.itemIndex;
    const committedValue=state.settings[entry.settingKey];
    const draftValue=selected && overlay.editing?overlay.draftValue:null;
    const value=draftValue??committedValue;
    const rawValueText=entry.kind!=="choice"?"":
      value!==undefined && value!==null?String(value):
      value===null?"--":
      (entry.disabled===true || entry.id==="system.language" ||
        (vi && entry.id==="sounder.clutter"))
        ?String(entry.choices?.[0]??"--"):"";
    const label=vi
      ?localizeFcvMenuLabel(entry.id,entry.label,state.settings)
      :entry.label;
    const valueText=vi && rawValueText && rawValueText!=="--"
      ?localizeFcvChoiceValue(entry.settingKey,rawValueText,state.settings)
      :rawValueText;
    return {id:entry.id,selected,disabled:entry.disabled===true,
      label,valueText,committedValue:committedValue??null,draftValue,
      text:(selected?"▶ ":"  ")+label+
        (valueText?" : "+valueText:""),
      sourceStatus:entry.sourceStatus};
  });
  let editor=null;
  if(overlay.editing && !active.disabled && active.kind==="choice"){
    const win=projectChoiceWindow(active.choices??[],overlay.draftValue);
    const choices=vi
      ?win.choices.map(item=>({
        ...item,
        label:localizeFcvChoiceValue(active.settingKey,item.value,state.settings),
      }))
      :win.choices;
    editor={
      title:vi?localizeFcvMenuLabel(active.id,active.label,state.settings):active.label,
      ...win,choices,
    };
  }
  const legendLines=[...localizeFcvMenuLegend(state.settings)];
  const reason=active.disabled?active.disabledReason??"SOURCE_GAP":null;
  return {
    category:localizedCategory,
    categoryKey:overlay.category,
    menuHeader,
    title:vi
      ?localizedCategory+(overlay.editing?" / CHINH":" / B. LENH")
      :overlay.category+(overlay.editing?" / EDIT":" / MENU"),
    categories:FCV_MENU_CATEGORIES.map(cat=>({
      key:cat,
      label:localizeFcvCategory(cat,state.settings),
      selected:cat===overlay.category,
    })),
    rows,editor,
    legendLines,
    footerKeys:vi?legendLines:["▲/▼/◀/▶","ENTER","MENU/ESC"],
    localeConformance:vi?"PHOTO_REFERENCE_VI_ASCII":"HOLD",
    help:overlay.editing?"◀/▶ chọn · ENTER lưu · MENU/ESC hủy":
      "◀/▶ nhóm · ▲/▼ mục · ENTER mở · MENU/ESC trở lại",
    reason:reason?(isSourceHold(reason)?"HOLD (thiếu nguồn/quyền): ":
      "N/A (điều kiện cấu hình): ")+reason:"",
    geometryGrade:"ORIGINAL_REFERENCE_ESTIMATE",
  };
}
