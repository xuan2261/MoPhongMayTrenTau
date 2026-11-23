/**
 * Instructor-platform (D15) lesson checks. Deterministic semantic feedback,
 * NOT a manufacturer skill certificate, anti-cheat oracle or navigation tool.
 */
import {fingerprint} from "./protocol.mjs";
import {dispatch,createSession,sessionHash} from "./session.mjs";
import {TRAINING_SCENARIO} from "./scenario.mjs";
import {FCV588_ADAPTER} from "../devices/fcv588/adapter.mjs";
import {projectFcvTrainingReceiver} from "../devices/fcv588/receiver-status.mjs";
const bootDescription="Nhấn POWER ngắn, chờ khởi động 4 nhịp mô phỏng.";
export const FCV588_TRAINING_LESSONS=Object.freeze([
  Object.freeze({
    id:"FCV588-LEARN-01",titleVi:"Đặt thang đo RANGE thủ công",
    instructionVi:bootDescription+" Nhấn RANGE, chọn Manual bằng TrackPad, ENTER lưu.",
    profileId:"FCV588_PUBLIC_DEMO_UNKNOWN_FW",manualSection:"§1.5",
    sourceId:"PUB-FCV-001",hardwareValidated:false,releaseApproved:false,
    actions:[
      {kind:"press",control:"range"},
      {kind:"pad",control:"trackpad",direction:"right"},
      {kind:"press",control:"enter"},
    ],
    expectedProbes:{power:"on",rangeMode:"manual"},
    negativeCaseDescription:"MENU/ESC trước ENTER phải hủy sửa đổi phạm vi.",
  }),
  Object.freeze({
    id:"FCV588-LEARN-02",titleVi:"Chọn MODE DUAL bằng núm xoay",
    instructionVi:bootDescription+
      " Xoay núm MODE một nấc và chờ cửa sổ chọn chuyển sau khoảng 6 giây.",
    profileId:"FCV588_PUBLIC_DEMO_UNKNOWN_FW",manualSection:"§1.4",
    sourceId:"PUB-FCV-001",hardwareValidated:false,releaseApproved:false,
    actions:[{kind:"rotate",control:"mode",steps:1}],
    requiredUiElapsedMs:6000,
    expectedProbes:{power:"on",mode:"DUAL",overlay:null},
    negativeCaseDescription:"Núm xoay lần đầu chưa được đổi MODE tức thì.",
  }),
  Object.freeze({
    id:"FCV588-LEARN-03",titleVi:"Đánh dấu waypoint giả lập",
    instructionVi:bootDescription+
      " Giảng viên bật fixture vị trí tổng hợp D15 (ngoài máy FCV), rồi nhấn MARK.",
    profileId:"FCV588_PUBLIC_DEMO_UNKNOWN_FW",manualSection:"§1.20",
    sourceId:"PUB-FCV-001",hardwareValidated:false,releaseApproved:false,
    actions:[{kind:"press",control:"mark"}],
    expectedProbes:{power:"on",minimumWaypoints:1},
    negativeCaseDescription:"Khi chưa có nguồn vị trí giả lập, MARK phải hiển thị NO POSITION.",
  }),
  Object.freeze({
    id:"FCV588-LEARN-04",titleVi:"Chọn nguồn Trip không có kết nối NMEA",
    instructionVi:bootDescription+
      " Mở MENU > Data (TrackPad phải 3 lần), xuống 9 mục đến Trip Source, "+
      "ENTER, chọn NMEA rồi ENTER. Giải thích vì sao Trip dừng tăng khi "+
      "không có thiết bị nhận IEC/NMEA. Đây chỉ là bài học offline.",
    profileId:"FCV588_PUBLIC_DEMO_UNKNOWN_FW",manualSection:"§1.21",
    sourceId:"PUB-FCV-001",hardwareValidated:false,releaseApproved:false,
    actions:[
      {kind:"press",control:"menu"},
      ...Array.from({length:3},()=>({kind:"pad",control:"trackpad",direction:"right"})),
      ...Array.from({length:9},()=>({kind:"pad",control:"trackpad",direction:"down"})),
      {kind:"press",control:"enter"},
      {kind:"pad",control:"trackpad",direction:"right"},
      {kind:"press",control:"enter"},
    ],
    expectedProbes:{power:"on",tripSource:"NMEA"},
    negativeCaseDescription:"MENU/ESC khi đang chỉnh phải giữ nguyên nguồn Own; "+
      "chọn NMEA không tạo vị trí hoặc dữ liệu tốc độ thực.",
  }),
  Object.freeze({
    id:"FCV588-LEARN-05",
    titleVi:"Nhận biết Receiver Status không có nguồn",
    instructionVi:bootDescription+
      " Giảng viên để D15 Vị trí tổng hợp TẮT. Dùng MENU, TrackPad "+
      "phải 4 lần đến System, xuống 13 mục, ENTER mở Receiver Status. "+
      "Quan sát NO_TRAINING_DATA và Transport NONE; không kết nối NMEA thật.",
    profileId:"FCV588_PUBLIC_DEMO_UNKNOWN_FW",manualSection:"§4.9",
    sourceId:"PUB-FCV-001",hardwareValidated:false,releaseApproved:false,
    actions:[
      {kind:"press",control:"menu"},
      ...Array.from({length:4},()=>({kind:"pad",control:"trackpad",direction:"right"})),
      ...Array.from({length:13},()=>({kind:"pad",control:"trackpad",direction:"down"})),
      {kind:"press",control:"enter"},
    ],
    expectedProbes:{power:"on",overlayKind:"receiver-status",
      receiverStatus:"NO_TRAINING_DATA",receiverTransport:"NONE"},
    // This source-negative exercise must remain without an instructor NAV
    // fixture or virtual Tankenmaru suppression for the *whole scored attempt*.
    requiredFixtureState:{navigation:false,tankenmaruOption:false},
    negativeCaseDescription:"Bật fixture D15 vị trí tổng hợp trước bài học "+
      "phải làm trạng thái thay đổi, không thể chấm NO_TRAINING_DATA. "+
      "NMEA/IEC vật lý luôn ngắt.",
  }),
  Object.freeze({
    id:"FCV588-LEARN-06",titleVi:"Bật Key Beep trong menu System",
    instructionVi:bootDescription+
      " Bắt đầu khi Key Beep = Off và tùy chọn Tankenmaru ảo TẮT. "+
      "Nhấn MENU, TrackPad phải 4 lần tới System, xuống 15 mục đến "+
      "Key Beep, ENTER, phải chọn On, ENTER lưu. Âm chỉ là huấn luyện.",
    profileId:"FCV588_PUBLIC_DEMO_UNKNOWN_FW",manualSection:"§2.3",
    sourceId:"PUB-FCV-001",hardwareValidated:false,releaseApproved:false,
    actions:[
      {kind:"press",control:"menu"},
      ...Array.from({length:4},()=>({kind:"pad",control:"trackpad",direction:"right"})),
      ...Array.from({length:15},()=>({kind:"pad",control:"trackpad",direction:"down"})),
      {kind:"press",control:"enter"},
      {kind:"pad",control:"trackpad",direction:"right"},
      {kind:"press",control:"enter"},
    ],
    requiredInitialProbes:{keyBeep:"Off"},
    requiredFixtureState:{tankenmaruOption:false},
    expectedProbes:{power:"on",keyBeep:"On"},
    negativeCaseDescription:"MENU/ESC trước ENTER phải giữ Key Beep Off; "+
      "thao tác cũ ngoài lượt học không được tính điểm.",
  }),
  Object.freeze({
    id:"FCV588-LEARN-07",titleVi:"Chỉnh BRILL từ 9 xuống 8",
    instructionVi:bootDescription+
      " Bắt đầu khi độ sáng = 9. Nhấn ngắn POWER/BRILL lần đầu để mở "+
      "cửa sổ, nhấn ngắn lần hai để chuyển từ 9 xuống 8, ENTER lưu. "+
      "Giữ POWER hơn 3 giây sẽ tắt máy, không được tính.",
    profileId:"FCV588_PUBLIC_DEMO_UNKNOWN_FW",manualSection:"§1.3",
    sourceId:"PUB-FCV-001",hardwareValidated:false,releaseApproved:false,
    actions:[
      {kind:"down",control:"power"},{kind:"up",control:"power"},
      {kind:"down",control:"power"},{kind:"up",control:"power"},
      {kind:"press",control:"enter"},
    ],
    requiredInitialProbes:{brightness:9},
    expectedProbes:{power:"on",brightness:8,overlayKind:null},
    negativeCaseDescription:"MENU/ESC thay ENTER không được chấm; "+
      "giữ POWER dài tắt máy không phải thao tác BRILL hợp lệ.",
  }),
]);

const sameAction=(event,requirement)=>Object.entries(requirement).every(([key,value])=>
  event[key]===value);
const findInOrder=(events,required)=>{
  let from=0;
  for(const step of required){
    const index=events.findIndex((event,i)=>i>=from&&sameAction(event,step));
    if(index<0)return false;
    from=index+1;
  }
  return true;
};

const stripEnvelopeFields=event=>{
  const copy={...event};
  delete copy.schemaVersion;
  delete copy.seq;
  delete copy.tick;
  return copy;
};

export function assessFcvLesson(session,lessonId,{
  startSeq=0,baselineWaypointCount,startSessionHash,
}={}){
  const reasons=[];
  const lesson=FCV588_TRAINING_LESSONS.find(l=>l.id===lessonId);
  if(!lesson)return {passed:false,reasons:["UNKNOWN_LESSON"],
    sourceClass:"INSTRUCTOR_PLATFORM",hardwareApproved:false};
  if(!session||!Array.isArray(session.events)||!session.deviceState){
    return {passed:false,reasons:["INVALID_SESSION"],
      sourceClass:"INSTRUCTOR_PLATFORM",hardwareApproved:false};
  }
  if(!Number.isSafeInteger(startSeq) || startSeq<0 ||
      startSeq>session.events.length){
    return {passed:false,reasons:["INVALID_LESSON_BOUNDARY"],
      lessonId:lesson.id,sourceClass:"INSTRUCTOR_PLATFORM",hardwareApproved:false};
  }
  // Nonzero boundaries are only meaningful when the calling teacher proves
  // which *exact* session prefix was current at lesson start. A bare seq may
  // coincide in two unrelated sessions and must never earn course credit.
  if(startSeq>0 && (typeof startSessionHash!=="string" ||
      startSessionHash.length===0)){
    return {passed:false,reasons:["INVALID_LESSON_BOUNDARY"],
      lessonId:lesson.id,sourceClass:"INSTRUCTOR_PLATFORM",hardwareApproved:false};
  }
  if(lesson.expectedProbes.minimumWaypoints!==undefined &&
     (startSeq>0 && (!Number.isSafeInteger(baselineWaypointCount) ||
       baselineWaypointCount<0 || baselineWaypointCount>20))){
    return {passed:false,reasons:["INVALID_LESSON_BOUNDARY"],
      lessonId:lesson.id,sourceClass:"INSTRUCTOR_PLATFORM",hardwareApproved:false};
  }
  // Single-pass canonical replay verification + boundary capture + attempt audit.
  const attemptEvents=session.events.slice(startSeq);
  const gradedEvents=[];
  let replayVerified;
  let attemptInitial=null;
  let unexpectedOperatorAction=false;
  let poweredOffAction=false;
  try{
    if(!session.meta || session.deviceId!==FCV588_ADAPTER.id ||
        session.profileRevision!==FCV588_ADAPTER.revision ||
        session.scenarioId!==TRAINING_SCENARIO.id ||
        session.scenarioVersion!==TRAINING_SCENARIO.version){
      throw new Error("session contract mismatch");
    }
    let cursor=createSession(FCV588_ADAPTER,TRAINING_SCENARIO);
    if(fingerprint(session.meta)!==fingerprint(cursor.meta)){
      throw new Error("session meta mismatch");
    }
    if(startSeq===0)attemptInitial=cursor;
    for(let i=0;i<session.events.length;i++){
      const event=session.events[i];
      if(!event || typeof event!=="object" || Array.isArray(event) ||
          event.seq!==i+1 || event.tick!==cursor.worldState.simTick ||
          event.schemaVersion!==cursor.meta.schemaVersion){
        throw new Error("event sequence/clock/schema mismatch");
      }
      if(i>=startSeq){
        const studentPhysical=["press","pad","rotate","push","down","up","cancel"]
          .includes(event.kind);
        // Boot edges (including an accidental slip/cancel while still off) are
        // startup prerequisites, not scored student controls.
        const startupPower=event.control==="power" &&
          ["down","up","cancel"].includes(event.kind) &&
          cursor.deviceState.power==="off";
        if(!startupPower)gradedEvents.push(event);
        if(studentPhysical && !startupPower &&
           !lesson.actions.some(step=>sameAction(event,step))){
          unexpectedOperatorAction=true;
        }
        if(!startupPower &&
           lesson.actions.some(step=>sameAction(event,step)) &&
           cursor.deviceState.power!=="on"){
          poweredOffAction=true;
        }
      }
      cursor=dispatch(cursor,FCV588_ADAPTER,stripEnvelopeFields(event),TRAINING_SCENARIO);
      if(i+1===startSeq)attemptInitial=cursor;
    }
    replayVerified=sessionHash(cursor)===sessionHash(session);
    if(!replayVerified)attemptInitial=null;
  }catch{
    replayVerified=false;
    attemptInitial=null;
  }
  if(!replayVerified)reasons.push("REPLAY_STATE_MISMATCH");
  if(attemptInitial){
    if(startSessionHash!==undefined &&
       (typeof startSessionHash!=="string" ||
        startSessionHash!==sessionHash(attemptInitial))){
      reasons.push("LESSON_BOUNDARY_MISMATCH");
    }
    if(baselineWaypointCount!==undefined &&
       attemptInitial.deviceState.navigation.waypoints.length!==baselineWaypointCount){
      reasons.push("LESSON_WAYPOINT_BASELINE_MISMATCH");
    }
    for(const [field,value] of Object.entries(lesson.requiredInitialProbes??{})){
      const actual=field==="keyBeep"
        ?attemptInitial.deviceState.settings?.keyBeep
        :attemptInitial.deviceState[field];
      if(actual!==value)reasons.push("WRONG_INITIAL_"+field);
    }
    for(const [fixture,expected] of Object.entries(lesson.requiredFixtureState??{})){
      if(attemptInitial.deviceState.trainingFixture?.[fixture]!==expected ||
         attemptEvents.some(e=>e.kind==="training-fixture" &&
           e.fixture===fixture && e.enabled!==expected)){
        reasons.push("WRONG_TRAINING_CONTEXT");
      }
    }
    if(poweredOffAction)reasons.push("ACTION_WHILE_POWERED_OFF");
  }
  if(unexpectedOperatorAction && attemptInitial){
    reasons.push("UNEXPECTED_OPERATOR_ACTIONS");
  }
  if(!findInOrder(gradedEvents,lesson.actions))reasons.push("MISSING_REQUIRED_ACTION_SEQUENCE");
  const receiver=projectFcvTrainingReceiver(session.deviceState,
    session.worldState.simTick);
  const probes={
    power:session.deviceState.power,
    mode:session.deviceState.mode,
    overlay:session.deviceState.overlay,
    overlayKind:session.deviceState.overlay?.kind??null,
    rangeMode:session.deviceState.rangeMode,
    tripSource:session.deviceState.settings?.tripSource,
    keyBeep:session.deviceState.settings?.keyBeep,
    brightness:session.deviceState.brightness,
    minimumWaypoints:session.deviceState.navigation?.waypoints.length??0,
    receiverStatus:receiver.status,
    receiverTransport:receiver.transport,
  };
  for(const [field,value]of Object.entries(lesson.expectedProbes)){
    if(field==="minimumWaypoints"){
      const added=probes.minimumWaypoints-(baselineWaypointCount??0);
      if(added<value)reasons.push("WRONG_PROBE_"+field);
    }else if(probes[field]!==value)reasons.push("WRONG_PROBE_"+field);
  }
  if(lesson.requiredUiElapsedMs){
    const total=attemptEvents.filter(e=>e.kind==="ui-tick")
      .reduce((sum,e)=>sum+e.elapsedMs,0);
    if(total<lesson.requiredUiElapsedMs)reasons.push("UI_TIMER_NOT_OBSERVED");
  }
  return {passed:reasons.length===0,reasons,
    lessonId:lesson.id,startSeq,sourceClass:"INSTRUCTOR_PLATFORM",
    hardwareApproved:false,firmwareInstalled:null,antiCheatAuthenticated:false,
    replayVerified,publicReleaseEligible:false,
    score:reasons.length===0?1:0,
    note:"TRAINING FEEDBACK ONLY - NOT AN OEM CERTIFICATE"};
}
