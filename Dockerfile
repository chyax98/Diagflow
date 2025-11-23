# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-alpine AS deps

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./

# 安装依赖（跳过 postinstall 脚本，避免依赖 agent 目录）
RUN pnpm install --frozen-lockfile --ignore-scripts

# ============================================
# Stage 2: Builder
# ============================================
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# 从 deps 复制依赖
COPY --from=deps /app/node_modules ./node_modules

# 复制源代码
COPY . .

# 构建参数（可在构建时传入）
ARG NEXT_PUBLIC_KROKI_BASE_URL
ARG AGENT_URL

ENV NEXT_PUBLIC_KROKI_BASE_URL=${NEXT_PUBLIC_KROKI_BASE_URL}
ENV AGENT_URL=${AGENT_URL}
ENV NEXT_TELEMETRY_DISABLED=1

# 构建应用
RUN pnpm build

# ============================================
# Stage 3: Runner (生产环境)
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 设置生产环境
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 复制必要文件
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 切换到非 root 用户
USER nextjs

# 暴露端口
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# 启动应用
CMD ["node", "server.js"]
