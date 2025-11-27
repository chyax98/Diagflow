# DiagFlow 架构

DiagFlow = Diagram + Flow（图表 + AI 对话）

## 技术栈

- Next.js 15 + React 19 + TypeScript
- Vercel AI SDK v5（流式对话 + 工具调用）
- Kroki API（图表渲染）
- CodeMirror 6（代码编辑）
- IndexedDB（会话持久化）

## 架构

```
浏览器
  ↓
Next.js (:3000)
├─ 前端
│  ├─ CodeEditor (CodeMirror)
│  ├─ SvgPreview (zoom/pan/export)
│  └─ ChatPanel (AI 对话)
│
├─ API
│  ├─ /api/chat          # AI Agent
│  ├─ /api/render/...    # Kroki 代理
│  └─ /api/health
│
└─ 语法库
   └─ src/lib/syntax-md/
      ↓
Kroki (https://kroki.io)
```

## AI Agent 工具

| 工具 | 说明 |
|------|------|
| `get_diagram_syntax` | 获取语法规则 |
| `validate_and_render` | 渲染验证 |
| `get_current_diagram` | 获取当前图表 |

工作流：分析需求 → 查语法 → 生成代码 → 渲染验证 → 失败重试

## 状态管理

- `useSession` - 会话管理（IndexedDB 持久化）
- `useUndo` - 撤销/重做
- `useRenderControl` - 渲染控制

会话命名格式：`类型 月日-时分`（如 Mermaid 1127-1430）

## 环境变量

```env
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://api.moonshot.cn/v1
OPENAI_MODEL=gpt-4
NEXT_PUBLIC_KROKI_BASE_URL=https://kroki.io
```

## 扩展

- 自定义 Prompt：编辑 `src/app/api/chat/route.ts`
- 更换模型：修改环境变量
- 自托管 Kroki：Docker 部署后配置 `NEXT_PUBLIC_KROKI_BASE_URL`
- 添加图表引擎：在 `src/lib/syntax-md/` 添加语法文件
