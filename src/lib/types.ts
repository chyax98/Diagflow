import { z } from "zod";

// ============================================================================
// Agent State（已废弃，保留以兼容旧代码）
// ============================================================================

export type AgentState = {
  diagram_type: string;
  diagram_name: string;
  diagram_code: string;
  svg_content: string;
  error_message: string | null;
  is_loading: boolean;
  retry_count: number;
  last_modified: number;
};

// ============================================================================
// Chat Message Schema（AI SDK 消息格式）
// ============================================================================

/**
 * 文本内容 Part
 */
export const TextPartSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

/**
 * 工具调用 Part（用户消息中）
 */
export const ToolCallPartSchema = z.object({
  type: z.literal("tool-call"),
  toolCallId: z.string(),
  toolName: z.string(),
  args: z.record(z.string(), z.unknown()),
});

/**
 * 工具结果 Part（助手消息中）
 */
export const ToolResultPartSchema = z.object({
  type: z.literal("tool-result"),
  toolCallId: z.string(),
  toolName: z.string(),
  result: z.unknown(),
  isError: z.boolean().optional(),
});

/**
 * Message Part（可以是文本、工具调用或工具结果）
 * 使用宽松匹配，允许 AI SDK 的各种 part 类型
 */
export const MessagePartSchema = z.union([
  TextPartSchema,
  ToolCallPartSchema,
  ToolResultPartSchema,
  // 兜底：允许任何包含 type 字段的对象（AI SDK 可能有其他 part 类型）
  z.object({ type: z.string() }).passthrough(),
]);

/**
 * Chat Message（完整消息格式 - 兼容 AI SDK UIMessage）
 * 使用 passthrough() 允许 AI SDK 添加的额外字段（如 toolInvocations, annotations 等）
 */
export const ChatMessageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(["user", "assistant", "system", "tool"]),
  content: z
    .union([
      z.string(), // 简单文本消息
      z.array(MessagePartSchema), // 多 part 消息
    ])
    .optional(),
  parts: z.array(MessagePartSchema).optional(), // AI SDK 使用 parts
  createdAt: z.union([z.date(), z.string()]).optional(), // 支持字符串日期
  // AI SDK 额外字段
  toolInvocations: z.array(z.unknown()).optional(),
  annotations: z.array(z.unknown()).optional(),
}).passthrough(); // 允许其他未知字段

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

// ============================================================================
// Chat Request/Response Schema
// ============================================================================

/**
 * 当前图表状态（传递给 AI）
 */
export const CurrentDiagramSchema = z.object({
  diagram_type: z.string(),
  diagram_code: z.string(),
  has_error: z.boolean().optional(),
});

export type CurrentDiagram = z.infer<typeof CurrentDiagramSchema>;

/**
 * Chat API 请求体
 */
export const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1, "消息列表不能为空"),
  currentDiagram: CurrentDiagramSchema.optional(),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

// ============================================================================
// Tool Call Result Schema（工具调用结果）
// ============================================================================

/**
 * 工具调用结果（validate_and_render 返回）
 *
 * 优化后的格式：
 * - 成功：只返回 diagram_type 和 diagram_code（不含 SVG，节省 99%+ token）
 * - 失败：返回结构化错误信息（error 对象）
 *
 * 使用 nullish() 允许 null、undefined 和缺失值，兼容旧格式
 */
export const ToolCallResultSchema = z.object({
  success: z.boolean(),
  diagram_type: z.string().nullish(),
  diagram_code: z.string().nullish(),
  // 以下字段已废弃（仅为向后兼容保留）
  svg_content: z.string().nullish(),
  error_message: z.string().nullish(),
  code_length: z.number().nullish(),
  svg_length: z.number().nullish(),
  // 新增字段：结构化错误（用于失败情况）
  error: z.object({
    message: z.string(),
    line: z.number().optional(),
    context: z.object({
      before: z.array(z.string()),
      error_line: z.string(),
      after: z.array(z.string()),
    }).optional(),
  }).nullish(),
});

export type ToolCallResult = z.infer<typeof ToolCallResultSchema>;

/**
 * 语法查询结果（get_diagram_syntax 返回）
 */
export const SyntaxResultSchema = z.union([
  z.object({
    success: z.literal(true),
    engine: z.string(),
    diagram_type: z.string(),
    description: z.string(),
    use_cases: z.array(z.string()),
    syntax_rules: z.string(),
    examples: z.array(z.string()),
  }),
  z.object({
    error: z.string(),
    supported_engines: z.array(z.string()).optional(),
    supported_types: z.array(z.string()).optional(),
  }),
]);

export type SyntaxResult = z.infer<typeof SyntaxResultSchema>;

// ============================================================================
// Error Types（错误类型）
// ============================================================================

/**
 * 应用错误基类
 */
export class DiagFlowError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "DiagFlowError";
  }
}

/**
 * 网络请求错误
 */
export class NetworkError extends DiagFlowError {
  constructor(message: string, cause?: unknown) {
    super(message, "NETWORK_ERROR", cause);
    this.name = "NetworkError";
  }
}

/**
 * 渲染错误
 */
export class RenderError extends DiagFlowError {
  constructor(message: string, cause?: unknown) {
    super(message, "RENDER_ERROR", cause);
    this.name = "RenderError";
  }
}

/**
 * 存储错误
 */
export class StorageError extends DiagFlowError {
  constructor(message: string, cause?: unknown) {
    super(message, "STORAGE_ERROR", cause);
    this.name = "StorageError";
  }
}

/**
 * 验证错误
 */
export class ValidationError extends DiagFlowError {
  constructor(message: string, cause?: unknown) {
    super(message, "VALIDATION_ERROR", cause);
    this.name = "ValidationError";
  }
}
