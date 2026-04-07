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
   * Attach event listeners
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
  }

  /**
   * Reset input state
   */
  reset(): void {
    this.state = { up: false, down: false, left: false, right: false };
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.state.up = true;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.state.down = true;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.state.left = true;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.state.right = true;
        break;
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
}
