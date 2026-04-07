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
   * Attach event listeners to the window
   */
  attach(): void {
    if (this.bound) return;

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.bound = true;
  }

  /**
   * Detach event listeners
   */
  detach(): void {
    if (!this.bound) return;

    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.bound = false;
    this.reset();
  }

  /**
   * Reset input state
   */
  reset(): void {
    this.state = { up: false, down: false, left: false, right: false };
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    let handled = false;

    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.state.up = true;
        handled = true;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.state.down = true;
        handled = true;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.state.left = true;
        handled = true;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.state.right = true;
        handled = true;
        break;
    }

    // Prevent default browser behavior (scrolling, etc.) for game keys
    // Only when we're not in an input/textarea/contenteditable element
    if (handled && !this.isEditableElement(e.target as Element)) {
      e.preventDefault();
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.state.up = false;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.state.down = false;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.state.left = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.state.right = false;
        break;
    }
  };

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
