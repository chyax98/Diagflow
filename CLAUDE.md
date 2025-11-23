# DiagFlow 架构设计

**DiagFlow** = Diagram + Flow（图表 + 流程/流式对话）
AI 驱动的智能图表生成器

## 技术栈

**前端**: Next.js 15 + React 19 + CopilotKit
**后端**: PydanticAI + FastAPI
**渲染**: Kroki API

---

## 系统架构

```
公网 (80/443)
  ↓ Nginx 反向代理
前端 (Next.js :3000) ← 唯一对外端口
├─ CodeEditor (CodeMirror)
├─ SvgPreview (zoom/pan/export)
├─ CopilotSidebar (AI 对话)
└─ API Route (/api/render/*)
     ↓ HTTP (内网)
后端 (FastAPI :8000) ← 内网，不对外
├─ PydanticAI Agent
│  ├─ 3 个工具 (get_diagram_syntax, validate_and_render, get_current_diagram)
│  └─ 语法知识库 (15 个 TOML 文件)
├─ kroki_client.py (统一渲染客户端)
│  └─ Agent 工具和 API 端点共享
└─ API 端点 (/api/render/{engine}/{format})
     ↓ HTTP
Kroki (图表渲染)
└─ 15+ 引擎 (mermaid, plantuml, d2 ...)
```

**架构特点**:
- 后端不对外暴露，只在内网运行
- 所有 Kroki 调用统一走 `kroki_client.py`
- 前端和 Agent 工具共享渲染逻辑
- Nginx/宝塔只需代理前端 3000 端口

---

## 数据流

**AI 生成**:
```
用户输入 → Agent → get_diagram_syntax → 生成代码
  → validate_and_render → kroki_client → Kroki → SVG
```

**手动编辑**:
```
浏览器编辑 → useDebounce (500ms) → /api/render (Next.js)
  → 后端 /api/render → kroki_client → Kroki → SVG
```

**调用链路统一**:
- Agent 工具: `kroki_client.render_diagram()`
- 后端代理: `kroki_client.render_diagram()`
- 前端请求: `/api/render` → 后端代理 → `kroki_client`

---

## 状态管理

**共享状态** (DiagramState):
```typescript
{
  diagram_type: string      // 引擎
  diagram_code: string      // 代码
  svg_content: string       // SVG
  error_message: string?
  retry_count: number       // 最多 3 次
}
```

**竞态防护**:
- `currentTypeRef` - 类型切换
- `lastSyncedCode` - 变化来源
- `renderVersionRef` - debounce 延迟

---

## 核心模块

### 前端

| 文件 | 说明 |
|------|------|
| `src/lib/kroki.ts` | Kroki 客户端封装，调用 Next.js API Route |
| `src/app/api/render/[engine]/[format]/route.ts` | API Route，转发到后端 |
| `src/app/page.tsx` | 主界面 (双模式 + 状态同步) |
| `src/components/code-editor.tsx` | 代码编辑器 |
| `src/components/svg-preview.tsx` | SVG 预览 (data URI 渲染) |

### 后端

| 文件 | 说明 |
|------|------|
| `agent/src/agent.py` | Agent 定义 (15 种引擎 + 3 工具) |
| `agent/src/kroki_client.py` | **统一 Kroki 客户端** (Agent + API 共享) |
| `agent/src/main.py` | FastAPI 应用 + API 端点 |
| `agent/syntax_toml/` | 语法知识库 (~400KB) |

---

## 部署

**本地**:
```bash
pnpm dev → next dev + uvicorn
```

**Docker**:
```bash
docker-compose up -d
├─ frontend (~100MB)
├─ backend (~150MB)
└─ kroki (~500MB)
```

---

## 关键设计

1. **统一 Kroki 客户端** - Agent 工具和 API 端点共享 `kroki_client.py`
   - 避免重复代码 (DRY 原则)
   - 统一错误处理和日志记录
   - 只在一个地方配置 `KROKI_BASE_URL`

2. **渲染版本号** - 防止 debounce 竞态

3. **data URI** - 避免 XSS

4. **超时控制** - 30s 避免挂起

5. **Logfire** - 可选监控

6. **内网隔离** - 后端不暴露端口，通过前端 API Route 转发
