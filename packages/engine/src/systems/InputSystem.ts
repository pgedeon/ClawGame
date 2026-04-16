/**
 * @clawgame/engine - Input system
 */

import { InputState } from '../types';

export class InputSystem {
  private state: InputState = { up: false, down: false, left: false, right: false };
  private bound = false;

  /**
   * Get current input state
   */
  getState(): InputState {
    return { ...this.state };
  }

  /**
   * Set input state directly (for replay integration)
   */
  setState(newState: InputState): void {
    this.state = { ...newState };
  }

  /**
   * Update input system (placeholder for compatibility)
   */
  update(scene: any, inputState: InputState): void {
    this.state = { ...inputState };
  }

  /**
   * Bind to a canvas element for keyboard input
   */
  bind(canvas: HTMLCanvasElement): void {
    if (this.bound) return;
    this.bound = true;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (this.isEditableElement(event.target as Element)) return;
      
      switch (event.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          this.state.up = true;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          this.state.down = true;
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          this.state.left = true;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          this.state.right = true;
          break;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (this.isEditableElement(event.target as Element)) return;
      
      switch (event.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          this.state.up = false;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          this.state.down = false;
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          this.state.left = false;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          this.state.right = false;
          break;
      }
    };

    canvas.addEventListener('keydown', handleKeyDown);
    canvas.addEventListener('keyup', handleKeyUp);
  }

  /**
   * Remove all event listeners
   */
  unbind(): void {
    this.bound = false;
    this.state = { up: false, down: false, left: false, right: false };
  }

  /**
   * Detach method for compatibility
   */
  detach(): void {
    this.unbind();
  }

  /**
   * Check if target element is editable (should not block input)
   */
  private isEditableElement(element: Element): boolean {
    return element.tagName === 'INPUT' || 
           element.tagName === 'TEXTAREA' || 
           element.getAttribute('contenteditable') === 'true';
  }
}