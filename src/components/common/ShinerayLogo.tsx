import React from 'react';

interface ShinerayLogoProps {
  className?: string;
  variant?: 'full' | 'icon' | 'horizontal';
  theme?: 'dark' | 'light' | 'white';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const ShinerayLogo: React.FC<ShinerayLogoProps> = ({
  className = '',
  variant = 'full',
  theme = 'dark',
  size = 'md',
}) => {
  // Color configuration
  const redColor = '#E11D23';
  const textColor = theme === 'white' ? '#FFFFFF' : theme === 'dark' ? '#111827' : '#0F172A';

  // Dimension scaling
  const getDimensions = () => {
    switch (size) {
      case 'sm':
        return {
          iconSize: 22,
          height: variant === 'icon' ? 24 : 32,
          width: variant === 'icon' ? 24 : variant === 'horizontal' ? 120 : 100,
        };
      case 'lg':
        return {
          iconSize: 46,
          height: variant === 'icon' ? 48 : 64,
          width: variant === 'icon' ? 48 : variant === 'horizontal' ? 220 : 180,
        };
      case 'xl':
        return {
          iconSize: 60,
          height: variant === 'icon' ? 64 : 88,
          width: variant === 'icon' ? 64 : variant === 'horizontal' ? 280 : 220,
        };
      case 'md':
      default:
        return {
          iconSize: 32,
          height: variant === 'icon' ? 34 : 44,
          width: variant === 'icon' ? 34 : variant === 'horizontal' ? 160 : 130,
        };
    }
  };

  const dims = getDimensions();

  if (variant === 'icon') {
    return (
      <svg
        viewBox="0 0 100 100"
        className={`shrink-0 ${className}`}
        style={{ width: dims.iconSize, height: dims.iconSize }}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Logo Shineray"
      >
        {/* Shineray 4-point faceted origami star emblem */}
        {/* Top-Left Wing */}
        <polygon points="50,48 5,5 25,50" fill={redColor} />
        {/* Top-Right Wing */}
        <polygon points="50,48 95,5 75,50" fill="#B91C1C" />
        {/* Bottom-Left Wing */}
        <polygon points="50,52 5,95 25,50" fill="#B91C1C" />
        {/* Bottom-Right Wing */}
        <polygon points="50,52 95,95 75,50" fill={redColor} />
        {/* Center diamond highlight */}
        <polygon points="50,38 62,50 50,62 38,50" fill="#EF4444" />
      </svg>
    );
  }

  if (variant === 'horizontal') {
    return (
      <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
        {/* Emblem */}
        <svg
          viewBox="0 0 100 100"
          className="shrink-0"
          style={{ width: dims.iconSize, height: dims.iconSize }}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <polygon points="50,48 5,5 25,50" fill={redColor} />
          <polygon points="50,48 95,5 75,50" fill="#B91C1C" />
          <polygon points="50,52 5,95 25,50" fill="#B91C1C" />
          <polygon points="50,52 95,95 75,50" fill={redColor} />
          <polygon points="50,38 62,50 50,62 38,50" fill="#EF4444" />
        </svg>

        {/* Wordmark SHINERAY */}
        <div className="flex items-center font-black tracking-tight uppercase" style={{ fontSize: dims.iconSize * 0.72 }}>
          <span style={{ color: textColor }}>SH</span>
          <span style={{ color: redColor, margin: '0 1px' }} className="font-extrabold italic">
            /
          </span>
          <span style={{ color: textColor }}>NERAY</span>
        </div>
      </div>
    );
  }

  // Default 'full' variant (Emblem on top, Wordmark on bottom as in the official logo image)
  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      {/* Top 4-Point Emblem */}
      <svg
        viewBox="0 0 100 100"
        className="shrink-0"
        style={{ width: dims.iconSize, height: dims.iconSize }}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <polygon points="50,48 5,5 25,50" fill={redColor} />
        <polygon points="50,48 95,5 75,50" fill="#B91C1C" />
        <polygon points="50,52 5,95 25,50" fill="#B91C1C" />
        <polygon points="50,52 95,95 75,50" fill={redColor} />
        <polygon points="50,38 62,50 50,62 38,50" fill="#EF4444" />
      </svg>

      {/* Bottom Stylized Wordmark */}
      <div
        className="flex items-center font-black tracking-wider uppercase mt-1 leading-none"
        style={{ fontSize: dims.iconSize * 0.52 }}
      >
        <span style={{ color: textColor }}>SH</span>
        <span style={{ color: redColor, margin: '0 1px' }} className="font-black italic">
          /
        </span>
        <span style={{ color: textColor }}>NERAY</span>
      </div>
    </div>
  );
};
