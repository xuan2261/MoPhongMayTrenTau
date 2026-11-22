/**
 * D10 classroom fault cues. These describe authored instructor events, never
 * observed battery voltage, diagnostic error codes or physical FCV hardware.
 */
const FLAGS=Object.freeze([
  ["lowBattery","LOW_BATTERY","LOW BATTERY"],
  ["systemError","SYSTEM_ERROR","SYSTEM ERROR"],
]);
export function projectFcvTrainingFaults(state) {
  return FLAGS.filter(([fixture])=>state?.trainingFixture?.[fixture]===true)
    .map(([,code,label])=>({
      code,label,sourceClass:"SIMULATED_ONLY",hardwareObserved:false,
      clearance:"INSTRUCTOR_CONTROLLED",
    }));
}
