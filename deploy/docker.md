# Docker 部署

## 快速开始

```bash
cd deploy
cp .env.example .env  # 配置 API Key
docker compose up -d
```

## 可选配置

### 启用本地 Kroki（渲染更快）

1. 编辑 `docker-compose.yml`，取消 `kroki` 和 `mermaid` 服务的注释
2. 取消 `app.depends_on` 的注释
3. 设置 `KROKI_BASE_URL=http://kroki:8000`

### 本地构建镜像

将 `app.image` 替换为：
```yaml
build:
  context: ..
  dockerfile: Dockerfile
```

### 配置代理

取消 `HTTP_PROXY` / `HTTPS_PROXY` 注释并修改地址。

## Nginx 反向代理

```nginx
server {
    listen 80;
    server_name diagram.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

## 常见问题

| 问题 | 解决 |
|------|------|
| LLM API 超时 | 配置代理或使用 `network_mode: host` |
| 端口冲突 | 修改 `.env` 中的 `PORT` |
| Mermaid 渲染失败 | 启用本地 Kroki 服务 |
