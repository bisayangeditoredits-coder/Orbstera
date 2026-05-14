/** @type {import('next').NextConfig} */
const nextConfig = {
  // ESLint is enforced in CI (`npm run lint`). Skipping during `next build` avoids blocking deploys on legacy warnings.
  eslint: {
    ignoreDuringBuilds: true,
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

module.exports = nextConfig;
