import { useId, useEffect, useState } from 'react';

export default function Logo({ size = 'default' }) {
  // size can be 'default' (nav header) or 'compact' (compact mode)
  const height = size === 'compact' ? 50 : 64;
  const viewBoxHeight = 120;
  const viewBoxWidth = 360;
  const ratio = viewBoxWidth / viewBoxHeight;
  const width = height * ratio;
  const gradientId = useId();
  
  // Detect dark mode
  const [isDark, setIsDark] = useState(false);
  
  useEffect(() => {
    // Check initial preference
    const darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(darkMode);
    
    // Listen for changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => setIsDark(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Colors for light and dark mode
  const lightGradientStart = '#0F766E';
  const lightGradientEnd = '#7C3AED';
  const darkGradientStart = '#14B8A6'; // brighter teal
  const darkGradientEnd = '#A78BFA'; // brighter purple
  
  const gradientStart = isDark ? darkGradientStart : lightGradientStart;
  const gradientEnd = isDark ? darkGradientEnd : lightGradientEnd;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="TeamBlender"
    >
      <defs>
        <linearGradient id={gradientId} x1="40" y1="40" x2="100" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={gradientStart} />
          <stop offset="100%" stopColor={gradientEnd} />
        </linearGradient>
      </defs>

      {/* Icône blending */}
      <circle cx="60" cy="60" r="20" fill={`url(#${gradientId})`} opacity="0.95" />
      <circle cx="80" cy="60" r="20" fill={`url(#${gradientId})`} opacity="0.95" />

      {/* Texte */}
      <text
        x="120"
        y="70"
        fontFamily="Sora, Inter, Segoe UI, sans-serif"
        fontSize="28"
        fontWeight="600"
        className="logo-wordmark"
      >
        <tspan>TeamBlender</tspan>
      </text>
    </svg>
  );
}
