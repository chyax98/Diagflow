# 部署配置

## 文件说明

| 文件 | 说明 |
|------|------|
| `docker-compose.prod.yml` | 生产环境（预构建镜像） |
| `docker-compose.yml` | 本地构建 |
| `nginx.conf` | Nginx 反向代理 |
| `vercel.md` | Vercel 部署教程 |
| `docker.md` | Docker 部署教程 |

## 快速部署

### Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/chyax98/Diagflow&env=OPENAI_API_KEY,OPENAI_BASE_URL,OPENAI_MODEL)

### Docker

```bash
wget https://raw.githubusercontent.com/chyax98/Diagflow/main/deploy/docker-compose.prod.yml
wget https://raw.githubusercontent.com/chyax98/Diagflow/main/deploy/.env.example
cp .env.example .env && vim .env
docker compose -f docker-compose.prod.yml up -d
```

## 环境变量

```env
OPENAI_API_KEY=sk-your-api-key
OPENAI_BASE_URL=https://api.moonshot.cn/v1
OPENAI_MODEL=gpt-4
NEXT_PUBLIC_KROKI_BASE_URL=https://kroki.io  # 可选
```
