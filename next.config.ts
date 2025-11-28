import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 启用 standalone 模式，优化 Docker 镜像大小
  output: "standalone",
};

export default nextConfig;
