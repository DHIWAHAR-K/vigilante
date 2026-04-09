'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import type { Theme } from '@/lib/desktop/client';

const OPTIONS = [
  { value: 'system', label: 'Auto', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
] as const;

interface ThemeSegmentedControlProps {
  value?: Theme;
  onChange?: (theme: Theme) => void;
}

export function ThemeSegmentedControl({ value, onChange }: ThemeSegmentedControlProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-10 w-full max-w-sm rounded-lg border border-border-subtle bg-bg-elevated p-1" />;
  }

  const activeTheme = value ?? ((theme as Theme | undefined) ?? 'system');

  return (
    <div className="flex p-1 bg-bg-elevated rounded-lg border border-border-subtle w-full max-w-sm relative">
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const isActive = activeTheme === option.value;
        
        return (
          <button
            key={option.value}
            onClick={() => {
              setTheme(option.value);
              onChange?.(option.value);
            }}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-body-sm transition-colors relative z-10",
              isActive ? "text-text-primary" : "text-text-muted hover:text-text-secondary"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {option.label}
            
            {isActive && (
              <motion.div
                layoutId="theme-segmented-thumb"
                className="absolute inset-0 bg-bg-surface rounded-md border border-border-strong shadow-sm -z-10"
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
