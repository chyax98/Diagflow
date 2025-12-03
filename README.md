# DiagFlow

<p align="center">
  <img src="public/logo.svg" width="120" alt="DiagFlow"/>
</p>

<p align="center">AI 驱动的智能图表生成器</p>

## 功能

- 🤖 自然语言生成图表
- ✏️ 实时预览编辑
- 📤 导出 SVG/PNG/PDF
- 📊 支持 Mermaid、PlantUML、D2、Graphviz 等

## 快速开始

**本地开发**
```bash
pnpm install && cp .env.example .env.local
# 编辑 .env.local 配置 OPENAI_API_KEY
pnpm dev
```

**Docker 部署** → [deploy/](./deploy/)

**Vercel** → [![Deploy](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/chyax98/Diagflow&env=OPENAI_API_KEY,OPENAI_BASE_URL,OPENAI_MODEL)

## 环境变量

```env
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://api.moonshot.cn/v1
OPENAI_MODEL=kimi-k2-thinking
```

支持 Kimi、OpenRouter、OpenAI 等兼容 API。

## License

MIT
