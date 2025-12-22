import React, { useMemo } from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = "", size = 32 }) => {
  return (
    <img
      src="/icon.png"
      alt="Insight Notes"
      width={size}
      height={size}
      className={`rounded-lg ${className}`}
    />
  );
};

export default Logo;
