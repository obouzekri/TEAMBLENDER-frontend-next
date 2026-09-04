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

function normalizePosthogHost(rawValue) {
  const fallback = 'https://eu.i.posthog.com';
  const normalized = String(rawValue || '').trim().replace(/\/+$/, '');
  if (!normalized) return fallback;
  return normalized;
}

function getPosthogIngestDestinations(rawHost) {
  const normalizedHost = normalizePosthogHost(rawHost);
  let parsedHost;

  try {
    parsedHost = new URL(normalizedHost);
  } catch {
    parsedHost = new URL('https://eu.i.posthog.com');
  }

  const host = parsedHost.hostname.toLowerCase();
  const staticHost = host.includes('eu.i.posthog.com')
    ? 'https://eu-assets.i.posthog.com'
    : 'https://us-assets.i.posthog.com';

  return {
    ingestHost: `${parsedHost.protocol}//${parsedHost.host}`,
    staticHost,
  };
}

const cdnOrigin = normalizeCdnOrigin(process.env.NEXT_PUBLIC_CDN_ORIGIN);
const remoteImageHosts = parseRemoteImageHosts(process.env.NEXT_PUBLIC_CDN_IMAGE_HOSTS);
const posthogIngestDestinations = getPosthogIngestDestinations(process.env.NEXT_PUBLIC_POSTHOG_HOST);

const backendCspOrigin = normalizeCdnOrigin(rewriteBackendOrigin);
const cspConnectSources = [
  "'self'",
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3100',
  'https://*.teamblender.io',
  'https://*.vercel.app',
  'https://*.posthog.com',
  'https://*.google.com',
  'https://*.googleapis.com',
  'https://*.microsoft.com',
  'https://login.microsoftonline.com',
  'ws:',
  'wss:',
];

if (backendCspOrigin) {
  cspConnectSources.push(backendCspOrigin);
}

const cspHeader = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.vercel.app https://*.teamblender.io https://*.posthog.com https://*.google.com https://*.googleapis.com https://*.microsoft.com https://login.microsoftonline.com",
  "style-src 'self' 'unsafe-inline' https://*.googleapis.com https://*.gstatic.com",
  "img-src 'self' data: blob: https://*.teamblender.io https://*.vercel.app https://*.posthog.com https://*.googleusercontent.com https://*.microsoft.com https://*.microsoftonline.com",
  "font-src 'self' data: https://*.gstatic.com",
  `connect-src ${cspConnectSources.join(' ')}`,
  "form-action 'self' https://*.google.com https://*.microsoft.com",
  "frame-src 'self' https://*.google.com https://*.microsoft.com https://*.posthog.com",
].join('; ');

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
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: cspHeader },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
        ],
      },
    ];
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
        destination: `${posthogIngestDestinations.staticHost}/static/:path*`,
      },
      {
        source: '/ingest/:path*',
        destination: `${posthogIngestDestinations.ingestHost}/:path*`,
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
