/** Deterministic OFFLINE waypoint and NAV projection. Never emits NMEA/GPS. */
import {formatFcvDepth,formatFcvTemperature,formatFcvSpeed,
  formatFcvDistance} from "./units-profile21.mjs";
import {FCV_NAV_BOX_DEFAULTS,FCV_NAV_BOX_OPTIONS} from "./menu-atlas-profile21.mjs";
export const createNavigationState=()=>({
  waypoints:[],destinationId:null,nextWaypointNumber:1,
  tripNm:0,odometerNm:0,
});
/** Classroom-only STW/SOG integral; does not navigate a real ship. */
export function advanceTrainingTrip(state,speedKn,elapsedSeconds){
  if(!Number.isFinite(speedKn)||speedKn<0||
     !Number.isInteger(elapsedSeconds)||elapsedSeconds<1||elapsedSeconds>20)
    return state;
  const incrementNm=speedKn*elapsedSeconds/3600;
  return {...state,tripNm:state.tripNm+incrementNm,
    odometerNm:state.odometerNm+incrementNm};
}

export const isValidSyntheticPosition=p=>p && p.source==="SYNTHETIC_FIXTURE" &&
  Number.isFinite(p.lat) && p.lat>=-90 && p.lat<=90 &&
  Number.isFinite(p.lon) && p.lon>=-180 && p.lon<=180;
export const isValidSyntheticSpeed=speedKn=>
  Number.isFinite(speedKn) && speedKn>=0;
const validAngle=degrees=>Number.isFinite(degrees) &&
  degrees>=0 && degrees<360;
const positionValid=isValidSyntheticPosition;
/** One hemisphere-safe coordinate representation across the two NAV layouts. */
export const formatSyntheticPosition=p=>"SIM "+
  Math.abs(p.lat).toFixed(4)+"°"+(p.lat>=0?"N":"S")+" "+
  Math.abs(p.lon).toFixed(4)+"°"+(p.lon>=0?"E":"W");
/** Great-circle classroom range ONLY between two typed synthetic positions. */
export function distanceNmBetween(a,b){
  if(!positionValid(a)||!positionValid(b))return null;
  const radians=Math.PI/180;
  const dLat=(b.lat-a.lat)*radians;
  const dLon=(b.lon-a.lon)*radians;
  const h=Math.sin(dLat/2)**2+
    Math.cos(a.lat*radians)*Math.cos(b.lat*radians)*Math.sin(dLon/2)**2;
  return 3440.065*2*Math.asin(Math.min(1,Math.sqrt(h)));
}
const validateName=name=>{
  if(typeof name!=="string" || !name.trim() || name.length>8)
    throw new RangeError("invalid waypoint name");
  return name.trim();
};

export function addWaypoint(state,{name,position}={}) {
  if(!positionValid(position)) throw new Error("synthetic waypoint position missing");
  // FCV-588 Operator's Manual §1.20 documents capacity for 20 waypoints.
  if(state.waypoints.length>=20) throw new RangeError("waypoint limit 20");
  const id="WP"+String(state.nextWaypointNumber).padStart(3,"0");
  const waypoint={id,name:validateName(name),position:{...position}};
  return {...state,nextWaypointNumber:state.nextWaypointNumber+1,
    waypoints:[...state.waypoints,waypoint]};
}

export function editWaypoint(state,id,{name,position}={}) {
  if(!state.waypoints.some(w=>w.id===id)) throw new Error("unknown waypoint");
  if(position!==undefined && !positionValid(position)) throw new Error("invalid synthetic position");
  return {...state,waypoints:state.waypoints.map(w=>w.id===id
    ? {...w,name:name===undefined?w.name:validateName(name),
      position:position===undefined?w.position:{...position}}:w)};
}

export function deleteWaypoint(state,id) {
  if(!state.waypoints.some(w=>w.id===id)) throw new Error("unknown waypoint");
  if(state.destinationId===id) throw new Error("destination waypoint protected");
  return {...state,waypoints:state.waypoints.filter(w=>w.id!==id),
    destinationId:state.destinationId};
}

export function setDestination(state,id) {
  if(id===null) return {...state,destinationId:null};
  if(!state.waypoints.some(w=>w.id===id)) throw new Error("unknown waypoint destination");
  return {...state,destinationId:id};
}

/**
 * A configured NMEA Trip source without a receiver must never reuse the
 * previously accumulated Own trip as though it came from the selected port.
 * The stored classroom counters are unchanged, including Odometer history.
 * This pure projection is shared by NAV boxes and the operator Trip overlay.
 */
export function projectFcvTravelValues(navState,settings){
  const externalTrip=settings?.tripSource==="NMEA";
  return {
    tripNm:externalTrip?null:
      Number.isFinite(navState?.tripNm)?navState.tripNm:null,
    odometerNm:Number.isFinite(navState?.odometerNm)?navState.odometerNm:null,
    tripSourceStatus:externalTrip?"NO EXTERNAL RECEIVER":"SYNTHETIC OWN",
  };
}

const noData=status=>({status,boxes:[
  {label:"POSITION",value:"NO DATA"},{label:"SPEED",value:"NO DATA"},
],trainingOnly:true});

export function projectNavData(sample,mode,{
  simTick=0,staleAfterTicks=10,units="Metric",speedUnit="kn",
}={}) {
  if(!sample || !positionValid(sample.position) ||
      !Number.isInteger(sample.observedAtTick)) return noData("NO_DATA");
  if(simTick-sample.observedAtTick>staleAfterTicks ||
      simTick<sample.observedAtTick) return noData("STALE_DATA");
  const pos=formatSyntheticPosition(sample.position);
  const boxes=mode==="NAV1"
    ? [{label:"POSITION",value:pos},
      {label:"DEPTH",value:Number.isFinite(sample.depthM)
        ? formatFcvDepth(sample.depthM,units)+" (SIM)":"NO DATA"}]
    : [{label:"POSITION",value:pos},
      {label:"SPEED",value:isValidSyntheticSpeed(sample.speedKn)
        ? formatFcvSpeed(sample.speedKn,speedUnit)+" (SIM)":"NO DATA"},
      {label:"COURSE",value:validAngle(sample.courseDeg)
        ? sample.courseDeg.toFixed(0)+"° (SIM)":"NO DATA"}];
  return {status:"SYNTHETIC_DATA",boxes,trainingOnly:true};
}

/**
 * Manual OME-23890-E §1.4.4, PDF page 11 (printed page 4):
 * NAV1 defaults STW and wind; NAV2 defaults depth, temperature, trip and odometer.
 * Only explicitly authored classroom samples appear. Wind remains NO DATA.
 */
export function projectFcvManualNavBoxes({
  mode="NAV1",simTick=0,sample=null,navState=null,settings=null,
  sonarDepthM=null,units="Metric",tempUnit="C",speedUnit="kn",
  distanceUnit="NM",staleAfterTicks=10,
}={}){
  if(!["NAV1","NAV2"].includes(mode))throw new RangeError("unknown NAV view");
  const observed=sample?.observedAtTick;
  const valid=positionValid(sample?.position) && Number.isInteger(observed) &&
    Number.isInteger(simTick) && simTick>=observed &&
    simTick-observed<=staleAfterTicks;
  const stale=Number.isInteger(observed) && simTick-observed>staleAfterTicks;
  const sim=value=>value===null?"NO DATA":String(value)+" (SIM)";
  const depth=Number.isFinite(sonarDepthM)
    ?sim(formatFcvDepth(sonarDepthM,units)):"NO DATA";
  const speed=valid && settings?.speedSource!=="NMEA" &&
      isValidSyntheticSpeed(sample.speedKn)
    ?sim(formatFcvSpeed(sample.speedKn,speedUnit)):"NO DATA";
  const temp=valid && settings?.tempSource!=="NMEA" &&
      Number.isFinite(sample.temperatureC)
    ?sim(formatFcvTemperature(sample.temperatureC,tempUnit)):"NO DATA";
  const travel=projectFcvTravelValues(navState,settings);
  const distance=field=>valid && Number.isFinite(travel[field])
    ?sim(distanceUnit==="NM"?travel[field].toFixed(3)+" nm":
      formatFcvDistance(travel[field],distanceUnit)):"NO DATA";
  const position=valid?formatSyntheticPosition(sample.position):"NO DATA";
  const course=valid && validAngle(sample.courseDeg)
    ?sim(sample.courseDeg.toFixed(0)+"°"):"NO DATA";
  // A synthetic ownship position is not automatically a heading, bearing,
  // separate SOG receiver, atmospheric-pressure sensor or XTE observation.
  // Such independent fields need an explicit, field-specific training source.
  const fieldIsTyped=field=>valid &&
    Object.hasOwn(sample?.fieldSources??{},field) &&
    sample.fieldSources[field]==="SYNTHETIC_FIXTURE";
  const sog=fieldIsTyped("speedOverGroundKn") &&
      isValidSyntheticSpeed(sample.speedOverGroundKn)
    ?sim(formatFcvSpeed(sample.speedOverGroundKn,speedUnit)):"NO DATA";
  const bearing=fieldIsTyped("bearingDeg") && validAngle(sample.bearingDeg)
    ?sim(sample.bearingDeg.toFixed(0)+"°"):"NO DATA";
  const heading=fieldIsTyped("headingDeg") && validAngle(sample.headingDeg)
    ?sim(sample.headingDeg.toFixed(0)+"°"):"NO DATA";
  const pressure=fieldIsTyped("barometerHPa") &&
      Number.isFinite(sample.barometerHPa) && sample.barometerHPa>0
    ?sim(sample.barometerHPa.toFixed(1)+" hPa"):"NO DATA";
  const crossTrack=fieldIsTyped("crossTrackNm") &&
      Number.isFinite(sample.crossTrackNm)
    ?sim(formatFcvDistance(sample.crossTrackNm,distanceUnit)):"NO DATA";
  // The Data > RANGE box is range TO the selected synthetic waypoint, not
  // the sounder's water-depth RANGE knob. Neither a waypoint nor a position
  // may be substituted from untyped/external ship data. The same deterministic
  // great-circle distance is already used by the synthetic Arrival lesson.
  const destination=navState?.waypoints?.find(waypoint=>
    waypoint.id===navState.destinationId);
  const rangeNm=valid && destination
    ?distanceNmBetween(sample.position,destination.position):null;
  const waypointRange=Number.isFinite(rangeNm)
    ?sim(distanceUnit==="NM"?rangeNm.toFixed(2)+" nm":
      formatFcvDistance(rangeNm,distanceUnit)):"NO DATA";
  // §1.4.4 NAV indication: an OFFLINE teaching estimate based solely on the
  // same synthetic movement speed used by the one canonical world fixture
  // and a selected synthetic destination. It is NOT a receiver ETA, an OEM
  // predictor, or an assertion of heading/track to that waypoint. Selecting
  // an unavailable NMEA source or losing/staling either input must hide it.
  const ownSpeedKn=valid && settings?.speedSource!=="NMEA"
    ?sample?.speedKn:null;
  const minutes=Number.isFinite(rangeNm) && Number.isFinite(ownSpeedKn) &&
    ownSpeedKn>0 ?Math.ceil(rangeNm*60/ownSpeedKn):null;
  const timeToGo=Number.isSafeInteger(minutes) && minutes>=0 &&
    minutes<=99*60+59
    ?String(Math.floor(minutes/60)).padStart(2,"0")+":"+
      String(minutes%60).padStart(2,"0")+" (SIM EST)"
    :"NO DATA";
  // Position/course are not substitutes for true bearing, ship heading or
  // wind sensors; those fields stay NO DATA without separately typed inputs.
  const values={"SPEED (STW)":speed,WIND:"NO DATA",DEPTH:depth,
    TEMPERATURE:temp,TRIP:distance("tripNm"),ODOMETER:distance("odometerNm"),
    POSITION:position,COURSE:course,"SPEED (SOG)":sog,
    RANGE:waypointRange,BEARING:bearing,HEADING:heading,
    "BAROM PRESS":pressure,"TIME TO GO":timeToGo,XTE:crossTrack};
  const defaults=FCV_NAV_BOX_DEFAULTS[mode];
  const boxes=defaults.map((fallback,i)=>{
    const selected=settings?.[mode.toLowerCase()+"Box"+(i+1)];
    const label=FCV_NAV_BOX_OPTIONS.includes(selected) &&
      (i>=2 || selected!=="Off")?selected:fallback;
    const labelled=label==="BEARING" && settings?.bearing==="Mag"
      ?"BEARING (MAG)"
      :label==="WIND" && settings?.windSpeedDirection==="Apparent"
        ?"WIND (APPARENT)"
        :label;
    return {label:labelled,value:values[label]??"NO DATA"};
  }).filter(item=>item.label!=="Off");
  return {status:valid?"SYNTHETIC_DATA":stale?"STALE_DATA":"NO_DATA",
    boxes,trainingOnly:true,hardwareValidated:false,
    sourceClass:"SIMULATED_ONLY"};
}
