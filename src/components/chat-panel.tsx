"use client";

import { useEffect, useRef, useMemo, useState, memo } from "react";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import type { DiagramSnapshot, Session } from "@/lib/storage";
import { ToolCallResultSchema } from "@/lib/types";
import { logger } from "@/lib/logger";

// 工具调用结果回调
export interface ToolCallResult {
  success: boolean;
  diagram_type?: string;
  diagram_code?: string;
  svg_content?: string;
  error_message?: string;
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

// 示例提示
const SUGGESTIONS = [
  "用 Mermaid 生成一个用户登录的流程图",
  "用 D2 画一个 Web 应用的三层架构图",
  "用 DBML 设计一个博客系统的数据库",
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
              <code className="bg-muted/70 px-1.5 py-0.5 rounded text-[13px]">
                {children}
              </code>
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
            <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
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
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // 使用 ref 存储 diagram 以避免 transport 重新创建
  const diagramRef = useRef(diagram);
  useEffect(() => {
    diagramRef.current = diagram;
  }, [diagram]);

  // 使用 useMemo 缓存 transport 实例
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

  const { messages, sendMessage, status, setMessages, stop } = useChat({
    transport,
    messages: externalMessages,
  });
  const isLoading = status === "streaming" || status === "submitted";

  const lastExternalMessagesRef = useRef(externalMessages);
  const lastSessionIdRef = useRef<string | null>(sessionId);
  const isRestoringMessagesRef = useRef(false);

  useEffect(() => {
    const sessionChanged = lastSessionIdRef.current !== sessionId;
    const externalChanged = lastExternalMessagesRef.current !== externalMessages;

    if (sessionChanged || externalChanged) {
      lastSessionIdRef.current = sessionId;
      lastExternalMessagesRef.current = externalMessages;
      isRestoringMessagesRef.current = true;
      setMessages(externalMessages);
      return;
    }

    if (isRestoringMessagesRef.current) {
      if (messages === externalMessages) {
        isRestoringMessagesRef.current = false;
      }
      return;
    }

    if (messages !== externalMessages) {
      lastExternalMessagesRef.current = messages;
      setExternalMessages(messages);
    }
  }, [sessionId, externalMessages, messages, setMessages, setExternalMessages]);

  // 监听工具调用结果
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== "assistant" || !lastMsg.parts) return;

    lastMsg.parts.forEach((part) => {
      if (
        part.type === "tool-validate_and_render" &&
        part.state === "output-available" &&
        onToolResult
      ) {
        try {
          // 使用 Zod 验证工具调用结果
          const result = ToolCallResultSchema.parse(part.output);
          onToolResult(result);
        } catch (error) {
          // 验证失败：记录错误并提示用户
          logger.error('工具调用结果验证失败', error, {
            part: part.type,
            output: part.output,
          });
          toast.error('AI 返回的数据格式不正确，请重试');
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
  };

  // 切换工具展开状态
  const toggleToolExpanded = (toolKey: string) => {
    setExpandedTools(prev => {
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

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
    } else if (isYesterday) {
      return "昨天";
    } else {
      return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
    }
  };

  // 开始编辑会话名称
  const startEditing = (session: Session) => {
    setEditingSessionId(session.id);
    setEditingName(session.name);
  };

  // 确认重命名
  const confirmRename = async () => {
    if (editingSessionId && editingName.trim()) {
      await onRenameSession(editingSessionId, editingName.trim());
    }
    setEditingSessionId(null);
    setEditingName("");
  };

  // 取消编辑
  const cancelEditing = () => {
    setEditingSessionId(null);
    setEditingName("");
  };

  // 自动聚焦编辑输入框
  useEffect(() => {
    if (editingSessionId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingSessionId]);

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
            <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* 新对话按钮 */}
          <button
            onClick={handleNewSession}
            className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="新对话"
          >
            <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* 历史记录覆盖面板 */}
      {showHistory && (
        <div className="absolute inset-0 top-[52px] z-50 bg-background/95 backdrop-blur-sm flex flex-col rounded-b-xl overflow-hidden">
          {/* 面板头部 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <span className="text-sm font-medium">历史对话</span>
            <button
              onClick={() => setShowHistory(false)}
              className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 新建对话按钮 */}
          <div className="px-3 py-2 border-b border-border">
            <button
              onClick={handleNewSession}
              className="w-full px-3 py-2.5 text-sm text-left bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors flex items-center gap-2 font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              开始新对话
            </button>
          </div>

          {/* 会话列表 */}
          <div className="flex-1 overflow-y-auto">
            {sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-sm">暂无历史对话</p>
                <p className="text-xs mt-1">开始新对话后会在这里显示</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {sessions.map((session) => {
                  const isEditing = editingSessionId === session.id;
                  return (
                    <div
                      key={session.id}
                      className={`group flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                        session.id === sessionId
                          ? "bg-primary/10 border border-primary/20"
                          : "hover:bg-accent border border-transparent"
                      } ${isEditing ? "" : "cursor-pointer"}`}
                      onClick={() => !isEditing && handleLoadSession(session.id)}
                    >
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                confirmRename();
                              } else if (e.key === "Escape") {
                                cancelEditing();
                              }
                            }}
                            onBlur={confirmRename}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full px-2 py-1 text-sm bg-background border border-primary rounded outline-none"
                          />
                        ) : (
                          <>
                            <div className={`text-sm truncate ${session.id === sessionId ? "font-medium" : ""}`}>
                              {session.name}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {formatTime(session.updatedAt)}
                            </div>
                          </>
                        )}
                      </div>
                      {!isEditing && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(session);
                            }}
                            className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                            title="重命名"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteSession(session.id);
                            }}
                            className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="删除"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

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
                if (part.type === "text") return true;
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
                          {isUser ? (
                            part.text
                          ) : (
                            <MemoizedMarkdown content={part.text} />
                          )}
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
                    const isSuccess = toolPart.state === "output-available" &&
                      (toolPart.output as { success?: boolean })?.success;
                    const isError = toolPart.state === "output-error" ||
                      (toolPart.state === "output-available" && !(toolPart.output as { success?: boolean })?.success);
                    const isPending = toolPart.state === "input-streaming" || toolPart.state === "input-available";
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
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                          <span>{toolLabels[toolName] || toolName}</span>
                          {isPending && (
                            <svg className="w-3 h-3 animate-spin text-muted-foreground" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          )}
                          {isSuccess && (
                            <span className="tool-success">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              成功
                            </span>
                          )}
                          {isError && (
                            <span className="text-destructive flex items-center gap-1 ml-2">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
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
                                <div className="text-muted-foreground mb-1 font-medium">输入参数</div>
                                <pre className="bg-background/50 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all text-[11px]">
                                  {formatToolData(toolPart.input)}
                                </pre>
                              </div>
                            )}
                            {toolPart.output !== undefined && toolPart.output !== null && (
                              <div>
                                <div className="text-muted-foreground mb-1 font-medium">输出结果</div>
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
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && input.trim() && !isLoading) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="描述你想要的图表..."
            disabled={isLoading}
            className="flex-1 py-2 text-[14px] border-none outline-none bg-transparent"
          />
          {isLoading ? (
            <button
              onClick={stop}
              className="w-9 h-9 bg-destructive hover:bg-destructive/90 text-white rounded-full flex items-center justify-center transition-all shrink-0"
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
              className="w-9 h-9 bg-primary hover:bg-primary-hover text-white rounded-full flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <svg className="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          )}
        </div>
        <p className="mt-2.5 text-center text-[11px] text-muted-foreground">
          Enter 发送 | 支持 15 种图表引擎
        </p>
      </div>
    </div>
  );
}
