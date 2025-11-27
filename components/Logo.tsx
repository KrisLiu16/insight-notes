import React, { useMemo } from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = "", size = 32 }) => {
  const ids = useMemo(() => {
    const suffix = Math.random().toString(36).slice(2, 8);
    return {
      gradient: `logo_gradient_${suffix}`,
      glow: `logo_glow_${suffix}`,
    };
  }, []);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id={ids.gradient} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7C3AED" />
          <stop offset="1" stopColor="#9F7AEA" />
        </linearGradient>
        <filter id={ids.glow} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width="40" height="40" rx="10" fill={`url(#${ids.gradient})`} filter={`url(#${ids.glow})`} />

      {/* Abstract Z / Neural Network Shape */}
      <path
        d="M12 13H24C26.2091 13 28 14.7909 28 17V17C28 18.5262 27.1585 19.9168 25.808 20.6232L14.192 26.6994C12.8415 27.4058 12 28.7964 12 30.3226V30.3226"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.9"
      />

      {/* Spark of Idea */}
      <path
        d="M32 26L30 28L32 30"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
    </svg>
  );
};

export default Logo;
