import React from 'react';

interface ConversationGroupProps {
  label: string;
  children: React.ReactNode;
}

export function ConversationGroup({ label, children }: ConversationGroupProps) {
  return (
    <div className="flex flex-col mb-6">
      <div className="px-4 mb-2">
        <span className="text-caption text-text-muted">
          {label}
        </span>
      </div>
      <div className="flex flex-col gap-0.5 px-2">
        {children}
      </div>
    </div>
  );
}
