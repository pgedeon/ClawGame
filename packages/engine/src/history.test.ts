import { createHistoryStack, pushHistory, undo, redo, canUndo, canRedo } from '../src/history';

describe('history', () => {
  it('starts with no past or future', () => {
    const stack = createHistoryStack('initial');
    expect(stack.past).toHaveLength(0);
    expect(stack.future).toHaveLength(0);
    expect(stack.present).toBe('initial');
  });

  it('pushes new state and clears future', () => {
    let stack = createHistoryStack('a');
    stack = pushHistory(stack, 'change to b', 'b');
    expect(stack.present).toBe('b');
    expect(stack.past).toHaveLength(1);
    expect(stack.future).toHaveLength(0);
  });

  it('undoes and redoes', () => {
    let stack = createHistoryStack('a');
    stack = pushHistory(stack, 'to b', 'b');
    stack = pushHistory(stack, 'to c', 'c');

    expect(canUndo(stack)).toBe(true);
    stack = undo(stack)!;
    expect(stack.present).toBe('b');
    expect(canRedo(stack)).toBe(true);

    stack = undo(stack)!;
    expect(stack.present).toBe('a');
    expect(canUndo(stack)).toBe(false);

    stack = redo(stack)!;
    expect(stack.present).toBe('b');

    stack = redo(stack)!;
    expect(stack.present).toBe('c');
    expect(canRedo(stack)).toBe(false);
  });

  it('pushing after undo clears future', () => {
    let stack = createHistoryStack('a');
    stack = pushHistory(stack, 'to b', 'b');
    stack = undo(stack)!;
    expect(stack.future).toHaveLength(1);
    stack = pushHistory(stack, 'to x', 'x');
    expect(stack.future).toHaveLength(0);
    expect(stack.present).toBe('x');
  });

  it('undo returns null when nothing to undo', () => {
    const stack = createHistoryStack('a');
    expect(undo(stack)).toBeNull();
  });

  it('redo returns null when nothing to redo', () => {
    const stack = createHistoryStack('a');
    expect(redo(stack)).toBeNull();
  });
});
