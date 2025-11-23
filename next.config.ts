import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 启用 standalone 模式，优化 Docker 镜像大小
  output: "standalone",

  // 环境变量配置
  env: {
    NEXT_PUBLIC_KROKI_BASE_URL: process.env.NEXT_PUBLIC_KROKI_BASE_URL,
    AGENT_URL: process.env.AGENT_URL,
  },
};

export default nextConfig;
