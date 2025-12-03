# 部署指南

## Docker（推荐）

```bash
# 下载配置
wget https://raw.githubusercontent.com/chyax98/Diagflow/main/deploy/docker-compose.yml
wget https://raw.githubusercontent.com/chyax98/Diagflow/main/deploy/.env.example -O .env

# 配置 API Key
vim .env

# 启动
docker compose up -d
```

访问 http://localhost:3000

### 可选配置

编辑 `docker-compose.yml`：
- **本地 Kroki**：取消 `kroki`/`mermaid` 注释，设置 `KROKI_BASE_URL=http://kroki:8000`
- **代理**：取消 `HTTP_PROXY` 注释

## Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/chyax98/Diagflow&env=OPENAI_API_KEY,OPENAI_BASE_URL,OPENAI_MODEL)

> Hobby 计划限制 10s 超时，推荐使用快速模型

## 环境变量

```env
OPENAI_API_KEY=sk-xxx                      # 必填
OPENAI_BASE_URL=https://api.moonshot.cn/v1 # 可选
OPENAI_MODEL=kimi-k2-thinking              # 可选
```

支持 Kimi、OpenRouter、OpenAI 等兼容 API。
