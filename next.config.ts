import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  turbopack: {},

  // Hide the floating dev build indicator (red circle with "N")
  // in development mode — it overlaps app content unnecessarily.
  devIndicators: false,

  // Transpile native ESM packages that need bundling
  transpilePackages: ["d3-force", "d3-selection", "d3-zoom", "d3-drag"],

  // Webpack optimization for smaller client bundles
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Split large vendor libraries into separate chunks
      config.optimization = config.optimization ?? {};
      config.optimization.splitChunks = {
        chunks: "all",
        cacheGroups: {
          // Separate D3 modules into their own chunk
          d3: {
            test: /[\\/]node_modules[\\/](d3-|d3\/)/,
            name: "d3-vendor",
            priority: 20,
            reuseExistingChunk: true,
          },
          // Other vendor libraries
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendors",
            priority: 10,
            reuseExistingChunk: true,
          },
        },
      };

      // Don't bundle server-only modules on the client
      config.resolve = config.resolve ?? {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        os: false,
      };
    }

    // Server side — exclude native modules from the bundle
    if (isServer) {
      config.externals = config.externals ?? [];
      if (Array.isArray(config.externals)) {
        config.externals.push("better-sqlite3");
      }
    }

    return config;
  },
};

export default nextConfig;
