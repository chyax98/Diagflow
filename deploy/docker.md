# Docker 部署

## 快速开始

### 使用预构建镜像

```bash
wget https://raw.githubusercontent.com/chyax98/Diagflow/main/deploy/docker-compose.prod.yml
wget https://raw.githubusercontent.com/chyax98/Diagflow/main/deploy/.env.example
cp .env.example .env && vim .env
docker compose -f docker-compose.prod.yml up -d
```

### 本地构建

```bash
git clone https://github.com/chyax98/Diagflow.git
cd Diagflow
cp .env.example .env && vim .env
docker compose up -d --build
```

访问 http://localhost:3000

## 环境变量

```env
OPENAI_API_KEY=sk-your-api-key
OPENAI_BASE_URL=https://api.moonshot.cn/v1
OPENAI_MODEL=kimi-k2-thinking
NEXT_PUBLIC_KROKI_BASE_URL=https://kroki.io
PORT=3000
```

## 常用命令

```bash
docker compose up -d        # 启动
docker compose stop         # 停止
docker compose logs -f      # 日志
docker compose pull && docker compose up -d  # 更新
```

## Nginx 反向代理

```nginx
server {
    listen 80;
    server_name diagflow.example.com;
    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### HTTPS

```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d diagflow.example.com
```

## 自托管 Kroki

```yaml
services:
  app:
    environment:
      - NEXT_PUBLIC_KROKI_BASE_URL=http://kroki:8000
    depends_on:
      - kroki

  kroki:
    image: yuzutech/kroki:latest
    restart: unless-stopped
```

## 常见问题

| 问题 | 解决 |
|------|------|
| 端口占用 | `lsof -i :3000` 或修改 `PORT` |
| 内存不足 | 增加 Docker 内存限制 |
| 构建失败 | 确保 Node 20+，检查 pnpm-lock.yaml |
