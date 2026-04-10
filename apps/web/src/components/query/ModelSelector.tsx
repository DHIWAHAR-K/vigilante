'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ChevronDown, Download, Check } from 'lucide-react';
import { useRuntimeStore, ModelInfo } from '@/store/useRuntimeStore';
import { cn } from '@/lib/utils';

export function ModelSelector() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { 
    selection, 
    installedModels, 
    selectModel,
    status 
  } = useRuntimeStore();

  const currentModel = selection 
    ? installedModels.find(m => m.id === selection.modelId && m.engineId === selection.engineId)
    : null;

  const hasInstalledModels = installedModels.length > 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectModel = (model: ModelInfo) => {
    selectModel(model.engineId, model.id);
    setIsOpen(false);
  };

  const handleDownloadModels = () => {
    setIsOpen(false);
    router.push('/settings');
  };

  const getStatusColor = () => {
    if (status === 'ready') return 'bg-success';
    if (status === 'no_models') return 'bg-warning';
    return 'bg-text-muted';
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-2.5 h-6 rounded transition-colors relative",
          "bg-bg-elevated hover:bg-border-subtle"
        )}
        title="Select Model"
      >
        <div className={cn(
          "w-1.5 h-1.5 rounded-full",
          getStatusColor(),
          status === 'ready' && "shadow-[0_0_8px_rgba(52,211,153,0.4)]"
        )} />
        <span className="text-mono-xs text-accent whitespace-nowrap">
          {currentModel?.name.split(':')[0] || selection?.modelId?.split(':')[0] || 'Select Model'}
        </span>
        <ChevronDown className={cn(
          "w-3 h-3 text-text-muted transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute bottom-full right-0 mb-2 min-w-[200px] rounded-lg border shadow-lg z-50 overflow-hidden",
              "bg-bg-surface border-border-subtle"
            )}
          >
            <div className="py-1 max-h-[300px] overflow-y-auto">
              {hasInstalledModels ? (
                <>
                  {installedModels.map((model) => {
                    const isSelected = selection?.modelId === model.id && selection?.engineId === model.engineId;
                    return (
                      <button
                        key={`${model.engineId}-${model.id}`}
                        onClick={() => handleSelectModel(model)}
                        className={cn(
                          "w-full px-3 py-2 flex items-center justify-between text-left hover:bg-bg-elevated transition-colors",
                          isSelected ? "bg-accent/5" : ""
                        )}
                      >
                        <div className="flex flex-col">
                          <span className="text-body-sm text-text-primary">
                            {model.name.split(':')[0]}
                          </span>
                          <span className="text-[10px] text-text-muted capitalize">
                            {model.engineId} • {model.size}
                          </span>
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 text-accent" />
                        )}
                      </button>
                    );
                  })}
                  <div className="my-1 border-t border-border-subtle" />
                </>
              ) : null}
              
              <button
                onClick={handleDownloadModels}
                className={cn(
                  "w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-bg-elevated transition-colors",
                  "text-accent"
                )}
              >
                <Download className="w-4 h-4" />
                <span className="text-body-sm font-medium">Download Models</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
