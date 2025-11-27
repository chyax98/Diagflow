# Vercel 部署

## 一键部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/chyax98/Diagflow&env=OPENAI_API_KEY,OPENAI_BASE_URL,OPENAI_MODEL)

或从 GitHub 导入：[Vercel Dashboard](https://vercel.com/new) → Import Git Repository

## 环境变量

```env
# 必需
OPENAI_API_KEY=sk-your-api-key
OPENAI_BASE_URL=https://api.moonshot.cn/v1
OPENAI_MODEL=kimi-k2-thinking

# 可选
NEXT_PUBLIC_KROKI_BASE_URL=https://kroki.io
```

### API 配置示例

**Kimi**
```env
OPENAI_BASE_URL=https://api.moonshot.cn/v1
OPENAI_MODEL=kimi-k2-thinking
```

**OpenRouter**
```env
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_MODEL=openai/gpt-4
```

**OpenAI**
```env
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4
```

## 添加环境变量

Project → Settings → Environment Variables → Add New

修改后需要 Redeploy：Deployments → ⋮ → Redeploy

## 自定义域名

Settings → Domains → 输入域名 → 配置 DNS CNAME 记录

Vercel 自动配置 HTTPS 证书。

## 边缘函数优化

编辑 `src/app/api/chat/route.ts`，添加：

```typescript
export const runtime = 'edge';
```

可降低延迟、提高并发。

## 本地开发

```bash
npm i -g vercel
vercel login
vercel link
vercel env pull .env.local
vercel dev
```

## 常见问题

**API 超时**
- Hobby 计划限制 10 秒
- 升级 Pro（60 秒）或优化模型配置

**环境变量不生效**
- 检查拼写和环境选择（Production/Preview）
- 重新部署

**构建失败**
- Node 版本：在 `package.json` 添加 `"engines": {"node": ">=20.0.0"}`
- 依赖问题：检查 `pnpm-lock.yaml` 是否提交
