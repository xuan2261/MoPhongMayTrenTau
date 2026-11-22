/** Original basic-control LCD projection. No input handling or independent clock.
 * Existing training contracts: ENTER for Range/Gain, ENTER or MENU for BRILL,
 * automatic timeout (not ENTER) for MODE. Exact OEM geometry/timing is HOLD.
 */
import {DISPLAY_MODES,GAIN_MODES} from "../src/devices/fcv588/model.mjs";
import {FCV_RANGE_BANK_FIELDS} from "../src/devices/fcv588/menu-atlas.mjs";
import {formatFcvDepth} from "../src/devices/fcv588/units.mjs";
import {projectFcvChoiceWindow} from "./lcd-presentation.mjs";
const modes=Object.freeze({auto:"Auto",manual:"Manual"});
const gainNames=Object.freeze({fishing:"Fishing",cruising:"Cruising",off:"Off"});
const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
const signed=v=>(v>0?"+":"")+v;
const rows=(values,active,label=String)=>values.map(value=>({
  value:String(value),text:label(value),selected:value===active,
}));
const idle=o=>Number.isFinite(o.elapsedMs)&&o.elapsedMs>=0;

export function projectFcvControl(state){
  const o=state?.overlay;
  if(state?.power!=="on" || !o || !state.settings)return null;
  let view;
  if(o.kind==="range"){
    if(!Object.hasOwn(modes,o.mode)||!Object.hasOwn(modes,state.rangeMode)||
        !integer(o.index,0,7)||!integer(state.rangeIndex,0,7))return null;
    const text=(mode,index)=>{
      if(mode==="auto")return "Auto";
      const field=FCV_RANGE_BANK_FIELDS[index];
      const value=Number(state.settings[field.key]??field.defaultValue);
      return "Manual · "+field.label+" : "+formatFcvDepth(value,state.settings.units,0);
    };
    view={title:"Range",rows:rows(["auto","manual"],o.mode,v=>modes[v]),
      currentValue:state.rangeMode+":"+state.rangeIndex,draftValue:o.mode+":"+o.index,
      currentText:text(state.rangeMode,state.rangeIndex),draftText:text(o.mode,o.index),
      help:"◀/▶ Auto/Manual · ▲/▼ preset khi Manual · ENTER lưu · MENU/ESC hủy",
      note:"§1.5 · Preset chỉ chọn khi Manual; không đổi dữ liệu đáy."};
  }else if(o.kind==="gain"){
    if(!GAIN_MODES.includes(o.mode)||!GAIN_MODES.includes(state.gainMode)||
        !integer(o.offset,-5,5)||!integer(state.autoGainOffset,-5,5))return null;
    const text=(mode,offset)=>mode==="off"
      ?"Off · Manual Gain "+Number(state.manualGain).toFixed(1)
      :gainNames[mode]+" · Offset "+signed(offset);
    view={title:"Auto Gain",rows:rows(GAIN_MODES,o.mode,v=>gainNames[v]),
      currentValue:state.gainMode+":"+state.autoGainOffset,
      draftValue:o.mode+":"+o.offset,currentText:text(state.gainMode,state.autoGainOffset),
      draftText:text(o.mode,o.offset),
      help:"▲/▼ chế độ · ◀/▶ offset · ENTER lưu · MENU/ESC hủy",
      note:"§1.6 · Offset −5…+5; Off dùng GAIN thủ công."};
  }else if(o.kind==="brill"){
    if(!integer(o.value,0,9)||!integer(state.brightness,0,9)||!idle(o))return null;
    const choices=projectFcvChoiceWindow(Array.from({length:10},(_,i)=>String(i)),String(o.value));
    view={title:"Brill",rows:choices.choices.map(c=>({...c,text:c.value})),
      currentValue:String(state.brightness),draftValue:String(o.value),
      currentText:state.brightness+" / 9",draftText:o.value+" / 9",
      remainingMs:Math.max(0,6000-o.elapsedMs),
      help:"◀/▶ độ sáng · POWER/BRILL đổi mức · ENTER hoặc MENU/ESC lưu",
      note:"§1.3 · Xem trước LCD; tự lưu sau thời gian không thao tác (mô phỏng)."};
  }else if(o.kind==="mode"){
    if(!DISPLAY_MODES.includes(o.candidate)||!DISPLAY_MODES.includes(state.mode)||!idle(o))return null;
    view={title:"MODE",rows:rows(DISPLAY_MODES,o.candidate),
      currentValue:state.mode,draftValue:o.candidate,currentText:state.mode,draftText:o.candidate,
      remainingMs:Math.max(0,6000-o.elapsedMs),
      help:"Xoay MODE chọn · tự áp dụng khi hết thời gian · MENU/ESC hủy",
      note:"§1.4 · Đồng hồ chọn độc lập thời gian thế giới mô phỏng."};
  }else return null;
  return {kind:o.kind,...view,geometryGrade:"ORIGINAL_TRAINING_ESTIMATE",
    persistence:"CURRENT_DEVICE_CONTROL_NOT_SERIALIZED_SETTINGS"};
}
