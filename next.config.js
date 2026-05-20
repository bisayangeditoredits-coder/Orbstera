const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];

const nextConfig = {
  // ESLint is enforced in CI (`npm run lint`). Skipping during `next build` avoids blocking deploys on legacy warnings.
  eslint: {
    ignoreDuringBuilds: true,
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },

  experimental: {
    // Prevent canvas native module from being bundled server-side
    serverComponentsExternalPackages: ['canvas'],
    // Tree-shake icon barrel imports on the client
    optimizePackageImports: ['lucide-react'],
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      // pptxgenjs uses node: built-ins; exclude from client bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        https: false,
        http: false,
        zlib: false,
        stream: false,
        crypto: false,
        os: false,
        url: false,
        net: false,
        tls: false,
        child_process: false,
      };
    }

    if (isServer) {
      // Prevent konva/react-konva from being bundled on server
      config.externals = [...(config.externals || []), 'konva', 'react-konva'];
    }

    return config;
  },
};

module.exports = process.env.SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      silent: true,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      widenClientFileUpload: true,
      hideSourceMaps: true,
      disableLogger: true,
      automaticVercelMonitors: true,
    })
  : nextConfig;
