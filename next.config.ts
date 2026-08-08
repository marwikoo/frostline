import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const projectBasePath = "/frostline";

const nextConfig: NextConfig = {
  output: "export",
  reactStrictMode: true,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  basePath: isGitHubPages ? projectBasePath : "",
  assetPrefix: isGitHubPages ? `${projectBasePath}/` : "",
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;