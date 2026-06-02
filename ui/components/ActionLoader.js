'use client';

import React from 'react';

export default function ActionLoader({ message }) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/45 backdrop-blur-md">
      <div className="bg-white rounded-3xl p-8 flex flex-col items-center space-y-4 border border-lord-border shadow-2xl max-w-xs w-full mx-4">
        <svg className="animate-spin text-lord-teal" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <circle cx="12" cy="12" r="10" stroke="rgba(13, 148, 136, 0.15)" strokeWidth="3" />
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <p className="text-sm font-bold text-lord-text-main text-center">{message || 'Processing...'}</p>
      </div>
    </div>
  );
}
