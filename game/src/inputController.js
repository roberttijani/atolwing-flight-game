// Responsive keyboard & mouse flight controls with discrete action triggers.

export function createInputController(canvasElement) {
  const keys = new Set();
  const pending = {
    flapStep: false,
    toggleCamera: false,
    toggleTailhook: false,
    resetSortie: false,
    togglePause: false,
    toggleMute: false,
    dropCargo: false,
    brakeLatch: false,
    anyInteraction: false,
  };

  let pointerDragging = false;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let lookDeltaX = 0;
  let lookDeltaY = 0;

  const isTypingTarget = (target) => {
    if (!target || !target.tagName) return false;
    const tag = target.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select';
  };

  const onKeyDown = (event) => {
    if (isTypingTarget(event.target)) return;
    const code = event.code;
    pending.anyInteraction = true;

    if (
      [
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'Space',
      ].includes(code) &&
      document.activeElement?.tagName?.toLowerCase() !== 'button'
    ) {
      event.preventDefault();
    }

    if (!event.repeat) {
      if (code === 'KeyF') pending.flapStep = true;
      else if (code === 'KeyC') pending.toggleCamera = true;
      else if (code === 'KeyH') pending.toggleTailhook = true;
      else if (code === 'KeyR') pending.resetSortie = true;
      else if (code === 'KeyM') pending.toggleMute = true;
      else if (code === 'KeyP' || code === 'Escape') pending.togglePause = true;
      else if (code === 'Space') pending.dropCargo = true;
    }

    keys.add(code);
  };

  const onKeyUp = (event) => {
    keys.delete(event.code);
  };

  const onBlur = () => {
    keys.clear();
    pointerDragging = false;
  };

  const onPointerDown = (event) => {
    if (event.button !== 0) return;
    pending.anyInteraction = true;
    pointerDragging = true;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
  };

  const onPointerMove = (event) => {
    if (!pointerDragging) return;
    lookDeltaX += (event.clientX - lastPointerX) * 0.0032;
    lookDeltaY += (event.clientY - lastPointerY) * 0.0026;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
  };

  const onPointerUp = () => {
    pointerDragging = false;
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  if (canvasElement) {
    canvasElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }

  return {
    keys,
    pending,
    triggerAction(actionName) {
      pending.anyInteraction = true;
      if (actionName === 'brakes') {
        pending.brakeLatch = !pending.brakeLatch;
      } else if (actionName in pending) {
        pending[actionName] = true;
      }
    },
    consumeLookDelta() {
      const out = { dx: lookDeltaX, dy: lookDeltaY };
      lookDeltaX = 0;
      lookDeltaY = 0;
      return out;
    },
  };
}

export function samplePilotControls(input) {
  const { keys, pending } = input;

  // Pitch: S / ArrowDown pulls nose up (+1), W / ArrowUp pushes nose down (-1)
  let pitch = 0;
  if (keys.has('KeyS') || keys.has('ArrowDown')) pitch += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) pitch -= 1;

  // Roll: D / ArrowRight banks right (+1), A / ArrowLeft banks left (-1)
  let roll = 0;
  if (keys.has('KeyD') || keys.has('ArrowRight')) roll += 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) roll -= 1;

  // Yaw: E yaws right (+1), Q yaws left (-1)
  let yaw = 0;
  if (keys.has('KeyE')) yaw += 1;
  if (keys.has('KeyQ')) yaw -= 1;

  // Throttle: Shift / Equal / KeyZ increases, Control / Minus / KeyX decreases
  let throttleDelta = 0;
  if (keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('Equal') || keys.has('KeyZ')) {
    throttleDelta += 0.42;
  }
  if (keys.has('ControlLeft') || keys.has('ControlRight') || keys.has('Minus') || keys.has('KeyX')) {
    throttleDelta -= 0.42;
  }

  const flapStep = pending.flapStep;
  const toggleCamera = pending.toggleCamera;
  const toggleTailhook = pending.toggleTailhook;
  const resetSortie = pending.resetSortie;
  const togglePause = pending.togglePause;
  const toggleMute = pending.toggleMute;
  const dropCargo = pending.dropCargo;
  const hadInteraction = pending.anyInteraction;

  pending.flapStep = false;
  pending.toggleCamera = false;
  pending.toggleTailhook = false;
  pending.resetSortie = false;
  pending.togglePause = false;
  pending.toggleMute = false;
  pending.dropCargo = false;
  pending.anyInteraction = false;

  const brakes = keys.has('KeyB') || pending.brakeLatch;

  return {
    pitch,
    roll,
    yaw,
    throttleDelta,
    flapStep,
    brakes,
    toggleCamera,
    toggleTailhook,
    resetSortie,
    togglePause,
    toggleMute,
    dropCargo,
    hadInteraction,
  };
}
