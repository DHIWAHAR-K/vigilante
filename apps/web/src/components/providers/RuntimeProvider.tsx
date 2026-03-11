'use client';

import { useEffect } from 'react';
import { useRuntimeStore } from '@/store/useRuntimeStore';

export function RuntimeProvider({ children }: { children: React.ReactNode }) {
  const initializeFromCache = useRuntimeStore(s => s.initializeFromCache);
  const checkRuntime = useRuntimeStore(s => s.checkRuntime);

  useEffect(() => {
    // Initialize from cache on mount, then do a fresh check
    const init = async () => {
      await initializeFromCache();
      // Do a fresh check in the background
      checkRuntime();
    };
    init();
  }, [initializeFromCache, checkRuntime]);

  return <>{children}</>;
}
