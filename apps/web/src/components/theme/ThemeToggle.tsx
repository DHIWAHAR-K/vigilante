'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ThemeToggleProps {
  collapsed?: boolean;
}

export function ThemeToggle({ collapsed = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  };

  const getIcon = () => {
    if (theme === 'system') return <Monitor className="w-4 h-4 stroke-[1.5]" />;
    if (theme === 'light') return <Sun className="w-4 h-4 stroke-[1.5]" />;
    return <Moon className="w-4 h-4 stroke-[1.5]" />;
  };

  const getLabel = () => {
    if (theme === 'system') return 'Auto Theme';
    if (theme === 'light') return 'Light Theme';
    return 'Dark Theme';
  };

  if (collapsed) {
    return (
      <button 
        onClick={cycleTheme}
        title={getLabel()}
        className="w-10 h-10 flex items-center justify-center rounded-xl transition-colors text-text-muted hover:text-text-primary hover:bg-bg-elevated group relative overflow-hidden"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={theme}
            initial={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {getIcon()}
          </motion.div>
        </AnimatePresence>
      </button>
    );
  }

  return (
    <button 
      onClick={cycleTheme}
      className="w-full flex items-center gap-3 px-3 h-10 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors text-left overflow-hidden group"
    >
      <div className="w-5 flex justify-center relative h-5 items-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={theme}
            initial={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {getIcon()}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="relative flex-1 h-5 overflow-hidden">
         <AnimatePresence mode="wait" initial={false}>
           <motion.span
             key={theme}
             initial={{ opacity: 0, y: -10 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: 10 }}
             transition={{ duration: 0.2 }}
             className="absolute inset-0 text-[13px] font-medium flex items-center"
           >
             {getLabel()}
           </motion.span>
         </AnimatePresence>
      </div>
    </button>
  );
}
