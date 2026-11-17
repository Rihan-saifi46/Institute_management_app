import React from 'react';

export const SidebarWaveGraphic: React.FC<{ className?: string }> = ({ className = 'w-full h-32' }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 280 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="wave1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E40AF" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#0866F5" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="wave2" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2563EB" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#07183D" stopOpacity="0.0" />
        </linearGradient>
        <linearGradient id="wave3" x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path
        d="M0 60 C80 90 140 30 280 75 L280 140 L0 140 Z"
        fill="url(#wave1)"
      />
      <path
        d="M0 90 C70 45 180 110 280 50 L280 140 L0 140 Z"
        fill="url(#wave2)"
      />
      <path
        d="M0 110 C90 85 160 125 280 95 L280 140 L0 140 Z"
        fill="url(#wave3)"
      />
    </svg>
  );
};
