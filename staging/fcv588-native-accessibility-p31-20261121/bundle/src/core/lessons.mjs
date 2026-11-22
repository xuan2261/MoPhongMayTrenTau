/**
 * Instructor-platform (D15) lesson checks. Deterministic semantic feedback,
 * NOT a manufacturer skill certificate, anti-cheat oracle or navigation tool.
 */
import {replay,dispatch,createSession,createReplayEnvelope,sessionHash} from "./session.mjs";
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
    // fixture for the *whole scored attempt*, not only at the final screen.
    requiredFixtureState:{navigation:false},
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
       baselineWaypointCount<0 ||
       baselineWaypointCount>session.deviceState.navigation?.waypoints.length))){
    return {passed:false,reasons:["INVALID_LESSON_BOUNDARY"],
      lessonId:lesson.id,sourceClass:"INSTRUCTOR_PLATFORM",hardwareApproved:false};
  }
  // An instructor must start a new attempt: historical actions and clock
  // advances from another lesson never count toward this attempt.
  const attemptEvents=session.events.filter(event=>event.seq>startSeq);
  let replayVerified=false;
  let attemptInitial=null;
  let unexpectedOperatorAction=false;
  try{
    const envelope=createReplayEnvelope(session);
    replayVerified=sessionHash(replay(FCV588_ADAPTER,TRAINING_SCENARIO,
      envelope))===sessionHash(session);
    if(replayVerified){
      // Reconstruct an independent *shortened* canonical session to obtain
      // its own expected final state hash. Never tamper with a full envelope's
      // event list and silently reuse its final-state acceptance signature.
      let prefixSession=createSession(FCV588_ADAPTER,TRAINING_SCENARIO);
      for(const event of session.events.slice(0,startSeq)){
        const {schemaVersion,seq,tick,...input}=event;
        prefixSession=dispatch(prefixSession,FCV588_ADAPTER,input,TRAINING_SCENARIO);
      }
      attemptInitial=replay(FCV588_ADAPTER,TRAINING_SCENARIO,
        createReplayEnvelope(prefixSession));
    }
  }catch{
    replayVerified=false;
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
    // Repeating a complete and valid exercise is legitimate practice even
    // if the target setting is already selected. Grade actions and their
    // power context, never just a changed final field.
    let atEvent=attemptInitial;
    for(const event of attemptEvents){
      const studentPhysical=["press","pad","rotate","push","down","up","cancel"]
        .includes(event.kind);
      // Boot edges are startup prerequisites, not scored student controls.
      // They may occur inside an attempt opened before power-on. Do not exempt
      // hold-capable FUNC or later POWER input while already operating.
      const startupPower=event.control==="power" &&
        ["down","up"].includes(event.kind) &&
        atEvent.deviceState.power==="off";
      if(studentPhysical && !startupPower &&
         !lesson.actions.some(step=>sameAction(event,step))){
        unexpectedOperatorAction=true;
      }
      if(lesson.actions.some(step=>sameAction(event,step)) &&
         atEvent.deviceState.power!=="on" &&
         !reasons.includes("ACTION_WHILE_POWERED_OFF")){
        reasons.push("ACTION_WHILE_POWERED_OFF");
      }
      const {schemaVersion,seq,tick,...input}=event;
      atEvent=dispatch(atEvent,FCV588_ADAPTER,input,TRAINING_SCENARIO);
    }
  }
  // Scored operator actions must belong to the lesson's prescribed sequence.
  // Exact retries of a lesson action are allowed (a student can retry MARK
  // after the teacher enables the location fixture), but unrelated physical
  // controls do not silently earn credit from the final probe alone. World/UI
  // ticks, POWER boot edges and teacher fixture changes are not graded actions.
  if(unexpectedOperatorAction){
    reasons.push("UNEXPECTED_OPERATOR_ACTIONS");
  }
  if(!findInOrder(attemptEvents,lesson.actions))reasons.push("MISSING_REQUIRED_ACTION_SEQUENCE");
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
      // A historical waypoint may remain on the device, but it cannot satisfy
      // a new attempt merely because the student pressed MARK without data.
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
