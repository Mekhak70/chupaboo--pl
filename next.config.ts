import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const polandStorageUrl = process.env.NEXT_PUBLIC_POLAND_SUPABASE_URL;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizeCss: true,
  },
  images: {
    remotePatterns: [
      ...(polandStorageUrl ? [new URL("/storage/v1/object/public/**", polandStorageUrl)] : []),
      {
        protocol: "https",
        hostname: "chupaboo.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "drive.google.com",
        port: "",
        pathname: "/uc/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
      
    ],
  },
  // Ավելացնել սա
  compiler: {
    // Remove `console.*` in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  // Կամ սա
  turbopack: {},
};
export default withAnalyzer(nextConfig);