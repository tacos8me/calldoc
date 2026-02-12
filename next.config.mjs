/** @type {import('next').NextConfig} */
const nextConfig = {
  // Performance: standalone output for Docker -- copies only necessary files
  // reducing image size by ~60% compared to default output
  output: 'standalone',

  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    // Performance: enable optimized package imports for tree-shaking
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns'],
  },

  images: {
    // Performance: configure Next.js image optimization
    remotePatterns: [],
    // Supported image formats (avif for smaller size, webp for compatibility)
    formats: ['image/avif', 'image/webp'],
    // Responsive sizes for srcSet generation
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    // Cache optimized images for 60 days (Docker self-hosted)
    minimumCacheTTL: 5184000,
  },

  // Performance: configure response headers for caching static assets
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ];
  },

  webpack: (config) => {
    // Ignore node-specific modules in client bundles
    config.resolve.fallback = {
      ...config.resolve.fallback,
      net: false,
      tls: false,
      fs: false,
    };
    return config;
  },
};

export default nextConfig;
