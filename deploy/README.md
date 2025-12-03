# 部署指南

## 快速部署

```bash
# 1. 下载配置
wget https://raw.githubusercontent.com/chyax98/Diagflow/main/deploy/docker-compose.kroki.yml
wget https://raw.githubusercontent.com/chyax98/Diagflow/main/deploy/.env.example -O .env

# 2. 配置 API Key
vim .env

# 3. 启动
docker compose -f docker-compose.kroki.yml up -d
```

访问 http://localhost:3000

## 环境变量

```env
OPENAI_API_KEY=sk-xxx          # 必填
OPENAI_BASE_URL=https://api.moonshot.cn/v1
OPENAI_MODEL=kimi-k2-thinking
```

## 常用命令

```bash
docker compose -f docker-compose.kroki.yml up -d     # 启动
docker compose -f docker-compose.kroki.yml logs -f   # 日志
docker compose -f docker-compose.kroki.yml down      # 停止
```

## 部署方式

| 方式 | 配置文件 | 说明 |
|------|----------|------|
| 自托管 Kroki | `docker-compose.kroki.yml` | 推荐，含 Mermaid 渲染器 |
| 公网 Kroki | `docker-compose.prod.yml` | 使用 kroki.io |
| Vercel | [vercel.md](./vercel.md) | 一键部署 |

## 网络代理

如需代理访问 LLM API，使用 `network_mode: host`（已在 kroki.yml 配置）。
