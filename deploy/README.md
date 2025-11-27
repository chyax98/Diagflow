# 部署配置

## 文件说明

- `vercel.md` - Vercel 部署教程
- `docker.md` - Docker 部署教程
- `docker-compose.yml` - Docker 本地构建
- `docker-compose.prod.yml` - Docker 生产环境（预构建镜像）
- `nginx.conf` - Nginx 反向代理配置
- `.env.example` - 环境变量模板

## 快速开始

### Vercel（一键部署）

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/chyax98/Diagflow&env=OPENAI_API_KEY,OPENAI_BASE_URL,OPENAI_MODEL)

详见 [vercel.md](./vercel.md)

### Docker（VPS 部署）

```bash
wget https://raw.githubusercontent.com/chyax98/Diagflow/main/deploy/docker-compose.prod.yml
wget https://raw.githubusercontent.com/chyax98/Diagflow/main/deploy/.env.example
cp .env.example .env
vim .env
docker compose -f docker-compose.prod.yml up -d
```

详见 [docker.md](./docker.md)

## 环境变量

```env
# 必需
OPENAI_API_KEY=sk-your-api-key
OPENAI_BASE_URL=https://api.moonshot.cn/v1
OPENAI_MODEL=kimi-k2-thinking

# 可选
NEXT_PUBLIC_KROKI_BASE_URL=https://kroki.io
```
