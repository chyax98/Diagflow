# 部署配置

## 文件说明

| 文件 | 说明 |
|------|------|
| `docker-compose.prod.yml` | 生产环境（预构建镜像） |
| `docker-compose.yml` | 本地构建 |
| `nginx.conf` | Nginx 反向代理 |
| `vercel.md` | Vercel 部署 |
| `docker.md` | Docker 部署 |

## 快速部署

详见 [vercel.md](./vercel.md) 和 [docker.md](./docker.md)

## 环境变量

```env
OPENAI_API_KEY=sk-your-api-key
OPENAI_BASE_URL=https://api.moonshot.cn/v1
OPENAI_MODEL=kimi-k2-thinking
```
