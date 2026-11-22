/** Original training-only pointer gesture adapter for an illustrated rotary. */
export function bindRotaryDragControl({button,control,emit,windowTarget=window,stepPixels=18}){
  if(!button || !["mode","gain"].includes(control) ||
    typeof emit!=="function" || !Number.isFinite(stepPixels) || stepPixels<8 ||
    stepPixels>80)throw new TypeError("invalid rotary input binding");
  // The vertical gesture is an original classroom input convention, NOT an
  // assertion about mechanical OEM detents, knob torque or rotary cadence.
  // Device core receives only ordinary replayable rotate events.
  let active=null;
  let suppressPointerClick=false;
  let disposed=false;
  function cancel(){
    if(!active)return false;
    active=null;
    suppressPointerClick=false;
    return true;
  }
  function onPointerDown(event){
    if(disposed || active || event.button!==0 || event.isPrimary===false ||
        !Number.isFinite(event.clientY))return;
    try{button.setPointerCapture?.(event.pointerId);}catch{return;}
    suppressPointerClick=false;
    active={id:event.pointerId,lastY:event.clientY,moved:false};
  }
  function onPointerMove(event){
    if(!active || event.pointerId!==active.id ||
        !Number.isFinite(event.clientY))return;
    const delta=active.lastY-event.clientY;
    const steps=Math.max(-20,Math.min(20,Math.trunc(delta/stepPixels)));
    if(!steps)return;
    active.lastY-=steps*stepPixels;
    active.moved=true;
    emit({kind:"rotate",control,steps});
    event.preventDefault();
  }
  function onPointerUp(event){
    if(!active || event.pointerId!==active.id)return;
    suppressPointerClick=active.moved;
    active=null;
  }
  function onPointerCancel(event){
    if(active?.id!==event.pointerId)return;
    // A gesture may already have emitted replayable rotate detents before
    // Chromium reports lost capture. The subsequent native click, if any,
    // must not reinterpret those detents as an unrelated GAIN push.
    const moved=active.moved;
    cancel();
    suppressPointerClick=moved;
  }
  button.addEventListener("pointerdown",onPointerDown);
  button.addEventListener("pointermove",onPointerMove);
  button.addEventListener("pointerup",onPointerUp);
  button.addEventListener("pointercancel",onPointerCancel);
  button.addEventListener("lostpointercapture",onPointerCancel);
  windowTarget.addEventListener("blur",cancel);
  return {
    cancel,
    suppressClick(event){
      if(event?.detail===0)return false;
      const suppressed=suppressPointerClick;
      suppressPointerClick=false;
      return suppressed;
    },
    dispose(){
      if(disposed)return;
      cancel();
      disposed=true;
      button.removeEventListener("pointerdown",onPointerDown);
      button.removeEventListener("pointermove",onPointerMove);
      button.removeEventListener("pointerup",onPointerUp);
      button.removeEventListener("pointercancel",onPointerCancel);
      button.removeEventListener("lostpointercapture",onPointerCancel);
      windowTarget.removeEventListener("blur",cancel);
    },
  };
}
