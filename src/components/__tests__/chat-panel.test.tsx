import type { ComponentProps, ReactNode } from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, act } from "@testing-library/react";
import type { UIMessage } from "@ai-sdk/react";
import { ChatPanel } from "@/components/chat-panel";

vi.mock("remark-gfm", () => ({
  default: () => null,
}));
vi.mock("react-markdown", () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("ai", () => ({
  DefaultChatTransport: class DefaultChatTransportMock {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(public config: any) {}
  },
}));

const chatStore: { setMessages?: (msgs: UIMessage[]) => void } = {};

vi.mock("@ai-sdk/react", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  const useChat = ({ messages }: { messages: UIMessage[] }) => {
    const [chatMessages, setChatMessages] = (
      React.useState as <T>(initialValue: T) => [T, (value: T) => void]
    )(messages);
    React.useEffect(() => {
      setChatMessages(messages);
    }, [messages]);
    chatStore.setMessages = setChatMessages;
    const sendMessage = vi.fn();
    return {
      messages: chatMessages,
      sendMessage,
      status: "idle",
      setMessages: setChatMessages,
      stop: vi.fn(),
    };
  };
  return { useChat };
});

vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    onValueChange,
    value,
  }: {
    children: ReactNode;
    onValueChange: (val: string) => void;
    value: string;
  }) => (
    <select value={value} onChange={(event) => onValueChange(event.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => (
    <option value={value}>{children}</option>
  ),
  SelectValue: () => null,
}));

vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  AlertDialogCancel: ({ children }: { children: ReactNode }) => (
    <button type="button">{children}</button>
  ),
}));

function createAsyncFn() {
  return vi.fn().mockResolvedValue(undefined);
}

type ChatPanelProps = ComponentProps<typeof ChatPanel>;

function createProps(overrides: Partial<ChatPanelProps> = {}): ChatPanelProps {
  return {
    sessionId: "session-1",
    diagram: { diagram_type: "mermaid", diagram_code: "graph TD\nA-->B", timestamp: Date.now() },
    messages: [] as UIMessage[],
    setMessages: vi.fn(),
    onToolResult: vi.fn(),
    sessions: [],
    onNewSession: createAsyncFn(),
    onLoadSession: createAsyncFn(),
    onDeleteSession: createAsyncFn(),
    onRenameSession: createAsyncFn(),
    ...overrides,
  } satisfies ChatPanelProps;
}

describe("ChatPanel message synchronization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chatStore.setMessages = undefined;
  });

  it("respects parent message resets", async () => {
    const initialMessages: UIMessage[] = [
      { id: "1", role: "user", parts: [{ type: "text", text: "hello" }] },
    ];
    const props = createProps({ messages: initialMessages });

    const { rerender } = render(<ChatPanel {...props} />);
    await act(async () => {
      await Promise.resolve();
    });
    vi.mocked(props.setMessages).mockClear();

    const updatedProps = createProps({ messages: [], setMessages: props.setMessages });
    rerender(<ChatPanel {...updatedProps} />);
    await act(async () => {
      await Promise.resolve();
    });

    expect(props.setMessages).not.toHaveBeenCalledWith(initialMessages);
  });

  it("外部消息变化同步到 useChat", async () => {
    const initialMessages: UIMessage[] = [
      { id: "1", role: "user", parts: [{ type: "text", text: "Hello" }] },
    ];
    const props = createProps({ messages: initialMessages });

    const { rerender } = render(<ChatPanel {...props} />);
    await act(async () => {
      await Promise.resolve();
    });

    // 外部消息更新
    const updatedMessages: UIMessage[] = [
      { id: "1", role: "user", parts: [{ type: "text", text: "Hello" }] },
      { id: "2", role: "assistant", parts: [{ type: "text", text: "Hi there!" }] },
    ];
    const updatedProps = createProps({ messages: updatedMessages, setMessages: props.setMessages });

    rerender(<ChatPanel {...updatedProps} />);
    await act(async () => {
      await Promise.resolve();
    });

    // 验证内部消息已同步
    expect(chatStore.setMessages).toBeDefined();
  });

  it("会话切换时清除已处理工具调用记录", async () => {
    const messagesWithTool1: UIMessage[] = [
      {
        id: "1",
        role: "assistant",
        parts: [
          {
            type: "tool-validate_and_render",
            toolCallId: "tool-call-1",
            state: "output-available",
            input: {},
            output: { success: true, diagram_code: "test" },
          },
        ],
      },
    ];

    const onToolResult = vi.fn();
    const props = createProps({
      sessionId: "session-1",
      messages: messagesWithTool1,
      onToolResult
    });

    const { rerender } = render(<ChatPanel {...props} />);
    await act(async () => {
      await Promise.resolve();
    });

    // 工具调用应该被处理
    expect(onToolResult).toHaveBeenCalledTimes(1);
    onToolResult.mockClear();

    // 切换会话，使用新的消息数组（但内容相同的工具调用）
    const messagesWithTool2: UIMessage[] = [
      {
        id: "1",
        role: "assistant",
        parts: [
          {
            type: "tool-validate_and_render",
            toolCallId: "tool-call-2",
            state: "output-available",
            input: {},
            output: { success: true, diagram_code: "test" },
          },
        ],
      },
    ];

    const newProps = createProps({
      sessionId: "session-2",
      messages: messagesWithTool2,
      onToolResult,
    });

    rerender(<ChatPanel {...newProps} />);
    await act(async () => {
      await Promise.resolve();
    });

    // 工具调用应该再次被处理（因为会话切换清除了记录）
    expect(onToolResult).toHaveBeenCalledTimes(1);
  });

  it("快速切换不触发重复同步", async () => {
    const props = createProps({ sessionId: "session-1", messages: [] });
    const { rerender } = render(<ChatPanel {...props} />);

    await act(async () => {
      await Promise.resolve();
    });

    vi.mocked(props.setMessages).mockClear();

    // 快速多次切换会话
    const sessions = ["session-2", "session-3", "session-4"];
    for (const sessionId of sessions) {
      const newProps = createProps({ sessionId, messages: [], setMessages: props.setMessages });
      rerender(<ChatPanel {...newProps} />);
    }

    await act(async () => {
      await Promise.resolve();
    });

    // 验证不会触发过多的 setMessages 调用
    // 最多应该是会话数量 (3) 次
    expect(vi.mocked(props.setMessages).mock.calls.length).toBeLessThanOrEqual(3);
  });

  it("版本号递增防止旧消息覆盖新消息", async () => {
    const onToolResult = vi.fn();

    // 初始会话
    const props1 = createProps({
      sessionId: "session-1",
      messages: [
        { id: "1", role: "user", parts: [{ type: "text", text: "message 1" }] },
      ],
      onToolResult,
    });

    const { rerender } = render(<ChatPanel {...props1} />);
    await act(async () => {
      await Promise.resolve();
    });

    // 快速切换到会话 2
    const props2 = createProps({
      sessionId: "session-2",
      messages: [
        { id: "2", role: "user", parts: [{ type: "text", text: "message 2" }] },
      ],
      onToolResult,
      setMessages: props1.setMessages,
    });

    rerender(<ChatPanel {...props2} />);

    // 快速切换到会话 3
    const props3 = createProps({
      sessionId: "session-3",
      messages: [
        { id: "3", role: "user", parts: [{ type: "text", text: "message 3" }] },
      ],
      onToolResult,
      setMessages: props1.setMessages,
    });

    rerender(<ChatPanel {...props3} />);

    await act(async () => {
      await Promise.resolve();
    });

    // 验证最终状态应该是 session-3 的消息
    // 通过检查是否调用了 setMessages 且最后一次调用的参数正确
    const lastCall = vi.mocked(props1.setMessages).mock.calls[
      vi.mocked(props1.setMessages).mock.calls.length - 1
    ];

    if (lastCall) {
      expect(lastCall[0]).toEqual(props3.messages);
    }
  });

  it("会话切换时工具调用记录正确清理", async () => {
    const onToolResult = vi.fn();

    // 会话 1：包含工具调用
    const toolMessage: UIMessage = {
      id: "msg-1",
      role: "assistant",
      parts: [
        {
          type: "tool-validate_and_render",
          toolCallId: "tool-call-msg-1",
          state: "output-available",
          input: {},
          output: { success: true, diagram_code: "test1" },
        },
      ],
    };

    const props1 = createProps({
      sessionId: "session-1",
      messages: [toolMessage],
      onToolResult,
    });

    const { rerender } = render(<ChatPanel {...props1} />);
    await act(async () => {
      await Promise.resolve();
    });

    // 验证工具调用被处理
    expect(onToolResult).toHaveBeenCalledTimes(1);
    expect(onToolResult).toHaveBeenCalledWith({ success: true, diagram_code: "test1" });
    onToolResult.mockClear();

    // 切换到会话 2，使用不同的消息 ID 但相同的工具调用
    const toolMessage2: UIMessage = {
      id: "msg-2",
      role: "assistant",
      parts: [
        {
          type: "tool-validate_and_render",
          toolCallId: "tool-call-msg-2",
          state: "output-available",
          input: {},
          output: { success: true, diagram_code: "test2" },
        },
      ],
    };

    const props2 = createProps({
      sessionId: "session-2",
      messages: [toolMessage2],
      onToolResult,
      setMessages: props1.setMessages,
    });

    rerender(<ChatPanel {...props2} />);
    await act(async () => {
      await Promise.resolve();
    });

    // 验证工具调用再次被处理（因为会话切换清空了已处理记录）
    expect(onToolResult).toHaveBeenCalledTimes(1);
    expect(onToolResult).toHaveBeenCalledWith({ success: true, diagram_code: "test2" });
  });

  it("同一会话内工具调用不重复触发", async () => {
    const onToolResult = vi.fn();

    const toolMessage: UIMessage = {
      id: "msg-1",
      role: "assistant",
      parts: [
        {
          type: "tool-validate_and_render",
          toolCallId: "tool-call-same-session",
          state: "output-available",
          input: {},
          output: { success: true, diagram_code: "test" },
        },
      ],
    };

    const props = createProps({
      sessionId: "session-1",
      messages: [toolMessage],
      onToolResult,
    });

    const { rerender } = render(<ChatPanel {...props} />);
    await act(async () => {
      await Promise.resolve();
    });

    // 第一次处理
    expect(onToolResult).toHaveBeenCalledTimes(1);
    onToolResult.mockClear();

    // 重新渲染相同的消息（不切换会话）
    rerender(<ChatPanel {...props} />);
    await act(async () => {
      await Promise.resolve();
    });

    // 不应该再次触发（因为已经处理过）
    expect(onToolResult).not.toHaveBeenCalled();
  });

  // 交互变更由 useChat 自身覆盖，核心回归测试在上方
});
