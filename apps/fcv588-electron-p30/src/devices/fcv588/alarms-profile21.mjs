/**
 * Deterministic source-graded training alarms. Each enabled condition INSIDE
 * a profile is conjunctive (AND); enabled profiles are independent. No beeper
 * or other actual physical alarm interface is driven by this module.
 */
import {isValidSyntheticSpeed} from "./navigation-profile21.mjs";
function matchCondition(condition, sensor) {
  if (condition.enabled === false) return true;
  switch (condition.kind) {
    case "depthRange":
      return Number.isFinite(sensor.bottomDepthM) &&
        sensor.bottomDepthM >= condition.min && sensor.bottomDepthM <= condition.max;
    case "fishPresent":
      if(typeof sensor.fishPresent!=="boolean" ||
         sensor.fishPresent!==condition.value)return false;
      if(condition.syntheticType){
        if(condition.syntheticType==="ACCU-FISH"){
          if(sensor.accuFishAvailable!==true)return false;
        }else if(sensor.fishCategory!==condition.syntheticType)return false;
        const levels={Low:0.25,Medium:0.55,High:0.8};
        if(!Number.isFinite(sensor.fishStrength) ||
           sensor.fishStrength<(levels[condition.level]??1))return false;
      }
      return true;
    case "bottomType":
      return typeof sensor.bottomType === "string" &&
        sensor.bottomType === condition.value;
    case "temperatureRange":
      return Number.isFinite(sensor.temperatureC) &&
        ((sensor.temperatureC >= condition.min &&
          sensor.temperatureC <= condition.max)!==(condition.outside===true));
    case "speedRange":
      return isValidSyntheticSpeed(sensor.speedKn) &&
        ((sensor.speedKn >= condition.min &&
          sensor.speedKn <= condition.max)!==(condition.outside===true));
    case "arrivalRange":
      return Number.isFinite(sensor.arrivalDistanceNm) &&
        Number.isFinite(condition.maxNm) && condition.maxNm>0 &&
        sensor.arrivalDistanceNm<=condition.maxNm;
    default:
      return false;
  }
}

export function evaluateFcvAlarms(profiles = [], observation = {}, previous = null) {
  const activeIds = profiles.filter(p => p.enabled && Array.isArray(p.conditions) &&
    p.conditions.some(c => c.enabled !== false) &&
    p.conditions.every(c => matchCondition(c,observation))).map(p => p.id);
  const acknowledgedIds = (previous?.acknowledgedIds ?? [])
    .filter(id => activeIds.includes(id));
  return {
    activeIds,
    acknowledgedIds,
    visualActive: activeIds.length > 0,
    audible: activeIds.some(id => !acknowledgedIds.includes(id)),
    sourceClass: "SYNTHETIC_TRAINING_CAUSES",
  };
}

export function acknowledgeFcvAlarms(state) {
  return {...state, acknowledgedIds: [...state.activeIds], audible: false};
}
