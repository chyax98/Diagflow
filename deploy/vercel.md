# Vercel 部署

## 一键部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/chyax98/Diagflow&env=OPENAI_API_KEY,OPENAI_BASE_URL,OPENAI_MODEL)

## 环境变量

```env
OPENAI_API_KEY=sk-your-api-key
OPENAI_BASE_URL=https://api.moonshot.cn/v1
OPENAI_MODEL=gpt-4
```

### API 配置示例

| Provider | BASE_URL | MODEL |
|----------|----------|-------|
| Kimi | `https://api.moonshot.cn/v1` | `kimi-k2-thinking` |
| OpenRouter | `https://openrouter.ai/api/v1` | `openai/gpt-4` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4` |

## 配置

**添加环境变量**：Project → Settings → Environment Variables

**自定义域名**：Settings → Domains → 添加域名 → 配置 DNS

**重新部署**：Deployments → ⋮ → Redeploy

## 本地开发

```bash
npm i -g vercel
vercel login
vercel link
vercel env pull .env.local
vercel dev
```

## 常见问题

| 问题 | 解决 |
|------|------|
| API 超时 | Hobby 限制 10s，升级 Pro 或优化模型 |
| 环境变量不生效 | 检查拼写，重新部署 |
| 构建失败 | 确保 Node 20+，检查 pnpm-lock.yaml |
