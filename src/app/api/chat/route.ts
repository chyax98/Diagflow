import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { getDiagramSyntax, generateEngineSelectionText } from "@/lib/syntax";
import { renderDiagramServer } from "@/lib/kroki";
import { langfuse, isLangfuseEnabled } from "@/lib/langfuse";
import { nanoid } from "nanoid";
import { logger } from "@/lib/logger";
import { ChatRequestSchema } from "@/lib/types";

// 根据环境变量选择 AI 提供商
// 支持 DIAGFLOW_ 前缀（项目专用）和无前缀（兼容）
const AI_PROVIDER = process.env.DIAGFLOW_AI_PROVIDER || process.env.AI_PROVIDER || "openai";

// 配置 OpenAI 兼容的 API（支持 Kimi、OpenRouter 等）
const openai = createOpenAI({
  baseURL:
    process.env.DIAGFLOW_OPENAI_BASE_URL ||
    process.env.OPENAI_BASE_URL ||
    "https://api.moonshot.cn/v1",
  apiKey: process.env.DIAGFLOW_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "",
});

// 配置 Anthropic Claude API
const anthropic = createAnthropic({
  apiKey: process.env.DIAGFLOW_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || "",
  baseURL: process.env.DIAGFLOW_ANTHROPIC_BASE_URL || process.env.ANTHROPIC_BASE_URL || undefined,
});

// 获取模型实例
function getModel() {
  if (AI_PROVIDER === "anthropic") {
    const modelName =
      process.env.DIAGFLOW_ANTHROPIC_MODEL ||
      process.env.ANTHROPIC_MODEL ||
      "claude-3-5-sonnet-20241022";
    return anthropic(modelName);
  } else {
    const modelName =
      process.env.DIAGFLOW_OPENAI_MODEL || process.env.OPENAI_MODEL || "kimi-k2-thinking";
    return openai.chat(modelName);
  }
}

// 动态生成引擎选择策略
const ENGINE_SELECTION = generateEngineSelectionText();

const SYSTEM_PROMPT = `你是专业图表生成助手，根据用户需求选择合适的引擎，生成符合规范的图表代码。

## 引擎和类型（工具参数必须从此表选取）

${ENGINE_SELECTION}

选择原则：用户指定则直接使用，否则根据"典型场景"匹配需求。engine/type 必须完全匹配上表。

## 工具

| 工具 | 说明 |
|------|------|
| get_diagram_syntax(engine, type) | 获取语法规则，生成前必须调用 |
| validate_and_render(engine, code) | 渲染验证，成功返回代码信息，失败返回错误（含行号和上下文） |
| get_current_diagram() | 获取当前图表状态 |
| edit_diagram_code(search, replace) | 局部编辑代码，适用于小修改（颜色/文本/单个节点） |

**edit_diagram_code 使用说明**
- 适用：修改颜色（fill:#fff→fill:#00f）、修改文本、添加单行
- 不适用：大规模重构（>5行）、不确定位置、结构调整
- 失败时：回退到 validate_and_render 重新生成

## 工作流程

**生成新图表**
1. 确定 engine/type → 2. get_diagram_syntax → 3. 按语法规则生成代码 → 4. validate_and_render
失败则分析错误、修正、重试（最多 3 次）

**修改现有图表**
1. get_current_diagram → 2. 小修改用 edit_diagram_code，大修改用 validate_and_render

**需求模糊**
快速确认关键信息，不要猜测。例："你要的架构图是现代风格（D2）还是 C4 模型？"

## 沟通规范

- 成功：简述图表类型和内容（"已生成登录流程图，包含：用户输入→验证→结果"）
- 失败：说明问题和修正动作（"语法错误：缺少结束标签，正在修正..."）
- 修改：确认修改内容（"已添加忘记密码流程"）
- 代码：默认不输出，用户要求时才展示

## 核心要求

1. 生成前必须调用 get_diagram_syntax（工具是知识来源）
2. 严格遵守语法规则：
   - "Kroki 限制"列出的特性绝对不能使用
   - 只用明确列出的特性，不推测
   - 遇到 "Could not parse input" 检查是否用了不支持的语法
   - 优先参考示例代码
3. 生成后必须调用 validate_and_render 验证
4. 失败时仔细阅读错误信息（含行号和上下文），对照"常见错误"修正
5. 渲染成功才算完成任务
`.trim();

// 允许流式响应最多 30 秒
export const maxDuration = 30;

export async function POST(req: Request) {
  // 用于错误追踪（langfuse 可能未初始化）
  let trace: ReturnType<NonNullable<typeof langfuse>["trace"]> | null = null;

  try {
    const body = await req.json();

    // 验证请求体
    const validationResult = ChatRequestSchema.safeParse(body);
    if (!validationResult.success) {
      logger.warn("Chat 请求参数验证失败", {
        errors: validationResult.error.flatten(),
      });

      return new Response(
        JSON.stringify({
          error: "请求参数错误",
          details: validationResult.error.flatten(),
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { messages, currentDiagram } = validationResult.data;

    // 创建 Langfuse trace（如果启用）
    const traceId = nanoid();
    trace = isLangfuseEnabled()
      ? langfuse!.trace({
          id: traceId,
          name: "diagflow-chat",
          userId: "user-" + nanoid(8), // 如果有用户系统，替换为真实 ID
          metadata: {
            diagramType: currentDiagram?.diagram_type,
            hasError: currentDiagram?.has_error,
            userMessage: messages[messages.length - 1],
          },
        })
      : null;

    // 记录完整的输入消息
    trace?.event({
      name: "chat-input",
      input: {
        messages: messages.map((m) => ({
          role: m.role,
          content: typeof m.content === "string" ? m.content : "multi-part",
        })),
        currentDiagram: currentDiagram,
      },
    });

    // 用于跟踪工具调用次数
    let toolCallCount = 0;
    let generationCount = 0;

    const result = streamText({
      // 根据 AI_PROVIDER 选择模型提供商（OpenAI 或 Anthropic）
      model: getModel(),
      system: SYSTEM_PROMPT,
      // convertToModelMessages 会自动处理 UI 消息格式到 ModelMessage 的转换
      // 使用 unknown 作为中间类型，比 any 更安全
      // ChatRequestSchema 已验证消息格式，这里的转换是安全的
      messages: convertToModelMessages(messages as unknown as UIMessage[]),

      // 允许多轮工具调用（查询语法 → 生成代码 → 渲染 → 可能重试）
      // AI SDK v5 使用 stopWhen + stepCountIs 替代 maxSteps
      stopWhen: stepCountIs(10),

      // 启用 telemetry 追踪（自动记录到 Langfuse）
      experimental_telemetry: {
        isEnabled: true,
        functionId: "diagflow-chat",
        metadata: {
          diagramType: currentDiagram?.diagram_type || "",
          hasError: currentDiagram?.has_error || false,
        },
      },

      // 每一步完成时的回调（记录 AI 的每次生成和工具调用决策）
      onStepFinish: async ({ text, toolCalls, usage, finishReason }) => {
        generationCount++;

        // 记录 AI 生成的文本（如果有）
        if (text) {
          trace?.span({
            name: `generation-${generationCount}`,
            input: { step: generationCount },
            output: {
              text,
              hasToolCalls: toolCalls.length > 0,
              toolCallsPlanned: toolCalls.map((t) => ({
                name: t.toolName,
                args: (t as any).input,
              })),
            },
            metadata: {
              finishReason,
              stepNumber: generationCount,
              inputTokens: usage?.inputTokens,
              outputTokens: usage?.outputTokens,
              totalTokens: usage?.totalTokens,
            },
          });
        }

        // 记录 AI 决定调用的工具（计划阶段）
        if (toolCalls.length > 0) {
          trace?.event({
            name: "tool-calls-planned",
            output: {
              step: generationCount,
              tools: toolCalls.map((t) => ({
                name: t.toolName,
                args: (t as any).input,
              })),
            },
          });
        }
      },

      // 流式响应完成时的回调
      onFinish: async ({ usage, finishReason, response: _response }) => {
        // 记录最终结果
        trace?.event({
          name: "chat-finish",
          output: {
            finishReason,
            totalSteps: generationCount,
            totalToolCalls: toolCallCount,
            usage: usage
              ? {
                  input: usage.inputTokens,
                  output: usage.outputTokens,
                  total: usage.totalTokens,
                }
              : undefined,
          },
        });

        // 刷新 Langfuse 数据到云端
        if (isLangfuseEnabled()) {
          await langfuse!.flushAsync();
        }
      },

      tools: {
        // 工具 1: 获取语法规则
        get_diagram_syntax: {
          description: "获取语法规则。参数必须从支持的 engine/type 表中选取",
          inputSchema: z.object({
            engine: z.string().describe("图表引擎，必须从支持列表选取"),
            type: z.string().describe("图表类型，必须从支持列表选取"),
          }),
          execute: async ({ engine, type: diagram_type }) => {
            toolCallCount++;
            const spanStartTime = Date.now();

            // 记录工具调用
            const span = trace?.span({
              name: `get_diagram_syntax-${toolCallCount}`,
              input: { engine, diagram_type, callNumber: toolCallCount },
            });

            const syntax = getDiagramSyntax(engine, diagram_type);

            // 记录完整的语法规则（用于后续分析）
            const syntaxRules = "syntax_rules" in syntax ? (syntax.syntax_rules ?? "") : "";
            span?.end({
              output: {
                success: "success" in syntax,
                syntaxLength: syntaxRules.length,
                syntaxPreview:
                  syntaxRules.length > 0
                    ? syntaxRules.substring(0, 500) + (syntaxRules.length > 500 ? "..." : "")
                    : "",
                fullSyntax: syntax,
              },
              metadata: {
                duration: Date.now() - spanStartTime,
                engine,
                diagramType: diagram_type,
              },
            });

            return syntax;
          },
        },

        // 工具 2: 验证并渲染图表
        validate_and_render: {
          description: "验证图表代码语法并渲染。成功返回代码信息，失败返回结构化错误。",
          inputSchema: z.object({
            engine: z.string().describe("图表引擎"),
            code: z.string().describe("图表源代码"),
          }),
          execute: async ({ engine, code }) => {
            toolCallCount++;
            const spanStartTime = Date.now();

            // 记录工具调用到 Langfuse（记录完整代码）
            const span = trace?.span({
              name: `validate_and_render-${toolCallCount}`,
              input: {
                engine,
                code, // 完整代码，关键！
                code_length: code.length,
                code_lines: code.split("\n").length,
                callNumber: toolCallCount,
              },
            });

            try {
              // 调用渲染验证（但不返回 SVG）
              await renderDiagramServer(engine, code);

              // 成功：返回必要信息（不含 SVG）
              const result = {
                success: true as const,
                diagram_type: engine,
                diagram_code: code,
              };

              // 记录成功的详细信息
              span?.end({
                output: { success: true },
                metadata: {
                  duration: Date.now() - spanStartTime,
                  engine,
                  attemptNumber: toolCallCount,
                },
              });

              return result;

            } catch (e) {
              const errorMessage = e instanceof Error ? e.message : String(e);

              // 分析错误类型
              const errorType = errorMessage.includes("Parse error")
                ? "syntax_error"
                : errorMessage.includes("timeout")
                  ? "timeout"
                  : errorMessage.includes("404")
                    ? "not_found"
                    : "unknown";

              // 降级方案：简单的行号提取
              const lineMatch = errorMessage.match(/line\s+(\d+)/i);
              const parsedError = {
                message: errorMessage,
                line: lineMatch ? parseInt(lineMatch[1], 10) : undefined,
              };

              const result = {
                success: false as const,
                error: parsedError,
              };

              // 记录失败的完整上下文（关键用于语法错误分析）
              span?.end({
                output: {
                  success: false,
                  error: parsedError,
                  failed_code: code, // 完整的失败代码（仅记录，不返回给 AI）
                  code_lines: code.split("\n"), // 逐行代码（仅记录）
                },
                metadata: {
                  duration: Date.now() - spanStartTime,
                  engine,
                  attemptNumber: toolCallCount,
                  errorType,
                },
                level: "ERROR",
              });

              return result;
            }
          },
        },

        // 工具 3: 获取当前图表状态
        get_current_diagram: {
          description: "获取当前正在编辑的图表状态（引擎类型、代码、SVG）",
          inputSchema: z.object({}),
          execute: async () => {
            toolCallCount++;

            // 记录工具调用
            const span = trace?.span({
              name: `get_current_diagram-${toolCallCount}`,
              input: { callNumber: toolCallCount },
            });

            const diagram = currentDiagram || {
              diagram_type: "",
              diagram_code: "",
              has_error: false,
            };

            span?.end({
              output: {
                diagram_type: diagram.diagram_type,
                has_code: !!diagram.diagram_code,
                code_length: diagram.diagram_code?.length || 0,
                has_error: diagram.has_error,
              },
            });

            return diagram;
          },
        },

        // 工具 4: 增量编辑图表代码
        edit_diagram_code: {
          description: `局部编辑图表代码，适用于小修改（颜色、文本、单个节点）。
search 必须唯一匹配，编辑后自动验证语法。失败时建议用 validate_and_render 重新生成。`,

          inputSchema: z.object({
            search: z.string().describe("要查找的代码片段（精确匹配）"),
            replace: z.string().describe("替换后的代码片段"),
          }),

          execute: async ({ search, replace }) => {
            toolCallCount++;
            const spanStartTime = Date.now();

            // 记录工具调用到 Langfuse
            const span = trace?.span({
              name: `edit_diagram_code-${toolCallCount}`,
              input: {
                search,
                replace,
                search_length: search.length,
                replace_length: replace.length,
                callNumber: toolCallCount,
              },
            });

            // 获取当前图表代码
            if (!currentDiagram?.diagram_code) {
              const result = {
                success: false,
                error: "无当前图表，请先生成图表",
              };

              span?.end({
                output: result,
                metadata: {
                  duration: Date.now() - spanStartTime,
                },
                level: "ERROR",
              });

              return result;
            }

            const code = currentDiagram.diagram_code;

            // 查找匹配（精确匹配）
            const searchNormalized = search.trim();
            const matches = code.split(searchNormalized).length - 1;

            if (matches === 0) {
              const result = {
                success: false,
                error: `未找到匹配的代码片段。建议使用完整代码重新生成。\n查找内容：\n${search}`,
              };

              span?.end({
                output: result,
                metadata: {
                  duration: Date.now() - spanStartTime,
                  code_length: code.length,
                },
                level: "WARNING",
              });

              return result;
            }

            if (matches > 1) {
              const result = {
                success: false,
                error: `找到 ${matches} 处匹配，无法确定修改位置。请提供更精确的 search 内容（包含更多上下文）。`,
                matches_count: matches,
              };

              span?.end({
                output: result,
                metadata: {
                  duration: Date.now() - spanStartTime,
                  code_length: code.length,
                },
                level: "WARNING",
              });

              return result;
            }

            // 执行替换
            const newCode = code.replace(searchNormalized, replace.trim());

            // 验证语法（调用 Kroki 渲染）
            try {
              await renderDiagramServer(currentDiagram.diagram_type, newCode);

              const result = {
                success: true,
                new_code: newCode,
                message: "代码已成功修改并验证",
              };

              // 记录成功
              span?.end({
                output: {
                  success: true,
                  code_length_before: code.length,
                  code_length_after: newCode.length,
                  token_saved_estimate: code.length * 2 - (search.length + replace.length),
                },
                metadata: {
                  duration: Date.now() - spanStartTime,
                  engine: currentDiagram.diagram_type,
                },
              });

              return result;
            } catch (e) {
              const errorMessage = e instanceof Error ? e.message : String(e);

              const result = {
                success: false,
                error: "修改后的代码语法错误",
                syntax_error: errorMessage,
                attempted_code: newCode,
              };

              // 记录失败的完整上下文
              span?.end({
                output: {
                  success: false,
                  error: errorMessage,
                  attempted_code: newCode,
                },
                metadata: {
                  duration: Date.now() - spanStartTime,
                  engine: currentDiagram.diagram_type,
                },
                level: "ERROR",
              });

              return result;
            }
          },
        },
      },
    });

    // 返回 UI Message Stream，携带工具调用事件
    return result.toUIMessageStreamResponse({
      originalMessages: messages as unknown as UIMessage[],
    });
  } catch (error) {
    // 记录错误到日志系统
    logger.error("Chat API 错误", error, {
      traceId: trace?.id,
      endpoint: "/api/chat",
    });

    // 记录错误到 Langfuse
    if (trace) {
      trace.event({
        name: "chat-error",
        level: "ERROR",
        output: {
          error: logger.formatError(error),
        },
      });

      // 尝试刷新 Langfuse（不阻塞响应）
      if (isLangfuseEnabled()) {
        langfuse!.flushAsync().catch((e) => {
          console.error("Langfuse flush 失败:", e);
        });
      }
    }

    // 构建错误响应
    const errorResponse: {
      error: string;
      code?: string;
      stack?: string;
      traceId?: string;
    } = {
      error: error instanceof Error ? error.message : "Internal server error",
      ...(trace?.id && { traceId: trace.id }),
    };

    // 开发环境返回完整错误信息
    if (process.env.NODE_ENV === "development") {
      errorResponse.stack = error instanceof Error ? error.stack : undefined;
      errorResponse.code = error instanceof Error ? error.name : undefined;
    }

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
