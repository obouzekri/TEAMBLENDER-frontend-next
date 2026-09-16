import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '80px',
          backgroundColor: '#081223',
          backgroundImage:
            'radial-gradient(circle at 85% 10%, rgba(122,92,255,0.35) 0%, rgba(122,92,255,0) 45%), radial-gradient(circle at 10% 90%, rgba(53,160,255,0.25) 0%, rgba(53,160,255,0) 45%), linear-gradient(180deg, #0b1630 0%, #081223 100%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '18px',
          }}
        >
          <div
            style={{
              display: 'flex',
              width: '64px',
              height: '64px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, #7a5cff 0%, #35a0ff 100%)',
            }}
          />
          <span
            style={{
              fontSize: '52px',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-0.02em',
            }}
          >
            TeamBlender
          </span>
        </div>
        <p
          style={{
            marginTop: '36px',
            maxWidth: '900px',
            fontSize: '34px',
            fontWeight: 600,
            lineHeight: 1.35,
            color: '#e2e8f0',
          }}
        >
          Team building B2B pour managers et RH
        </p>
        <p
          style={{
            marginTop: '18px',
            fontSize: '26px',
            fontWeight: 500,
            color: '#93c5fd',
          }}
        >
          Créez, animez et mesurez des sessions collaboratives hybrides
        </p>
      </div>
    ),
    { ...size }
  );
}
