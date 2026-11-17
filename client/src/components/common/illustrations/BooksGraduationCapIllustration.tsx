import React from 'react';

export const BooksGraduationCapIllustration: React.FC<{ className?: string }> = ({
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
          {/* Background dome glow */}
          <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>

          {/* Book 1 (Bottom book - warm amber/orange) */}
          <linearGradient id="bookBottomSpine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#E27339" />
            <stop offset="100%" stopColor="#FA9556" />
          </linearGradient>
          <linearGradient id="bookBottomPages" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFF8F2" />
            <stop offset="100%" stopColor="#EDE2D8" />
          </linearGradient>

          {/* Book 2 (Top book - royal / teal blue) */}
          <linearGradient id="bookTopSpine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
          <linearGradient id="bookTopPages" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E2E8F0" />
          </linearGradient>

          {/* Mortarboard Graduation Cap Gradients */}
          <linearGradient id="mortarTop" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="50%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#090D16" />
          </linearGradient>
          <linearGradient id="mortarSide" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>
          <linearGradient id="tasselGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>

          {/* Shadow filter */}
          <filter id="softShadow" x="-10%" y="-10%" width="120%" height="130%" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#0F172A" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Ambient background watermark - University Pillars */}
        <g opacity="0.18" stroke="#FFFFFF" strokeWidth="2.5" fill="none">
          {/* Triangular Pediment */}
          <path d="M210 50 L275 25 L340 50 Z" />
          <line x1="215" y1="50" x2="335" y2="50" />
          {/* Columns */}
          <line x1="225" y1="52" x2="225" y2="100" />
          <line x1="245" y1="52" x2="245" y2="100" />
          <line x1="275" y1="52" x2="275" y2="100" />
          <line x1="305" y1="52" x2="305" y2="100" />
          <line x1="325" y1="52" x2="325" y2="100" />
          <line x1="215" y1="100" x2="335" y2="100" />
        </g>

        {/* Floating Sparkles / Stars */}
        <path d="M70 45 L73 35 L76 45 L86 48 L76 51 L73 61 L70 51 L60 48 Z" fill="#FFFFFF" opacity="0.75" />
        <path d="M280 85 L282 78 L284 85 L291 87 L284 89 L282 96 L280 89 L273 87 Z" fill="#FFFFFF" opacity="0.65" />
        <path d="M120 20 L121 15 L123 20 L128 21 L123 23 L121 28 L120 23 L115 21 Z" fill="#FFFFFF" opacity="0.5" />

        {/* Soft platform glow */}
        <ellipse cx="160" cy="180" rx="100" ry="25" fill="url(#bgGlow)" />

        {/* Bottom Book (Amber/Orange) */}
        <g filter="url(#softShadow)">
          {/* Cover bottom */}
          <path d="M 60,165 L 195,190 L 270,160 L 135,135 Z" fill="#D95D24" />
          {/* Pages block */}
          <path d="M 62,156 L 195,181 L 268,151 L 268,160 L 195,190 L 62,165 Z" fill="url(#bookBottomPages)" />
          {/* Spine and front */}
          <path d="M 58,154 Q 56,164 62,166 L 195,191 Q 198,191 198,183 L 195,173 L 60,147 Z" fill="url(#bookBottomSpine)" />
        </g>

        {/* Top Book (Navy / Blue) */}
        <g filter="url(#softShadow)">
          {/* Cover base */}
          <path d="M 75,142 L 190,165 L 255,138 L 140,115 Z" fill="#1E40AF" />
          {/* Pages block */}
          <path d="M 77,133 L 190,156 L 253,129 L 253,138 L 190,165 L 77,142 Z" fill="url(#bookTopPages)" />
          {/* Top cover & spine */}
          <path d="M 72,131 Q 70,141 77,143 L 190,166 Q 193,166 193,158 L 190,149 L 74,124 Z" fill="url(#bookTopSpine)" />
          {/* Ribbon bookmark */}
          <path d="M 175,150 L 182,175 L 187,171 L 192,176 L 188,152 Z" fill="#EF4444" />
        </g>

        {/* Graduation Cap (Mortarboard) */}
        <g filter="url(#softShadow)">
          {/* Skull cap base cylinder */}
          <ellipse cx="165" cy="112" rx="36" ry="14" fill="url(#mortarSide)" />
          <path d="M 129,112 C 129,122 145,130 165,130 C 185,130 201,122 201,112 L 201,105 C 201,115 185,123 165,123 C 145,123 129,115 129,105 Z" fill="#090D16" />

          {/* Diamond Mortarboard Top */}
          <polygon points="165,58 245,86 165,114 85,86" fill="url(#mortarTop)" stroke="#334155" strokeWidth="1" />

          {/* Center Button */}
          <ellipse cx="165" cy="86" rx="6" ry="3.5" fill="#38BDF8" />
          <ellipse cx="165" cy="85.5" rx="4" ry="2.2" fill="#E2E8F0" />

          {/* Gold Tassel Band */}
          <path
            d="M 165,86 C 185,87 215,95 228,110 C 235,118 238,130 237,144"
            fill="none"
            stroke="url(#tasselGold)"
            strokeWidth="3.2"
            strokeLinecap="round"
          />

          {/* Hanging Tassel Fringe */}
          <g transform="translate(232, 142)">
            <ellipse cx="5" cy="3" rx="4" ry="2.5" fill="#B45309" />
            <polygon points="1,3 9,3 12,22 -2,22" fill="url(#tasselGold)" />
            <line x1="1" y1="22" x2="1" y2="25" stroke="#D97706" strokeWidth="1.5" />
            <line x1="5" y1="22" x2="5" y2="26" stroke="#FDE047" strokeWidth="1.5" />
            <line x1="9" y1="22" x2="9" y2="25" stroke="#D97706" strokeWidth="1.5" />
          </g>
        </g>
      </svg>
    </div>
  );
};
