// ConversationActionsMenu.tsx
"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useConversationStore } from '../../store/useConversationStore';

export default function ConversationActionsMenu({ conversation, onClose }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const router = useRouter();
  const { deleteConversation, archiveConversation } = useConversationStore();

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleOutsideClick = (event) => {
    if (menuRef.current && !menuRef.current.contains(event.target)) {
      setIsMenuOpen(false);
      onClose();
    }
  };

  useEffect(() => {
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleEscapeKey);
    } else {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscapeKey);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isMenuOpen]);

  const handleEscapeKey = (event) => {
    if (event.key === 'Escape') {
      setIsMenuOpen(false);
      onClose();
    }
  };

  const handleRename = () => {
    // Implement rename logic
    setIsMenuOpen(false);
    onClose();
  };

  const handleShare = () => {
    // Implement share logic
    setIsMenuOpen(false);
    onClose();
  };

  const handleArchive = () => {
    archiveConversation(conversation.id);
    setIsMenuOpen(false);
    onClose();
  };

  const handleDelete = () => {
    // Implement delete logic with confirmation
    setIsMenuOpen(false);
    onClose();
  };

  return (
    <div ref={menuRef} className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10">
      <button
        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
        onClick={handleRename}
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
        </svg>
        Rename
      </button>
      <button
        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
        onClick={handleShare}
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.888 12.938 9 12.48 9 12c0-.48-.112-.938-.316-1.342m0 1.342l-1.5 4.5H3m1.5-4.5l1.5 4.5M3 21h18M9 7a2 2 0 012-2h6a2 2 0 012 2m-6 4a2 2 0 01-2-2h-6a2 2 0 01-2 2m0 4h18a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6z"></path>
        </svg>
        Share
      </button>
      <button
        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
        onClick={handleArchive}
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .86-3 2s1.343 2 3 2 3 .86 3 2-1.343 2-3 2m0-8c1.11 0 3 0 3 0-1.11 0-3 0-3 0z"></path>
        </svg>
        Archive
      </button>
      <button
        className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900"
        onClick={handleDelete}
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12a2 2 0 01-2 1.736V3a1 1 0 00-2-1 1 1 0 00-1 1v14a2 2 0 002 2 2 2 0 002-2M7 18a2 2 0 002.828 1.292l6.484-10.243A2 2 0 0015 2h-3V4a2 2 0 013-2 2 2 0 012 2v10m-6 4l3-3m0 0l3 3m-3-3V7"></path>
        </svg>
        Delete
      </button>
    </div>
  );
}