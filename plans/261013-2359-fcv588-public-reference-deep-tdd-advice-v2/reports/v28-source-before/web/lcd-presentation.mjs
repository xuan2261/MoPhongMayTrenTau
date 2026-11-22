/** Original FCV classroom presentation. No state transitions or OEM pixels. */
import {FCV_MENU_CATEGORIES,getFcvMenuItems} from
  "../src/devices/fcv588/menu-atlas.mjs";

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
    const badge=entry.disabled?(isSourceHold(entry.disabledReason)?" [HOLD]":" [N/A]"):"";
    return {id:entry.id,selected,disabled:entry.disabled===true,
      text:(selected?"▶ ":"  ")+entry.label+badge+
        (entry.kind==="choice" && value!==undefined && value!==null?" : "+value:""),
      sourceStatus:entry.sourceStatus};
  });
  let editor=null;
  if(overlay.editing && !active.disabled && active.kind==="choice"){
    const choices=active.choices??[];
    const index=choices.indexOf(overlay.draftValue);
    const start=Math.max(0,Math.min(index-3,choices.length-7));
    editor={title:active.label,total:choices.length,index,
      choices:choices.slice(start,start+7).map(value=>({
        value,selected:value===overlay.draftValue})),
      before:start>0,after:start+7<choices.length};
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
