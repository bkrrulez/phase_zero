
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  devIndicators: false,
  webpack: (config, { isServer }) => {
    // Exclude the scripts directory from being watched
    if (!isServer) {
        config.watchOptions = {
            ...config.watchOptions,
            ignored: [
                ...(config.watchOptions.ignored as any[] || []),
                '**/scripts/**'
            ],
        }
    }
    return config;
  }
};

export default nextConfig;
