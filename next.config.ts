import type { NextConfig } from "next";

// NOTE: Next.js type definitions may lag behind config runtime behavior.
// We intentionally keep `trustHost` to support nginx reverse-proxy setups.
const nextConfig = {
  trustHost: true,
  reactCompiler: true,
} as unknown as NextConfig;

export default nextConfig;
