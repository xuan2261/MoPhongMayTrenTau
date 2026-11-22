/** Original FCV classroom presentation. No state transitions or OEM pixels. */
import {FCV_MENU_CATEGORIES,getFcvMenuItems} from
  "../src/devices/fcv588/menu-atlas.mjs";
import {getFcvDisplayPalette} from "../src/devices/fcv588/display-palette.mjs";
import {shouldRenderFcvSonar} from "../src/devices/fcv588/echo-projection.mjs";

const PICTURE_RATE_LABELS=Object.freeze({
  "4x":"x4","2x":"x2","1x":"x1","1/2":"1/2","1/4":"1/4",
  "1/8":"1/8","1/16":"1/16","Stop":"STOP",
});

/** Header reads the committed setting, never an unconfirmed menu draft. */
export function formatFcvPictureAdvance(settings={}){
  const choice=settings.pictureAdvance??"1x";
  return Object.hasOwn(PICTURE_RATE_LABELS,choice)?PICTURE_RATE_LABELS[choice]:"?";
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

/** Read-only FUNC editor; numeric White Line/Edge semantics are NOT added. */
export function projectFcvFuncSetting(state){
  const overlay=state?.overlay;
  if(state?.power!=="on" || overlay?.kind!=="func-setting" ||
      typeof overlay.label!=="string" || typeof overlay.settingKey!=="string" ||
      !Array.isArray(overlay.choices) || !overlay.choices.length ||
      overlay.choices.some(value=>typeof value!=="string") ||
      !overlay.choices.includes(overlay.draftValue))return null;
  return {title:overlay.label+" / FUNC",settingKey:overlay.settingKey,
    ...projectChoiceWindow(overlay.choices,overlay.draftValue),
    help:"▲/▼ hoặc FUNC chọn · ENTER lưu · MENU/ESC hủy",
    geometryGrade:"ORIGINAL_REFERENCE_ESTIMATE"};
}

/** Keep operator rows, option choices and classroom instructions distinct. */
export function projectFcvMainMenu(state){
  const overlay=state.overlay;
  if(state.power!=="on" || overlay?.kind!=="menu" ||
      !FCV_MENU_CATEGORIES.includes(overlay.category))return null;
  const entries=getFcvMenuItems(overlay.category,state);
  const active=entries[overlay.itemIndex];
  if(!Number.isInteger(overlay.itemIndex) || !active)return null;
  const rows=entries.map((entry,index)=>{
    const selected=index===overlay.itemIndex;
    const value=selected && overlay.editing?overlay.draftValue:
      state.settings[entry.settingKey];
    return {id:entry.id,selected,disabled:entry.disabled===true,
      text:(selected?"▶ ":"  ")+entry.label+
        (entry.kind==="choice" && value!==undefined && value!==null?" : "+value:""),
      sourceStatus:entry.sourceStatus};
  });
  let editor=null;
  if(overlay.editing && !active.disabled && active.kind==="choice"){
    editor={title:active.label,
      ...projectChoiceWindow(active.choices??[],overlay.draftValue)};
  }
  const reason=active.disabled?active.disabledReason??"SOURCE_GAP":null;
  return {category:overlay.category,
    title:overlay.category+(overlay.editing?" / EDIT":" / MENU"),
    categories:FCV_MENU_CATEGORIES.map(label=>({label,selected:label===overlay.category})),
    rows,editor,
    help:overlay.editing?"◀/▶ chọn · ENTER lưu · MENU/ESC hủy":
      "◀/▶ nhóm · ▲/▼ mục · ENTER mở · MENU/ESC trở lại",
    reason:reason?(isSourceHold(reason)?"HOLD (thiếu nguồn/quyền): ":
      "N/A (điều kiện cấu hình): ")+reason:"",
    geometryGrade:"ORIGINAL_REFERENCE_ESTIMATE"};
}
