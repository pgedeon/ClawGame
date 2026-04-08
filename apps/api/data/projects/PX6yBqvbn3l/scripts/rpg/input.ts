/**
 * Eclipse of Runes — Input Handler
 * Keyboard input with WASD + Arrow support.
 */

export type KeyState = Record<string, boolean>;

export class InputHandler {
  private keys: KeyState = {};
  private bound = false;

  attach(): void {
    if (this.bound) return;
    window.addEventListener('keydown', this.onDown);
    window.addEventListener('keyup', this.onUp);
    this.bound = true;
  }

  detach(): void {
    if (!this.bound) return;
    window.removeEventListener('keydown', this.onDown);
    window.removeEventListener('keyup', this.onUp);
    this.bound = false;
    this.keys = {};
  }

  private onDown = (e: KeyboardEvent): void => {
    if (this.isEditable(e.target as Element)) return;
    this.keys[e.key.toLowerCase()] = true;
    // Prevent scroll for game keys
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' '].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }
  };

  private onUp = (e: KeyboardEvent): void => {
    this.keys[e.key.toLowerCase()] = false;
  };

  private isEditable(el: Element | null): boolean {
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    if (['input', 'textarea', 'select'].includes(tag)) return true;
    if (el.getAttribute('contenteditable') === 'true') return true;
    if (el.closest('.cm-editor, .CodeMirror')) return true;
    return false;
  }

  getState(): KeyState {
    return { ...this.keys };
  }

  isPressed(key: string): boolean {
    return !!this.keys[key.toLowerCase()];
  }
}
