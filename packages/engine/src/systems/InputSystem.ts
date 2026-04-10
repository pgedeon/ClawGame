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
   * Update input state (placeholder for consistent API)
   */
  update(canvas: HTMLCanvasElement, inputState: InputState): void {
    // The bind method handles event listening, no explicit update needed
    // This method is for consistency with other systems
  }

  /**
   * Check if the event target is an editable element (input, textarea, contenteditable)
   * In those cases we don't want to preventDefault or steal keyboard input.
   */
  private isEditableElement(element: Element | null): boolean {
    if (!element) return false;

    const tagName = element.tagName.toLowerCase();
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
      return true;
    }

    if (element.getAttribute('contenteditable') === 'true') {
      return true;
    }

    // Check for CodeMirror editor
    if (element.closest('.cm-editor') || element.closest('.CodeMirror')) {
      return true;
    }

    return false;
  }
}
