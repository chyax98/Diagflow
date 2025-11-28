"use client";

import { useEffect, useRef, useMemo, useState, memo } from "react";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { DiagramSnapshot, Session } from "@/lib/storage";
import { ToolCallResultSchema } from "@/lib/types";
import { logger } from "@/lib/logger";
import { handleError } from "@/lib/error-handler";
import { SessionHistory } from "./session-history";
import { APP_CONFIG } from "@/config/app";

// 工具调用结果回调（允许 null 值，与 AI 返回的数据兼容）
export interface ToolCallResult {
  success: boolean;
  diagram_type?: string | null;
  diagram_code?: string | null;
  svg_content?: string | null;
  error_message?: string | null;
}

interface ChatPanelProps {
  sessionId: string | null;
  diagram: DiagramSnapshot;
  messages: UIMessage[];
  setMessages: (messages: UIMessage[]) => void;
  onToolResult?: (result: ToolCallResult) => void;
  // 会话管理
  sessions: Session[];
  onNewSession: () => Promise<void>;
  onLoadSession: (id: string) => Promise<void>;
  onDeleteSession: (id: string) => Promise<void>;
  onRenameSession: (id: string, name: string) => Promise<void>;
}

// 引导示例：从简单到复杂，覆盖常见场景和图表类型
const SUGGESTIONS = [
  "画一个用户注册登录的流程图",
  "前后端交互的时序图：用户下单到支付完成",
  "博客系统的数据库 ER 图",
  "React 核心概念思维导图",
  "微服务电商系统架构图",
  "订单状态机：从创建到完成的所有状态",
  "项目开发排期甘特图",
  "设计模式：观察者模式的类图",
  "公司发展历程时间线",
];

// Memoized Markdown 组件，避免不必要的重渲染
const MemoizedMarkdown = memo(
  function MemoizedMarkdown({ content }: { content: string }) {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // 代码块样式
          pre: ({ children }) => (
            <pre className="bg-muted/70 rounded-md p-3 overflow-x-auto my-2 text-[13px]">
              {children}
            </pre>
          ),
          code: ({ children, className }) => {
            const isInline = !className;
            return isInline ? (
              <code className="bg-muted/70 px-1.5 py-0.5 rounded text-[13px]">{children}</code>
            ) : (
              <code className={className}>{children}</code>
            );
          },
          // 段落
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          // 列表
          ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          // 链接
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          // 标题
          h1: ({ children }) => <h1 className="text-lg font-semibold mb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-semibold mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold mb-1">{children}</h3>,
          // 引用
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-muted-foreground/30 pl-3 italic text-muted-foreground my-2">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    );
  },
  (prevProps, nextProps) => prevProps.content === nextProps.content
);

export function ChatPanel({
  sessionId,
  diagram,
  messages: externalMessages,
  setMessages: setExternalMessages,
  onToolResult,
  sessions,
  onNewSession,
  onLoadSession,
  onDeleteSession,
  onRenameSession,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 使用 ref 存储 diagram 以避免 transport 重新创建
  const diagramRef = useRef(diagram);
  useEffect(() => {
    diagramRef.current = diagram;
  }, [diagram]);

  // 使用 useMemo 缓存 transport 实例
  // diagramRef 在 body 回调中访问，不是在渲染时，所以不会导致重新渲染问题
  /* eslint-disable react-hooks/exhaustive-deps, react-hooks/refs */
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({
          currentDiagram: {
            diagram_type: diagramRef.current.diagram_type,
            diagram_code: diagramRef.current.diagram_code,
            has_error: false,
          },
        }),
      }),
    []
  );
  /* eslint-enable react-hooks/exhaustive-deps, react-hooks/refs */

  const { messages, sendMessage, status, setMessages, stop } = useChat({
    transport,
    messages: externalMessages,
  });
  const isLoading = status === "streaming" || status === "submitted";

  // ============================================================================
  // 消息同步状态管理（简化设计）
  // ============================================================================
  // 替换原来的 3 个 ref（lastExternalMessagesRef, lastSessionIdRef, isRestoringMessagesRef）
  // 使用版本号机制防止竞态条件

  const syncVersionRef = useRef(0); // 同步版本号，每次外部同步时递增
  const lastSessionIdRef = useRef<string | null>(sessionId); // 上一次的 sessionId
  const lastExternalMessagesRef = useRef(externalMessages); // 上一次的外部消息

  // 跟踪已处理的工具调用，避免重复处理（会话切换时清空）
  const processedToolCallsRef = useRef<Set<string>>(new Set());

  // 双向消息同步逻辑：
  // 1. 外部消息变化（useSession 更新） -> 同步到 useChat
  // 2. 内部消息变化（AI 生成新消息） -> 同步到 useSession
  // 3. 会话切换时清空工具调用记录
  useEffect(() => {
    const sessionChanged = lastSessionIdRef.current !== sessionId;
    const externalChanged = lastExternalMessagesRef.current !== externalMessages;

    // 会话切换：清理已处理工具调用记录
    if (sessionChanged) {
      lastSessionIdRef.current = sessionId;
      processedToolCallsRef.current.clear();
    }

    // 外部消息变化：同步到内部（优先级高）
    if (sessionChanged || externalChanged) {
      lastExternalMessagesRef.current = externalMessages;
      setMessages(externalMessages);
      syncVersionRef.current++; // 递增版本号，防止触发反向同步
      return;
    }

    // 内部消息变化：同步到外部（AI 生成的新消息）
    if (messages !== lastExternalMessagesRef.current) {
      lastExternalMessagesRef.current = messages;
      setExternalMessages(messages);
    }
  }, [sessionId, externalMessages, messages, setMessages, setExternalMessages]);

  // 监听工具调用结果
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== "assistant" || !lastMsg.parts) return;

    lastMsg.parts.forEach((part, index) => {
      // 生成唯一标识符
      const toolCallId = `${lastMsg.id}-${index}`;

      if (
        part.type === "tool-validate_and_render" &&
        part.state === "output-available" &&
        onToolResult &&
        !processedToolCallsRef.current.has(toolCallId)
      ) {
        // 标记为已处理
        processedToolCallsRef.current.add(toolCallId);

        try {
          // 使用 Zod 验证工具调用结果
          const result = ToolCallResultSchema.parse(part.output);
          onToolResult(result);
        } catch (error) {
          // 验证失败：记录错误并提示用户
          logger.error("工具调用结果验证失败", error, {
            part: part.type,
            output: part.output,
          });
          handleError(error, { level: "warning", userMessage: "AI 返回的数据格式不正确，请重试" });
        }
      }
    });
  }, [messages, onToolResult]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = () => {
    if (input.trim() && !isLoading) {
      sendMessage({ text: input });
      setInput("");
    }
  };

  const handleNewSession = async () => {
    setShowHistory(false);
    await onNewSession();
    setMessages([]);
  };

  const handleLoadSession = async (id: string) => {
    setShowHistory(false);
    await onLoadSession(id);
  };

  const toolLabels: Record<string, string> = {
    get_diagram_syntax: "查询语法",
    validate_and_render: "渲染图表",
    get_current_diagram: "获取当前图表",
    edit_diagram_code: "修改代码",
  };

  // 切换工具展开状态
  const toggleToolExpanded = (toolKey: string) => {
    setExpandedTools((prev) => {
      const next = new Set(prev);
      if (next.has(toolKey)) {
        next.delete(toolKey);
      } else {
        next.add(toolKey);
      }
      return next;
    });
  };

  // 格式化工具参数/输出显示
  const formatToolData = (data: unknown): string => {
    if (data === null || data === undefined) return "";
    if (typeof data === "string") return data;
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };


  return (
    <div className="panel flex h-full flex-col overflow-hidden relative">
      {/* Header */}
      <div className="panel-header flex items-center justify-between rounded-t-xl">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-foreground">DiagFlow Agent</span>
        </div>
        <div className="flex items-center gap-1">
          {/* 历史记录按钮 */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
              showHistory
                ? "bg-primary text-white"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
            title="历史对话"
          >
            <svg
              className="w-[15px] h-[15px]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>

          {/* 新对话按钮 */}
          <button
            onClick={handleNewSession}
            className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="新对话"
          >
            <svg
              className="w-[15px] h-[15px]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* 历史记录覆盖面板 */}
      <SessionHistory
        sessions={sessions}
        currentSessionId={sessionId}
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onSelect={handleLoadSession}
        onNew={handleNewSession}
        onDelete={onDeleteSession}
        onRename={onRenameSession}
      />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-white/30 rounded-b-xl">
        <div className="p-4 space-y-4">
          {messages.length === 0 ? (
            // 空状态 - 显示建议
            <div className="flex flex-col gap-2 pt-4">
              {SUGGESTIONS.map((suggestion, i) => (
                <button
                  key={i}
                  className="quick-btn text-left"
                  onClick={() => sendMessage({ text: suggestion })}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : (
            // 消息列表
            messages.map((m) => {
              // 过滤有效的 parts（避免渲染空消息框）
              if (!m.parts) return null;
              const validParts = m.parts.filter((part) => {
                // 文本消息：必须有非空内容
                if (part.type === "text") {
                  return (part as { text?: string }).text?.trim();
                }
                // 工具调用：仅 assistant 角色
                if (m.role === "assistant" && part.type?.startsWith("tool-")) return true;
                return false;
              });

              // 如果没有有效的 parts，跳过这条消息
              if (validParts.length === 0) return null;

              return (
                <div key={m.id} className="space-y-3">
                  {validParts.map((part, index) => {
                    // 文本消息
                    if (part.type === "text") {
                      const isUser = m.role === "user";
                      return (
                        <div
                          key={index}
                          className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[88%] px-4 py-2.5 text-[14px] leading-relaxed ${
                              isUser ? "message-user" : "message-ai"
                            }`}
                          >
                            {isUser ? part.text : <MemoizedMarkdown content={part.text} />}
                          </div>
                        </div>
                      );
                    }

                    // 工具调用（仅 assistant）
                    if (m.role === "assistant" && part.type?.startsWith("tool-")) {
                      const toolPart = part as {
                        type: string;
                        state: string;
                        input?: unknown;
                        output?: unknown;
                        errorText?: string;
                      };
                      const toolName = toolPart.type.replace("tool-", "");
                      const toolKey = `${m.id}-${index}`;
                      const isExpanded = expandedTools.has(toolKey);
                      const isSuccess =
                        toolPart.state === "output-available" &&
                        (toolPart.output as { success?: boolean })?.success;
                      const isError =
                        toolPart.state === "output-error" ||
                        (toolPart.state === "output-available" &&
                          !(toolPart.output as { success?: boolean })?.success);
                      const isPending =
                        toolPart.state === "input-streaming" ||
                        toolPart.state === "input-available";
                      const hasDetails = toolPart.input || toolPart.output || toolPart.errorText;

                      return (
                        <div key={index} className="flex flex-col items-start gap-1">
                          <button
                            onClick={() => hasDetails && toggleToolExpanded(toolKey)}
                            className={`tool-badge ${hasDetails ? "cursor-pointer hover:bg-accent/80" : "cursor-default"}`}
                          >
                            {/* 展开图标 */}
                            {hasDetails && (
                              <svg
                                className={`w-3 h-3 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            )}
                            <span>{toolLabels[toolName] || toolName}</span>
                            {isPending && (
                              <svg
                                className="w-3 h-3 animate-spin text-muted-foreground"
                                viewBox="0 0 24 24"
                                fill="none"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                            )}
                            {isSuccess && (
                              <span className="tool-success">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                成功
                              </span>
                            )}
                            {isError && (
                              <span className="text-destructive flex items-center gap-1 ml-2">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path
                                    fillRule="evenodd"
                                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                失败
                              </span>
                            )}
                          </button>

                          {/* 展开的详情 */}
                          {isExpanded && hasDetails && (
                            <div className="w-full max-w-[88%] ml-0 bg-muted/50 rounded-lg p-3 text-xs space-y-2 overflow-hidden">
                              {toolPart.input !== undefined && toolPart.input !== null && (
                                <div>
                                  <div className="text-muted-foreground mb-1 font-medium">
                                    输入参数
                                  </div>
                                  <pre className="bg-background/50 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all text-[11px]">
                                    {formatToolData(toolPart.input)}
                                  </pre>
                                </div>
                              )}
                              {toolPart.output !== undefined && toolPart.output !== null && (
                                <div>
                                  <div className="text-muted-foreground mb-1 font-medium">
                                    输出结果
                                  </div>
                                  <pre className="bg-background/50 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all text-[11px] max-h-48 overflow-y-auto">
                                    {formatToolData(toolPart.output)}
                                  </pre>
                                </div>
                              )}
                              {toolPart.errorText && (
                                <div>
                                  <div className="text-destructive mb-1 font-medium">错误信息</div>
                                  <pre className="bg-destructive/10 text-destructive rounded p-2 overflow-x-auto whitespace-pre-wrap break-all text-[11px]">
                                    {toolPart.errorText}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="p-4 glass-subtle rounded-b-xl">
        <div className="chat-input-wrapper">
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              // 自动调整高度
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && input.trim() && !isLoading) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="描述你想要的图表..."
            disabled={isLoading}
            rows={1}
            maxLength={APP_CONFIG.input.MAX_LENGTH}
            className="flex-1 py-2 text-[14px] border-none outline-none bg-transparent resize-none min-h-[36px] max-h-[120px]"
          />
          {isLoading ? (
            <button
              onClick={stop}
              className="w-9 h-9 bg-destructive hover:bg-destructive/90 text-white rounded-full flex items-center justify-center transition-all shrink-0 self-end"
              title="停止生成"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!input.trim()}
              className="w-9 h-9 bg-primary hover:bg-primary-hover text-white rounded-full flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 self-end"
            >
              <svg className="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          )}
        </div>
        <p className="mt-2.5 text-center text-[11px] text-muted-foreground">
          Enter 发送 · Shift+Enter 换行
        </p>
      </div>
    </div>
  );
}
