import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const ROOT = 'C:/Work/MoPhongMayTrenTau';
const base = resolve(ROOT);
const imp=async p=>import(pathToFileURL(join(base,p)).href);
const {planFcvScreenLayout,planFcvDepthReadout,planFcvNavRows}=await imp('src/devices/fcv588/display-layout.mjs');
const {initialFcv588State}=await imp('src/devices/fcv588/model.mjs');
const {projectFcvPhotoStatusHeader,projectFcvDepthTicks,shouldShowFcvGlobalDepth}=await imp('web/lcd-presentation.mjs');
const {projectFcvZoomWindowMarker}=await imp('src/devices/fcv588/display-widgets.mjs');
const sha=x=>createHash('sha256').update(x).digest('hex');
const tracked=['src/devices/fcv588/display-layout.mjs','src/devices/fcv588/model.mjs','web/lcd-presentation.mjs','src/devices/fcv588/display-widgets.mjs','web/app.mjs'];
const pre=Object.fromEntries(await Promise.all(tracked.map(async p=>[p,sha(await readFile(join(base,p)))])));
const modes=['LF','HF','DUAL','LF-ZOOM','HF-ZOOM','NAV1','NAV2'];
const zoomTypes=['Bottom Lock','Bottom Zoom','Marker Zoom'];
const viewports=[{width:375,height:812},{width:1366,height:768},{width:1920,height:1080}];
const labels={'Bottom Lock':'BL','Bottom Zoom':'BZ','Marker Zoom':'MZ'};
const cases=[];const failures=[];let checks=0;
function chk(name,fn){ checks++;try{fn()}catch(e){failures.push({name,error:e.message});} }
for(const viewport of viewports)for(const mode of modes)for(const zoomMode of zoomTypes){
 const s=initialFcv588State();s.power='on';s.mode=mode;s.settings={...s.settings,zoomMode,windowRatio:'50',battery:'Off',pictureAdvance:'1x',headerInfo:'On'};
 const before=structuredClone(s);
 const logical={width:480,height:640};
 const layout=planFcvScreenLayout(s,logical);
 const panes=Object.values(layout.panes);
 const id=`${viewport.width}x${viewport.height}/${mode}/${zoomMode}`;
 const p={id,viewport,mode,zoomMode,paneKeys:Object.keys(layout.panes),header:null,checks:0};
 const go=(name,fn)=>{chk(id+' '+name,fn);p.checks++};
 go('horizontal coverage/no overlap',()=>{let x=0;for(const pane of panes){assert.equal(pane.x,x);assert.equal(pane.y,0);assert.equal(pane.height,640);assert.ok(pane.width>0);x+=pane.width}assert.equal(x,480)});
 go('layout type',()=>{if(mode==='DUAL')assert.deepEqual(p.paneKeys,['lf','hf']);else if(mode.includes('ZOOM'))assert.deepEqual(p.paneKeys,['zoom','normal']);else if(mode.startsWith('NAV'))assert.deepEqual(p.paneKeys,['nav','sonar']);else assert.deepEqual(p.paneKeys,['normal'])});
 go('DIVIDER and NAV origin',()=>{const depth=planFcvDepthReadout(s,layout,logical);if(mode==='DUAL'){assert.equal(depth.kind,'dual-divider');assert.equal(depth.anchorX,layout.panes.hf.x)}else assert.equal(depth.kind,'left');if(mode.startsWith('NAV')){assert.equal(layout.panes.nav.width,320);assert.equal(layout.panes.sonar.x,320);assert.equal(shouldShowFcvGlobalDepth(mode,[]),false)}else assert.equal(shouldShowFcvGlobalDepth(mode,[]),true)});
 const h=projectFcvPhotoStatusHeader(s);p.header=h.text;
 go('mode/header/source',()=>{if(mode.startsWith('NAV')){assert.equal(h.text,'');assert.equal(h.modeLabel,mode)}else if(mode==='DUAL')assert.equal(h.modeLabel,'LF/HF');else if(mode.includes('ZOOM'))assert.equal(h.modeLabel,labels[zoomMode]+'-'+mode.slice(0,2));else assert.equal(h.modeLabel,mode);if(!mode.startsWith('NAV'))assert.ok(h.text.includes('x1'))});
 go('Battery On cannot invent voltage',()=>{const b=projectFcvPhotoStatusHeader({...s,settings:{...s.settings,battery:'On'}});assert.equal(b.batteryStatus,'NO_HARDWARE_DATA');assert.ok(!b.text.includes('x1'));assert.ok(!/\d+(\.\d+)?\s*V\b/.test(b.text))});
 go('zoom/manual scale',()=>{const f=mode.includes('ZOOM')?{startDepthM:45,rangeM:5,windowDepthM:5,zoomMode}:{startDepthM:0,rangeM:20};const ts=projectFcvDepthTicks(f,{height:640,top:66,bottom:12,units:'Metric',axis:mode.includes('ZOOM')&&zoomMode==='Bottom Lock'?'bottom-lock':'absolute'});assert.ok(ts.length>0);assert.ok(ts.every((t,i)=>t.y>=66&&t.y<=628&&(i===0||t.y>=ts[i-1].y)));if(mode.includes('ZOOM')&&zoomMode==='Bottom Lock'){assert.equal(ts[0].depthM,5);assert.equal(ts.at(-1).depthM,0)}});
 go('source/view not mutated',()=>assert.deepEqual(s,before));
 cases.push(p);
}
for(const n of [2,4]){const navRows=planFcvNavRows(Array.from({length:n},(_,i)=>({label:i===0?'POSITION':i===n-1?'DEPTH':'SPEED (STW)',value:'NO DATA'})),{x:0,y:0,width:320,height:640});chk('NAV '+n+' rows separated/bounded',()=>{assert.equal(navRows.length,n);assert.ok(navRows.every((r,i)=>r.y>=0&&r.y+r.height<=640+1e-10&&(i===0||r.y>=navRows[i-1].y+navRows[i-1].height-1e-8)));assert.equal(navRows.filter(x=>x.separatorY!==null).length,n-1)});}
for(const ratio of ['25','50','75']){const s={mode:'DUAL',settings:{windowRatio:ratio}};const layout=planFcvScreenLayout(s,{width:480,height:640});chk('DUAL ratio '+ratio,()=>{assert.equal(layout.panes.hf.x,Math.round(480*Number(ratio)/100));assert.equal(planFcvDepthReadout(s,layout).anchorX,layout.panes.hf.x)});}
const post=Object.fromEntries(await Promise.all(tracked.map(async p=>[p,sha(await readFile(join(base,p)))])));
chk('source frozen during P07 pure QA',()=>assert.deepEqual(post,pre));
const out=process.argv[2];if(!out)throw new Error('receipt path required');
const report={schema:'fcv588-p07-pure-display-matrix-v1',date:'2026-11-16',runOn:'WINDOWS_CANONICAL_READ_ONLY',logicalLCD:{width:480,height:640},externalViewports:viewports,modeCount:modes.length,zoomCount:zoomTypes.length,caseCount:cases.length,checks,status:failures.length===0?'PASS':'FAILED',failures,trackedSourceSha256:post,sourceStable:JSON.stringify(pre)===JSON.stringify(post),cases,limits:['Geometry projector is 480x640 logical and repeated under external viewport labels; real CSS/Chrome viewport acceptance is separate','No OEM photometric/physical/firmware/rights claim','The 3 zoom choices are inert for non-ZOOM modes']};
await writeFile(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:report.status,caseCount:report.caseCount,checks:report.checks,failures:failures.length,receipt:out,receiptSHA256:sha(await readFile(out))}));if(failures.length)process.exitCode=2;