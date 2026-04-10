/**
 * @clawgame/engine - Behavior Executor
 *
 * Runs BehaviorGraphs on entities during the game loop.
 * Implements a tick-based execution model:
 * - Composite nodes run children according to strategy
 * - Decorator nodes modify child results
 * - Condition nodes evaluate game state
 * - Action nodes modify entities/fire events
 *
 * Extensible via registered custom conditions and actions.
 */

import {
  BehaviorGraph,
  BehaviorNode,
  BehaviorEdge,
  NodeStatus,
  NodeRunState,
  ActionData,
  ConditionData,
  CompositeData,
  DecoratorData,
} from './types';
import { Entity, Scene } from '../types';
import { EventBus } from '../EventBus';

/** Context provided to nodes during execution */
export interface BehaviorContext {
  entity: Entity;
  scene: Scene;
  events: EventBus;
  /** Variables from the graph + binding overrides */
  variables: Record<string, any>;
  /** Delta time in seconds */
  deltaTime: number;
  /** External state for conditions (e.g., input state) */
  inputState?: { up: boolean; down: boolean; left: boolean; right: boolean };
}

/** Custom condition evaluator */
export type ConditionEvaluator = (
  data: ConditionData,
  ctx: BehaviorContext,
) => boolean;

/** Custom action executor */
export type ActionExecutor = (
  data: ActionData,
  ctx: BehaviorContext,
) => NodeStatus;

/** Internal helper to cast movement component */
interface MovementLike {
  vx: number;
  vy: number;
  speed?: number;
}

export class BehaviorExecutor {
  private graphs = new Map<string, BehaviorGraph>();
  private customConditions = new Map<string, ConditionEvaluator>();
  private customActions = new Map<string, ActionExecutor>();

  /** Track per-entity run state: entityId -> graphId -> nodeId -> state */
  private runStates = new Map<string, Map<string, Map<string, NodeRunState>>>();

  /** Register a behavior graph for execution */
  registerGraph(graph: BehaviorGraph): void {
    this.graphs.set(graph.id, graph);
  }

  /** Unregister a behavior graph */
  unregisterGraph(graphId: string): void {
    this.graphs.delete(graphId);
    this.runStates.forEach((graphMap) => {
      graphMap.delete(graphId);
    });
  }

  /** Register a custom condition evaluator */
  registerCondition(name: string, evaluator: ConditionEvaluator): void {
    this.customConditions.set(name, evaluator);
  }

  /** Register a custom action executor */
  registerAction(name: string, executor: ActionExecutor): void {
    this.customActions.set(name, executor);
  }

  /** Reset run state for an entity (e.g., on scene load) */
  resetEntity(entityId: string): void {
    this.runStates.delete(entityId);
  }

  /** Reset all run state */
  resetAll(): void {
    this.runStates.clear();
  }

  /**
   * Tick a specific graph for a specific entity.
   * Returns the root node status.
   */
  tick(graphId: string, ctx: BehaviorContext): NodeStatus {
    const graph = this.graphs.get(graphId);
    if (!graph) return 'failure';

    let entityMap = this.runStates.get(ctx.entity.id);
    if (!entityMap) {
      entityMap = new Map();
      this.runStates.set(ctx.entity.id, entityMap);
    }
    let graphMap = entityMap.get(graphId);
    if (!graphMap) {
      graphMap = new Map();
      entityMap.set(graphId, graphMap);
    }

    const children = this.buildChildMap(graph);
    Object.assign(ctx.variables, graph.variables);
    const fullCtx: BehaviorContext = { ...ctx, variables: ctx.variables };

    const status = this.executeNode(graph.root, graph, children, graphMap, fullCtx);

    graphMap.forEach((state) => {
      state.entered = false;
    });

    return status;
  }

  // ─── Internal ───

  private buildChildMap(graph: BehaviorGraph): Map<string, BehaviorEdge[]> {
    const map = new Map<string, BehaviorEdge[]>();
    for (const edge of graph.edges) {
      const list = map.get(edge.from) || [];
      list.push(edge);
      map.set(edge.from, list);
    }
    map.forEach((edges) => {
      edges.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
    });
    return map;
  }

  private getNode(graph: BehaviorGraph, nodeId: string): BehaviorNode | undefined {
    return graph.nodes.find((n) => n.id === nodeId);
  }

  private getOrCreateState(
    graphMap: Map<string, NodeRunState>,
    nodeId: string,
  ): NodeRunState {
    let state = graphMap.get(nodeId);
    if (!state) {
      state = { status: 'running' };
      graphMap.set(nodeId, state);
    }
    return state;
  }

  private getMovement(entity: Entity): MovementLike | undefined {
    const raw = entity.components.get('movement');
    if (!raw) return undefined;
    // Component is stored as any in the Map; cast safely
    return raw as unknown as MovementLike;
  }

  private emitAny(events: EventBus, name: string, payload: unknown): void {
    // Use emit through the custom:* index signature for dynamic events
    const customName = `custom:${name}` as any;
    (events as any).emit(customName, payload);
  }

  private executeNode(
    nodeId: string,
    graph: BehaviorGraph,
    children: Map<string, BehaviorEdge[]>,
    graphMap: Map<string, NodeRunState>,
    ctx: BehaviorContext,
  ): NodeStatus {
    const node = this.getNode(graph, nodeId);
    if (!node) return 'failure';

    const state = this.getOrCreateState(graphMap, nodeId);
    state.entered = true;

    switch (node.data.type) {
      case 'composite':
        return this.executeComposite(node.data.composite, nodeId, graph, children, graphMap, ctx, state);
      case 'decorator':
        return this.executeDecorator(node.data.decorator, nodeId, graph, children, graphMap, ctx, state);
      case 'condition':
        return this.executeCondition(node.data.condition, ctx);
      case 'action':
        return this.executeAction(node.data.action, ctx);
      default:
        return 'failure';
    }
  }

  private getChildIds(
    nodeId: string,
    children: Map<string, BehaviorEdge[]>,
  ): string[] {
    return (children.get(nodeId) || []).map((e) => e.to);
  }

  // ─── Composite Execution ───

  private executeComposite(
    data: CompositeData,
    nodeId: string,
    graph: BehaviorGraph,
    children: Map<string, BehaviorEdge[]>,
    graphMap: Map<string, NodeRunState>,
    ctx: BehaviorContext,
    state: NodeRunState,
  ): NodeStatus {
    const childIds = this.getChildIds(nodeId, children);
    if (childIds.length === 0) return 'success';

    switch (data.kind) {
      case 'sequence':
        return this.executeSequence(childIds, graph, children, graphMap, ctx, state);
      case 'selector':
        return this.executeSelector(childIds, graph, children, graphMap, ctx, state);
      case 'parallel':
        return this.executeParallel(childIds, graph, children, graphMap, ctx);
    }
  }

  private executeSequence(
    childIds: string[],
    graph: BehaviorGraph,
    children: Map<string, BehaviorEdge[]>,
    graphMap: Map<string, NodeRunState>,
    ctx: BehaviorContext,
    state: NodeRunState,
  ): NodeStatus {
    let index = state.childIndex ?? 0;

    while (index < childIds.length) {
      const status = this.executeNode(childIds[index], graph, children, graphMap, ctx);
      if (status === 'running') {
        state.status = 'running';
        state.childIndex = index;
        return 'running';
      }
      if (status === 'failure') {
        state.status = 'failure';
        state.childIndex = 0;
        return 'failure';
      }
      index++;
    }

    state.status = 'success';
    state.childIndex = 0;
    return 'success';
  }

  private executeSelector(
    childIds: string[],
    graph: BehaviorGraph,
    children: Map<string, BehaviorEdge[]>,
    graphMap: Map<string, NodeRunState>,
    ctx: BehaviorContext,
    state: NodeRunState,
  ): NodeStatus {
    let index = state.childIndex ?? 0;

    while (index < childIds.length) {
      const status = this.executeNode(childIds[index], graph, children, graphMap, ctx);
      if (status === 'running') {
        state.status = 'running';
        state.childIndex = index;
        return 'running';
      }
      if (status === 'success') {
        state.status = 'success';
        state.childIndex = 0;
        return 'success';
      }
      index++;
    }

    state.status = 'failure';
    state.childIndex = 0;
    return 'failure';
  }

  private executeParallel(
    childIds: string[],
    graph: BehaviorGraph,
    children: Map<string, BehaviorEdge[]>,
    graphMap: Map<string, NodeRunState>,
    ctx: BehaviorContext,
  ): NodeStatus {
    let allSuccess = true;
    let anyRunning = false;

    for (const childId of childIds) {
      const status = this.executeNode(childId, graph, children, graphMap, ctx);
      if (status === 'running') anyRunning = true;
      if (status === 'failure') return 'failure';
      if (status !== 'success') allSuccess = false;
    }

    if (anyRunning) return 'running';
    return allSuccess ? 'success' : 'failure';
  }

  // ─── Decorator Execution ───

  private executeDecorator(
    data: DecoratorData,
    nodeId: string,
    graph: BehaviorGraph,
    children: Map<string, BehaviorEdge[]>,
    graphMap: Map<string, NodeRunState>,
    ctx: BehaviorContext,
    state: NodeRunState,
  ): NodeStatus {
    const childIds = this.getChildIds(nodeId, children);
    if (childIds.length === 0) return 'failure';
    const childId = childIds[0];

    switch (data.kind) {
      case 'inverter': {
        const status = this.executeNode(childId, graph, children, graphMap, ctx);
        if (status === 'running') return 'running';
        return status === 'success' ? 'failure' : 'success';
      }
      case 'repeater': {
        const max = data.maxRepetitions ?? 0;
        let reps = state.repetitions ?? 0;
        const childStatus = this.executeNode(childId, graph, children, graphMap, ctx);
        if (childStatus === 'running') return 'running';
        reps++;
        state.repetitions = reps;
        if (max > 0 && reps >= max) {
          state.repetitions = 0;
          return 'success';
        }
        graphMap.delete(childId);
        return 'running';
      }
      case 'until-fail': {
        const status = this.executeNode(childId, graph, children, graphMap, ctx);
        if (status === 'failure') return 'success';
        return 'running';
      }
      case 'timer': {
        const duration = data.duration ?? 1;
        state.elapsed = (state.elapsed ?? 0) + ctx.deltaTime;
        if (state.elapsed >= duration) {
          state.elapsed = 0;
          return 'success';
        }
        this.executeNode(childId, graph, children, graphMap, ctx);
        return 'running';
      }
      case 'cooldown': {
        const duration = data.duration ?? 1;
        state.elapsed = (state.elapsed ?? 0) + ctx.deltaTime;
        if (state.elapsed >= duration) {
          state.elapsed = 0;
          const childStatus = this.executeNode(childId, graph, children, graphMap, ctx);
          return childStatus;
        }
        return 'running';
      }
    }
  }

  // ─── Condition Evaluation ───

  private executeCondition(data: ConditionData, ctx: BehaviorContext): NodeStatus {
    if (data.evaluator && this.customConditions.has(data.evaluator)) {
      return this.customConditions.get(data.evaluator)!(data, ctx) ? 'success' : 'failure';
    }

    switch (data.kind) {
      case 'always':
        return 'success';
      case 'never':
        return 'failure';
      case 'random-chance':
        return Math.random() < (data.chance ?? 0.5) ? 'success' : 'failure';
      case 'entity-in-range': {
        if (!data.targetId) return 'failure';
        const target = ctx.scene.entities.get(data.targetId);
        if (!target) return 'failure';
        const dx = target.transform.x - ctx.entity.transform.x;
        const dy = target.transform.y - ctx.entity.transform.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist <= (data.range ?? 100) ? 'success' : 'failure';
      }
      case 'entity-has-tag': {
        const tags = ctx.entity.components.get('tags') as unknown as { list: string[] } | undefined;
        if (!tags || !Array.isArray(tags.list)) return 'failure';
        return tags.list.includes(data.tag ?? '') ? 'success' : 'failure';
      }
      case 'health-below':
      case 'health-above': {
        const stats = ctx.entity.components.get('stats') as unknown as { hp: number } | undefined;
        if (!stats) return 'failure';
        const threshold = data.threshold ?? 50;
        if (data.kind === 'health-below') return stats.hp < threshold ? 'success' : 'failure';
        return stats.hp > threshold ? 'success' : 'failure';
      }
      case 'input-pressed': {
        if (!ctx.inputState) return 'failure';
        const dir = (data.params?.direction as string) ?? '';
        if (dir === 'left') return ctx.inputState.left ? 'success' : 'failure';
        if (dir === 'right') return ctx.inputState.right ? 'success' : 'failure';
        if (dir === 'up') return ctx.inputState.up ? 'success' : 'failure';
        if (dir === 'down') return ctx.inputState.down ? 'success' : 'failure';
        return 'failure';
      }
      case 'timer-elapsed': {
        const varName = data.variable ?? 'timer';
        const elapsed = ctx.variables[varName] ?? 0;
        const target = data.threshold ?? 1;
        return elapsed >= target ? 'success' : 'failure';
      }
      case 'custom':
        if (data.evaluator && this.customConditions.has(data.evaluator)) {
          return this.customConditions.get(data.evaluator)!(data, ctx) ? 'success' : 'failure';
        }
        return 'failure';
      default:
        return 'failure';
    }
  }

  // ─── Action Execution ───

  private executeAction(data: ActionData, ctx: BehaviorContext): NodeStatus {
    if (data.executor && this.customActions.has(data.executor)) {
      return this.customActions.get(data.executor)!(data, ctx);
    }

    switch (data.kind) {
      case 'set-velocity': {
        const movement = this.getMovement(ctx.entity);
        if (movement) {
          movement.vx = data.vx ?? movement.vx;
          movement.vy = data.vy ?? movement.vy;
        }
        return 'success';
      }
      case 'move-to': {
        const movement = this.getMovement(ctx.entity);
        const speed = movement?.speed ?? 100;
        const dx = (data.x ?? 0) - ctx.entity.transform.x;
        const dy = (data.y ?? 0) - ctx.entity.transform.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 5) return 'success';
        if (movement) {
          movement.vx = (dx / dist) * speed;
          movement.vy = (dy / dist) * speed;
        }
        return 'running';
      }
      case 'move-toward-entity': {
        if (!data.targetId) return 'failure';
        const target = ctx.scene.entities.get(data.targetId);
        if (!target) return 'failure';
        const movement = this.getMovement(ctx.entity);
        const speed = movement?.speed ?? 100;
        const dx = target.transform.x - ctx.entity.transform.x;
        const dy = target.transform.y - ctx.entity.transform.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 5) return 'success';
        if (movement) {
          movement.vx = (dx / dist) * speed;
          movement.vy = (dy / dist) * speed;
        }
        return 'running';
      }
      case 'apply-damage': {
        const targetId = data.targetId ?? ctx.entity.id;
        const target = ctx.scene.entities.get(targetId);
        if (!target) return 'failure';
        const stats = target.components.get('stats') as unknown as { hp: number } | undefined;
        if (stats) {
          stats.hp = Math.max(0, stats.hp - (data.amount ?? 10));
        }
        return 'success';
      }
      case 'heal': {
        const targetId = data.targetId ?? ctx.entity.id;
        const target = ctx.scene.entities.get(targetId);
        if (!target) return 'failure';
        const stats = target.components.get('stats') as unknown as { hp: number; maxHp: number } | undefined;
        if (stats) {
          stats.hp = Math.min(stats.maxHp, stats.hp + (data.amount ?? 10));
        }
        return 'success';
      }
      case 'destroy-self': {
        ctx.scene.entities.delete(ctx.entity.id);
        this.emitAny(ctx.events, 'entity:destroyed', { entityId: ctx.entity.id });
        return 'success';
      }
      case 'fire-event': {
        this.emitAny(ctx.events, data.event ?? 'unnamed', data.payload);
        return 'success';
      }
      case 'set-tag': {
        const existing = ctx.entity.components.get('tags') as unknown as { list: string[] } | undefined;
        const tags = existing ?? { list: [] };
        if (!existing) {
          ctx.entity.components.set('tags', tags as any);
        }
        if (!tags.list.includes(data.tag ?? '')) {
          tags.list.push(data.tag ?? '');
        }
        return 'success';
      }
      case 'remove-tag': {
        const tags = ctx.entity.components.get('tags') as unknown as { list: string[] } | undefined;
        if (tags) {
          tags.list = tags.list.filter((t) => t !== (data.tag ?? ''));
        }
        return 'success';
      }
      case 'set-variable': {
        if (data.variable) {
          ctx.variables[data.variable] = data.value;
        }
        return 'success';
      }
      case 'wait': {
        return 'success';
      }
      case 'change-state': {
        this.emitAny(ctx.events, 'behavior:state-change', {
          entityId: ctx.entity.id,
          state: data.state,
        });
        return 'success';
      }
      case 'custom':
        if (data.executor && this.customActions.has(data.executor)) {
          return this.customActions.get(data.executor)!(data, ctx);
        }
        return 'failure';
      default:
        return 'failure';
    }
  }
}
