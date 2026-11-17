import React from 'react';

interface SparklineCurveProps {
  color?: 'blue' | 'emerald' | 'amber' | 'purple' | 'rose';
  className?: string;
}

const colorMap = {
  blue: {
    stroke: '#3B82F6',
    stop1: '#93C5FD',
    stop2: '#EFF6FF',
    id: 'sparkline-blue',
  },
  emerald: {
    stroke: '#10B981',
    stop1: '#A7F3D0',
    stop2: '#ECFDF5',
    id: 'sparkline-emerald',
  },
  amber: {
    stroke: '#F59E0B',
    stop1: '#FDE68A',
    stop2: '#FFFBEB',
    id: 'sparkline-amber',
  },
  purple: {
    stroke: '#8B5CF6',
    stop1: '#DDD6FE',
    stop2: '#F5F3FF',
    id: 'sparkline-purple',
  },
  rose: {
    stroke: '#F43F5E',
    stop1: '#FECDD3',
    stop2: '#FFF1F2',
    id: 'sparkline-rose',
  },
};

export const SparklineCurve: React.FC<SparklineCurveProps> = ({
  color = 'blue',
  className = 'w-24 h-12',
}) => {
  const conf = colorMap[color] || colorMap.blue;
  const gradId = `${conf.id}-${Math.random().toString(36).substr(2, 5)}`;

  return (
    <svg
      className={className}
      viewBox="0 0 120 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={conf.stop1} stopOpacity="0.45" />
          <stop offset="100%" stopColor={conf.stop2} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path
        d="M 0,38 C 25,38 35,16 60,26 C 85,36 95,8 120,18 L 120,48 L 0,48 Z"
        fill={`url(#${gradId})`}
      />
      <path
        d="M 0,38 C 25,38 35,16 60,26 C 85,36 95,8 120,18"
        stroke={conf.stroke}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
