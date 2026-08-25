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
  enabled: boolean = true,
): AutosaveState & { triggerSave: () => void } {
  const [state, setState] = useState<AutosaveState>({ status: 'idle', lastSaved: null, error: null });
  const dataRef = useRef(data);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  dataRef.current = data;

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const triggerSave = useCallback(async () => {
    // Skip entirely when autosave is not armed (no user edits yet) or there is
    // no scene to save (never loaded). Prevents pointless/unsafe write-backs.
    if (!enabledRef.current || dataRef.current == null) return;
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
    if (!enabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(triggerSave, debounceMs);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [data, triggerSave, debounceMs, enabled]);

  // Interval autosave
  useEffect(() => {
    intervalRef.current = setInterval(triggerSave, intervalMs);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [triggerSave, intervalMs]);

  return { ...state, triggerSave };
}
