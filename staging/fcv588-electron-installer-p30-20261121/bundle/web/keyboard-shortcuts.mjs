/**
 * Device shortcuts remain available from the physical face or page backdrop.
 * Teacher controls own keyboard focus: keys cannot unexpectedly dispatch an
 * FCV operator action or block page scrolling from the instructor panel.
 * Native Enter/Space button activation and MODE/GAIN arrow detents stay intact.
 */
export function shouldRouteFcvShortcut(event){
  if(!event || event.repeat || !event.target?.closest)return false;
  const target=event.target;
  if(target.closest(".training-panel"))return false;
  if(target.closest("input, textarea, select, [contenteditable='true']"))
    return false;
  if(target.closest("button")){
    if(["Enter"," ","Spacebar"].includes(event.key))return false;
    if(/^Arrow(Up|Down|Left|Right)$/.test(event.key) &&
        target.closest("#gain-knob, #mode-knob"))return false;
  }
  return true;
}
