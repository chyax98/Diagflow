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

## 部署

### Docker

```bash
wget https://raw.githubusercontent.com/chyax98/Diagflow/main/deploy/docker-compose.yml
wget https://raw.githubusercontent.com/chyax98/Diagflow/main/deploy/.env.example -O .env
vim .env  # 配置 OPENAI_API_KEY
docker compose up -d
```

### Vercel

[![Deploy](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/chyax98/Diagflow&env=OPENAI_API_KEY,OPENAI_BASE_URL,OPENAI_MODEL)

### 本地开发

```bash
pnpm install && cp .env.example .env.local
pnpm dev
```

## 环境变量

```env
OPENAI_API_KEY=sk-xxx                       # 必填
OPENAI_BASE_URL=https://api.moonshot.cn/v1  # 可选
OPENAI_MODEL=kimi-k2-thinking               # 可选
```

支持 Kimi、OpenRouter、OpenAI 等兼容 API。

## License

MIT
