import type { ReactNode } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import Home from '@/app/page';
import { renderDiagram } from '@/lib/kroki';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

vi.mock('@/lib/hooks', () => ({
  useDebounce: <T,>(value: T) => value,
}));

vi.mock('@/lib/kroki', () => ({
  renderDiagram: vi.fn(),
  exportPng: vi.fn(),
  exportPngOpaque: vi.fn(),
  exportJpeg: vi.fn(),
  exportPdf: vi.fn(),
  getExportCapability: () => ({
    svg: true,
    png: true,
    pdf: true,
    jpeg: true,
    pngOpaque: false,
  }),
}));

vi.mock('@/components/code-editor', () => {
  const CodeEditor = ({ code, onChange, isLoading }: { code: string; onChange: (value: string) => void; isLoading: boolean }) => (
    <textarea
      data-testid="code-editor"
      data-isloading={isLoading ? 'true' : 'false'}
      value={code}
      onChange={(event) => onChange(event.target.value)}
    />
  );
  return { CodeEditor };
});

vi.mock('@/components/svg-preview', () => {
  const SvgPreview = ({ svg, error }: { svg: string; error?: string | null }) => (
    <div data-testid="svg-preview" data-error={error || ''}>
      {svg}
    </div>
  );
  return { SvgPreview };
});

// Mock store for testing tool handler
const chatToolHandlerStore = { handler: null as ((result: unknown) => void) | null };

vi.mock('@/components/chat-panel', () => {
  const ChatPanel = ({ onToolResult }: { onToolResult?: (result: unknown) => void }) => {
    chatToolHandlerStore.handler = onToolResult ?? null;
    return <div data-testid="chat-panel" />;
  };
  return { ChatPanel };
});

vi.mock('@/components/ui/select', () => {
  const Select = ({ children, onValueChange, value, disabled }: { children: ReactNode; onValueChange: (val: string) => void; value: string; disabled: boolean }) => (
    <select data-testid="diagram-select" value={value} onChange={(event) => onValueChange(event.target.value)} disabled={disabled}>
      {children}
    </select>
  );
  const SelectTrigger = ({ children }: { children: ReactNode }) => <>{children}</>;
  const SelectContent = ({ children }: { children: ReactNode }) => <>{children}</>;
  const SelectItem = ({ value, children }: { value: string; children: ReactNode }) => <option value={value}>{children}</option>;
  const SelectValue = () => null;
  return { Select, SelectTrigger, SelectContent, SelectItem, SelectValue };
});

vi.mock('@/components/ui/alert-dialog', () => {
  const Base = ({ children }: { children: ReactNode }) => <div>{children}</div>;
  return {
    AlertDialog: Base,
    AlertDialogContent: Base,
    AlertDialogHeader: Base,
    AlertDialogTitle: Base,
    AlertDialogDescription: Base,
    AlertDialogFooter: Base,
    AlertDialogAction: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => <button onClick={onClick}>{children}</button>,
    AlertDialogCancel: ({ children }: { children: ReactNode }) => <button>{children}</button>,
  };
});

vi.mock('@/lib/use-session', () => {
  const React = require('react');
  function useSessionMock() {
    const [diagram, setDiagram] = React.useState({ diagram_type: 'mermaid', diagram_code: '' });
    const [messages, setMessages] = React.useState([]);
    return {
      sessionId: 'session-1',
      isLoading: false,
      diagram,
      canUndo: false,
      canRedo: false,
      setDiagram: (update: Partial<typeof diagram>) => setDiagram((prev: typeof diagram) => ({ ...prev, ...update })),
      undo: () => {},
      redo: () => {},
      messages,
      setMessages,
      sessions: [],
      createNewSession: async () => {},
      loadSession: async () => {},
      deleteSessionById: async () => {},
      renameSession: async () => {},
    };
  }
  return { useSession: useSessionMock };
});

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const renderDiagramMock = vi.mocked(renderDiagram);

describe('Home page rendering logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chatToolHandlerStore.handler = null;
    cleanup();
  });

  it('ignores stale renders when code changes rapidly', async () => {
    // 现在只有 debounce effect 触发渲染（初始渲染 effect 仅在会话加载完成时触发一次）
    const renderQueue = [createDeferred<string>(), createDeferred<string>()];
    const calls: { code: string; deferred: ReturnType<typeof createDeferred<string>> }[] = [];
    renderDiagramMock.mockImplementation((_type, code) => {
      const deferred = renderQueue[calls.length];
      if (!deferred) throw new Error('Unexpected render call');
      calls.push({ code, deferred });
      return deferred.promise;
    });

    render(<Home />);

    const editor = screen.getByTestId('code-editor');
    // 第一次编辑：触发 1 次渲染
    fireEvent.change(editor, { target: { value: 'diagram-1' } });
    await waitFor(() => expect(calls.length).toBe(1));

    // 第二次编辑（快速）：触发第 2 次渲染
    fireEvent.change(editor, { target: { value: 'diagram-2' } });
    await waitFor(() => expect(calls.length).toBe(2));

    // 第二次渲染先完成
    calls[1].deferred.resolve('<svg>diagram-2</svg>');
    await waitFor(() => expect(screen.getByTestId('svg-preview')).toHaveTextContent('diagram-2'));

    // 第一次渲染后完成（过期），应该被忽略
    calls[0].deferred.resolve('<svg>diagram-1-stale</svg>');
    await waitFor(() => expect(screen.getByTestId('svg-preview')).toHaveTextContent('diagram-2'));
  });

  it('handles tool result and ignores stale renders', async () => {
    // 准备两次渲染：第一次用户编辑，第二次 AI 工具返回（通过 setDiagram 触发 effect）
    const renderQueue = [createDeferred<string>(), createDeferred<string>()];
    const calls: { code: string; deferred: ReturnType<typeof createDeferred<string>> }[] = [];
    renderDiagramMock.mockImplementation((_type, code) => {
      const deferred = renderQueue[calls.length];
      if (!deferred) throw new Error('Unexpected render call');
      calls.push({ code, deferred });
      return deferred.promise;
    });

    render(<Home />);

    const editor = screen.getByTestId('code-editor');
    fireEvent.change(editor, { target: { value: 'diagram-tool' } });
    await waitFor(() => expect(calls.length).toBe(1));
    await waitFor(() => expect(editor).toHaveAttribute('data-isloading', 'true'));

    // AI 工具返回结果，setDiagram 会触发 effect 导致第二次渲染
    await act(async () => {
      chatToolHandlerStore.handler?.({
        success: true,
        diagram_type: 'mermaid',
        diagram_code: 'ai-code',
        svg_content: '<svg>ai</svg>',
      } as never);
    });

    // 应该触发第二次渲染（通过 effect）
    await waitFor(() => expect(calls.length).toBe(2));

    // 第二次渲染完成
    calls[1].deferred.resolve('<svg>ai</svg>');
    await waitFor(() => expect(editor).toHaveAttribute('data-isloading', 'false'));
    await waitFor(() => expect(screen.getByTestId('svg-preview')).toHaveTextContent('ai'));

    // 第一次渲染完成（过期），应该被忽略
    calls[0].deferred.resolve('<svg>stale</svg>');
    await waitFor(() => expect(screen.getByTestId('svg-preview')).toHaveTextContent('ai'));
  });
});
