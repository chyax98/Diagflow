# DiagFlow 架构设计

DiagFlow = Diagram + Flow（图表 + 流式对话）

---

## 技术栈

- Next.js + React + TypeScript
- Vercel AI SDK v5（streamText + 工具调用）
- Kroki API（图表渲染）
- CodeMirror（代码编辑）

---

## 系统架构

```
浏览器
  ↓
Next.js (:3000)
├─ 前端
│  ├─ CodeEditor (CodeMirror)
│  ├─ SvgPreview (zoom/pan/export)
│  └─ ChatPanel (AI Elements)
│
├─ API
│  ├─ /api/chat          # AI Agent
│  ├─ /api/render/...    # Kroki 代理
│  └─ /api/health
│
└─ 语法库
   └─ src/lib/syntax-md/ (Markdown)
      ↓
Kroki (https://kroki.io)
```

---

## AI SDK v5 集成

### 后端

```typescript
// src/app/api/chat/route.ts
import { streamText, stepCountIs } from 'ai';

const result = streamText({
  model: openai.chat(process.env.OPENAI_MODEL),
  system: SYSTEM_PROMPT,
  messages: convertToModelMessages(messages),
  stopWhen: stepCountIs(10),  // 多轮工具调用
  tools: { ... },
});

return result.toUIMessageStreamResponse({
  originalMessages: messages,
});
```

### 前端

```typescript
// src/components/chat-panel.tsx
import { useChat } from '@ai-sdk/react';

const transport = useMemo(
  () => new DefaultChatTransport({
    api: '/api/chat',
    body: () => ({ currentDiagram: diagramStateRef.current }),
  }),
  [diagramStateRef]
);

const { messages, sendMessage } = useChat({ transport });
```

---

## Kroki 渲染

```typescript
// 服务端
renderDiagramServer() → renderKroki() → Kroki API

// 浏览器
renderDiagram() → /api/render/... → renderKroki() → Kroki API
```

`/api/render` 代理避免 CORS，统一错误处理。

---

## AI Agent 工具

| 工具 | 说明 |
|------|------|
| `get_diagram_syntax` | 查询语法规则 |
| `validate_and_render` | 渲染验证 |
| `get_current_diagram` | 获取当前图表 |

工作流：分析需求 → 查语法 → 生成代码 → 渲染验证 → 失败重试（最多 3 次）

---

## 状态管理

```typescript
// src/app/page.tsx
const [diagramType, setDiagramType] = useState('mermaid');
const [localCode, setLocalCode] = useState('...');
const [svgContent, setSvgContent] = useState('');

const diagramStateRef = useRef<DiagramState>({
  diagram_type: diagramType,
  diagram_code: localCode,
  has_error: !!errorMessage,
});
```

**竞态防护**：使用 `renderVersionRef` 递增版本号，渲染完成时检查版本。

---

## 语法知识库

使用 Markdown 格式，直接加载无需构建：

```
src/lib/syntax-md/
├── mermaid/
│   ├── _meta.yaml
│   ├── flowchart.md
│   └── sequence.md
└── plantuml/
    └── ...
```

添加新引擎：创建目录 → 添加 `_meta.yaml` 和 `.md` → 在 `page.tsx` 添加默认模板。

---

## 环境变量

```env
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://api.moonshot.cn/v1
OPENAI_MODEL=kimi-k2-thinking
NEXT_PUBLIC_KROKI_BASE_URL=https://kroki.io
```

支持任何 OpenAI 兼容 API。

---

## 扩展

- 自定义 AI Prompt：编辑 `src/app/api/chat/route.ts` 的 `SYSTEM_PROMPT`
- 更换模型：修改环境变量 `OPENAI_BASE_URL` 和 `OPENAI_MODEL`
- 自托管 Kroki：Docker 启动后设置 `NEXT_PUBLIC_KROKI_BASE_URL`
