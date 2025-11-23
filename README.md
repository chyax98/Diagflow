# DiagFlow

<p align="center">
  <img src="public/logo.svg" width="200" alt="DiagFlow Logo"/>
</p>

<p align="center">
  <strong>AI 驱动的智能图表生成器</strong><br/>
  通过自然语言对话快速生成流程图、时序图、架构图等 15+ 种专业图表
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

## 快速开始（本地）

```bash
# 1. 安装依赖
pnpm install

# 2. 配置 API Key
cp agent/.env.example agent/.env
vim agent/.env  # 填写 OPENAI_API_KEY

# 3. 启动
pnpm dev  # 前端 :3000 + 后端 :8000
```

---

## Docker 部署

```bash
# 1. 配置
cp .env.example .env
vim .env  # 填写 OPENAI_API_KEY

# 2. 启动
./docker-start.sh
# 或 docker-compose up -d
```

**访问**:
- 前端：http://localhost:3000
- 后端：http://localhost:8000

**环境变量**:
- `OPENAI_API_KEY` (必需)
- `OPENAI_BASE_URL` (可选，默认 Moonshot)
- `LOGFIRE_TOKEN` (可选，生产监控)

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
