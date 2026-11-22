import {TRAINING_SCENARIO, observeSounder, makeEchoFrame, effectiveRangeM} from "../src/core/scenario.mjs";
import {createSession, dispatch, replay, createReplayEnvelope, reset, sessionHash} from "../src/core/session.mjs";
import {FCV588_ADAPTER} from "../src/devices/fcv588/adapter.mjs";
import {DISPLAY_MODES} from "../src/devices/fcv588/model.mjs";
import {FCV_FUNC_TARGETS,FCV_FISH_ALARM_FIELDS,FCV_RANGE_BANK_FIELDS,
  FCV_NAV_BOX_DEFAULTS,getFcvMenuItems,getInstallationMenu} from
  "../src/devices/fcv588/menu-atlas.mjs";
import {projectFcvEcho, projectFcvZoom, projectFcvAScope, projectFcvBottomDiscrimination, projectFcvBottomZone, advanceFcvPictureHistory, depthFractionOnFcvFrame, shouldRenderFcvSonar} from "../src/devices/fcv588/echo-projection.mjs";
import {projectNavData,projectFcvManualNavBoxes,
  projectFcvTravelValues} from "../src/devices/fcv588/navigation.mjs";
import {planFcvScreenLayout} from "../src/devices/fcv588/display-layout.mjs";
import {projectFcvDisplayWidgets,projectFcvZoomWindowMarker} from
  "../src/devices/fcv588/display-widgets.mjs";
import {FCV_CALIBRATION_FIELDS,projectFcvCalibratedReadings} from
  "../src/devices/fcv588/calibration.mjs";
import {projectFcvTrainingReceiver} from
  "../src/devices/fcv588/receiver-status.mjs";
import {projectFcvTankenmaruTrainingStatus} from
  "../src/devices/fcv588/tankenmaru-status.mjs";
import {projectFcvTrainingFaults} from "../src/devices/fcv588/training-faults.mjs";
import {FCV588_TRAINING_LESSONS, assessFcvLesson} from "../src/core/lessons.mjs";
import {FCV_SETTINGS_STORAGE_KEY, decodeFcvSettings, encodeFcvSettings} from "../src/devices/fcv588/settings.mjs";
import {FCV_UNIT_FIELDS,convertFcvDepth,formatFcvDepth,
  formatFcvTemperature,formatFcvFishSize,formatFcvDistance} from
  "../src/devices/fcv588/units.mjs";
import {getFcvDisplayPalette,getFcvLcdContrastTheme} from
  "../src/devices/fcv588/display-palette.mjs";
import {bindHoldControl} from "./hold-input.mjs";
import {bindRepeatPadControl} from "./pad-repeat.mjs";
import {bindRotaryDragControl} from "./rotary-input.mjs";
import {shouldPlayFcvKeyTone,createFcvKeyTonePlayer} from "./key-feedback.mjs";
import {shouldRouteFcvShortcut} from "./keyboard-shortcuts.mjs";
import {projectFcvLcdPresentation,projectFcvMainMenu} from "./lcd-presentation.mjs";

const adapter = FCV588_ADAPTER;
const playKeyTone=createFcvKeyTonePlayer();
const $ = id => document.getElementById(id);
const scenario = TRAINING_SCENARIO;
let session = createSession(adapter, scenario);
let paused = false;
let cachedTick = -1;
let cachedObservation;
let lastObservedSettings = encodeFcvSettings(session.deviceState.settings);
const frozenFrames = new Map();
const canvas = $("echo-canvas");
const ctx = canvas.getContext("2d", {alpha: false});
const displayCanvas = document.createElement("canvas");
const displayCtx = displayCanvas.getContext("2d", {alpha: false});

// Local configuration is not a replay or live-device session. Only menu
// settings are persisted, never world time, active alarms, waypoints or inputs.
// A schema/profile mismatch is rejected by the codec before entering the
// canonical event log. Storage can be unavailable in privacy-restricted tabs.
function restoreSettingsOnReload() {
  let raw;
  try {
    raw = localStorage.getItem(FCV_SETTINGS_STORAGE_KEY);
  } catch {
    return "Local storage không khả dụng; chạy với cấu hình mặc định.";
  }
  if (raw === null) return "";
  const settings = decodeFcvSettings(raw);
  if (!settings) {
    return "Cấu hình lưu không hợp lệ/khác phiên bản; đã bỏ qua, không dùng cấu hình cũ.";
  }
  try {
    session = dispatch(session, adapter, {kind: "restore-settings", settings}, scenario);
    lastObservedSettings = encodeFcvSettings(session.deviceState.settings);
    return "Đã khôi phục cấu hình LOCAL qua sự kiện replay; thiết bị vẫn tắt.";
  } catch {
    return "Không thể khôi phục cấu hình LOCAL; đã giữ cấu hình mặc định.";
  }
}

function persistSettingsAfterChange() {
  const encoded = encodeFcvSettings(session.deviceState.settings);
  if (encoded === lastObservedSettings) return;
  // Avoid writing on every UI/world tick, including when storage is blocked.
  lastObservedSettings = encoded;
  try {
    localStorage.setItem(FCV_SETTINGS_STORAGE_KEY, encoded);
  } catch {
    $("validation-status").textContent =
      "Không thể lưu cấu hình trong trình duyệt; trạng thái hiện tại vẫn hoạt động.";
  }
}

function observation() {
  if (cachedTick !== session.worldState.simTick) {
    cachedTick = session.worldState.simTick;
    cachedObservation = observeSounder(scenario, session.worldState, {columns: 160, rows: 301});
  }
  return cachedObservation;
}

function send(input) {
  try {
    const priorSonar=shouldRenderFcvSonar(session.deviceState);
    session = dispatch(session, adapter, input, scenario);
    if(shouldPlayFcvKeyTone(session.deviceState,input))playKeyTone();
    if(priorSonar!==shouldRenderFcvSonar(session.deviceState))frozenFrames.clear();
    persistSettingsAfterChange();
    render();
  } catch (err) {
    $("validation-status").textContent = "Lỗi input đã chặn: " + err.message;
  }
}

const lcdRgb=components=>"rgb("+components.join(",")+")";
function drawChannel(frame, x0, y0, w, h) {
  const palette=getFcvDisplayPalette(session.deviceState.settings);
  const contrast=getFcvLcdContrastTheme(session.deviceState.settings);
  displayCanvas.width = frame.columns;
  displayCanvas.height = frame.rows;
  const pixels = displayCtx.createImageData(frame.columns, frame.rows);
  for (let i = 0; i < frame.pixels.length; i++) {
    const value = frame.pixels[i];
    const level = Math.min(palette.length - 1, Math.floor(value / 256 * palette.length));
    const color = palette[level];
    const j = i * 4;
    pixels.data[j] = color[0];
    pixels.data[j + 1] = color[1];
    pixels.data[j + 2] = color[2];
    pixels.data[j + 3] = 255;
  }
  displayCtx.putImageData(pixels, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(displayCanvas, x0, y0, w, h);
  ctx.fillStyle = lcdRgb(contrast.foreground);
  ctx.font = "bold 15px Consolas, monospace";
  ctx.fillText(String(frame.frequencyKhz) + " kHz", x0 + 8, y0 + 43);
  ctx.font = "12px Consolas, monospace";
  const units=session.deviceState.settings.units;
  const start=frame.startDepthM??0;
  ctx.fillText(formatFcvDepth(start,units,0),x0+w-45,y0+22);
  ctx.fillText(formatFcvDepth(start+frame.rangeM/2,units,0),x0+w-48,y0+h/2);
  ctx.fillText(formatFcvDepth(start+frame.rangeM,units,0),x0+w-48,y0+h-12);
  if(session.deviceState.settings.colorBar==="On"){
    // Original classroom legend; color choices are not calibrated OEM assets.
    const bandWidth=Math.min(w-18,Math.max(80,palette.length*10));
    const sampleWidth=bandWidth/palette.length;
    for(let i=0;i<palette.length;i++){
      const [r,g,b]=palette[i];
      ctx.fillStyle=`rgb(${r},${g},${b})`;
      ctx.fillRect(x0+9+i*sampleWidth,y0+h-27,sampleWidth+0.4,8);
    }
  }
}

function sounderFrame(observation, state, frequencyKhz, zoom = false) {
  const key = frequencyKhz + (zoom ? "-zoom" : "-regular");
  const candidate = zoom
    ? projectFcvZoom(observation, state, {frequencyKhz})
    : projectFcvEcho(observation, state, {frequencyKhz});
  const frame = advanceFcvPictureHistory(frozenFrames.get(key), candidate,
    state, observation.simTick);
  frozenFrames.set(key, frame);
  return frame;
}

function drawSourceGradedOverlays(frame, x0, y0, w, h, bottomDepthM) {
  const zone=projectFcvBottomZone(frame,bottomDepthM,
    frame.overlays?.bottomZone??"Standard");
  if(zone){
    ctx.fillStyle="#7adab522";
    ctx.fillRect(x0,y0+zone.topFraction*h,w,
      (zone.bottomFraction-zone.topFraction)*h);
    ctx.strokeStyle="#8dd4ac77";
    ctx.strokeRect(x0+0.5,y0+zone.topFraction*h,w-1,
      Math.max(1,(zone.bottomFraction-zone.topFraction)*h));
  }
  if (frame.overlays?.whiteLine) {
    const fraction=depthFractionOnFcvFrame(frame,bottomDepthM);
    if(fraction>=0 && fraction<=1){
      ctx.fillStyle = "#f2ffff";
      ctx.fillRect(x0,y0+fraction*h,w,3);
    }
  }
  if (frame.overlays?.aScope) {
    const scope=projectFcvAScope(frame);
    const band = Math.min(36, w / 5);
    ctx.fillStyle = "#061e30aa";
    ctx.fillRect(x0 + w - band, y0, band, h);
    for (let y = 0; y < frame.rows; y += 3) {
      const strength=scope[y]/255;
      ctx.fillStyle=frame.overlays.aScopeMode==="Peak"?"#ffe09e":"#d9f0fe";
      ctx.fillRect(x0 + w - band, y0 + y / frame.rows * h,
        strength * (band - 3), 2);
    }
  }
  if (frame.overlays?.bottomDiscrimination) {
    const bottom=projectFcvBottomDiscrimination(frame);
    const width=Math.max(85,w-18);
    const panelTop=y0+h-109;
    ctx.fillStyle="#06192fe0";
    ctx.fillRect(x0+9,panelTop,width,96);
    ctx.fillStyle="#e9f2bb";
    ctx.font="bold 11px Consolas, monospace";
    ctx.fillText("BOTTOM TYPE · SIMULATED "+(bottom?.mode??""),
      x0+15,panelTop+16);
    if(bottom?.status==="SYNTHETIC_ONLY"){
      const tones=["#677875","#d0c18a","#8a8c86","#c9ad80"];
      if(bottom.mode==="Probability"){
        const barWidth=Math.max(35,width-126);
        bottom.values.forEach((entry,i)=>{
          const yy=panelTop+29+i*15;
          ctx.fillStyle="#e8edf3";
          ctx.font="10px Consolas, monospace";
          ctx.fillText(entry.label,x0+15,yy+3);
          ctx.fillStyle=tones[i];
          ctx.fillRect(x0+71,yy-8,barWidth*entry.weight,9);
          ctx.fillStyle="#e8edf3";
          ctx.fillText((entry.weight*100).toFixed(0)+"%",
            x0+76+barWidth,yy+2);
        });
      }else{
        let x=x0+16;
        const barWidth=width-15;
        bottom.values.forEach((entry,i)=>{
          const band=barWidth*entry.weight;
          ctx.fillStyle=tones[i];
          ctx.fillRect(x,panelTop+32,band,25);
          x+=band;
        });
        ctx.fillStyle="#e9f2bb";
        ctx.font="10px Consolas, monospace";
        ctx.fillText("CLASS: "+bottom.dominantType+
          " · SYNTHETIC FIXTURE",x0+16,panelTop+79);
      }
    }else{
      ctx.fillStyle="#d9e2e9";
      ctx.font="11px Consolas, monospace";
      ctx.fillText("NO CLASSIFICATION DATA",x0+16,panelTop+47);
    }
  }
  if (frame.overlays?.accuFish) {
    ctx.fillStyle = "#d4f1a8";
    ctx.font = "bold 12px Consolas, monospace";
    ctx.fillText("FISH SIZE · SYNTHETIC", x0 + 9, y0 + h - 44);
    if(frame.overlays.fishSymbol!=="Off"){
      const large=frame.overlays.fishSize==="Large";
      for(const fish of frame.syntheticFish??[]){
        const xx=x0+fish.xFraction*w;
        const yy=y0+fish.yFraction*h;
        const sz=large?7:5;
        ctx.fillStyle="#e7e9a4";
        ctx.beginPath();
        if(frame.overlays.fishSymbol==="Circle"){
          ctx.arc(xx,yy,sz,0,Math.PI*2);
        }else{
          // Independently drawn training icon; no OEM fish imagery.
          ctx.ellipse(xx,yy,sz*1.55,sz,0,0,Math.PI*2);
        }
        ctx.fill();
        ctx.font="bold 10px Consolas, monospace";
        ctx.fillStyle="#fff2c2";
        ctx.fillText(formatFcvFishSize(fish.sizeCm,
          session.deviceState.settings.fishSizeUnit)+" SIM",
          Math.max(x0+8,Math.min(x0+w-88,xx+10)),
          Math.max(y0+28,yy-8));
      }
    }
  }
  if (frame.overlays?.rezBoost) {
    ctx.fillStyle = "#f8d290";
    ctx.font = "bold 12px Consolas, monospace";
    ctx.fillText("REZBOOST · TRAINING", x0 + 9, y0 + 61);
  }
}
const clampUi = (v,lo,hi) => Math.max(lo,Math.min(hi,v));

function drawSupplementaryDisplay(state,simTick,width,height){
  // All values are typed instructor/synthetic projections, never live feeds.
  const {tempGraph,navData,battery}=projectFcvDisplayWidgets(state,
    state.navigationObservation,simTick);
  if(navData){
    const x=width-217,y=145;
    ctx.fillStyle="#071b32e0";
    ctx.fillRect(x,y,208,navData.boxes.length*28+22);
    ctx.fillStyle="#fed996";
    ctx.font="bold 11px Consolas, monospace";
    ctx.fillText("NAV DATA · "+navData.status,x+7,y+15);
    ctx.font="11px Consolas, monospace";
    for(const [i,box] of navData.boxes.entries()){
      ctx.fillStyle="#b2d5e4";
      ctx.fillText(box.label+": "+box.value,x+7,y+35+i*28,194);
    }
  }
  if(tempGraph){
    const x=12,y=height-111,w=176,h=84;
    ctx.fillStyle="#06182cdc";
    ctx.fillRect(x,y,w,h);
    ctx.fillStyle="#c6ebf0";
    ctx.font="11px Consolas, monospace";
    if(tempGraph.status!=="SYNTHETIC_DATA"){
      ctx.fillText("TEMP GRAPH · NO DATA",x+8,y+20);
    }else{
      ctx.fillText("TEMP "+formatFcvTemperature(tempGraph.currentC,
        state.settings.tempUnit)+" · SIM",x+8,y+17);
      ctx.strokeStyle="#ffda89";
      ctx.lineWidth=2;
      ctx.beginPath();
      tempGraph.samples.forEach((sample,i)=>{
        const xx=x+8+i/(tempGraph.samples.length-1)*(w-17);
        const yy=y+51-(sample-tempGraph.currentC)/
          tempGraph.scaleSpanC*44;
        if(i===0)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy);
      });
      ctx.stroke();
      ctx.fillStyle="#83adba";
      ctx.fillText("INSTRUCTOR FIXTURE ONLY",x+8,y+75);
    }
  }
  if(battery){
    ctx.fillStyle="#ffdda3";
    ctx.font="bold 11px Consolas, monospace";
    ctx.fillText(battery.label,width-190,42,184);
  }
}

function renderScreen() {
  const state = session.deviceState;
  const {width, height} = canvas;
  const sonarAvailable=shouldRenderFcvSonar(state);
  const contrast=getFcvLcdContrastTheme(state.settings);
  // Original presentation approximation: brightness changes LCD pixels and
  // overlays only, never the synthetic sonar observation or replay inputs.
  const presentation=projectFcvLcdPresentation(state);
  const {luminance,testPattern}=presentation;
  $("lcd").style.filter = "brightness("+luminance+")";
  $("lcd").style.setProperty("--fcv-lcd-foreground",lcdRgb(contrast.foreground));
  $("lcd").style.setProperty("--fcv-lcd-shadow",lcdRgb(contrast.shadow));
  ctx.fillStyle = lcdRgb(contrast.background);
  ctx.fillRect(0, 0, width, height);
  $("off-screen").hidden = state.power !== "off";
  $("screen-top").hidden=Boolean(testPattern);
  $("depth-display").parentElement.hidden = state.power !== "on" || Boolean(testPattern);
  $("depth-display").parentElement.dataset.size=state.settings.depthSize??"Medium";
  const testStatus=$("lcd-test-status");
  testStatus.hidden=!testPattern;
  const testMessage=testPattern?"LCD TEST · SIMULATED · "+testPattern.name+
    ". TrackPad đổi màu; MENU/ESC trở lại. Mẫu màu lớp học, không phải phép kiểm tra phần cứng.":"";
  if(testStatus.textContent!==testMessage)testStatus.textContent=testMessage;
  canvas.setAttribute("aria-label",testPattern?"LCD TEST · SIMULATED · "+testPattern.name:
    "Ảnh hồi âm minh họa theo dữ liệu mô phỏng");
  if(testPattern){
    // Use our declared diagnostic sequence, not the live sonar background.
    // Keep instructions outside the LCD so every test pixel is unobstructed.
    ctx.fillStyle=lcdRgb(testPattern.rgb);
    ctx.fillRect(0,0,width,height);
    $("vrm-indicator").hidden=true;
    $("screen-top").textContent="LCD TEST · SIMULATED · "+testPattern.name;
    renderDialog();
    return;
  }
  const vrmEligible=state.power==="on" && sonarAvailable && state.vrmVisible &&
    !["NAV1","NAV2"].includes(state.mode);
  let vrmFraction=null;
  if(vrmEligible){
    const range=effectiveRangeM(observation(),state);
    const start=state.rangeMode==="manual"?Number(state.settings.shift??0):0;
    vrmFraction=depthFractionOnFcvFrame({rangeM:range,startDepthM:start},
      state.vrmDepthM);
  }
  const vrmShown=vrmEligible && vrmFraction>=0 && vrmFraction<=1;
  $("vrm-indicator").hidden = !vrmShown;
  if (vrmShown) {
    $("vrm-indicator").textContent = "VRM " +
      formatFcvDepth(state.vrmDepthM,state.settings.units);
    $("vrm-indicator").style.top = Math.max(2,
      Math.min(94,100*vrmFraction)) + "%";
  }
  if (state.power === "booting") {
    ctx.fillStyle = "#b8d5e8";
    ctx.textAlign = "center";
    ctx.font = "bold 32px Consolas, monospace";
    ctx.fillText("FCV-588", width / 2, height / 2 - 20);
    ctx.font = "18px Consolas, monospace";
    ctx.fillText("INITIALIZING ... " + state.bootElapsed + "/4", width / 2, height / 2 + 25);
    ctx.textAlign = "left";
  }
  if (state.power === "on") {
    const o = observation();
    const layout=planFcvScreenLayout(state,{width,height});
    if (["NAV1", "NAV2"].includes(state.mode)) {
      const input = state.trainingFixture.navigation === true
        ? state.navigationObservation : null;
      const nav = projectFcvManualNavBoxes({
        mode:state.mode,sample:input,navState:state.navigation,
        settings:state.settings,
        sonarDepthM:sonarAvailable?o.bottomDepthM:null,
        simTick:session.worldState.simTick,staleAfterTicks:10,
        units:state.settings.units,
        tempUnit:state.settings.tempUnit,speedUnit:state.settings.speedUnit,
        distanceUnit:state.settings.distanceUnit,
      });
      const navPane=layout.panes.nav;
      const sounderPane=layout.panes.sonar;
      if(sonarAvailable){
        const normal=sounderFrame(o,state,50);
        drawChannel(normal,sounderPane.x,0,sounderPane.width,height);
        drawSourceGradedOverlays(normal,sounderPane.x,0,
          sounderPane.width,height,o.bottomDepthM);
      }else{
        ctx.fillStyle=lcdRgb(contrast.background);
        ctx.fillRect(sounderPane.x,0,sounderPane.width,height);
        ctx.fillStyle=lcdRgb(contrast.foreground);
        ctx.font="12px Consolas, monospace";
        ctx.fillText("NO SONAR DATA",sounderPane.x+6,height/2,
          sounderPane.width-12);
      }
      ctx.fillStyle=lcdRgb(contrast.navPanel);
      ctx.fillRect(navPane.x,0,navPane.width,height);
      ctx.fillStyle=lcdRgb(contrast.navHeading);
      ctx.font="bold 19px Consolas, monospace";
      ctx.fillText(state.mode+" / "+nav.status,15,70,navPane.width-23);
      const spacing=nav.boxes.length===4?113:179;
      let line=135;
      for(const box of nav.boxes){
        ctx.fillStyle=lcdRgb(contrast.secondary);
        ctx.font="14px Consolas, monospace";
        ctx.fillText(box.label,20,line,navPane.width-37);
        ctx.fillStyle=lcdRgb(contrast.navValue);
        ctx.font="bold 19px Consolas, monospace";
        ctx.fillText(box.value,20,line+33,navPane.width-40);
        line+=spacing;
      }
      ctx.fillStyle=lcdRgb(contrast.navHeading);
      ctx.font="12px Consolas, monospace";
      ctx.fillText("SYNTHETIC · NO LIVE RECEIVER",15,height-33,
        navPane.width-25);
      ctx.fillStyle=lcdRgb(contrast.foreground);
      ctx.fillRect(navPane.width-1,0,2,height);
    } else if (!sonarAvailable) {
      ctx.fillStyle=lcdRgb(contrast.background);
      ctx.fillRect(0,0,width,height);
      ctx.fillStyle=lcdRgb(contrast.foreground);
      ctx.textAlign="center";
      ctx.font="bold 24px Consolas, monospace";
      ctx.fillText("NO SONAR DATA",width/2,height/2-18);
      ctx.font="15px Consolas, monospace";
      ctx.fillText("DEMO OFF · NO PHYSICAL TRANSDUCER",width/2,height/2+20);
      ctx.fillText("TRAINING ONLY",width/2,height/2+49);
      ctx.textAlign="left";
    } else if (state.mode === "DUAL") {
      const lf = sounderFrame(o,state,50);
      const hf = sounderFrame(o,state,200);
      const leftWidth=layout.panes.lf.width;
      drawChannel(lf,0,0,leftWidth,height);
      drawChannel(hf,leftWidth,0,width-leftWidth,height);
      drawSourceGradedOverlays(lf,0,0,leftWidth,height,o.bottomDepthM);
      drawSourceGradedOverlays(hf,leftWidth,0,width-leftWidth,height,o.bottomDepthM);
      ctx.fillStyle = lcdRgb(contrast.foreground);
      ctx.fillRect(leftWidth-1,0,2,height);
    } else {
      const frequencyKhz = state.mode.includes("HF") ? 200 : 50;
      const normal = sounderFrame(o,state,frequencyKhz);
      if (state.mode.includes("ZOOM")) {
        const zoom = sounderFrame(o,state,frequencyKhz,true);
        const leftWidth=layout.panes.zoom.width;
        // OME-23890-E §1.4.3: zoom LEFT, normal single-frequency RIGHT.
        drawChannel(zoom,layout.panes.zoom.x,0,leftWidth,height);
        drawChannel(normal,layout.panes.normal.x,0,
          layout.panes.normal.width,height);
        ctx.fillStyle = lcdRgb(contrast.foreground);
        ctx.fillText("ZOOM: " + zoom.zoomMode + " · SIM",6,height-10,
          leftWidth-11);
        drawSourceGradedOverlays(zoom,layout.panes.zoom.x,0,leftWidth,height,
          o.bottomDepthM);
        drawSourceGradedOverlays(normal,layout.panes.normal.x,0,
          layout.panes.normal.width,height,o.bottomDepthM);
        const marker=projectFcvZoomWindowMarker(state,normal,zoom);
        if(marker){
          ctx.strokeStyle=lcdRgb(contrast.navHeading);
          ctx.lineWidth=2;
          ctx.setLineDash([4,4]);
          for(const fraction of [marker.topFraction,marker.bottomFraction]){
            ctx.beginPath();ctx.moveTo(layout.panes.normal.x+6,fraction*height);
            ctx.lineTo(width-6,fraction*height);ctx.stroke();
          }
          ctx.setLineDash([]);
        }
        ctx.fillStyle=lcdRgb(contrast.foreground);
        ctx.fillRect(leftWidth-1,0,2,height);
      } else {
        drawChannel(normal,0,0,width,height);
        drawSourceGradedOverlays(normal,0,0,width,height,o.bottomDepthM);
      }
    }
    if(!["NAV1","NAV2"].includes(state.mode))
      drawSupplementaryDisplay(state,session.worldState.simTick,width,height);
    if (vrmShown) {
      if (vrmShown) {
        const y = vrmFraction * height;
        ctx.strokeStyle = lcdRgb(contrast.navHeading);
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    const displayCalibrated=projectFcvCalibratedReadings(state.settings,
      sonarAvailable?{sourceClass:"SYNTHETIC_FIXTURE",
        bottomDepthM:o.bottomDepthM}:null);
    const depth=convertFcvDepth(displayCalibrated.depthM??null,state.settings.units);
    $("depth-display").textContent=sonarAvailable && depth.value!==null
      ? depth.value.toFixed(1):"--.-";
    $("depth-unit").textContent=depth.unit;
    if(state.alarms?.activeIds.length){
      ctx.fillStyle="#921d28";
      ctx.fillRect(8,Math.min(height-60,80),width-16,26);
      ctx.fillStyle="#ffffff";
      ctx.font="bold 16px Consolas, monospace";
      ctx.fillText(state.alarms.activeIds.join(" / ") +
        (state.alarms.audible?" ACTIVE":" ACK"),15,Math.min(height-60,80)+19);
    }
    // D10: instructor-triggered training cues, never physical battery or CPU data.
    projectFcvTrainingFaults(state).forEach((fault,index)=>{
      const top=(state.alarms?.activeIds.length?116:84)+index*29;
      ctx.fillStyle="#6f3b13";
      ctx.fillRect(8,top,width-16,25);
      ctx.fillStyle="#fff0c7";
      ctx.font="bold 16px Consolas, monospace";
      ctx.fillText(fault.label+" · SIMULATED",15,top+18);
    });
  }
  const offset = state.autoGainOffset ? (state.autoGainOffset > 0 ? "+" : "") +
    state.autoGainOffset : "";
  const g = state.gainMode === "fishing" ? "G:AF" + offset :
    state.gainMode === "cruising" ? "G:AC" + offset : "G:" + state.manualGain.toFixed(1);
  const modeLabel = state.mode === "DUAL" ? "LF/HF" :
    state.mode.includes("ZOOM") ? state.mode.replace("-", " ") : state.mode;
  $("screen-top").textContent = state.power === "on"
    ? (state.settings.headerInfo==="Off"?"":
      (state.demoOn ? "[DEMO]  " : "") +
      (state.rangeMode === "auto" ? "AUTO_R" : "MAN_R") + "   " + g + "   " + modeLabel
      )
    : state.power === "booting" ? "STARTUP" : "POWER OFF";
  renderDialog();
}

function keepMenuSelectionVisible(content,selected){
  if(!selected)return;
  const itemRect=selected.getBoundingClientRect();
  const portRect=content.getBoundingClientRect();
  if(itemRect.bottom>portRect.bottom-6){
    content.scrollTop+=itemRect.bottom-portRect.bottom+9;
  }else if(itemRect.top<portRect.top+6){
    content.scrollTop-=portRect.top-itemRect.top+9;
  }
}

function renderMainMenuChrome(projected,title,content){
  title.textContent=projected.title;
  const categories=$("lcd-menu-categories");
  categories.replaceChildren(...projected.categories.map(item=>{
    const label=document.createElement("div");
    label.textContent=item.label;
    label.dataset.category=item.label;
    label.setAttribute("role","listitem");
    if(item.selected)label.setAttribute("aria-current","true");
    return label;
  }));
  const rows=projected.rows.map(item=>{
    const row=document.createElement("div");
    row.className="lcd-menu-row";
    row.textContent=item.text;
    row.dataset.entryId=item.id;
    row.setAttribute("role","listitem");
    if(item.selected)row.setAttribute("aria-current","true");
    if(item.disabled)row.setAttribute("aria-disabled","true");
    return row;
  });
  content.setAttribute("role","list");
  content.setAttribute("aria-label",projected.category);
  content.replaceChildren(...rows);
  $("dialog-footer").textContent=projected.help+
    (projected.reason?"\n"+projected.reason:"");
  const options=$("lcd-menu-options");
  options.replaceChildren();
  if(projected.editor){
    const heading=document.createElement("div");
    heading.className="lcd-options-title";
    heading.textContent=projected.editor.title+" · "+
      (projected.editor.index+1)+"/"+projected.editor.total;
    options.appendChild(heading);
    for(const item of projected.editor.choices){
      const choice=document.createElement("div");
      choice.textContent=item.value;
      choice.setAttribute("role","listitem");
      if(item.selected)choice.setAttribute("aria-current","true");
      options.appendChild(choice);
    }
    keepMenuSelectionVisible(options,options.querySelector('[aria-current="true"]'));
  }
  keepMenuSelectionVisible(content,rows[projected.rows.findIndex(row=>row.selected)]);
}

function renderDialog() {
  const overlay = session.deviceState.overlay;
  const mainMenu=projectFcvMainMenu(session.deviceState);
  $("lcd-overlay").hidden = !overlay || session.deviceState.power !== "on" || overlay.kind==="lcd-test";
  $("lcd-overlay").dataset.layout=mainMenu?"main-menu":"dialog";
  $("lcd-menu-categories").hidden=!mainMenu;
  $("lcd-menu-options").hidden=!mainMenu?.editor;
  $("dialog-footer").textContent="▲ ▼ ◀ ▶ · ENTER xác nhận · MENU/ESC quay lại";
  $("dialog-content").removeAttribute("role");
  $("dialog-content").removeAttribute("aria-label");
  if (!overlay) return;
  const title = $("dialog-title");
  const content = $("dialog-content");
  if(mainMenu){
    renderMainMenuChrome(mainMenu,title,content);
    return;
  }
  if (overlay.kind === "range") {
    title.textContent = "Range";
    content.textContent = (overlay.mode === "auto" ? "▶ " : "   ") + "Auto     " +
      (overlay.mode === "manual" ? "▶ " : "   ") + "Manual\n" +
      "Độ sâu chọn: " + formatFcvDepth(Number(session.deviceState.settings[
        FCV_RANGE_BANK_FIELDS[overlay.index].key]??FCV_RANGE_BANK_FIELDS[overlay.index].defaultValue),
        session.deviceState.settings.units,0) +
      "\n(▲/▼ thay đổi khi Manual)";
  } else if(overlay.kind==="window-size"){
    title.textContent="WINDOW SIZE · SIMULATED";
    content.textContent="Split pane: "+overlay.draftRatio+"% / "+
      String(100-Number(overlay.draftRatio))+"%\n"+
      "◀/▶ di chuyển đường chia · ENTER lưu · MENU/ESC hủy\n"+
      "TRAINING WINDOW, NOT OEM PIXEL GEOMETRY";
  } else if(overlay.kind==="calibration"){
    title.textContent="CALIBRATION · SYNTHETIC ONLY";
    content.textContent=FCV_CALIBRATION_FIELDS.map((field,index)=>{
      const value=overlay.editing && index===overlay.itemIndex
        ?overlay.draftValue:session.deviceState.settings[field.key];
      return (index===overlay.itemIndex?"▶ ":"  ")+field.label+": "+value;
    }).join("\n")+"\n"+(overlay.editing
      ?"◀/▶ đổi giá trị · ENTER lưu · MENU/ESC hủy"
      :"▲/▼ chọn trường · ENTER mở · MENU/ESC quay lại")+
      "\nKhông đo/hiệu chuẩn đầu dò thực; giáo cụ mô phỏng.";
  } else if(overlay.kind==="units"){
    title.textContent="UNITS · MANUAL §2.5 · TRAINING";
    content.textContent=FCV_UNIT_FIELDS.map((field,index)=>{
      const value=overlay.editing && index===overlay.itemIndex
        ?overlay.draftValue:session.deviceState.settings[field.key];
      return (index===overlay.itemIndex?"▶ ":"  ")+field.label+": "+value;
    }).join("\n")+"\n"+(overlay.editing
      ?"◀/▶ đổi giá trị · ENTER lưu · MENU/ESC hủy"
      :"▲/▼ chọn trường · ENTER mở · MENU/ESC quay lại")+
      "\nDepth HR/pb chưa xác minh hệ số — SOURCE GAP";
  } else if(overlay.kind==="nav-boxes"){
    title.textContent=overlay.mode+" DATA BOXES · TRAINING ONLY";
    content.textContent=FCV_NAV_BOX_DEFAULTS[overlay.mode].map((fallback,i)=>{
      const key=overlay.mode.toLowerCase()+"Box"+(i+1);
      const value=overlay.editing && i===overlay.itemIndex
        ?overlay.draftValue:session.deviceState.settings[key]??fallback;
      return (i===overlay.itemIndex?"▶ ":"  ")+"Box "+(i+1)+" : "+value;
    }).join("\n")+"\n"+(overlay.editing
      ?"◀/▶ đổi dữ liệu · ENTER lưu · MENU/ESC hủy"
      :"▲/▼ chọn ô · ENTER sửa · MENU/ESC quay lại")+
      "\nWIND/receiver không có nguồn: NO DATA; chỉ dữ liệu mô phỏng";
  } else if(overlay.kind==="receiver-status"){
    title.textContent="RECEIVER STATUS · SIMULATED";
    const projected=projectFcvTrainingReceiver(session.deviceState,
      session.worldState.simTick);
    content.textContent="NMEA physical port: OFF / NO REAL INTERFACE\n"+
      "Classroom fixture: "+projected.status+"\n"+
      "Position: "+projected.positionText+"\n"+
      "Transport: "+projected.transport+"\n"+
      "Speed source: "+projected.selectedSources.speed+" · "+
        projected.selectedSources.speedStatus+"\n"+
      "Temp source: "+projected.selectedSources.temperature+" · "+
        projected.selectedSources.tempStatus+"\n"+
      "Trip source: "+projected.selectedSources.trip+" · "+
        projected.selectedSources.tripStatus+"\n"+
      "NO REAL RECEIVER OR VESSEL LINK\nMENU/ESC quay lại";
  } else if(overlay.kind==="tankenmaru-details"){
    title.textContent="TANKENMARU · MANUAL §2.9 · SIM ONLY";
    const virtual=projectFcvTankenmaruTrainingStatus(session.deviceState);
    content.textContent=virtual.values
      ?"D15 virtual option: "+virtual.status+"\n"+
        "Output: "+virtual.values.output+" (NO PHYSICAL TRANSMISSION)\n"+
        "Pic. Sync: "+virtual.values.pictureSync+" (REFERENCE DEFAULT)\n"+
        "Sub Clutter: "+virtual.values.subClutter+" (REFERENCE DEFAULT)\n"+
        "Transport: "+virtual.transport+" · NO REAL RF / PARTNER DISPLAY\n"+
        "READ-ONLY MANUAL DEFAULTS · NO OEM OPTION EDITOR\nMENU/ESC quay lại"
      :"SOURCE_GAP · OPTION NOT DECLARED OR NOT ACTIVE\n"+
        "NO REAL RF / PARTNER DISPLAY · NO OUTPUT\nMENU/ESC quay lại";
  } else if(overlay.kind==="range-bank"){
    title.textContent="RANGE BANK · TRAINING ONLY";
    content.textContent=FCV_RANGE_BANK_FIELDS.map((field,index)=>{
      const current=overlay.editing && index===overlay.itemIndex
        ?overlay.draftValue:session.deviceState.settings[field.key];
      return (index===overlay.itemIndex?"▶ ":"  ")+field.label+
        " : "+formatFcvDepth(Number(current??field.defaultValue),
          session.deviceState.settings.units,0);
    }).join("\n")+(overlay.editing
      ?"\n◀/▶ chọn giá trị · ENTER lưu · MENU/ESC hủy"
      :"\n▲/▼ chọn slot · ENTER sửa · MENU/ESC quay lại")+
      "\n8 RANGE PRESETS · SYNTHETIC TRAINING, NOT OEM VERIFIED";
  } else if (overlay.kind === "gain") {
    title.textContent = "Auto Gain";
    content.textContent = ["Fishing", "Cruising", "Off"].map((mode, i) =>
      ((overlay.mode === ["fishing", "cruising", "off"][i]) ? "▶ " : "   ") + mode).join("\n") +
      "\nAuto Gain Offset: " + overlay.offset + " (-5...+5)";
  } else if (overlay.kind === "brill") {
    title.textContent = "Brill";
    content.textContent = "Độ sáng: " + overlay.value + " / 9\n◀ giảm       tăng ▶";
  } else if (overlay.kind === "mode") {
    title.textContent = "MODE SELECT";
    content.textContent = DISPLAY_MODES.map(mode =>
      (overlay.candidate === mode ? "▶ " : "  ") + mode).join("\n") +
      "\nTự chọn sau " + Math.max(0, ((6000 - overlay.elapsedMs) / 1000)).toFixed(1) + " s";
  } else if (overlay.kind === "func-program") {
    title.textContent = "FUNC Key · ASSIGN";
    content.textContent = FCV_FUNC_TARGETS.map((item,index)=>
      (overlay.itemIndex===index?"▶ ":"  ")+item.label).join("\n")+
      "\nTrackPad chọn · ENTER gán · MENU/ESC hủy";
  } else if (overlay.kind === "func-setting") {
    title.textContent = overlay.label + " / FUNC";
    content.textContent = overlay.choices.map(choice=>
      (overlay.draftValue===choice?"▶ ":"  ")+choice).join("\n")+
      "\nTrackPad hoặc FUNC chọn · ENTER lưu · MENU/ESC hủy";
  } else if (overlay.kind === "fish-alarm") {
    const selected=overlay.itemIndex;
    const enabled=session.deviceState.settings["alarm"+overlay.profileIndex];
    title.textContent="ALARM"+overlay.profileIndex+" · TRAINING PROFILE";
    content.textContent=(selected===0?"▶ ":"  ")+"Setting\n"+
      (selected===1?"▶ ":"  ")+"Alarm : "+
      (selected===1 && overlay.editing?overlay.draftValue:enabled)+"\n"+
      (overlay.editing?"TrackPad chọn · ENTER lưu · MENU/ESC hủy":
        "TrackPad chọn · ENTER mở / chỉnh · MENU/ESC quay lại")+
      "\nSynthetic source conditions · NOT HARDWARE VALIDATED";
  } else if (overlay.kind === "fish-alarm-setting") {
    const n=overlay.profileIndex;
    title.textContent="ALARM"+n+" / SETTING · SIMULATED";
    content.textContent=FCV_FISH_ALARM_FIELDS.map((item,i)=>{
      const key="alarm"+n+item.key[0].toUpperCase()+item.key.slice(1);
      const value=overlay.itemIndex===i && overlay.editing
        ?overlay.draftValue:session.deviceState.settings[key];
      return (overlay.itemIndex===i?"▶ ":"  ")+item.label+" : "+value;
    }).join("\n")+"\n"+(overlay.editing
      ?"◀/▶ chọn · ENTER lưu · MENU/ESC hủy"
      :"▲/▼ chọn dòng · ENTER sửa · MENU/ESC quay lại")+
      "\nGiá trị và điều kiện là mô phỏng lớp học";
  } else if (overlay.kind === "power-hold") {
    title.textContent = "POWER / SHUTDOWN";
    content.textContent = "Giữ POWER/BRILL để tắt\nCòn " +
      (overlay.remainingMs / 1000).toFixed(2) + " giây theo đồng hồ UI.\n" +
      "Nhả sớm sẽ không tắt máy.";
  } else if (overlay.kind === "installation") {
    title.textContent = "INSTALLATION · PUBLIC REFERENCE";
    const installationItems=getInstallationMenu(session.deviceState);
    content.textContent = installationItems.map((item, index) => {
      const selected = overlay.itemIndex === index;
      const value = selected && overlay.editing ? overlay.draftValue :
        session.deviceState.settings[item.settingKey];
      return (selected ? "▶ " : "  ") + item.label +
        (item.disabled?" [HOLD]":"")+" : " + (value ?? "-");
    }).join("\n") +
      (installationItems[overlay.itemIndex]?.disabled
        ?"\nHOLD · "+installationItems[overlay.itemIndex].disabledReason:"")+
      "\nCài đặt ảo, không có dữ liệu NMEA thật";
  } else if(overlay.kind === "diagnostics"){
    title.textContent="DIAGNOSTICS · TRAINING ONLY";
    content.textContent="Model: FCV-588 (PUBLIC REFERENCE)\n" +
      "Installed firmware: UNKNOWN\nTransducer: VIRTUAL ONLY\n" +
      "NMEA port: NO REAL INTERFACE\nLCD TEST: simulated\n" +
      "Instructor fault injection: " +
      (projectFcvTrainingFaults(session.deviceState).map(fault=>fault.code).join(", ") || "NONE")+
      " (SIMULATED ONLY)\nNo actual hardware readings or error-code measurements";
  } else if(overlay.kind === "lcd-test"){
    title.textContent="LCD TEST · SIMULATED";
    const testColors=["BLACK","WHITE","RED","GREEN","BLUE"];
    content.textContent="Test color: "+testColors[overlay.colorIndex]+
      "\nTrackPad chọn màu\nMENU/ESC để quay lại";
  } else if(overlay.kind === "confirm-restore"){
    title.textContent="RESTORE TRAINING SETTINGS";
    content.textContent="Đây là thiết lập giả lập, không gửi lệnh thiết bị thật.\n"+
      (overlay.confirm?"▶ YES    NO":"  YES  ▶ NO")+
      "\n◀/▶ chọn, ENTER xác nhận, MENU/ESC hủy";
  } else if(overlay.kind === "trip-status"){
    title.textContent="TRIP / ODOMETER · SIMULATED";
    const nav=session.deviceState.navigation;
    const travel=projectFcvTravelValues(nav,session.deviceState.settings);
    const tripText=travel.tripNm===null?"NO DATA":
      formatFcvDistance(travel.tripNm,
        session.deviceState.settings.distanceUnit)+" (SIM)";
    const odometerText=travel.odometerNm===null?"NO DATA":
      formatFcvDistance(travel.odometerNm,
        session.deviceState.settings.distanceUnit)+" (SIM)";
    content.textContent="TRIP  "+tripText+"\n"+
      "ODOMETER  "+odometerText+"\n"+
      "Trip Source: "+session.deviceState.settings.tripSource+" · "+
      (session.deviceState.settings.tripSource==="NMEA"
        ?travel.tripSourceStatus:
        session.deviceState.trainingFixture.navigation?"SYNTHETIC OWN":"NO DATA")+"\n"+
      "Giá trị đo quãng đường nhân tạo, không phải máy tàu thật.\n"+
      "MENU/ESC quay lại";
  } else if(overlay.kind === "confirm-trip-reset"){
    title.textContent="RESET TRIP · SYNTHETIC";
    content.textContent="Chỉ đặt lại bộ đếm Trip ảo; giữ Odometer ảo.\n"+
      (overlay.confirm?"▶ YES    NO":"  YES  ▶ NO")+
      "\nTrackPad chọn · ENTER xác nhận · MENU/ESC hủy";
  } else if(overlay.kind === "waypoints"){
    title.textContent=overlay.purpose==="destination"?
      "GO TO WPT · SYNTHETIC":"WPT LIST · SYNTHETIC";
    const list=session.deviceState.navigation?.waypoints??[];
    const offset=overlay.purpose==="destination"?1:0;
    content.textContent=(offset?
      (overlay.itemIndex===0?"▶ ":"  ")+"OFF (không chọn đích)\n":"")+
      list.map((w,i)=>
        (i+offset===overlay.itemIndex?"▶ ":"  ")+w.id+" "+w.name+" (SIM)").join("\n")+
      (list.length?"\nENTER: "+(offset?"Go to WPT":"Edit / Erase")+"; MENU/ESC: Back":
        "\nNo waypoint / MARK requires instructor D15 synthetic NAV");
  } else if(overlay.kind==="waypoint-detail"){
    const waypoint=session.deviceState.navigation.waypoints[overlay.itemIndex];
    title.textContent="WPT LIST · EDIT (SIM)";
    content.textContent=waypoint?
      waypoint.id+" · "+waypoint.name+"\n"+
      (overlay.fieldIndex===0?"▶ ":"  ")+"Name\n"+
      (overlay.fieldIndex===1?"▶ ":"  ")+"Erase?\n"+
      "TrackPad chọn mục · ENTER · MENU/ESC quay lại":"WPT NOT FOUND";
  } else if(overlay.kind==="waypoint-name"){
    title.textContent="WPT NAME · SIMULATED KEY ENTRY";
    const draft=overlay.draftName;
    const cursor=overlay.charIndex;
    content.textContent=overlay.waypointId+"\n"+
      draft.slice(0,cursor)+"["+draft[cursor]+"]"+draft.slice(cursor+1)+
      "\n▲/▼ đổi ký tự; ◀/▶ di chuyển; ENTER lưu; MENU/ESC hủy";
  } else if(overlay.kind==="confirm-waypoint-delete" ||
      overlay.kind==="confirm-delete-all-waypoints"){
    title.textContent="ERASE WPT? · SYNTHETIC";
    content.textContent=(overlay.kind==="confirm-waypoint-delete"?
      overlay.waypointId:"DELETE ALL WPT")+
      "\nĐiểm đang là đích không thể xóa.\n"+
      (overlay.confirm?"▶ YES   NO":"  YES ▶ NO")+
      "\n◀/▶ chọn · ENTER xác nhận · MENU/ESC hủy";
  } else {
    title.textContent = "MENU / ESC";
    content.textContent = "Mục đang thiếu bằng chứng hoặc thao tác; không giả lập kết quả.";
  }
  // Source-long Data/System/Alarm menus must not hide the operator's cursor
  // below a scrollable LCD overlay. Create safe original DOM rows; never parse
  // the menu or any user setting as HTML. TrackPad ownership stays in reducer.
  if(["installation","nav-boxes","fish-alarm-setting","units",
      "calibration","range-bank","func-program","waypoints"].includes(overlay.kind) &&
      Number.isInteger(overlay.itemIndex)){
    const lines=content.textContent.split("\n");
    const rows=lines.map((line,index)=>{
      const row=document.createElement("div");
      row.className="lcd-menu-row";
      row.textContent=line;
      if(index===overlay.itemIndex)row.setAttribute("aria-current","true");
      return row;
    });
    content.replaceChildren(...rows);
    keepMenuSelectionVisible(content,rows[overlay.itemIndex]);
  }
}

function renderPhysicalDialState(state) {
  // Read-only view of canonical state, not another rotary counter or timer.
  // Angles are original training illustration, NOT measured OEM detents.
  const pending=state.overlay?.kind==="mode";
  const selected=pending?state.overlay.candidate:state.mode;
  const index=DISPLAY_MODES.indexOf(selected);
  const mode=$("mode-knob");
  mode.style.setProperty("--dial-angle",((index-3)*45)+"deg");
  mode.dataset.selection=selected;
  mode.dataset.pending=String(pending);
  mode.setAttribute("aria-label","MODE: "+selected+
    (pending?" đang chọn; chế độ đang chạy "+state.mode:" đang chọn")+
    ". Kéo dọc, cuộn chuột hoặc dùng phím mũi tên để xoay.");
  for(const label of document.querySelectorAll(".mode-scale [data-mode]")){
    label.dataset.selected=String(label.dataset.mode===selected);
  }
  const manual=state.gainMode==="off";
  const value=manual?state.manualGain:state.autoGainOffset;
  const description=manual?"Manual "+value.toFixed(1):
    "Auto "+state.gainMode+" · Offset "+(value>0?"+":"")+value;
  const gain=$("gain-knob");
  gain.style.setProperty("--dial-angle",((manual?value-5:value)*27)+"deg");
  gain.dataset.selection=description;
  gain.setAttribute("aria-label","GAIN: "+description+
    ". Nhấn để chọn chế độ; kéo dọc, cuộn chuột hoặc dùng phím mũi tên để xoay.");
  const readout="MODE "+selected+(pending?" (đang chọn; hiện tại "+state.mode+")":"")+
    " · GAIN "+description;
  // Do not make assistive technology announce the same value on every tick.
  if($("dial-readout").textContent!==readout)$("dial-readout").textContent=readout;
}

function render() {
  const s = session.deviceState;
  const injectedFaults=projectFcvTrainingFaults(s);
  $("btn-nav-fixture").setAttribute("aria-pressed",String(s.trainingFixture.navigation));
  $("btn-nav-fixture").textContent =
    "Vị trí tổng hợp: " + (s.trainingFixture.navigation ? "BẬT" : "TẮT");
  $("btn-mount-fixture").setAttribute("aria-pressed",String(s.trainingFixture.virtualMounting));
  $("btn-mount-fixture").textContent =
    "Gá đầu dò 525STID-PWD ảo: " + (s.trainingFixture.virtualMounting ? "BẬT" : "TẮT");
  $("btn-tankenmaru-fixture").setAttribute("aria-pressed",String(s.trainingFixture.tankenmaruOption));
  $("btn-tankenmaru-fixture").textContent =
    "Tùy chọn Tankenmaru ảo: " + (s.trainingFixture.tankenmaruOption ? "BẬT" : "TẮT");
  $("btn-battery-fixture").setAttribute("aria-pressed",String(s.trainingFixture.lowBattery));
  $("btn-battery-fixture").textContent =
    "Pin yếu giả lập: " + (s.trainingFixture.lowBattery ? "BẬT" : "TẮT");
  $("btn-error-fixture").setAttribute("aria-pressed",String(s.trainingFixture.systemError));
  $("btn-error-fixture").textContent =
    "Lỗi hệ thống giả lập: " + (s.trainingFixture.systemError ? "BẬT" : "TẮT");
  $("training-fault-status").textContent=injectedFaults.length
    ?"INJECTED TRAINING FAULT · "+injectedFaults.map(f=>f.code).join(" / ")+
      " · Không phải cảnh báo từ phần cứng."
    :"Không có cảnh báo lỗi giả lập.";
  $("tick-count").textContent = String(session.worldState.simTick).padStart(4, "0");
  $("event-count").textContent = String(session.events.length).padStart(3, "0");
  $("mode-state").textContent = s.mode;
  $("clock-line").textContent = "T + " + String(session.worldState.simTick).padStart(4, "0") + " s";
  $("status-line").textContent = s.power==="on" && injectedFaults.length
    ?"SIMULATED FAULT · "+injectedFaults.map(f=>f.code).join(" / "):
    s.notice || (s.power === "on" ? "RUN · DEMO DATA" :
      s.power === "booting" ? "BOOTING" : "POWER OFF");
  $("btn-pause").textContent = paused ? "Tiếp tục thời gian" : "Tạm dừng thời gian";
  renderPhysicalDialState(s);
  renderScreen();
}

const press = control => send({kind: "press", control});
const pad = direction => send({kind: "pad", control: "trackpad", direction});
const rotate = (control, steps) => send({kind: "rotate", control, steps});
const holdBindings = [];
// D15 fixtures are separate from FCV hardware and are never stored as
// persistent device settings. They remain deterministic session events.
$("btn-nav-fixture").addEventListener("click",()=>send({
  kind:"training-fixture",fixture:"navigation",
  enabled:!session.deviceState.trainingFixture.navigation,
}));
$("btn-mount-fixture").addEventListener("click",()=>send({
  kind:"training-fixture",fixture:"virtualMounting",
  enabled:!session.deviceState.trainingFixture.virtualMounting,
}));
$("btn-tankenmaru-fixture").addEventListener("click",()=>send({
  kind:"training-fixture",fixture:"tankenmaruOption",
  enabled:!session.deviceState.trainingFixture.tankenmaruOption,
}));
$("btn-battery-fixture").addEventListener("click",()=>send({
  kind:"training-fixture",fixture:"lowBattery",
  enabled:!session.deviceState.trainingFixture.lowBattery,
}));
$("btn-error-fixture").addEventListener("click",()=>send({
  kind:"training-fixture",fixture:"systemError",
  enabled:!session.deviceState.trainingFixture.systemError,
}));

const lessonPicker = $("lesson-picker");
let lessonAttempt = null;
for (const lesson of FCV588_TRAINING_LESSONS) {
  const option = document.createElement("option");
  option.value = lesson.id;
  option.textContent = lesson.titleVi;
  lessonPicker.appendChild(option);
}
function renderLessonInstruction() {
  const lesson = FCV588_TRAINING_LESSONS.find(item => item.id === lessonPicker.value);
  $("lesson-instruction").textContent = lesson
    ? lesson.instructionVi + " · Nguồn " + lesson.manualSection +
      ". Dữ liệu không dùng cho tàu thực."
    : "Không tìm thấy bài học.";
}
lessonPicker.addEventListener("change", () => {
  lessonAttempt = null;
  renderLessonInstruction();
  $("lesson-result").textContent =
    "Đã chọn bài khác. Nhấn Bắt đầu lượt thực hành mới để chấm thao tác từ đây.";
});
$("btn-start-lesson").addEventListener("click", () => {
  lessonAttempt = {lessonId:lessonPicker.value,
    startSeq:session.events.length,
    startSessionHash:sessionHash(session),
    baselineWaypointCount:session.deviceState.navigation.waypoints.length};
  $("lesson-result").textContent =
    "Đang ghi lượt thực hành từ sự kiện " +
    String(lessonAttempt.startSeq + 1) +
    ". Chỉ tính thao tác mới kể từ khi bắt đầu lượt này.";
});
$("btn-score").addEventListener("click", () => {
  if (!lessonAttempt || lessonAttempt.lessonId !== lessonPicker.value) {
    $("lesson-result").textContent =
      "CHƯA BẮT ĐẦU LƯỢT HỌC — nhấn Bắt đầu lượt thực hành mới trước khi thao tác.";
    return;
  }
  const result = assessFcvLesson(session, lessonPicker.value,
    {startSeq:lessonAttempt.startSeq,
      startSessionHash:lessonAttempt.startSessionHash,
      baselineWaypointCount:lessonAttempt.baselineWaypointCount});
  $("lesson-result").textContent = result.passed
    ? "ĐẠT chuỗi thao tác mô phỏng — không phải FURUNO/HARDWARE PASS."
    : "CHƯA ĐẠT: " + result.reasons.join(", ") +
      " · Kiểm tra bài học và thiết lập khởi đầu.";
});
renderLessonInstruction();

$("key-menu").addEventListener("click", () => press("menu"));
$("key-range").addEventListener("click", () => press("range"));
$("key-mark").addEventListener("click", () => press("mark"));
$("key-enter").addEventListener("click", () => press("enter"));
for (const d of ["up", "down", "left", "right"]) {
  holdBindings.push(bindRepeatPadControl({
    button:$("pad-"+d),direction:d,emit:input=>send(input),
  }));
}
const gainDrag=bindRotaryDragControl({button:$("gain-knob"),control:"gain",
  emit:input=>send(input)});
const modeDrag=bindRotaryDragControl({button:$("mode-knob"),control:"mode",
  emit:input=>send(input)});
holdBindings.push(gainDrag,modeDrag);
$("gain-knob").addEventListener("click", event => {
  if(!gainDrag.suppressClick(event))send({kind:"push",control:"gain"});
});
for (const control of ["gain", "mode"]) {
  $(control + "-minus").addEventListener("click", () => rotate(control, -1));
  $(control + "-plus").addEventListener("click", () => rotate(control, 1));
  $(control + "-knob").addEventListener("wheel", ev => {
    ev.preventDefault();
    rotate(control, ev.deltaY > 0 ? -1 : 1);
  }, {passive: false});
  $(control + "-knob").addEventListener("keydown", ev => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(ev.key) || ev.repeat) return;
    ev.preventDefault();
    rotate(control, ["ArrowRight", "ArrowUp"].includes(ev.key) ? 1 : -1);
  });
}
for (const control of ["power", "func"]) {
  holdBindings.push(bindHoldControl({
    button: $("key-" + control), control,
    emit: input => send(input),
  }));
}

$("btn-pause").addEventListener("click", () => {
  paused = !paused;
  render();
});
$("btn-step").addEventListener("click", () => send({kind: "tick", steps: 1}));
$("btn-reset").addEventListener("click", () => {
  for (const binding of holdBindings) binding.cancel();
  lessonAttempt = null;
  $("lesson-result").textContent =
    "Đã đặt lại phiên. Cần bắt đầu lượt thực hành mới trước khi đánh giá.";
  const retainedSettings = {...session.deviceState.settings};
  session = reset(adapter, scenario);
  // Teacher reset starts a new world/log but must not erase device preferences.
  session = dispatch(session, adapter,
    {kind: "restore-settings", settings: retainedSettings}, scenario);
  cachedTick = -1;
  frozenFrames.clear();
  $("validation-status").textContent =
    "Đã đặt lại thế giới, cảm biến và phiên học; giữ cấu hình máy, ghi sự kiện khôi phục mới.";
  render();
});
$("btn-replay").addEventListener("click", () => {
  try {
    const re = replay(adapter, scenario, createReplayEnvelope(session));
    const equal = sessionHash(re) === sessionHash(session);
    $("validation-status").textContent = equal
      ? "REPLAY PASS — trạng thái và sự kiện trùng khớp (" + session.events.length + " bước)."
      : "REPLAY FAIL — cần kiểm tra tính xác định.";
  } catch (err) {
    $("validation-status").textContent = "REPLAY REJECTED — " + err.message;
  }
});

const shortcuts = {
  ArrowUp: () => pad("up"), ArrowDown: () => pad("down"),
  ArrowLeft: () => pad("left"), ArrowRight: () => pad("right"),
  Escape: () => press("menu"), Enter: () => press("enter"),
  r: () => press("range"), g: () => send({kind: "push", control: "gain"}),
  "[": () => rotate("mode", -1), "]": () => rotate("mode", 1),
  "-": () => rotate("gain", -1), "=": () => rotate("gain", 1),
};
document.addEventListener("keydown", ev => {
  if (!shouldRouteFcvShortcut(ev)) return;
  const action = shortcuts[ev.key];
  if (!action) return;
  ev.preventDefault();
  action();
});
// One quantized runtime timer: display modal time is logged independently from
// a teacher-paused synthetic world. No Date.now-driven reducer mutation.
let worldIntervalMs = 0;
setInterval(() => {
  if (["mode", "brill", "power-hold"].includes(session.deviceState.overlay?.kind)) {
    send({kind: "ui-tick", elapsedMs: 250});
  }
  if (!paused) {
    worldIntervalMs += 250;
    if (worldIntervalMs >= 1000) {
      worldIntervalMs = 0;
      send({kind: "tick", steps: 1});
    }
  }
}, 250);
const storageStatus = restoreSettingsOnReload();
if (storageStatus) $("validation-status").textContent = storageStatus;
render();
