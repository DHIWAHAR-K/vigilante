import React from 'react';
import { cn } from '@/lib/utils';

export function VigilanteLogo({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-full h-full", className)}
    >
      {/* 
        Concept: "The Monolith Eye / Signal"
        - A sharp, precise diagonal cut (the V) intersects a glowing core.
        - The center circle represents the "vigilant" intelligent eye/core.
        - The sharp angles express precision, local-first control, and strength.
      */}
      <path 
        d="M2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12Z" 
        className="fill-bg-elevated stroke-border-strong"
        strokeWidth="1.5"
      />
      <path 
        d="M12 6L16 20H12L8 20L12 6Z" 
        className="fill-text-primary"
      />
      <circle 
        cx="12" 
        cy="10" 
        r="2" 
        className="fill-accent"
      />
      <path 
        d="M6 12L12 20L18 12" 
        className="stroke-border-subtle"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="2 2"
      />
    </svg>
  );
}
