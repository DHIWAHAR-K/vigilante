'use client';

import { useRouter } from 'next/navigation';

import { DesktopSettingsPanel } from '@/components/desktop-shell/DesktopSettingsPanel';

export default function SettingsPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen bg-bg-base text-text-primary">
      <div className="mx-auto flex w-full max-w-5xl flex-1 overflow-hidden border-x border-border-subtle bg-bg-base/96 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <DesktopSettingsPanel embedded onClose={() => router.push('/')} />
      </div>
    </div>
  );
}
