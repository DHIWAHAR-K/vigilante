'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="flex min-h-screen bg-bg-base text-text-primary">
      <div className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center border-x border-border-subtle bg-bg-base/96 px-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <p className="max-w-md text-sm text-text-secondary">
          Settings now live inside the desktop shell. Redirecting you back to the workspace.
        </p>
      </div>
    </div>
  );
}
