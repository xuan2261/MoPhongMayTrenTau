/**
 * Browser-only TrackPad adapter. A held pointer or focused Enter/Space uses
 * conservative classroom cadence; FCV-588 physical repeat timings are UNKNOWN.
 * Every repeat is dispatched as an ordinary pad event into the replay log.
 */
export function bindRepeatPadControl({
  button,direction,emit,
  documentTarget=document,windowTarget=window,
  schedule=(fn,ms)=>setTimeout(fn,ms),
  cancelTimer=handle=>clearTimeout(handle),
  initialDelayMs=450,repeatDelayMs=150,
}){
  if(!button || typeof emit!=="function" ||
      !["up","down","left","right"].includes(direction) ||
      !Number.isInteger(initialDelayMs) || initialDelayMs<250 || initialDelayMs>2000 ||
      !Number.isInteger(repeatDelayMs) || repeatDelayMs<70 || repeatDelayMs>1000){
    throw new TypeError("invalid synthetic pad repeat binding");
  }
  let active=null,timer=null,disposed=false;
  let suppressKeyboardClick=false;
  const edge=()=>emit({kind:"pad",control:"trackpad",direction});
  function arm(delay){
    timer=schedule(()=>{
      timer=null;
      if(!active || disposed)return;
      edge();
      arm(repeatDelayMs);
    },delay);
  }
  function begin(kind,id){
    if(disposed || active)return false;
    active={kind,id};
    edge();
    arm(initialDelayMs);
    return true;
  }
  function cancel(){
    if(!active)return false;
    active=null;
    if(timer!==null){cancelTimer(timer);timer=null;}
    return true;
  }
  function pointerDown(event){
    if(event.button!==0 || event.isPrimary===false || active)return;
    try{button.setPointerCapture?.(event.pointerId);}catch{return;}
    begin("pointer",event.pointerId);
    event.preventDefault();
  }
  function pointerUp(event){
    if(active?.kind!=="pointer" || active.id!==event.pointerId)return;
    cancel();
    event.preventDefault();
  }
  function pointerCancel(event){
    if(active?.kind==="pointer" && active.id===event.pointerId)cancel();
  }
  function keyDown(event){
    if(!["Enter"," "].includes(event.key))return;
    event.preventDefault();
    if(event.repeat || active)return;
    begin("keyboard",event.key);
  }
  function keyUp(event){
    if(active?.kind!=="keyboard" || active.id!==event.key)return;
    cancel();
    // On some browsers a focused button also emits a click on key release.
    // The adapter already emitted on keydown: discard that synthetic click.
    suppressKeyboardClick=true;
    queueMicrotask(()=>{suppressKeyboardClick=false;});
    event.preventDefault();
  }
  function onClick(event){
    // A regular pointer click follows pointerdown; it was already delivered.
    // A standalone detail=0 click (screen reader/assistive activation) gets
    // one pad event unless it follows this binding's own keyboard hold.
    if(event.detail===0 && !active && !suppressKeyboardClick)edge();
  }
  function focusLost(){if(active?.kind==="keyboard")cancel();}
  function windowBlur(){cancel();}
  button.addEventListener("pointerdown",pointerDown);
  button.addEventListener("pointerup",pointerUp);
  button.addEventListener("pointercancel",pointerCancel);
  button.addEventListener("lostpointercapture",pointerCancel);
  button.addEventListener("keydown",keyDown);
  button.addEventListener("blur",focusLost);
  button.addEventListener("click",onClick);
  documentTarget.addEventListener("keyup",keyUp,true);
  windowTarget.addEventListener("blur",windowBlur);
  return {
    cancel,
    dispose(){
      if(disposed)return;
      cancel();
      disposed=true;
      button.removeEventListener("pointerdown",pointerDown);
      button.removeEventListener("pointerup",pointerUp);
      button.removeEventListener("pointercancel",pointerCancel);
      button.removeEventListener("lostpointercapture",pointerCancel);
      button.removeEventListener("keydown",keyDown);
      button.removeEventListener("blur",focusLost);
      button.removeEventListener("click",onClick);
      documentTarget.removeEventListener("keyup",keyUp,true);
      windowTarget.removeEventListener("blur",windowBlur);
    },
  };
}
