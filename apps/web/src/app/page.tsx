'use client';

import { ConversationWorkspace } from '@/components/conversation/ConversationWorkspace';

export default function Home() {
  return (
    <div className="flex flex-col h-full w-full relative bg-bg-base">
      <ConversationWorkspace />
    </div>
  );
}
