"use client";

import { CodeEditor } from "@/components/code-editor";
import { SvgPreview } from "@/components/svg-preview";
import { ChatPanel, type ToolCallResult } from "@/components/chat-panel";
import type { DiagramSnapshot, Session } from "@/lib/storage";
import type { UIMessage } from "@ai-sdk/react";

interface WorkspaceProps {
  // 图表相关
  diagram: DiagramSnapshot;
  onCodeChange: (code: string) => void;
  svgContent: string;
  errorMessage: string | null;
  isLoading: boolean;
  onExport: (format: "svg" | "png" | "png-opaque" | "jpeg" | "pdf") => void;

  // 会话相关
  sessionId: string | null;
  messages: UIMessage[];
  setMessages: (messages: UIMessage[]) => void;
  onToolResult: (result: ToolCallResult) => void;

  // 会话管理
  sessions: Session[];
  onNewSession: () => Promise<void>;
  onLoadSession: (id: string) => Promise<void>;
  onDeleteSession: (id: string) => Promise<void>;
  onRenameSession: (id: string, name: string) => Promise<void>;
}

export function Workspace({
  diagram,
  onCodeChange,
  svgContent,
  errorMessage,
  isLoading,
  onExport,
  sessionId,
  messages,
  setMessages,
  onToolResult,
  sessions,
  onNewSession,
  onLoadSession,
  onDeleteSession,
  onRenameSession,
}: WorkspaceProps) {
  return (
    <div className="flex flex-1 gap-3 min-h-0">
      {/* 左侧: 代码编辑器 */}
      <div className="w-[400px] shrink-0">
        <CodeEditor
          code={diagram.diagram_code}
          diagramType={diagram.diagram_type}
          onChange={onCodeChange}
          readOnly={isLoading}
          isLoading={isLoading}
        />
      </div>

      {/* 中间: SVG 预览 */}
      <div className="flex-1 min-w-0">
        <SvgPreview
          svg={svgContent}
          diagramType={diagram.diagram_type}
          isLoading={isLoading}
          error={errorMessage}
          onExport={onExport}
        />
      </div>

      {/* 右侧: AI 聊天面板 */}
      <div className="w-[400px] shrink-0">
        <ChatPanel
          sessionId={sessionId}
          diagram={diagram}
          messages={messages}
          setMessages={setMessages}
          onToolResult={onToolResult}
          sessions={sessions}
          onNewSession={onNewSession}
          onLoadSession={onLoadSession}
          onDeleteSession={onDeleteSession}
          onRenameSession={onRenameSession}
        />
      </div>
    </div>
  );
}
