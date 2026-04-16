/**
 * Engine stubs for legacy canvas preview runtime
 * Provides minimal implementations for code that expects the @clawgame/engine package
 */

export interface Component {
  type: string;
  [key: string]: any;
}

export interface Entity {
  id: string;
  transform: { x: number; y: number };
  type?: string;
  components: Map<string, Component>;
}

export interface Scene {
  name: string;
  entities: Map<string, Entity>;
}

export interface EventBus {
  on(event: string, callback: Function): void;
  emit(event: string, data: any): void;
  off(event: string, callback: Function): void;
}

export interface InputSystem {
  getKeys(): Record<string, boolean>;
  bind(key: string, callback: Function): void;
  update(deltaTime: number): void;
}

export interface MovementSystem {
  update(deltaTime: number, inputState: any): void;
  attach(scene: Scene): void;
}

export interface PhysicsSystem {
  update(deltaTime: number): void;
  attach(scene: Scene): void;
}

export interface AISystem {
  update(deltaTime: number): void;
  attach(scene: Scene): void;
}

export interface ProjectileSystem {
  update(deltaTime: number): void;
  attach(scene: Scene): void;
}

export interface DamageSystem {
  update(deltaTime: number): void;
  attach(scene: Scene): void;
}

export function createDefaultScene(): Scene {
  return { name: 'default', entities: new Map() };
}

export function SceneLoader(): any {
  return null;
}

// Concrete implementations for use as classes
export class SimpleEventBus implements EventBus {
  private listeners = new Map<string, Function[]>();

  on(event: string, callback: Function): void {
    const handlers = this.listeners.get(event) ?? [];
    handlers.push(callback);
    this.listeners.set(event, handlers);
  }

  emit(event: string, data: any): void {
    const handlers = this.listeners.get(event) ?? [];
    handlers.forEach(cb => cb(data));
  }

  off(event: string, callback: Function): void {
    const handlers = this.listeners.get(event) ?? [];
    const filtered = handlers.filter(cb => cb !== callback);
    this.listeners.set(event, filtered);
  }
}

export class SimpleInputSystem implements InputSystem {
  private keys: Record<string, boolean> = {};
  private bindings = new Map<string, Function>();

  getKeys(): Record<string, boolean> {
    return this.keys;
  }

  setKey(key: string, pressed: boolean): void {
    this.keys[key] = pressed;
  }

  bind(key: string, callback: Function): void {
    this.bindings.set(key, callback);
  }

  update(_deltaTime: number): void {
    for (const [key, callback] of this.bindings) {
      if (this.keys[key]) {
        callback();
      }
    }
  }
}

export class SimpleMovementSystem implements MovementSystem {
  private scene?: Scene;

  attach(scene: Scene): void {
    this.scene = scene;
  }

  update(_deltaTime: number, _inputState: any): void {
    // Stub
  }
}

export class SimplePhysicsSystem implements PhysicsSystem {
  private scene?: Scene;

  attach(scene: Scene): void {
    this.scene = scene;
  }

  update(_deltaTime: number): void {
    // Stub
  }
}

export class SimpleAISystem implements AISystem {
  private scene?: Scene;

  attach(scene: Scene): void {
    this.scene = scene;
  }

  update(_deltaTime: number): void {
    // Stub
  }
}

export class SimpleProjectileSystem implements ProjectileSystem {
  private scene?: Scene;

  attach(scene: Scene): void {
    this.scene = scene;
  }

  update(_deltaTime: number): void {
    // Stub
  }
}

export class SimpleDamageSystem implements DamageSystem {
  private scene?: Scene;

  attach(scene: Scene): void {
    this.scene = scene;
  }

  update(_deltaTime: number): void {
    // Stub
  }
}

// Export classes under the interface names for compatibility
export const EventBus = SimpleEventBus;
export const InputSystem = SimpleInputSystem;
export const MovementSystem = SimpleMovementSystem;
export const PhysicsSystem = SimplePhysicsSystem;
export const AISystem = SimpleAISystem;
export const ProjectileSystem = SimpleProjectileSystem;
export const DamageSystem = SimpleDamageSystem;
