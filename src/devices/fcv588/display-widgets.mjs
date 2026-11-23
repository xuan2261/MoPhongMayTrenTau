/** Public-reference supplemental LCD projections; no external receiver or OEM pixels. */
import {projectNavData,isValidSyntheticPosition} from "./navigation.mjs";
import {projectFcvCalibratedReadings} from "./calibration.mjs";

export function projectFcvDisplayWidgets(state,navigationSample,simTick=0){
  const settings=state?.settings??{};
  const navValid=state?.trainingFixture?.navigation===true &&
    isValidSyntheticPosition(navigationSample?.position) &&
    Number.isInteger(navigationSample.observedAtTick) &&
    simTick>=navigationSample.observedAtTick &&
    simTick-navigationSample.observedAtTick<=10;
  const calibrated=projectFcvCalibratedReadings(settings,navValid?{
    ...navigationSample,sourceClass:"SYNTHETIC_FIXTURE"}:null);
  let tempGraph=null;
  if(["Narrow","Wide"].includes(settings.tempGraph)){
    // A disconnected NMEA temperature source cannot reuse the instructor's
    // ownship sample just because another widget can still show position.
    const current=settings.tempSource!=="NMEA" &&
      Number.isFinite(calibrated.temperatureC)
      ?calibrated.temperatureC:null;
    tempGraph=current===null
      ?{status:"NO_DATA",sourceClass:"SIMULATED_ONLY",samples:[]}:
      {status:"SYNTHETIC_DATA",sourceClass:"SYNTHETIC_FIXTURE",
        currentC:current,scaleSpanC:settings.tempGraph==="Narrow"?8.9:22.2,
        // Synthetic trend history is authored for classroom illustration.
        samples:Array.from({length:24},(_,i)=>Number((current+0.3*(
          Math.sin((simTick-23+i)/9)-Math.sin(simTick/9))).toFixed(3))) };
  }
  let navData=null;
  if(["Basic","Expanded"].includes(settings.navData)){
    const projected=projectNavData(navValid?{...navigationSample,
      bottomDepthM:navigationSample.depthM,
      depthM:calibrated.depthM??navigationSample.depthM,
      speedKn:settings.speedSource==="NMEA"?null:calibrated.speedKn}:null,"NAV2",{
      simTick,units:settings.units??"Metric",
      speedUnit:settings.speedUnit??"kn",staleAfterTicks:10,
    });
    navData={status:projected.status,sourceClass:"SIMULATED_ONLY",
      boxes:settings.navData==="Basic"?projected.boxes.slice(0,2):projected.boxes};
  }
  const battery=settings.battery==="On"
    ?{status:"NO_HARDWARE_DATA",sourceClass:"SIMULATED_ONLY",
      label:state?.trainingFixture?.lowBattery===true
        ?"LOW BATTERY · SIM":"BATTERY NO DATA · SIM"}:null;
  return {tempGraph,navData,battery};
}

/** Zoom markers refer to the active *displayed* source depth window only. */
export function projectFcvZoomWindowMarker(state,baseFrame,zoomFrame){
  if(state?.settings?.zoomMarker!=="On" ||
    !["LF-ZOOM","HF-ZOOM"].includes(state?.mode))return null;
  if(!Number.isFinite(baseFrame?.rangeM) || baseFrame.rangeM<=0 ||
    !Number.isFinite(zoomFrame?.rangeM) || zoomFrame.rangeM<=0 ||
    !Number.isFinite(zoomFrame?.startDepthM))return null;
  const top=(zoomFrame.startDepthM-(baseFrame.startDepthM??0))/baseFrame.rangeM;
  const bottom=(zoomFrame.startDepthM+zoomFrame.rangeM-
    (baseFrame.startDepthM??0))/baseFrame.rangeM;
  if(top>1 || bottom<0)return null;
  return {topFraction:Math.max(0,Math.min(1,top)),
    bottomFraction:Math.max(0,Math.min(1,bottom)),
    sourceClass:"SYNTHETIC_DISPLAY_ONLY"};
}
