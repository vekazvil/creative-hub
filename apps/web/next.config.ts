import type { NextConfig } from 'next';

// The monorepo keeps one .env at the root; Next.js only looks in apps/web by default.
try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {
  // no .env — values come from the real environment
}

const nextConfig: NextConfig = {
  // One Docker image for web and worker (task 1.8) uses the standalone output.
  output: 'standalone',
  outputFileTracingRoot: new URL('../../', import.meta.url).pathname,
  transpilePackages: ['@creative-hub/core', '@creative-hub/db', '@creative-hub/connectors'],
};

export default nextConfig;
