/**
 * Browser-only input adapter for a physical hold-capable key.
 * Emits canonical edges; the simulation core determines the hold duration.
 * Pointer identity and keyboard focus are never persisted in replay logs.
 */
export function bindHoldControl({
  button, control, emit, documentTarget = document, windowTarget = window,
  now = () => performance.now(),
}) {
  if (!button || typeof emit !== "function") throw new TypeError("button and emit required");
  let active = null; // {kind: 'pointer', id, startMs} | {kind:'keyboard', key, startMs}
  let suppressSyntheticClick = false;

  const finish = (kind) => {
    if (!active) return false;
    const captured = active;
    active = null;
    button.classList.remove("pressing");
    // Browsers may send an additional detail=0 click after Enter/Space keyup.
    // It must not repeat an already logged hold, including a canceled hold.
    suppressSyntheticClick = true;
    queueMicrotask(() => { suppressSyntheticClick = false; });
    if (kind === "up") {
      const durationMs = Math.max(0, Math.min(120000, Math.round(now() - captured.startMs)));
      emit({kind, control, durationMs});
    } else {
      emit({kind, control});
    }
    return true;
  };

  function onPointerDown(event) {
    if (event.button !== 0 || !event.isPrimary || active) return;
    try {
      button.setPointerCapture?.(event.pointerId);
    } catch {
      // Failed capture is not a registered physical down edge. Emitting
      // "cancel" here would create an orphan core event, which rejects.
      return;
    }
    active = {kind: "pointer", id: event.pointerId, startMs: now()};
    button.classList.add("pressing");
    emit({kind: "down", control});
    event.preventDefault();
  }
  function onPointerUp(event) {
    if (active?.kind !== "pointer" || event.pointerId !== active.id) return;
    finish("up");
    event.preventDefault();
  }
  function onPointerCancel(event) {
    if (active?.kind !== "pointer" || event.pointerId !== active.id) return;
    finish("cancel");
  }
  function onKeyDown(event) {
    if (![" ", "Enter"].includes(event.key) || event.repeat || active) return;
    active = {kind: "keyboard", key: event.key, startMs: now()};
    button.classList.add("pressing");
    emit({kind: "down", control});
    event.preventDefault();
  }
  // Listen on the document, not only the original button: a keyup can reach
  // another focused element if focus changed while a key was held.
  function onDocumentKeyUp(event) {
    if (active?.kind !== "keyboard" || event.key !== active.key) return;
    finish("up");
    event.preventDefault();
  }
  function onFocusLost() {
    if (active?.kind === "keyboard") finish("cancel");
  }
  function onLostPointerCapture(event) {
    onPointerCancel(event);
  }
  function onWindowBlur() {
    finish("cancel");
  }
  function onClick(event) {
    // Assistive technologies invoke native button activation without pointer
    // or key edges. Treat that as a single short, replayable physical action;
    // ordinary pointer clicks and post-keyup native clicks are already owned.
    if(event.detail!==0 || active || suppressSyntheticClick)return;
    emit({kind:"down",control});
    emit({kind:"up",control,durationMs:0});
  }

  button.addEventListener("pointerdown", onPointerDown);
  button.addEventListener("pointerup", onPointerUp);
  button.addEventListener("pointercancel", onPointerCancel);
  button.addEventListener("lostpointercapture", onLostPointerCapture);
  button.addEventListener("keydown", onKeyDown);
  button.addEventListener("blur", onFocusLost);
  button.addEventListener("click", onClick);
  documentTarget.addEventListener("keyup", onDocumentKeyUp, true);
  windowTarget.addEventListener("blur", onWindowBlur);

  return {
    cancel: () => finish("cancel"),
    dispose() {
      finish("cancel");
      button.removeEventListener("pointerdown", onPointerDown);
      button.removeEventListener("pointerup", onPointerUp);
      button.removeEventListener("pointercancel", onPointerCancel);
      button.removeEventListener("lostpointercapture", onLostPointerCapture);
      button.removeEventListener("keydown", onKeyDown);
      button.removeEventListener("blur", onFocusLost);
      button.removeEventListener("click", onClick);
      documentTarget.removeEventListener("keyup", onDocumentKeyUp, true);
      windowTarget.removeEventListener("blur", onWindowBlur);
    },
  };
}
