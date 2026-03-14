'use client';

import { useEffect } from 'react';
import { useRuntimeStore } from '@/store/useRuntimeStore';

export function RuntimeProvider({ children }: { children: React.ReactNode }) {
  const ensureReady = useRuntimeStore(s => s.ensureReady);

  useEffect(() => {
    // On app load, probe Ollama and start it if installed but stopped.
    // POST /api/runtime/ensure — may take up to 30 s on first launch.
    ensureReady();
  }, [ensureReady]);

  return <>{children}</>;
}
