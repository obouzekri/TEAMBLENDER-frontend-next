import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bundleAnalyzer from '@next/bundle-analyzer';

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
  process.env.BACKEND_ORIGIN
    || process.env.NEXT_BACKEND_ORIGIN
  || process.env.NEXT_PUBLIC_BACKEND_ORIGIN
  || process.env.NEXT_PUBLIC_API_URL
  || process.env.NEXT_PUBLIC_API_BASE
);

const isVercelProductionBuild =
  process.env.VERCEL === '1' && process.env.VERCEL_ENV === 'production';
const isVercelPreviewBuild =
  process.env.VERCEL === '1' && process.env.VERCEL_ENV === 'preview';

if (!stableBackendOrigin && isVercelProductionBuild) {
  throw new Error(
    'Missing BACKEND_ORIGIN (or NEXT_BACKEND_ORIGIN / NEXT_PUBLIC_BACKEND_ORIGIN). Set it to your production backend origin, for example https://your-backend.up.railway.app'
  );
}

const developmentFallbackOrigin = 'http://localhost:3000';
const previewDefaultOrigin =
  normalizeBackendOrigin(process.env.PREVIEW_BACKEND_ORIGIN);
const rewriteBackendOrigin = stableBackendOrigin
  || (isVercelPreviewBuild ? (previewDefaultOrigin || developmentFallbackOrigin) : developmentFallbackOrigin);

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

function normalizeCdnOrigin(rawValue) {
  const trimmed = String(rawValue || '').trim();
  if (!trimmed) return '';
  return trimmed.replace(/\/+$/, '');
}

function parseRemoteImageHosts(rawValue) {
  const normalized = String(rawValue || '').trim();
  if (!normalized) return [];

  return normalized
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((host) => ({
      protocol: 'https',
      hostname: host,
      pathname: '/**',
    }));
}

const cdnOrigin = normalizeCdnOrigin(process.env.NEXT_PUBLIC_CDN_ORIGIN);
const remoteImageHosts = parseRemoteImageHosts(process.env.NEXT_PUBLIC_CDN_IMAGE_HOSTS);

const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['127.0.0.1'],
  assetPrefix: cdnOrigin || undefined,
  outputFileTracingRoot: projectRoot,
  images: {
    remotePatterns: remoteImageHosts,
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${rewriteBackendOrigin}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${rewriteBackendOrigin}/uploads/:path*`,
      },
      {
        source: '/socket.io/:path*',
        destination: `${rewriteBackendOrigin}/socket.io/:path*`,
      },
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
