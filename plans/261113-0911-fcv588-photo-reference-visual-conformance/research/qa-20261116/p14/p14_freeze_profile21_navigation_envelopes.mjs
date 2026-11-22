import {writeFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {dirname,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {FCV588_ADAPTER as adapter} from "../../../../../src/devices/fcv588/adapter.mjs";
import {getFcvMenuItems} from "../../../../../src/devices/fcv588/menu-atlas.mjs";
import {TRAINING_SCENARIO as scenario} from "../../../../../src/core/scenario.mjs";
import {createSession,dispatch,createReplayEnvelope,replay,sessionHash} from "../../../../../src/core/session.mjs";
const send=(s,event)=>dispatch(s,adapter,event,scenario),press=(s,control)=>send(s,{kind:"press",control}),pad=(s,direction)=>send(s,{kind:"pad",control:"trackpad",direction});
function boot(){let s=createSession(adapter,scenario);for(const e of [{kind:"down",control:"power"},{kind:"up",control:"power",durationMs:100},{kind:"tick",steps:4}])s=send(s,e);return s;}
function enterData(s,id){if(s.deviceState.overlay?.kind!=="menu")s=press(s,"menu");for(let i=0;s.deviceState.overlay.category!=="Data"&&i<6;i++)s=pad(s,"right");if(s.deviceState.overlay.category!=="Data")throw Error("cannot open Data");const pos=getFcvMenuItems("Data",s.deviceState).findIndex(x=>x.id===id);if(pos<0)throw Error("missing Data row "+id);for(let i=0;s.deviceState.overlay.itemIndex!==pos&&i<25;i++)s=pad(s,"down");if(s.deviceState.overlay.itemIndex!==pos)throw Error("Data navigation mismatch");return press(s,"enter");}
let nav1=enterData(boot(),"data.nav1");nav1=pad(pad(nav1,"down"),"down");nav1=press(nav1,"enter");nav1=pad(nav1,"right");nav1=press(nav1,"enter");if(nav1.deviceState.settings.nav1Box3!=="DEPTH")throw Error("NAV1 target failed");
let nav2=boot();nav2=send(nav2,{kind:"training-fixture",fixture:"navigation",enabled:true});nav2=press(nav2,"mark");if(nav2.deviceState.navigation.waypoints.length!==1)throw Error("waypoint not created");nav2=enterData(nav2,"data.nav2");nav2=press(nav2,"enter");nav2=pad(nav2,"right");nav2=press(nav2,"enter");if(nav2.deviceState.settings.nav2Box1!=="SPEED (STW)")throw Error("NAV2 setting failed");
let nmea=boot();nmea=press(nmea,"menu");nmea=enterData(nmea,"data.tripSource"); // May be choice editor, source status stays synthetic.
if(!nmea.deviceState.overlay)throw Error("NMEA Data menu absent");
const frames=[["P14_LEGACY_PROFILE21_NAV1_ENVELOPE_20261116.json",nav1],["P14_LEGACY_PROFILE21_NAV2_ENVELOPE_20261116.json",nav2],["P14_LEGACY_PROFILE21_DATA_SOURCE_ENVELOPE_20261116.json",nmea]];
const dir=dirname(fileURLToPath(import.meta.url));
for(const [name,s] of frames){const envelope=createReplayEnvelope(s);if(adapter.revision!=="F1-public-reference-21"||s.meta.profileHash!=="f0-fnv1a32-f2d5289b"||sessionHash(replay(adapter,scenario,envelope))!==sessionHash(s))throw Error("canonical NAV replay mismatch "+name);const bytes=JSON.stringify(envelope,null,2)+"\n";const file=resolve(dir,name);writeFileSync(file,bytes,{flag:"wx"});console.log(JSON.stringify({path:file,sha256:createHash("sha256").update(bytes).digest("hex"),sessionHash:sessionHash(s),fingerprint:envelope.contentFingerprint,eventCount:s.events.length,nav1Box3:s.deviceState.settings.nav1Box3,nav2Box1:s.deviceState.settings.nav2Box1,waypointCount:s.deviceState.navigation.waypoints.length,overlay:s.deviceState.overlay?.kind}));}