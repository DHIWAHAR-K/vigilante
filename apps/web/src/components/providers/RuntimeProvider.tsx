'use client';

import { useEffect } from 'react';
import { useRuntimeStore } from '@/store/useRuntimeStore';

export function RuntimeProvider({ children }: { children: React.ReactNode }) {
  const checkRuntime = useRuntimeStore(s => s.checkRuntime);

  useEffect(() => {
    checkRuntime();
  }, [checkRuntime]);

  return <>{children}</>;
}
