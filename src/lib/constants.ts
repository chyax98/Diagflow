// 存储配置（可通过环境变量覆盖）
export const STORAGE_CONFIG = {
  // 最大历史会话数（超出后自动删除最旧的）
  maxSessions: Number(process.env.NEXT_PUBLIC_MAX_SESSIONS) || 50,
  // 最大撤销步数
  maxUndoSteps: Number(process.env.NEXT_PUBLIC_MAX_UNDO_STEPS) || 50,
} as const;

// IndexedDB 存储键
export const STORAGE_KEYS = {
  sessions: "diagflow_sessions",
  currentSessionId: "diagflow_current_session_id",
} as const;

// 默认图表模板
export const DEFAULT_TEMPLATES: Record<string, string> = {
  mermaid: "flowchart TD\n  A[开始] --> B[结束]",
  plantuml: "@startuml\nAlice -> Bob: Hello\nBob --> Alice: Hi\n@enduml",
  d2: `用户: {shape: person}
Web界面: {
  shape: rectangle
  style.fill: "#e3f2fd"
}
数据库: {
  shape: cylinder
  style.fill: "#ffccbc"
}

用户 -> Web界面: "访问"
Web界面 -> 数据库: "查询"`,
  dbml: "Table users {\n  id integer [pk]\n  name varchar\n}",
  graphviz: "digraph G {\n  A -> B\n}",
  c4plantuml: `@startuml
!include <C4/C4_Context>

Person(user, "用户", "系统使用者")
System(system, "系统", "核心系统")

Rel(user, system, "使用", "HTTPS")

LAYOUT_WITH_LEGEND()
@enduml`,
  wavedrom: `{ "signal": [
  { "name": "clk", "wave": "p......" },
  { "name": "data", "wave": "x.345x.", "data": ["A", "B", "C"] }
]}`,
};
