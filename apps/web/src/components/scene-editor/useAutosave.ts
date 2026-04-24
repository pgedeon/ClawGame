/**
 * @clawgame/web - Autosave indicator hook
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export interface AutosaveState {
  status: 'idle' | 'saving' | 'saved' | 'error';
  lastSaved: Date | null;
  error: string | null;
}

export function useAutosave(
  data: unknown,
  saveFn: (data: unknown) => Promise<void>,
  intervalMs: number = 30000,
  debounceMs: number = 2000,
): AutosaveState & { triggerSave: () => void } {
  const [state, setState] = useState<AutosaveState>({ status: 'idle', lastSaved: null, error: null });
  const dataRef = useRef(data);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  dataRef.current = data;

  const triggerSave = useCallback(async () => {
    setState((s) => ({ ...s, status: 'saving', error: null }));
    try {
      await saveFn(dataRef.current);
      setState({ status: 'saved', lastSaved: new Date(), error: null });
    } catch (e) {
      setState((s) => ({ ...s, status: 'error', error: (e as Error).message }));
    }
  }, [saveFn]);

  // Debounce
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(triggerSave, debounceMs);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [data, triggerSave, debounceMs]);

  // Interval autosave
  useEffect(() => {
    intervalRef.current = setInterval(triggerSave, intervalMs);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [triggerSave, intervalMs]);

  return { ...state, triggerSave };
}
