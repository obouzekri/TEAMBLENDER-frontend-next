import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

function normalizeBackendOrigin(rawValue) {
  const trimmed = String(rawValue || '').trim();
  if (!trimmed) return '';

  const withoutTrailingSlash = trimmed.replace(/\/$/, '');

  // Accept BACKEND_ORIGIN with or without /api suffix.
  return withoutTrailingSlash.endsWith('/api')
    ? withoutTrailingSlash.slice(0, -4)
    : withoutTrailingSlash;
}

const stableBackendOrigin = normalizeBackendOrigin(
  process.env.BACKEND_ORIGIN || process.env.NEXT_BACKEND_ORIGIN
);

const isVercelProductionBuild =
  process.env.VERCEL === '1' && process.env.VERCEL_ENV === 'production';

if (!stableBackendOrigin && isVercelProductionBuild) {
  throw new Error(
    'Missing BACKEND_ORIGIN (or NEXT_BACKEND_ORIGIN). Set it to your production backend origin, for example https://your-backend.up.railway.app'
  );
}

const developmentFallbackOrigin = 'http://localhost:3000';
const rewriteBackendOrigin = stableBackendOrigin || developmentFallbackOrigin;

const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: projectRoot,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${rewriteBackendOrigin}/api/:path*`,
      },
      {
        source: '/socket.io/:path*',
        destination: `${rewriteBackendOrigin}/socket.io/:path*`,
      },
    ];
  },
};

export default nextConfig;
