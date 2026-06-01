import { useId } from 'react';

export default function Logo({ size = 'default' }) {
  // size can be 'default' (nav header) or 'compact' (compact mode)
  const height = size === 'compact' ? 50 : 64;
  const viewBoxHeight = 120;
  const viewBoxWidth = 360;
  const ratio = viewBoxWidth / viewBoxHeight;
  const width = height * ratio;
  const gradientId = useId();

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
          <stop offset="0%" stopColor="#0F766E" />
          <stop offset="100%" stopColor="#7C3AED" />
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
        fill="#1E2A23"
      >
        <tspan>TeamBlender</tspan>
      </text>
    </svg>
  );
}
