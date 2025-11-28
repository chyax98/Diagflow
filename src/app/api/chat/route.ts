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
import { APP_CONFIG } from "@/config/app";

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

const SYSTEM_PROMPT = `<role>
图表生成 Agent。将用户需求转化为可视化图表，通过工具调用完成渲染验证。
</role>

<workflow>
执行 Thought-Action-Observation 循环：

1. Thought: 分析需求，确定图表类型和引擎
2. Action: get_diagram_syntax 查询语法规则
3. Observation: 获得语法和示例
4. Thought: 根据语法生成代码
5. Action: validate_and_render 渲染验证
6. Observation: 检查结果
7. 成功则回复用户；失败则分析错误，修正后重试
</workflow>

<tools>
get_diagram_syntax(engine, type)
- 用途: 获取语法规则、示例、Kroki 限制
- 时机: 生成代码前必须调用

validate_and_render(engine, code?)
- 用途: 渲染代码到页面
- code 可选: 不传时自动使用待渲染的代码
- 时机: 新建图表 或 edit_diagram_code 之后

get_current_diagram()
- 用途: 获取当前页面上的图表
- 时机: 修改现有图表前

edit_diagram_code(search, replace)
- 用途: 局部修改代码（只替换，不验证）
- 要求: search 精确匹配
- 可多次调用，最后统一 validate_and_render
</tools>

<engines>
${ENGINE_SELECTION}
</engines>

<examples>
Q: 画一个用户登录流程图

Thought: 流程图需求，Mermaid flowchart 适合，先查语法
Action: get_diagram_syntax("mermaid", "flowchart")
Observation: [语法规则和示例]

Thought: 根据语法生成登录流程代码
Action: validate_and_render("mermaid", "flowchart TD...")
Observation: success=true

Response: 已生成登录流程图，包含输入验证、登录判断和结果分支。

---
Q: 把这个节点改成蓝色

Thought: 样式小改动，用 edit_diagram_code
Action: get_current_diagram()
Observation: [当前 mermaid 代码]

Thought: 添加 style 定义
Action: edit_diagram_code("flowchart TD", "flowchart TD\\n  style A fill:#0066cc")
Observation: success=true

Response: 已将节点颜色改为蓝色。

---
Q: 渲染失败处理（多处错误）

Thought: 渲染失败，分析错误信息，发现多处问题
Observation: error line 5, 8: invalid syntax

Thought: 先修复第 5 行
Action: edit_diagram_code("[错误代码1]", "[修正代码1]")
Observation: success=true

Thought: 再修复第 8 行
Action: edit_diagram_code("[错误代码2]", "[修正代码2]")
Observation: success=true

Thought: 修改完成，统一验证渲染
Action: validate_and_render("mermaid")
Observation: success=true

Response: 已修复语法错误并完成渲染。
</examples>

<constraints>
- 渲染成功才算完成，失败需分析重试
- 代码默认不输出，用户要求时才展示
- 需求不明确时先询问
- 严格遵守语法规则，只用支持的特性
</constraints>`.trim();

// 流式响应最大时长（秒）
// 注意：这是 Next.js segment config，必须是静态值，不能使用运行时配置
// Vercel Hobby: 60s, Pro: 300s
export const maxDuration = 120;

export async function POST(req: Request) {
  // 用于错误追踪（langfuse 可能未初始化）
  let trace: ReturnType<NonNullable<typeof langfuse>["trace"]> | null = null;

  try {
    const body = await req.json();

    // 验证请求体
    const validationResult = ChatRequestSchema.safeParse(body);
    if (!validationResult.success) {
      // 详细记录验证失败信息
      logger.warn("Chat 请求参数验证失败", {
        errors: validationResult.error.flatten(),
        // 记录消息概要（不含完整内容，避免日志过大）
        messageCount: body?.messages?.length,
        messageRoles: body?.messages?.map((m: { role?: string }) => m.role),
        hasCurrentDiagram: !!body?.currentDiagram,
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

    // 待验证的图表代码（AI 工作期间的中间状态）
    // - validate_and_render 失败时存入
    // - edit_diagram_code 优先从这里读取
    // - validate_and_render 成功时清空
    let pendingDiagram: { diagram_type: string; diagram_code: string } | null = null;

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
      stopWhen: stepCountIs(APP_CONFIG.ai.MAX_STEPS),

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
          description:
            "验证图表代码并渲染到页面。不传 code 时自动使用上次编辑的代码（适用于 edit_diagram_code 之后）。",
          inputSchema: z.object({
            engine: z.string().describe("图表引擎"),
            code: z.string().optional().describe("图表代码，不传则使用待渲染的代码"),
          }),
          execute: async ({ engine, code: inputCode }) => {
            toolCallCount++;
            const spanStartTime = Date.now();

            // 确定要渲染的代码：优先使用传入的 code，否则使用 pendingDiagram
            const code = inputCode || pendingDiagram?.diagram_code;
            if (!code) {
              return {
                success: false as const,
                error: { message: "无代码可渲染，请先生成或编辑代码" },
              };
            }

            // 记录工具调用到 Langfuse（记录完整代码）
            const span = trace?.span({
              name: `validate_and_render-${toolCallCount}`,
              input: {
                engine,
                code,
                code_length: code.length,
                code_lines: code.split("\n").length,
                callNumber: toolCallCount,
                source: inputCode ? "input" : "pending",
              },
            });

            try {
              // 调用渲染验证（但不返回 SVG）
              await renderDiagramServer(engine, code);

              // 成功：清空 pending 状态
              pendingDiagram = null;

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

              // 失败：存入 pending 状态，供 edit_diagram_code 使用
              pendingDiagram = { diagram_type: engine, diagram_code: code };

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

              // 🔴 渲染失败埋点：上报到 Langfuse（方便查询分析）
              trace?.event({
                name: "render-error",
                level: "ERROR",
                input: {
                  diagram_type: engine,
                  diagram_code: code,
                  code_lines: code.split("\n").length,
                },
                output: {
                  error_type: errorType,
                  error_message: errorMessage,
                  error_line: parsedError.line,
                },
                metadata: {
                  attemptNumber: toolCallCount,
                  duration: Date.now() - spanStartTime,
                },
              });

              // 记录失败的完整上下文（关键用于语法错误分析）
              span?.end({
                output: {
                  success: false,
                  error: parsedError,
                  failed_code: code,
                  code_lines: code.split("\n"),
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

        // 工具 4: 增量编辑图表代码（只替换，不验证）
        edit_diagram_code: {
          description:
            "增量编辑图表代码（只替换，不验证）。可多次调用，最后统一调用 validate_and_render 验证渲染。",

          inputSchema: z.object({
            search: z.string().describe("要查找的代码片段（精确匹配）"),
            replace: z.string().describe("替换后的代码"),
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

            // 获取图表代码：优先从 pending 读取（首次渲染失败的情况），否则从 currentDiagram 读取
            const sourceDiagram = pendingDiagram || currentDiagram;
            if (!sourceDiagram?.diagram_code) {
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

            const code = sourceDiagram.diagram_code;
            const diagramType = sourceDiagram.diagram_type;

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

            // 执行替换（不验证，统一由 validate_and_render 验证）
            const newCode = code.replace(searchNormalized, replace.trim());

            // 更新 pending 状态
            pendingDiagram = { diagram_type: diagramType, diagram_code: newCode };

            const result = {
              success: true,
              message: "代码已修改，请调用 validate_and_render 验证渲染",
            };

            // 记录成功
            span?.end({
              output: {
                success: true,
                code_length_before: code.length,
                code_length_after: newCode.length,
              },
              metadata: {
                duration: Date.now() - spanStartTime,
                engine: diagramType,
              },
            });

            return result;
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
