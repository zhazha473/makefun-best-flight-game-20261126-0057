// Keyboard and mouse input for SALTWIND COURIER.
// Tracks held keys, one-shot presses (consumed once per frame) and mouse
// clicks on canvas buttons, so menus and flight share one input source.

export class InputTracker {
  constructor(canvas) {
    this.canvas = canvas;
    this.held = new Set();
    this.pressed = new Set();
    this.mouseX = 0;
    this.mouseY = 0;
    this.clicked = false;
    this.clickX = 0;
    this.clickY = 0;
    this.onKeyDown = (event) => {
      if (event.repeat) return;
      this.held.add(event.code);
      this.pressed.add(event.code);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
        event.preventDefault();
      }
    };
    this.onKeyUp = (event) => {
      this.held.delete(event.code);
    };
    this.onMouseMove = (event) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = (event.clientX - rect.left) * (this.canvas.width / rect.width);
      this.mouseY = (event.clientY - rect.top) * (this.canvas.height / rect.height);
    };
    this.onMouseDown = (event) => {
      this.onMouseMove(event);
      this.clicked = true;
      this.clickX = this.mouseX;
      this.clickY = this.mouseY;
    };
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mousedown', this.onMouseDown);
  }

  isDown(code) {
    return this.held.has(code);
  }

  wasPressed(code) {
    return this.pressed.has(code);
  }

  consumeClick() {
    if (!this.clicked) return null;
    this.clicked = false;
    return { x: this.clickX, y: this.clickY };
  }

  endFrame() {
    this.pressed.clear();
    this.clicked = false;
  }
}

export function throttleKeysDown(input) {
  return input.isDown('KeyW') || input.isDown('ArrowUp');
}

export function throttleKeysUp(input) {
  return input.isDown('KeyS') || input.isDown('ArrowDown');
}

export function turnKeysLeft(input) {
  return input.isDown('KeyA') || input.isDown('ArrowLeft');
}

export function turnKeysRight(input) {
  return input.isDown('KeyD') || input.isDown('ArrowRight');
}
