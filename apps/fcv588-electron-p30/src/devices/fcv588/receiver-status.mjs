/** No actual receiver or external vessel links. Pure classroom status projection. */
import {isValidSyntheticPosition,isValidSyntheticSpeed,
  formatSyntheticPosition} from "./navigation.mjs";
import {projectFcvCalibratedReadings} from "./calibration.mjs";
import {formatFcvSpeed} from "./units.mjs";

export function projectFcvTrainingReceiver(state,simTick=0){
  const configured=state?.settings??{};
  const localFixture=state?.trainingFixture?.navigation===true;
  const sample=state?.navigationObservation;
  const observed=sample?.observedAtTick;
  const current=localFixture && isValidSyntheticPosition(sample?.position) &&
    Number.isInteger(observed) &&
    Number.isInteger(simTick) && simTick>=observed &&
    simTick-observed<=10;
  // A historical Own trip counter is not a current position/speed feed.
  // Mark it available only while the typed fixture is fresh; never show
  // an active receiver channel during virtual Tankenmaru suppression
  // (whether via stored/projected Tankenmaru On or active virtual option).
  const tankenmaruActive=configured.tankenmaru==="On";
  const calibrated=projectFcvCalibratedReadings(configured,current?{
    ...sample,sourceClass:"SYNTHETIC_FIXTURE",
    speedKn:isValidSyntheticSpeed(sample?.speedKn)?sample.speedKn:null,
  }:null);
  const validCalibratedSpeed=current && isValidSyntheticSpeed(sample?.speedKn) &&
    isValidSyntheticSpeed(calibrated.speedKn);
  const ownSourceStatus=available=>tankenmaruActive?"INACTIVE_TANKENMARU":
    available?"SYNTHETIC_OWN":"NO_TRAINING_DATA";
  const selectedSources={
    speed:configured.speedSource??"Own",
    temperature:configured.tempSource??"Own",
    trip:configured.tripSource??"Own",
    speedStatus:configured.speedSource==="NMEA"?"NO_EXTERNAL_RECEIVER":
      ownSourceStatus(validCalibratedSpeed),
    tempStatus:configured.tempSource==="NMEA"?"NO_EXTERNAL_RECEIVER":
      ownSourceStatus(current && Number.isFinite(calibrated.temperatureC)),
    tripStatus:configured.tripSource==="NMEA"?"NO_EXTERNAL_RECEIVER":
      ownSourceStatus(current &&
        Number.isFinite(state?.navigation?.tripNm)),
  };
  const speedUnit=["kn","km/h","mph"].includes(configured.speedUnit)
    ?configured.speedUnit:"kn";
  const basic={transport:"NONE",physicalReceiverConnected:false,
    hardwareValidated:false,sourceClass:"SIMULATED_ONLY",positionText:"NO DATA",
    speedText:"NO DATA",selectedSources};
  if(tankenmaruActive)return {
    ...basic,status:"INACTIVE_TANKENMARU",
  };
  if(state?.trainingFixture?.navigation!==true)return {
    ...basic,status:"NO_TRAINING_DATA",
  };
  const position=sample?.position;
  if(!isValidSyntheticPosition(position) ||
    !Number.isInteger(sample.observedAtTick))return {
    ...basic,status:"NO_TRAINING_DATA",
  };
  if(!Number.isInteger(simTick) || simTick<sample.observedAtTick ||
    simTick-sample.observedAtTick>10)return {...basic,status:"STALE_TRAINING_DATA"};
  const speedKn=configured.speedSource==="NMEA" || !validCalibratedSpeed
    ?null:calibrated.speedKn;
  return {...basic,status:"SYNTHETIC_TRAINING_OBSERVATION",
    positionText:formatSyntheticPosition(position),
    observedAtTick:sample.observedAtTick,
    speedKn,
    speedText:speedKn===null?"NO DATA":formatFcvSpeed(speedKn,speedUnit),
  };
}
