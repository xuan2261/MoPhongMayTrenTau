/**
 * Offline, display-only conversion of synthetic water depth.
 * This never changes world observations, alarm thresholds, replay or physics.
 * OME-23890-E §2.5 (PDF p.34) has six distinct unit groups. Depth HR/pb
 * values remain SOURCE_GAP pending a trusted conversion oracle; other
 * conversions are ordinary mathematical unit transformations, not hardware.
 */
export const FCV_UNIT_FIELDS=Object.freeze([
  ["units","Depth",["Metric","Feet","Fathom"],"Metric",
    ["HR","pb"]],
  ["tempUnit","Temp",["C","F"],"C",[]],
  ["fishSizeUnit","Fish Size",["cm","inch"],"cm",[]],
  ["speedUnit","Speed",["kn","km/h","mph"],"kn",[]],
  ["windUnit","Wind",["kn","km/h","mph","m/s"],"kn",[]],
  ["distanceUnit","Distance",["NM","km","SM"],"NM",[]],
].map(([key,label,choices,defaultValue,holdOptions])=>Object.freeze({
  key,label,choices:Object.freeze(choices),defaultValue,
  holdOptions:Object.freeze(holdOptions),manualSection:"§2.5",
  sourceStatus:holdOptions.length?"CURATED_MANUAL_PARTIAL_HR_PB_HOLD":
    "CURATED_MANUAL_MATH_CONVERSION_NOT_HARDWARE_VERIFIED",
})));
const format=(number,unit,digits)=>Number.isFinite(number)
  ?number.toFixed(digits)+" "+unit:"NO DATA";
export function formatFcvTemperature(celsius,setting="C"){
  if(!["C","F"].includes(setting))throw new RangeError("unknown temperature unit");
  if(!Number.isFinite(celsius))return "NO DATA";
  return format(setting==="C"?celsius:celsius*9/5+32,
    setting==="C"?"°C":"°F",1);
}
export function formatFcvFishSize(cm,setting="cm"){
  if(!["cm","inch"].includes(setting))throw new RangeError("unknown fish size unit");
  if(!Number.isFinite(cm))return "NO DATA";
  return format(setting==="inch"?cm/2.54:cm,setting==="inch"?"in":"cm",1);
}
export function formatFcvSpeed(knots,setting="kn"){
  const factors={kn:1,"km/h":1.852,mph:1.150779448};
  if(!Object.hasOwn(factors,setting))throw new RangeError("unknown speed unit");
  if(!Number.isFinite(knots))return "NO DATA";
  return format(knots*factors[setting],setting,1);
}
export function formatFcvWind(knots,setting="kn"){
  const factors={kn:1,"km/h":1.852,mph:1.150779448,"m/s":1852/3600};
  if(!Object.hasOwn(factors,setting))throw new RangeError("unknown wind unit");
  if(!Number.isFinite(knots))return "NO DATA";
  return format(knots*factors[setting],setting,1);
}
export function formatFcvDistance(nm,setting="NM"){
  const factors={NM:1,km:1.852,SM:1.150779448};
  if(!Object.hasOwn(factors,setting))throw new RangeError("unknown distance unit");
  if(!Number.isFinite(nm))return "NO DATA";
  return format(nm*factors[setting],setting,2);
}
const UNIT_SPEC=Object.freeze({
  Metric:Object.freeze({factor:1,unit:"m"}),
  Feet:Object.freeze({factor:1/0.3048,unit:"ft"}),
  Fathom:Object.freeze({factor:1/1.8288,unit:"fm"}),
});
export function convertFcvDepth(depthM,setting="Metric") {
  const spec=UNIT_SPEC[setting];
  if(!spec)throw new RangeError("unknown depth unit choice");
  if(!Number.isFinite(depthM))return {value:null,unit:spec.unit};
  return {value:depthM*spec.factor,unit:spec.unit};
}
export function formatFcvDepth(depthM,setting="Metric",fractionDigits=1) {
  const result=convertFcvDepth(depthM,setting);
  if(result.value===null)return "--";
  if(!Number.isInteger(fractionDigits) || fractionDigits<0 || fractionDigits>3)
    throw new RangeError("invalid display precision");
  return result.value.toFixed(fractionDigits)+" "+result.unit;
}
