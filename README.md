# DiagFlow

<p align="center">
  <img src="public/logo.svg" width="200" alt="DiagFlow Logo"/>
</p>

<p align="center">
  <strong>AI 驱动的智能图表生成器</strong><br/>
  通过自然语言对话快速生成流程图、时序图、架构图等 15+ 种专业图表
</p>

<p align="center">
  <a href="https://github.com/chyax98/Diagflow/actions/workflows/ci.yml">
    <img src="https://github.com/chyax98/Diagflow/actions/workflows/ci.yml/badge.svg" alt="CI Status"/>
  </a>
  <a href="https://github.com/chyax98/Diagflow/releases">
    <img src="https://img.shields.io/github/v/release/chyax98/Diagflow" alt="Release"/>
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/github/license/chyax98/Diagflow" alt="License"/>
  </a>
</p>

<p align="center">
  <em>Diagram + Flow = DiagFlow</em>
</p>

---

## 核心特性

用自然语言描述需求，AI 自动生成专业图表代码，支持 Mermaid、PlantUML、D2 等 15+ 图表引擎。

## 功能

- **AI 生成** - 自然语言描述需求，AI 生成图表代码
- **实时预览** - 代码编辑 + SVG 预览，500ms 防抖
- **多格式导出** - SVG / PNG / PDF / JPEG

---

## 快速开始（本地开发）

```bash
# 1. 安装依赖
pnpm install

# 2. 配置 API Key
cp agent/.env.example agent/.env
vim agent/.env  # 填写 OPENAI_API_KEY

# 3. 启动
pnpm dev  # 前端 :30000 + 后端 :30001
```

访问 http://localhost:30000

---

## Docker 部署

### 方式一：从 ghcr.io 拉取镜像（推荐）

```bash
# 1. 配置
cp .env.example .env
vim .env  # 填写 OPENAI_API_KEY

# 2. 启动
docker compose -f docker-compose.prod.yml up -d
```

### 方式二：本地构建

```bash
# 1. 配置
cp .env.example .env
vim .env  # 填写 OPENAI_API_KEY

# 2. 构建并启动
docker compose up -d --build
```

**访问**: http://localhost:3000

**环境变量**:

| 变量 | 必需 | 说明 |
|------|------|------|
| `OPENAI_API_KEY` | 是 | OpenAI API Key |
| `OPENAI_BASE_URL` | 否 | API 地址（默认 Moonshot） |
| `OPENAI_MODEL` | 否 | 模型名（默认 kimi-k2-thinking） |
| `KROKI_BASE_URL` | 否 | Kroki 服务地址 |
| `LOGFIRE_TOKEN` | 否 | Logfire 监控 Token |

---

## 使用

### AI 生成
1. 右侧输入："用 Mermaid 生成登录流程图"
2. AI 自动生成并渲染
3. 点击导出下载

### 手动编辑
1. 左上角选择引擎
2. 编辑代码
3. 自动渲染

### 预览
- 缩放：鼠标滚轮
- 平移：拖拽
- 重置：双击

---

## 支持的引擎

Mermaid, PlantUML, D2, DBML, Graphviz, C4-PlantUML, Nomnoml, ERD, Ditaa, Svgbob, WaveDrom, BlockDiag, SeqDiag, NwDiag

---

## 常见问题

**Agent 连接失败**
检查后端运行状态 + `OPENAI_API_KEY` 配置

**渲染失败**
查看错误提示，询问 AI："代码有什么问题？"

**自托管 Kroki**
```bash
docker run -d -p 8080:8000 yuzutech/kroki
# 更新 KROKI_BASE_URL=http://localhost:8080
```

---

## 架构

见 [CLAUDE.md](./CLAUDE.md)

## 参考

[PydanticAI](https://ai.pydantic.dev) | [CopilotKit](https://docs.copilotkit.ai) | [Kroki](https://kroki.io)
