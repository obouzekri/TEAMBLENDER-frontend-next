import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const stableBackendOrigin = 'https://teamblender-backend-qxe5-production.up.railway.app';

const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: projectRoot,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${stableBackendOrigin}/api/:path*`,
      },
      {
        source: '/socket.io/:path*',
        destination: `${stableBackendOrigin}/socket.io/:path*`,
      },
    ];
  },
};

export default nextConfig;
