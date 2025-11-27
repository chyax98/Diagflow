# DiagFlow

<p align="center">
  <img src="public/logo.svg" width="200" alt="DiagFlow Logo"/>
</p>

<p align="center">
  AI 驱动的智能图表生成器<br/>
  通过自然语言对话生成专业图表
</p>

---

## 功能

- AI 生成图表代码
- 实时预览和编辑
- 多格式导出（SVG/PNG/PDF/JPEG）
- 支持 15+ 图表引擎（Mermaid、PlantUML、D2、DBML、Graphviz 等）

## 技术栈

- Next.js + React + TypeScript
- Vercel AI SDK + OpenAI 兼容 API
- Kroki API（图表渲染）
- CodeMirror（代码编辑）

---

## 快速开始

```bash
pnpm install
cp .env.example .env.local
# 编辑 .env.local 配置 API
pnpm dev
```

访问 http://localhost:3000

### 环境变量

```env
OPENAI_API_KEY=sk-your-api-key
OPENAI_BASE_URL=https://api.moonshot.cn/v1
OPENAI_MODEL=kimi-k2-thinking
```

支持 Kimi、OpenRouter、OpenAI、Azure OpenAI 等兼容 API。

---

## 部署

### Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/chyax98/Diagflow&env=OPENAI_API_KEY,OPENAI_BASE_URL,OPENAI_MODEL)

详见 [deploy/vercel.md](./deploy/vercel.md)

### Docker

```bash
wget https://raw.githubusercontent.com/chyax98/Diagflow/main/deploy/docker-compose.prod.yml
wget https://raw.githubusercontent.com/chyax98/Diagflow/main/deploy/.env.example
cp .env.example .env
vim .env
docker compose -f docker-compose.prod.yml up -d
```

详见 [deploy/docker.md](./deploy/docker.md)

---

## 文档

- [CLAUDE.md](./CLAUDE.md) - 架构设计
- [deploy/](./deploy/) - 部署配置
- [docs/testing.md](./docs/testing.md) - 测试指南

---

## License

MIT
