/**
 * Manual §2.6 calibration categories; values here are bounded classroom
 * approximations. No actual transducer, vessel speed or water sensor is read.
 */
const numeric=(min,max)=>Object.freeze(Array.from({length:max-min+1},
  (_,i)=>String(min+i)));
export const FCV_CALIBRATION_FIELDS=Object.freeze([
  ["gainAdjHF","Gain ADJ HF",numeric(-20,20),"0"],
  ["gainAdjLF","Gain ADJ LF",numeric(-20,20),"0"],
  ["tempAdjust","Temp",numeric(-20,20),"0"],
  ["speedAdjust","Speed (STW)",numeric(-50,50),"0"],
  ["fishSizeAdjust","Fish Size",numeric(-80,100),"0"],
  ["waterType","Water Type",Object.freeze(["Salt","Fresh"]),"Salt"],
  ["zeroLineRejector","Zero Line Rejector",Object.freeze(["Off","On"]),"Off"],
].map(([key,label,choices,defaultValue])=>Object.freeze({
  key,label,choices,defaultValue,manualSection:"§2.6",
  sourceStatus:"SIMULATED_CALIBRATION_LIMITED_PUBLIC_ORACLE",
})));
const finite=value=>Number.isFinite(value)?value:null;
const round=value=>Number(value.toFixed(3));
export function projectFcvCalibratedReadings(settings,observation){
  if(observation?.sourceClass!=="SYNTHETIC_FIXTURE")return {
    status:"NO_DATA",hardwareValidated:false,waterType:settings?.waterType??"Salt",
    zeroLineRejector:settings?.zeroLineRejector??"Off",
  };
  const temp=finite(observation.temperatureC);
  // Only a finite nonnegative ownship speed is a valid classroom reading.
  // Do not pass impossible negative fixture speeds into NAV widgets.
  const speed=Number.isFinite(observation.speedKn) && observation.speedKn>=0
    ?observation.speedKn:null;
  const fish=finite(observation.fishSizeCm);
  const depth=finite(observation.bottomDepthM);
  const tempAdj=Number(settings?.tempAdjust??"0");
  const speedAdj=Number(settings?.speedAdjust??"0");
  const sizeAdj=Number(settings?.fishSizeAdjust??"0");
  const draft=Number(settings?.draft??0);
  return {status:"SYNTHETIC_ONLY",hardwareValidated:false,
    sourceClass:"SYNTHETIC_FIXTURE",
    depthM:depth===null?null:round(depth+(Number.isFinite(draft)?draft:0)),
    temperatureC:temp===null?null:round(temp+(Number.isFinite(tempAdj)?tempAdj:0)),
    speedKn:speed===null?null:round(speed*(1+speedAdj/100)),
    fishSizeCm:fish===null?null:round(fish*(1+sizeAdj/100)),
    waterType:settings?.waterType??"Salt",
    zeroLineRejector:settings?.zeroLineRejector??"Off",
  };
}
