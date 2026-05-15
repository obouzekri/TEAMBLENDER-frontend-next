export default function Logo({ size = 'default' }) {
  // size can be 'default' (nav header) or 'compact' (compact mode)
  const height = size === 'compact' ? 50 : 64;
  const viewBoxHeight = 120;
  const viewBoxWidth = 360;
  const ratio = viewBoxWidth / viewBoxHeight;
  const width = height * ratio;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="TeamBlender"
    >
      {/* Icône blending */}
      <circle cx="60" cy="60" r="20" fill="#0f766e" opacity="0.95" />
      <circle cx="80" cy="60" r="20" fill="#7c3aed" opacity="0.95" />

      {/* Texte */}
      <text
        x="120"
        y="70"
        fontFamily="Sora, Inter, Segoe UI, sans-serif"
        fontSize="28"
        fontWeight="600"
      >
        <tspan fill="#0f766e">Team</tspan>
        <tspan dx="6" fill="#7c3aed">
          Blender
        </tspan>
      </text>
    </svg>
  );
}
