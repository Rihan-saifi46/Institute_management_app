import React from 'react';

export const WalletCoinsIllustration: React.FC<{ className?: string }> = ({
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
          {/* Gradients */}
          <radialGradient id="walletBgGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#1E3A8A" stopOpacity="0" />
          </radialGradient>

          {/* Pedestal platform */}
          <linearGradient id="pedestalTop" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E3A8A" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>

          {/* Wallet body */}
          <linearGradient id="walletGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="60%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>
          <linearGradient id="walletInner" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1E293B" />
          </linearGradient>

          {/* Credit card inside */}
          <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E2E8F0" />
            <stop offset="100%" stopColor="#94A3B8" />
          </linearGradient>

          {/* Gold Coin */}
          <linearGradient id="goldRim" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
          <radialGradient id="goldFace" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="60%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </radialGradient>

          {/* Shadow */}
          <filter id="walletShadow" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#020617" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Ambient Glow */}
        <ellipse cx="180" cy="140" rx="110" ry="40" fill="url(#walletBgGlow)" />

        {/* Floating Sparkles */}
        <path d="M60 50 L63 42 L66 50 L74 53 L66 56 L63 64 L60 56 L52 53 Z" fill="#FFFFFF" opacity="0.8" />
        <path d="M280 60 L282 54 L284 60 L290 62 L284 64 L282 70 L280 64 L274 62 Z" fill="#FEF08A" opacity="0.9" />
        <circle cx="295" cy="45" r="2" fill="#FFFFFF" opacity="0.7" />
        <circle cx="100" cy="30" r="2.5" fill="#FFFFFF" opacity="0.5" />

        {/* 3D Isometric Platform */}
        <g filter="url(#walletShadow)">
          {/* Top of pedestal */}
          <polygon points="120,150 250,150 290,175 160,175" fill="url(#pedestalTop)" opacity="0.9" />
          {/* Front of pedestal */}
          <polygon points="160,175 290,175 290,195 160,195" fill="#0A101D" />
          <polygon points="120,150 160,175 160,195 120,170" fill="#0F172A" />
        </g>

        {/* Wallet Container */}
        <g filter="url(#walletShadow)">
          {/* Card peaking out */}
          <g transform="rotate(-8 175 90)">
            <rect x="155" y="65" width="65" height="42" rx="4" fill="url(#cardGrad)" stroke="#CBD5E1" strokeWidth="1" />
            <rect x="160" y="73" width="14" height="10" rx="2" fill="#F59E0B" opacity="0.8" />
            <line x1="160" y1="92" x2="205" y2="92" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
          </g>

          {/* Back pocket flap */}
          <rect x="145" y="80" width="95" height="65" rx="8" fill="url(#walletInner)" />

          {/* Front folded leather body */}
          <rect x="140" y="90" width="105" height="65" rx="9" fill="url(#walletGrad)" stroke="#334155" strokeWidth="1.2" />

          {/* Leather Stitching lines */}
          <rect
            x="143"
            y="93"
            width="99"
            height="59"
            rx="7"
            fill="none"
            stroke="#475569"
            strokeWidth="1"
            strokeDasharray="3 3"
          />

          {/* Wallet clasp strap */}
          <path d="M 230,112 L 252,112 C 256,112 258,115 258,120 C 258,125 256,128 252,128 L 230,128 Z" fill="#0F172A" stroke="#334155" strokeWidth="1" />
          <circle cx="250" cy="120" r="3.5" fill="#E2E8F0" />
          <circle cx="250" cy="120" r="1.8" fill="#F59E0B" />
        </g>

        {/* Big Glowing Gold Coin in Front */}
        <g filter="url(#walletShadow)">
          {/* Coin 3D edge */}
          <ellipse cx="240" cy="152" rx="30" ry="30" fill="url(#goldRim)" />
          <ellipse cx="236" cy="148" rx="28" ry="28" fill="url(#goldFace)" stroke="#FEF08A" strokeWidth="1.5" />

          {/* Inner ring */}
          <circle cx="236" cy="148" r="23" fill="none" stroke="#D97706" strokeWidth="1.2" strokeDasharray="2 1.5" />

          {/* Rupee Symbol */}
          <text
            x="236"
            y="157"
            textAnchor="middle"
            fill="#78350F"
            fontWeight="900"
            fontSize="24"
            fontFamily="Inter, Arial, sans-serif"
          >
            ₹
          </text>

          {/* Highlight flare */}
          <ellipse cx="225" cy="132" rx="7" ry="3.5" fill="#FFFFFF" opacity="0.6" transform="rotate(-30 225 132)" />
        </g>
      </svg>
    </div>
  );
};
