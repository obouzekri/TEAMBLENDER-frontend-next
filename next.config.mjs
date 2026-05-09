import { fileURLToPath } from 'url';
import { dirname } from 'path';

const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: dirname(fileURLToPath(import.meta.url)),
  },
};

export default nextConfig;
