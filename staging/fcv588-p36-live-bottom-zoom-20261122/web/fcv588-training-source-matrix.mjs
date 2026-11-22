/**
 * V35 STAGING: D15 instructor-only readback of C11/D09/D14 guard conditions.
 *
 * This is neither a new FCV-588 menu nor an NMEA/sonar/RF receiver. It reads
 * the existing immutable classroom state and can never dispatch a device
 * event, grant an optional partner display or claim installed firmware.
 * All user-facing training descriptions belong OUTSIDE the equipment face.
 */
import {projectFcvTrainingReceiver} from
  "../src/devices/fcv588/receiver-status.mjs";
import {projectFcvTankenmaruTrainingStatus} from
  "../src/devices/fcv588/tankenmaru-status.mjs";
import {isValidSyntheticPosition} from
  "../src/devices/fcv588/navigation.mjs";

const SOURCE_LABELS=Object.freeze({
  SYNTHETIC_TRAINING_OBSERVATION:"Mẫu Own giả lập còn hiệu lực",
  STALE_TRAINING_DATA:"Mẫu Own giả lập đã hết hạn",
  NO_TRAINING_DATA:"Không có mẫu Own hợp lệ",
  INACTIVE_TANKENMARU:"Nguồn ảo bị Tankenmaru loại trừ",
  SYNTHETIC_OWN:"Own tổng hợp",
  NO_EXTERNAL_RECEIVER:"NMEA không có đầu thu",
  VIRTUAL_OPTION_REFERENCE:"Giá trị tham khảo tùy chọn ảo",
  SOURCE_GAP_OPTION_NOT_ACTIVE:"Tùy chọn ảo chưa hoạt động"
});
const PRESENTATION_STATES=Object.freeze({
  DEVICE_OFF:"Thiết bị mô phỏng đang tắt",
  INVALID_DESTINATION:"Điểm đích không hợp lệ",
  NO_DESTINATION:"Chưa chọn điểm đích",
  SYNTHETIC_DESTINATION_READY:"Điểm đích có nguồn Own giả lập hợp lệ",
  DESTINATION_WAITING_SOURCE:"Điểm đích thiếu dữ liệu hợp lệ",
  NO_VIRTUAL_OPTION:"Không có tùy chọn ảo",
  DECLARED_BUT_OFF:"Tùy chọn ảo chưa bật",
  VIRTUAL_OPTION_REFERENCE:"Tùy chọn ảo đang bật",
  MISSING_VIRTUAL_ENTITLEMENT:"Cấu hình tùy chọn không nhất quán",
  SYNTHETIC_TRAINING_OBSERVATION:"Nguồn Own giả lập còn hiệu lực",
  STALE_TRAINING_DATA:"Nguồn Own giả lập đã hết hạn",
  NO_TRAINING_DATA:"Chưa có dữ liệu Own hợp lệ",
  INACTIVE_TANKENMARU:"Nguồn ảo đang bị loại trừ"
});

const label=value=>SOURCE_LABELS[value]??"Trạng thái chưa được đối chứng";
const row=(id,title,status,summary,details)=>Object.freeze({
  id,title,status,
  statusText:PRESENTATION_STATES[status]??"Trạng thái chưa được đối chứng",
  summary,details
});
const countDestinations=nav=>Array.isArray(nav?.waypoints)?
  nav.waypoints.filter(w=>w && typeof w==="object").length:0;
const selectedWaypoint=nav=>{
  if(!Array.isArray(nav?.waypoints) || typeof nav?.destinationId!=="string")
    return null;
  const wp=nav.waypoints.find(w=>w?.id===nav.destinationId);
  return wp && isValidSyntheticPosition(wp.position)?wp:null;
};
const sourceNames=Object.freeze({
  speed:{name:"Speed",key:"speedStatus"},
  temperature:{name:"Temp",key:"tempStatus"},
  trip:{name:"Trip",key:"tripStatus"},
});

/**
 * Present exactly the existing reducer's source/option state, never simulate
 * a successful external receive or a true OEM ETA. The 10-tick TTL belongs
 * to the existing typed receiver projector, not to a new timer here.
 */
export function projectFcvInstructorSourceMatrix(state,simTick=0){
  const on=state?.power==="on";
  const settings=state?.settings??{};
  const fixture=state?.trainingFixture??{};
  const nav=state?.navigation??{};
  const receiver=projectFcvTrainingReceiver(state,simTick);
  const option=projectFcvTankenmaruTrainingStatus(state);
  const waypoint=selectedWaypoint(nav);
  const count=countDestinations(nav);
  const invalidDestination=nav.destinationId!==null &&
    nav.destinationId!==undefined && !waypoint;
  const sample=state?.navigationObservation;
  const observed=sample?.observedAtTick;
  const age=Number.isInteger(simTick) && Number.isInteger(observed) &&
    simTick>=observed?simTick-observed:null;
  const hasFreshOwn=on && receiver.status==="SYNTHETIC_TRAINING_OBSERVATION";
  const navStatus=!on?"DEVICE_OFF":invalidDestination?"INVALID_DESTINATION":
    !waypoint?"NO_DESTINATION":hasFreshOwn?"SYNTHETIC_DESTINATION_READY":
      "DESTINATION_WAITING_SOURCE";
  const navName=waypoint?waypoint.id+
    (typeof waypoint.name==="string"?" · "+waypoint.name:""):"NO DATA";
  const c11=row("C11","NAV / Waypoint giả lập",navStatus,
    !on?"LCD chưa bật, không có dữ liệu điều hướng hiện hành.":
    invalidDestination?"Điểm đích không còn khớp waypoint hợp lệ; giữ NO DATA.":
    !waypoint?"Chưa chọn waypoint đích; không suy ra quãng đường/ETA.":
    "Điểm đích: "+navName+" · "+label(receiver.status)+".",
    "Waypoint: "+count+"/20 (bài tập) · "+
      (age===null?"Tuổi mẫu: không xác định":"Tuổi mẫu Own: "+age+" tick")+
      ". Không có GPS tàu; TIME TO GO tính thử không phải ETA OEM.");

  const declared=fixture.tankenmaruOption===true;
  const savedOn=settings.tankenmaru==="On";
  const virtualActive=declared && savedOn &&
    option.status==="VIRTUAL_OPTION_REFERENCE";
  const optionStatus=savedOn && !declared?"MISSING_VIRTUAL_ENTITLEMENT":
    virtualActive?"VIRTUAL_OPTION_REFERENCE":declared?
      "DECLARED_BUT_OFF":"NO_VIRTUAL_OPTION";
  const d09=row("D09","Tankenmaru ảo",optionStatus,
    savedOn && !declared
      ?"Cấu hình On không có quyền ảo: từ chối suy diễn phần cứng."
      :virtualActive?"Tùy chọn được bật trong lớp học; NMEA bị loại trừ."
      :declared?"Đã khai báo tùy chọn ảo nhưng đang Off."
      :"Không khai báo tùy chọn ảo; không có quyền phần cứng.",
    (virtualActive?"NMEA không khả dụng trong menu giả lập.":
      "Chưa kích hoạt truyền nhận tùy chọn.")+
      " Không phát RF, không có màn hình Tankenmaru ngoài.");

  const selected=receiver.selectedSources??{};
  const channels=Object.entries(sourceNames).map(([key,info])=>{
    const value=selected[key]??settings[key+"Source"]??"Own";
    return info.name+": "+value+" — "+label(selected[info.key]);
  });
  const d14=row("D14","Nguồn dữ liệu nhận ảo",
    !on?"DEVICE_OFF":receiver.status,
    !on?"Màn hình tắt; đầu thu thực chưa từng kết nối.":
      "Receiver: "+label(receiver.status)+
      (hasFreshOwn?" · Vị trí Own tổng hợp":" · Vị trí: NO DATA")+".",
    channels.join(" · ")+
      " · NMEA vật lý: OFF; Transport: NONE. "+
      "Không có dữ liệu GPS/NMEA tàu.");

  return Object.freeze({
    sourceClass:"D15_INSTRUCTOR_SYNTHETIC_STATUS_ONLY",
    hardwareValidated:false,
    physicalTransport:"NONE",
    revisionScope:"FCV-588 PUBLIC_REFERENCE",
    simTick:Number.isInteger(simTick)?simTick:null,
    rows:Object.freeze([c11,d09,d14])
  });
}

/**
 * Discrete assistive announcement only for actual source-status transitions.
 * Ordinary simulation ticks may change displayed sample age; they must not
 * repeatedly announce the entire read-only matrix. Initial load is silent.
 */
export function projectFcvInstructorSourceTransition(previousRows,currentRows){
  if(!Array.isArray(previousRows) || !Array.isArray(currentRows) ||
      previousRows.length!==3 || currentRows.length!==3)return null;
  const previous=new Map(previousRows.map(r=>[r?.id,r?.status]));
  if(previous.size!==3)return null;
  const changes=currentRows.filter(row=>row && previous.has(row.id) &&
    typeof row.status==="string" && row.status!==previous.get(row.id));
  if(!changes.length)return null;
  return Object.freeze({
    text:changes.map(row=>row.id+": "+row.statusText).join(". ")+".",
    statuses:Object.freeze(changes.map(row=>row.id+":"+row.status))
  });
}
