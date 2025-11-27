import type { ComponentProps, ReactNode } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import type { UIMessage } from '@ai-sdk/react';
import { ChatPanel } from '@/components/chat-panel';

vi.mock('remark-gfm', () => ({
  default: () => null,
}));
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('ai', () => ({
  DefaultChatTransport: class DefaultChatTransportMock {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(public config: any) {}
  },
}));

const chatStore: { setMessages?: (msgs: UIMessage[]) => void } = {};

vi.mock('@ai-sdk/react', () => {
  const React = require('react');
  const useChat = ({ messages }: { messages: UIMessage[] }) => {
    const [chatMessages, setChatMessages] = (React.useState as <T>(initialValue: T) => [T, (value: T) => void])(messages);
    React.useEffect(() => {
      setChatMessages(messages);
    }, [messages]);
    chatStore.setMessages = setChatMessages;
    const sendMessage = vi.fn();
    return {
      messages: chatMessages,
      sendMessage,
      status: 'idle',
      setMessages: setChatMessages,
      stop: vi.fn(),
    };
  };
  return { useChat };
});

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value }: { children: ReactNode; onValueChange: (val: string) => void; value: string }) => (
    <select value={value} onChange={(event) => onValueChange(event.target.value)}>{children}</select>
  ),
  SelectTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => <option value={value}>{children}</option>,
  SelectValue: () => null,
}));

vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>{children}</button>
  ),
  AlertDialogCancel: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>,
}));

function createAsyncFn() {
  return vi.fn().mockResolvedValue(undefined);
}

type ChatPanelProps = ComponentProps<typeof ChatPanel>;

function createProps(overrides: Partial<ChatPanelProps> = {}): ChatPanelProps {
  return {
    sessionId: 'session-1',
    diagram: { diagram_type: 'mermaid', diagram_code: 'graph TD\nA-->B', timestamp: Date.now() },
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

describe('ChatPanel message synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chatStore.setMessages = undefined;
  });

  it('respects parent message resets', async () => {
    const initialMessages: UIMessage[] = [
      { id: '1', role: 'user', parts: [{ type: 'text', text: 'hello' }] },
    ];
    const props = createProps({ messages: initialMessages });

    const { rerender } = render(<ChatPanel {...props} />);
    await act(async () => { await Promise.resolve(); });
    vi.mocked(props.setMessages).mockClear();

    const updatedProps = createProps({ messages: [], setMessages: props.setMessages });
    rerender(<ChatPanel {...updatedProps} />);
    await act(async () => { await Promise.resolve(); });

    expect(props.setMessages).not.toHaveBeenCalledWith(initialMessages);
  });

  // 交互变更由 useChat 自身覆盖，核心回归测试在上方
});
