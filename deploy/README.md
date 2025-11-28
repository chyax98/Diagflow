# 部署配置

## 文件说明

| 文件 | 说明 |
|------|------|
| `docker-compose.prod.yml` | 生产环境（预构建镜像，使用公网 Kroki） |
| `docker-compose.kroki.yml` | 生产环境 + 自托管 Kroki（含 Mermaid） |
| `docker-compose.yml` | 本地构建 |
| `nginx.conf` | Nginx 反向代理 |
| `vercel.md` | Vercel 部署 |
| `docker.md` | Docker 部署 |

## 快速部署

### 方式一：使用公网 Kroki（推荐）

```bash
cp .env.example .env
vim .env  # 配置 API Key
docker compose -f docker-compose.prod.yml up -d
```

### 方式二：自托管 Kroki

适合内网环境或需要更快渲染速度的场景：

```bash
cp .env.example .env
vim .env  # 配置 API Key
docker compose -f docker-compose.kroki.yml up -d
```

包含服务：
- DiagFlow 应用
- Kroki 核心网关
- Mermaid 渲染器

详见 [vercel.md](./vercel.md) 和 [docker.md](./docker.md)

## 环境变量

```env
# AI 提供商（openai 或 anthropic）
AI_PROVIDER=openai

# OpenAI 兼容 API
OPENAI_API_KEY=sk-your-api-key
OPENAI_BASE_URL=https://api.moonshot.cn/v1
OPENAI_MODEL=kimi-k2-thinking

# 或 Anthropic Claude
# ANTHROPIC_API_KEY=sk-ant-xxx
# ANTHROPIC_MODEL=claude-sonnet-4-20250514
```

完整配置见 `.env.example`
