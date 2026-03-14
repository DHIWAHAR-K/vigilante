'use client';

import { useEffect } from 'react';
import { useRuntimeStore } from '@/store/useRuntimeStore';

export function RuntimeProvider({ children }: { children: React.ReactNode }) {
  const refreshStatus = useRuntimeStore(s => s.refreshStatus);

  useEffect(() => {
    // On app load, silently probe all engines.
    // This populates installedModels and selection without trying to start anything.
    // The app opens directly to chat — no blocking setup flow.
    refreshStatus();
  }, [refreshStatus]);

  return <>{children}</>;
}
