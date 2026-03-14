'use client';

import { useEffect, useRef, useState } from 'react';

export function usePersistedAdminState<T>(storageKey: string, initialState: T) {
  const initialStateRef = useRef(initialState);
  const [state, setState] = useState<T>(initialStateRef.current);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        setState({ ...initialStateRef.current, ...JSON.parse(raw) });
      }
    } catch {
      // Ignore invalid local state and fall back to defaults.
    } finally {
      setHydrated(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(state));
  }, [hydrated, state, storageKey]);

  return [state, setState, hydrated] as const;
}
