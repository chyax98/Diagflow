# Docker 部署

## 快速开始

### 使用预构建镜像（推荐）

```bash
# 下载配置
wget https://raw.githubusercontent.com/chyax98/Diagflow/main/deploy/docker-compose.prod.yml
wget https://raw.githubusercontent.com/chyax98/Diagflow/main/deploy/.env.example

# 配置环境变量
cp .env.example .env
vim .env

# 启动
docker compose -f docker-compose.prod.yml up -d

# 查看日志
docker compose -f docker-compose.prod.yml logs -f
```

访问 http://localhost:3000

### 本地构建

```bash
git clone https://github.com/chyax98/Diagflow.git
cd Diagflow
cp .env.example .env
vim .env
docker compose up -d --build
```

## 环境变量

```env
# 必需
OPENAI_API_KEY=sk-your-api-key
OPENAI_BASE_URL=https://api.moonshot.cn/v1
OPENAI_MODEL=kimi-k2-thinking

# 可选
NEXT_PUBLIC_KROKI_BASE_URL=https://kroki.io
PORT=3000
```

## 常用命令

```bash
# 启动/停止
docker compose up -d
docker compose stop
docker compose down

# 查看日志
docker compose logs -f

# 重启
docker compose restart

# 更新镜像
docker compose pull
docker compose up -d
```

## Nginx 配置

```nginx
server {
    listen 80;
    server_name diagflow.example.com;

    client_max_body_size 10M;

    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

    location / {
        proxy_pass http://127.0.0.1:3000;
    }
}
```

启用配置：

```bash
ln -s /etc/nginx/sites-available/diagflow /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### HTTPS（Certbot）

```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d diagflow.example.com
certbot renew --dry-run
```

## 自托管 Kroki

编辑 `docker-compose.yml`：

```yaml
services:
  app:
    environment:
      - NEXT_PUBLIC_KROKI_BASE_URL=http://kroki:8000
    depends_on:
      - kroki

  kroki:
    image: yuzutech/kroki:latest
    ports:
      - "8080:8000"
    restart: unless-stopped
```

## 性能优化

### 资源限制

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
```

### 日志轮转

```yaml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 常见问题

**端口占用**
```bash
# 查看占用
lsof -i :3000

# 修改端口
PORT=3001
```

**内存不足**
- 容器频繁重启：增加 Docker 内存限制或升级服务器

**构建失败**
- 检查 pnpm-lock.yaml 是否存在
- 使用 Node 20+
