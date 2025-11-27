import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { getDiagramSyntax } from '@/lib/syntax';
import { renderDiagramServer } from '@/lib/kroki';
import { langfuse, isLangfuseEnabled } from '@/lib/langfuse';
import { nanoid } from 'nanoid';
import { logger } from '@/lib/logger';
import { ChatRequestSchema, type ChatRequest } from '@/lib/types';

// 配置 OpenAI 兼容的 API（支持 Kimi、OpenRouter 等）
const openai = createOpenAI({
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.moonshot.cn/v1',
  apiKey: process.env.OPENAI_API_KEY || '',
});

const SYSTEM_PROMPT = `你是专业图表生成助手，核心能力是理解用户需求，选择合适的图表引擎，
调用工具获取语法规则，生成符合规范的图表代码。

## 可用工具

**get_diagram_syntax(engine, diagram_type)**
获取指定引擎和图表类型的完整语法规则、示例代码、最佳实践
使用时机：每次生成新图表前必须调用，确保语法正确

**validate_and_render(engine, code)**
验证代码语法并渲染为 SVG 图表
使用时机：代码生成后、代码修改后
返回：成功返回 SVG，失败返回错误信息

**get_current_diagram()**
获取当前正在编辑的图表状态（引擎类型、代码、SVG）
使用时机：用户要求修改现有图表时（如"改一下"、"添加XX功能"）

## 支持的引擎与选择策略

**通用场景（优先选择 Mermaid）**
- 流程图 → mermaid/flowchart
- 时序图 → mermaid/sequence
- 类图 → mermaid/class
- 状态图 → mermaid/state
- ER 图 → mermaid/er
- 甘特图 → mermaid/gantt
- 思维导图 → mermaid/mindmap

**专业场景**
- UML 标准图 → plantuml (sequence, class, activity, component, deployment)
- 现代架构图 → d2/diagram（简洁美观）
- C4 架构模型 → c4plantuml (context, container, component, deployment)
- 数据库设计 → dbml/schema（表结构、关系）
- 复杂关系图 → graphviz/diagram
- 网络拓扑图 → nwdiag/diagram
- 数字时序图 → wavedrom (timing, reg)
- ASCII 艺术图 → ditaa/diagram, svgbob/diagram
- 其他专用图 → erd, nomnoml, blockdiag, seqdiag

**选择原则**
- 用户明确指定引擎：直接使用（如"用 PlantUML 画时序图"）
- 用户未指定：优先 Mermaid（语法简单、渲染快）
- 特殊需求：UML 标准用 PlantUML，架构图用 D2/C4，数据库用 DBML
- **图表类型必须严格使用上面列出的类型**（如 d2 用 diagram，不要猜测 architecture）

## 标准工作流程

**场景 1：生成新图表**
1. 分析需求：用户要什么图表？关键元素是什么？
2. 确定引擎：根据上述策略选择引擎，类型必须从列表中选择（不要自己推理）
3. 获取语法：调用 get_diagram_syntax(engine, type)
4. 阅读规则：仔细查看返回的语法规则、示例、注意事项
5. 生成代码：严格按照语法规则编写代码
6. 渲染验证：调用 validate_and_render(engine, code)
7. 处理结果：
   - 成功：告知用户（简述图表内容）
   - 失败：分析错误 → 修正代码 → 重新渲染（最多 3 次）

**场景 2：修改现有图表**
1. 获取状态：调用 get_current_diagram()
2. 理解修改：用户要添加/删除/调整什么？
3. 修改代码：在现有代码基础上修改
4. 如需新语法：调用 get_diagram_syntax 查询
5. 渲染验证：validate_and_render
6. 告知用户：简述修改内容

**场景 3：需求模糊时**
快速确认关键信息，不要猜测。
例："你要的架构图是现代风格（D2）还是 C4 模型？"

## 沟通规范

**成功时**
告知图表类型和核心内容
✓ "已生成登录流程图（Mermaid），包含：用户输入 → 验证 → 成功/失败"
✓ "博客数据库设计完成（DBML），包含 users、posts、comments 三个表"

**失败时**
简要说明问题和修正动作
✓ "语法错误：缺少结束标签，正在修正..."
✓ "渲染失败，检测到不支持的节点类型，重新生成..."

**修改时**
确认修改内容
✓ "已添加忘记密码流程"
✓ "已调整数据库表关系"

**代码展示**
默认不在对话中输出代码（代码通过工具提交）
除非用户明确要求查看代码（如"给我看看代码"）

## 核心要求

1. **每次生成前**必须调用 get_diagram_syntax 获取语法规则（工具是知识来源）
2. **严格遵守语法规则**：
   - 语法规则中的"Kroki 限制"部分列出了不支持的特性，绝对不能使用
   - 只使用语法规则中明确列出的特性，不要推测或使用其他特性
   - 如遇错误提示"Could not parse input"，检查是否使用了不支持的语法
   - 示例代码是可以直接运行的，优先参考示例
3. **代码生成后**必须调用 validate_and_render 渲染并验证
4. **失败处理**：
   - 仔细阅读错误信息，定位具体的语法错误
   - 检查是否使用了"Kroki 限制"中明确禁止的特性（如 DBML 的 TablePartial、Check）
   - 参考"常见错误"部分，对照修正
   - 只有渲染成功才算完成任务
5. 用户看到的是渲染后的图表，不是代码，所以渲染是必须步骤
`.trim();

// 允许流式响应最多 30 秒
export const maxDuration = 30;

export async function POST(req: Request) {
  // 用于错误追踪（langfuse 可能未初始化）
  let trace: ReturnType<NonNullable<typeof langfuse>['trace']> | null = null;

  try {
    const body = await req.json();

    // 验证请求体
    const validationResult = ChatRequestSchema.safeParse(body);
    if (!validationResult.success) {
      logger.warn('Chat 请求参数验证失败', {
        errors: validationResult.error.format(),
      });

      return new Response(
        JSON.stringify({
          error: '请求参数错误',
          details: validationResult.error.format(),
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { messages, currentDiagram } = validationResult.data;

    // 创建 Langfuse trace（如果启用）
    const traceId = nanoid();
    trace = isLangfuseEnabled()
      ? langfuse!.trace({
          id: traceId,
          name: 'diagflow-chat',
          userId: 'user-' + nanoid(8), // 如果有用户系统，替换为真实 ID
          metadata: {
            diagramType: currentDiagram?.diagram_type,
            hasError: currentDiagram?.has_error,
            userMessage: messages[messages.length - 1],
          },
        })
      : null;

    // 记录完整的输入消息
    trace?.event({
      name: 'chat-input',
      input: {
        messages: messages.map((m) => ({
          role: m.role,
          content: typeof m.content === 'string' ? m.content : 'multi-part',
        })),
        currentDiagram: currentDiagram,
      },
    });

    // 用于跟踪工具调用次数
    let toolCallCount = 0;
    let generationCount = 0;

    const result = streamText({
      // 使用 chat() 强制使用 Chat Completions API（/v1/chat/completions）
      // 而不是默认的 Responses API（/v1/responses），兼容 Kimi 等 OpenAI 兼容服务
      model: openai.chat(process.env.OPENAI_MODEL || 'kimi-k2-thinking'),
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
        functionId: 'diagflow-chat',
        metadata: {
          diagramType: currentDiagram?.diagram_type || '',
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
            name: 'tool-calls-planned',
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
      onFinish: async ({ usage, finishReason, response }) => {
        // 记录最终结果
        trace?.event({
          name: 'chat-finish',
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
          description: '获取指定引擎和图表类型的完整语法规则、示例代码、最佳实践',
          inputSchema: z.object({
            engine: z.string().describe('图表引擎（如 mermaid, plantuml, d2）'),
            diagram_type: z.string().describe('图表类型（如 flowchart, sequence, diagram）'),
          }),
          execute: async ({ engine, diagram_type }) => {
            toolCallCount++;
            const spanStartTime = Date.now();

            // 记录工具调用
            const span = trace?.span({
              name: `get_diagram_syntax-${toolCallCount}`,
              input: { engine, diagram_type, callNumber: toolCallCount },
            });

            const syntax = getDiagramSyntax(engine, diagram_type);

            // 记录完整的语法规则（用于后续分析）
            const syntaxRules = 'syntax_rules' in syntax ? (syntax.syntax_rules ?? '') : '';
            span?.end({
              output: {
                success: 'success' in syntax,
                syntaxLength: syntaxRules.length,
                syntaxPreview: syntaxRules.length > 0 ? syntaxRules.substring(0, 500) + (syntaxRules.length > 500 ? '...' : '') : '',
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
          description: '验证图表代码语法并渲染为 SVG',
          inputSchema: z.object({
            engine: z.string().describe('图表引擎'),
            code: z.string().describe('图表源代码'),
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
                code_lines: code.split('\n').length,
                callNumber: toolCallCount,
              },
            });

            try {
              const svg = await renderDiagramServer(engine, code);
              const result = {
                success: true,
                svg_content: svg,
                error_message: null,
                diagram_type: engine,
                diagram_code: code,
                code_length: code.length,
                svg_length: svg.length,
              };

              // 记录成功的详细信息
              span?.end({
                output: {
                  success: true,
                  svg_length: svg.length,
                  svg_preview: svg.substring(0, 200) + '...',
                },
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
              const errorType = errorMessage.includes('Parse error')
                ? 'syntax_error'
                : errorMessage.includes('timeout')
                ? 'timeout'
                : errorMessage.includes('404')
                ? 'not_found'
                : 'unknown';

              const result = {
                success: false,
                svg_content: null,
                error_message: errorMessage,
                diagram_type: engine,
                failed_code: code, // 记录失败的完整代码，用于分析
                code_length: code.length,
              };

              // 记录失败的完整上下文（关键用于语法错误分析）
              span?.end({
                output: {
                  success: false,
                  error: errorMessage,
                  errorType,
                  failed_code: code, // 完整的失败代码
                  code_lines: code.split('\n'),  // 逐行代码，方便定位问题
                },
                metadata: {
                  duration: Date.now() - spanStartTime,
                  engine,
                  attemptNumber: toolCallCount,
                  errorType,
                },
                level: 'ERROR',
              });
              return result;
            }
          },
        },

        // 工具 3: 获取当前图表状态
        get_current_diagram: {
          description: '获取当前正在编辑的图表状态（引擎类型、代码、SVG）',
          inputSchema: z.object({}),
          execute: async () => {
            toolCallCount++;

            // 记录工具调用
            const span = trace?.span({
              name: `get_current_diagram-${toolCallCount}`,
              input: { callNumber: toolCallCount },
            });

            const diagram = currentDiagram || {
              diagram_type: '',
              diagram_code: '',
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
      },
    });

    // 返回 UI Message Stream，携带工具调用事件
    return result.toUIMessageStreamResponse({
      originalMessages: messages as unknown as UIMessage[],
    });
  } catch (error) {
    // 记录错误到日志系统
    logger.error('Chat API 错误', error, {
      traceId: trace?.id,
      endpoint: '/api/chat',
    });

    // 记录错误到 Langfuse
    if (trace) {
      trace.event({
        name: 'chat-error',
        level: 'ERROR',
        output: {
          error: logger.formatError(error),
        },
      });

      // 尝试刷新 Langfuse（不阻塞响应）
      if (isLangfuseEnabled()) {
        langfuse!.flushAsync().catch(e => {
          console.error('Langfuse flush 失败:', e);
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
      error: error instanceof Error ? error.message : 'Internal server error',
      ...(trace?.id && { traceId: trace.id }),
    };

    // 开发环境返回完整错误信息
    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = error instanceof Error ? error.stack : undefined;
      errorResponse.code = error instanceof Error ? error.name : undefined;
    }

    return new Response(
      JSON.stringify(errorResponse),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
