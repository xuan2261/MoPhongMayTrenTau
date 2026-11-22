import test from "node:test";
import assert from "node:assert/strict";
import {bindRepeatPadControl} from "../web/pad-repeat.mjs";

class TestButton extends EventTarget {
  captures=[];
  setPointerCapture(id){this.captures.push(id);}
}
function input(target,type,fields={}){
  const event=new Event(type,{cancelable:true});
  for(const [k,v] of Object.entries(fields))Object.defineProperty(event,k,{value:v});
  target.dispatchEvent(event);
  return event;
}
function clock(){
  let now=0,nextId=1;
  const jobs=new Map();
  return {
    schedule(fn,delay){
      const id=nextId++;
      jobs.set(id,{at:now+delay,fn});
      return id;
    },
    cancel(id){jobs.delete(id);},
    advance(milliseconds){
      const end=now+milliseconds;
      for(let i=0;i<200;i++){
        const due=[...jobs.entries()]
          .filter(([,job])=>job.at<=end)
          .sort((a,b)=>a[1].at-b[1].at || a[0]-b[0])[0];
        if(!due)break;
        const [id,job]=due;
        jobs.delete(id);
        now=job.at;
        job.fn();
      }
      now=end;
    },
    get pending(){return jobs.size;},
  };
}
function rig(){
  const button=new TestButton();
  const documentTarget=new EventTarget();
  const windowTarget=new EventTarget();
  const time=clock();
  const events=[];
  const binding=bindRepeatPadControl({
    button,direction:"right",documentTarget,windowTarget,
    emit:event=>events.push(event),
    schedule:time.schedule.bind(time),cancelTimer:time.cancel.bind(time),
    initialDelayMs:450,repeatDelayMs:150,
  });
  return {button,documentTarget,windowTarget,time,events,binding};
}
const right={kind:"pad",control:"trackpad",direction:"right"};

test("TrackPad pointerdown produces one edge, then bounded autorepeat; pointer identity/cancel stops it",()=>{
  const r=rig();
  input(r.button,"pointerdown",{button:0,isPrimary:true,pointerId:8});
  assert.deepEqual(r.events,[right]);
  assert.deepEqual(r.button.captures,[8]);
  input(r.button,"pointerup",{pointerId:9});
  r.time.advance(449);
  assert.equal(r.events.length,1);
  r.time.advance(1);
  assert.equal(r.events.length,2);
  r.time.advance(300);
  assert.equal(r.events.length,4);
  input(r.button,"pointercancel",{pointerId:8});
  assert.equal(r.time.pending,0);
  r.time.advance(1000);
  assert.equal(r.events.length,4);
  r.binding.dispose();
});

test("TrackPad native click is not double-dispatched after pointer input; accessibility click still works",()=>{
  const r=rig();
  input(r.button,"pointerdown",{button:0,isPrimary:true,pointerId:2});
  input(r.button,"pointerup",{pointerId:2});
  input(r.button,"click",{detail:1});
  assert.deepEqual(r.events,[right]);
  input(r.button,"click",{detail:0});
  assert.deepEqual(r.events,[right,right]);
  input(r.button,"pointerdown",{button:2,isPrimary:true,pointerId:5});
  input(r.button,"pointerdown",{button:0,isPrimary:false,pointerId:6});
  assert.equal(r.events.length,2);
  r.binding.dispose();
});

test("TrackPad keyboard hold repeats without keydown.repeat doubles and always releases off-button",()=>{
  const r=rig();
  input(r.button,"keydown",{key:"Enter",repeat:false});
  input(r.button,"keydown",{key:"Enter",repeat:true});
  assert.equal(r.events.length,1);
  r.time.advance(450);
  assert.equal(r.events.length,2);
  input(r.documentTarget,"keyup",{key:" ",repeat:false});
  assert.equal(r.time.pending,1);
  input(r.documentTarget,"keyup",{key:"Enter",repeat:false});
  assert.equal(r.time.pending,0);
  r.time.advance(1000);
  assert.equal(r.events.length,2);
  input(r.button,"keydown",{key:" ",repeat:false});
  input(r.windowTarget,"blur");
  assert.equal(r.time.pending,0);
  r.binding.dispose();
});

test("TrackPad reset/dispose never strand timers or leak repeated events",()=>{
  const r=rig();
  input(r.button,"pointerdown",{button:0,isPrimary:true,pointerId:1});
  assert.equal(r.binding.cancel(),true);
  assert.equal(r.binding.cancel(),false);
  r.time.advance(700);
  assert.equal(r.events.length,1);
  input(r.button,"pointerdown",{button:0,isPrimary:true,pointerId:3});
  r.binding.dispose();
  r.time.advance(1000);
  assert.equal(r.events.length,2);
  input(r.button,"pointerdown",{button:0,isPrimary:true,pointerId:4});
  assert.equal(r.events.length,2);
});
