import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use threads for build checks in environments that restrict child processes.
  experimental: { workerThreads: true, useTypeScriptCli: false },
};

export default nextConfig;
