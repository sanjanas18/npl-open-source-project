import type { NextConfig } from "next";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const basePath =
  process.env.BASE_PATH ??
  (process.env.GITHUB_ACTIONS === "true" && repositoryName ? `/${repositoryName}` : "");

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
};

export default nextConfig;
