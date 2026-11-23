/**
 * Original FCV configuration presentation. Reads the existing reducer and
 * source-graded field definitions; never commits, dispatches or invents defaults.
 * Layout and help are classroom artwork, not an OEM firmware/menu extract.
 */
import {FCV_RANGE_BANK_FIELDS,FCV_NAV_BOX_OPTIONS,FCV_NAV_BOX_DEFAULTS,
  FCV_FISH_ALARM_FIELDS,FCV_FUNC_TARGETS,getInstallationMenu} from
  "../src/devices/fcv588/menu-atlas.mjs";
import {FCV_UNIT_FIELDS,formatFcvDepth} from "../src/devices/fcv588/units.mjs";
import {FCV_CALIBRATION_FIELDS} from "../src/devices/fcv588/calibration.mjs";
import {
  projectFcvChoiceWindow,
  projectFcvAlarmPresentation,
  isVietnameseFcv,
  localizeFcvCategory,
  localizeFcvMenuLabel,
  localizeFcvChoiceValue,
} from "./lcd-presentation.mjs";

export const FCV_CONFIGURATION_KINDS=Object.freeze([
  "range-bank","units","calibration","nav-boxes","fish-alarm",
  "fish-alarm-setting","installation","func-program",
]);
const alarmKey=(n,key)=>"alarm"+n+key[0].toUpperCase()+key.slice(1);
const storedValue=(settings,key)=>typeof settings[key]==="string"?settings[key]:null;
const textValue=value=>value===null?"--":value;

function alarmStatus(state,n){
  const id="ALARM"+n;
  const display=projectFcvAlarmPresentation(state);
  const enabled=storedValue(state.settings,"alarm"+n);
  const active=display.snapshotAvailable && ["Off","On"].includes(enabled)
    ?display.activeIds.includes(id):null;
  const acknowledged=active===true?display.acknowledgedIds.includes(id):false;
  return {id,enabled,active,acknowledged};
}

/** Deliberately FCV-specific: each list comes from its actual existing owner. */
function configurationSpec(state){
  const o=state.overlay;
  switch(o.kind){
    case "range-bank":
      return {title:"RANGE BANK",path:"System > Range Presets",
        fields:FCV_RANGE_BANK_FIELDS,
        format:value=>value===null?textValue(value):formatFcvDepth(Number(value),state.settings.units??"Metric",0),
        note:"§2.2 · 8 dải lớp học; giới hạn OEM chưa xác minh."};
    case "units":
      return {title:"UNITS",path:"System > Units",
        fields:FCV_UNIT_FIELDS,note:"§2.5 · Depth HR/pb: SOURCE GAP; chỉ đổi hiển thị."};
    case "calibration":
      return {title:"CALIBRATION",path:"System > Calibration",
        fields:FCV_CALIBRATION_FIELDS,
        note:"§2.6 · Giá trị lớp học, không hiệu chuẩn đầu dò thực."};
    case "nav-boxes": {
      if(!Object.hasOwn(FCV_NAV_BOX_DEFAULTS,o.mode))return null;
      const fields=FCV_NAV_BOX_DEFAULTS[o.mode].map((_,i)=>({
        key:o.mode.toLowerCase()+"Box"+(i+1),label:"Box "+(i+1),
        choices:i<2?FCV_NAV_BOX_OPTIONS.filter(value=>value!=="Off"):FCV_NAV_BOX_OPTIONS,
        sourceStatus:"CURATED_REFERENCE_NOT_HARDWARE_VERIFIED",
      }));
      return {title:o.mode+" DATA BOXES",path:"Data > "+o.mode,
        fields,note:"§1.21 · Thiếu nguồn: NO DATA; không có receiver thực."};
    }
    case "fish-alarm":
    case "fish-alarm-setting": {
      const n=o.profileIndex;
      if(!Number.isInteger(n) || n<1 || n>5)return null;
      const profileStatus=alarmStatus(state,n);
      const fields=o.kind==="fish-alarm"?[
        {key:"alarm"+n+".setting",label:"Setting",choices:null},
        {key:"alarm"+n,label:"Alarm",choices:["Off","On"]},
      ]:FCV_FISH_ALARM_FIELDS.map(field=>({...field,key:alarmKey(n,field.key)}));
      const cause=profileStatus.active===null?"CAUSE UNKNOWN":
        profileStatus.active?"ACTIVE · "+(profileStatus.acknowledged?"ACK":"UNACKNOWLEDGED"):
          "INACTIVE";
      return {title:"ALARM"+n+(o.kind==="fish-alarm"?"":" / SETTING"),
        path:"Alarm > ALARM"+n,fields,profileStatus,
        note:"§1.18 · "+profileStatus.id+": "+(profileStatus.enabled??"?")+" · "+cause+" · SIM"};
    }
    case "installation":
      return {title:"INSTALLATION",path:"System > Installation",
        fields:getInstallationMenu(state).map(field=>({...field,key:field.settingKey})),
        note:"§4.10 · Cấu hình ảo; không mở NMEA/RF thực."};
    case "func-program":
      return {title:"FUNC Key · ASSIGN",path:"FUNC > Assignment",selectionOnly:true,
        fields:FCV_FUNC_TARGETS.map(target=>({
          key:target.entryId,label:target.label,choices:null,
          sourceStatus:"CURATED_REFERENCE_NOT_HARDWARE_VERIFIED",
        })),note:"§1.19 · Gán phím lớp học; ngưỡng giữ còn provisional."};
    default:return null;
  }
}

/** Project current fields, draft choices and cause/ack state without owning any. */
export function projectFcvConfiguration(state){
  const o=state?.overlay;
  if(state?.power!=="on" || !o || !FCV_CONFIGURATION_KINDS.includes(o.kind) ||
      !state.settings || typeof state.settings!=="object" || Array.isArray(state.settings) ||
      !Number.isInteger(o.itemIndex))return null;
  const spec=configurationSpec(state);
  const active=spec?.fields[o.itemIndex];
  if(!active)return null;
  const vi=isVietnameseFcv(state);
  const baseFormat=spec.format??textValue;
  const formatFor=(fieldKey,val)=>{
    if(val===null)return "--";
    if(spec.format)return spec.format(val);
    return vi?localizeFcvChoiceValue(fieldKey,val,state.settings):baseFormat(val);
  };
  const labelFor=field=>vi
    ?localizeFcvMenuLabel(field.key,field.label,state.settings)
    :field.label;
  const editing=o.editing===true && !active.disabled;
  if(editing && (!Array.isArray(active.choices) ||
      !active.choices.includes(o.draftValue)))return null;
  const committedValue=storedValue(state.settings,active.key);
  const editor=editing?{title:labelFor(active),fieldKey:active.key,
    ...projectFcvChoiceWindow(active.choices,o.draftValue)}:null;
  if(editor)editor.choices=editor.choices.map(choice=>({
    ...choice,text:formatFor(active.key,choice.value),
  }));
  const transaction=spec.selectionOnly?{
    fieldKey:"keySetup",committedValue:storedValue(state.settings,"keySetup"),
    draftValue:active.label,
    committedText:formatFor("keySetup",storedValue(state.settings,"keySetup")),
    draftText:labelFor(active),
  }:editing?{
    fieldKey:active.key,committedValue,draftValue:o.draftValue,
    committedText:formatFor(active.key,committedValue),
    draftText:formatFor(active.key,o.draftValue),
  }:null;
  const rows=spec.fields.map((field,index)=>{
    const selected=index===o.itemIndex;
    const value=selected && editing?o.draftValue:storedValue(state.settings,field.key);
    return {fieldKey:field.key,selected,disabled:field.disabled===true,
      sourceStatus:field.sourceStatus??"CURATED_REFERENCE_NOT_HARDWARE_VERIFIED",
      text:(selected?"▶ ":"  ")+labelFor(field)+
        (field.choices?" : "+formatFor(field.key,value):"")};
  });
  const reason=active.disabled?active.disabledReason??"SOURCE_GAP":null;
  const title=vi?localizeFcvCategory(spec.title,state.settings):spec.title;
  return {kind:o.kind,title,path:spec.path,rows,editor,transaction,
    profileStatus:spec.profileStatus??null,
    help:spec.selectionOnly?"▲/▼ chọn · ENTER gán · MENU/ESC hủy":
      editing?"◀/▶ chọn · ENTER lưu · MENU/ESC hủy":
        "▲/▼ mục · ENTER mở · MENU/ESC trở lại",
    note:reason?"HOLD · "+reason:spec.note,
    geometryGrade:"ORIGINAL_REFERENCE_ESTIMATE",hardwareValidated:false};
}
