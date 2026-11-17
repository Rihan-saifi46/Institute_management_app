import React from 'react';

export const ClipboardAttendanceIllustration: React.FC<{ className?: string }> = ({
  className = 'w-56 h-40',
}) => {
  return (
    <div className={`relative flex items-center justify-center select-none pointer-events-none ${className}`}>
      <svg
        viewBox="0 0 320 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-2xl"
      >
        <defs>
          {/* Ambient Glow */}
          <radialGradient id="attBgGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#1D4ED8" stopOpacity="0" />
          </radialGradient>

          {/* Board Gradients */}
          <linearGradient id="boardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1E40AF" />
          </linearGradient>

          {/* Paper Gradient */}
          <linearGradient id="paperGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F1F5F9" />
          </linearGradient>

          {/* Clip Metal */}
          <linearGradient id="clipGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#94A3B8" />
            <stop offset="50%" stopColor="#CBD5E1" />
            <stop offset="100%" stopColor="#64748B" />
          </linearGradient>

          {/* Clock Gradients */}
          <linearGradient id="clockRim" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E40AF" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
          <radialGradient id="clockFace" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="90%" stopColor="#E2E8F0" />
            <stop offset="100%" stopColor="#CBD5E1" />
          </radialGradient>

          {/* Shadow Filter */}
          <filter id="attShadow" x="-10%" y="-10%" width="120%" height="130%" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#0F172A" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Ambient background glow */}
        <ellipse cx="170" cy="130" rx="100" ry="40" fill="url(#attBgGlow)" />

        {/* Floating Sparkles */}
        <path d="M50 60 L53 52 L56 60 L64 63 L56 66 L53 74 L50 66 L42 63 Z" fill="#FFFFFF" opacity="0.8" />
        <path d="M290 80 L292 73 L294 80 L301 82 L294 84 L292 91 L290 84 L283 82 Z" fill="#FFFFFF" opacity="0.6" />
        <circle cx="110" cy="30" r="2" fill="#FFFFFF" opacity="0.6" />

        {/* Isometric Clipboard */}
        <g filter="url(#attShadow)" transform="rotate(-6 160 110)">
          {/* Wooden/Plastic Board Backing */}
          <rect x="100" y="30" width="115" height="150" rx="14" fill="url(#boardGrad)" stroke="#1D4ED8" strokeWidth="2" />

          {/* Paper Sheet */}
          <rect x="110" y="48" width="95" height="124" rx="7" fill="url(#paperGrad)" />

          {/* Paper Grid Lines & Checkmarks */}
          {/* Row 1 */}
          <line x1="120" y1="75" x2="195" y2="75" stroke="#E2E8F0" strokeWidth="1.5" />
          <path d="M 125,68 L 129,72 L 138,63" fill="none" stroke="#0866F5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="145" y1="68" x2="185" y2="68" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" />

          {/* Row 2 */}
          <line x1="120" y1="100" x2="195" y2="100" stroke="#E2E8F0" strokeWidth="1.5" />
          <path d="M 125,93 L 129,97 L 138,88" fill="none" stroke="#0866F5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="145" y1="93" x2="180" y2="93" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" />

          {/* Row 3 */}
          <line x1="120" y1="125" x2="195" y2="125" stroke="#E2E8F0" strokeWidth="1.5" />
          <path d="M 125,118 L 129,122 L 138,113" fill="none" stroke="#0866F5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="145" y1="118" x2="190" y2="118" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" />

          {/* Row 4 */}
          <line x1="120" y1="150" x2="195" y2="150" stroke="#E2E8F0" strokeWidth="1.5" />
          <path d="M 125,143 L 129,147 L 138,138" fill="none" stroke="#0866F5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="145" y1="143" x2="175" y2="143" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" />

          {/* Metal Top Clip */}
          <rect x="135" y="24" width="45" height="22" rx="5" fill="url(#clipGrad)" stroke="#475569" strokeWidth="1" />
          <ellipse cx="157.5" cy="30" rx="8" ry="4" fill="#1E293B" />
        </g>

        {/* 3D Round Clock (on the right foreground) */}
        <g filter="url(#attShadow)">
          {/* Clock base / bevel */}
          <circle cx="235" cy="145" r="38" fill="url(#clockRim)" />
          {/* Clock inner face */}
          <circle cx="235" cy="145" r="32" fill="url(#clockFace)" stroke="#F8FAFC" strokeWidth="1.5" />

          {/* Hour tick marks */}
          <circle cx="235" cy="119" r="1.5" fill="#475569" />
          <circle cx="261" cy="145" r="1.5" fill="#475569" />
          <circle cx="235" cy="171" r="1.5" fill="#475569" />
          <circle cx="209" cy="145" r="1.5" fill="#475569" />

          {/* Clock Hands */}
          {/* Hour hand (pointing to 10) */}
          <line x1="235" y1="145" x2="223" y2="133" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
          {/* Minute hand (pointing to 2) */}
          <line x1="235" y1="145" x2="249" y2="127" stroke="#0866F5" strokeWidth="2.2" strokeLinecap="round" />
          {/* Center pin */}
          <circle cx="235" cy="145" r="3" fill="#0866F5" />
          <circle cx="235" cy="145" r="1.2" fill="#FFFFFF" />
        </g>
      </svg>
    </div>
  );
};
