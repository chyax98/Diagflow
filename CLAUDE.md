# DiagFlow 架构

## 技术栈

- Next.js 16 + React 19 + TypeScript
- Vercel AI SDK v5（流式对话 + 工具调用）
- Kroki API（图表渲染）
- CodeMirror 6（代码编辑）
- IndexedDB（会话持久化）

## 架构

```
Next.js (:3000)
├─ 前端: CodeEditor / SvgPreview / ChatPanel
├─ API: /api/chat (AI Agent) / /api/render (Kroki 代理)
└─ 语法库: src/lib/syntax-md/
```

## AI Agent 工具

| 工具 | 说明 |
|------|------|
| `get_diagram_syntax` | 获取语法规则 |
| `validate_and_render` | 渲染验证 |
| `get_current_diagram` | 获取当前图表 |
| `edit_diagram_code` | 增量编辑代码 |

## 环境变量

```env
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://api.moonshot.cn/v1
OPENAI_MODEL=kimi-k2-thinking
KROKI_BASE_URL=https://kroki.io  # 可选
```

## 扩展

- Prompt：`src/app/api/chat/route.ts`
- 语法文档：`src/lib/syntax-md/{engine}/`
- 默认模板：`src/lib/constants.ts`
