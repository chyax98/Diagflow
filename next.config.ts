import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 启用 standalone 模式，优化 Docker 镜像大小
  output: "standalone",

  // 客户端环境变量配置
  // 注意：只配置 NEXT_PUBLIC_ 开头的变量，服务端变量（如 AGENT_URL）不应放这里
  env: {
    NEXT_PUBLIC_KROKI_BASE_URL: process.env.NEXT_PUBLIC_KROKI_BASE_URL,
  },
};

export default nextConfig;
