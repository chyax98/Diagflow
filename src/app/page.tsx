"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { MainToolbar } from "@/components/layout/main-toolbar";
import { ExportControls } from "@/components/layout/export-controls";
import { Workspace } from "@/components/layout/workspace";
// ❌ 删除对话框导入 - 改用 Toast
import { type ToolCallResult } from "@/components/chat-panel";
import type { UIMessage } from "@ai-sdk/react";
import {
  exportPng,
  exportPngOpaque,
  exportJpeg,
  exportPdf,
  getExportCapability,
} from "@/lib/kroki";
import { useDebounce } from "@/lib/hooks";
import { useSession } from "@/lib/use-session";
import { useRenderControl } from "@/lib/use-render-control";
import { DEFAULT_TEMPLATES } from "@/lib/constants";
import { APP_CONFIG } from "@/config/app";
import { handleError } from "@/lib/error-handler";

export default function Home() {
  // 会话管理
  const {
    sessionId,
    isLoading: isSessionLoading,
    diagram,
    canUndo,
    canRedo,
    setDiagram,
    undo,
    redo,
    messages,
    setMessages,
    sessions,
    createNewSession,
    loadSession,
    deleteSessionById,
    renameSession,
    saveNow,
    hasPendingChanges,
  } = useSession();

  // 渲染控制（统一入口）
  const { svgContent, errorMessage, isRendering, performRender } = useRenderControl();

  // ❌ 删除所有弹框状态 - 改用 Toast
  // const [pendingTypeChange, setPendingTypeChange] = useState<string | null>(null);
  // const [showSaveDialog, setShowSaveDialog] = useState(false);

  // ✅ 保存当前状态用于撤销
  const previousStateRef = useRef<{
    diagram_type: string;
    diagram_code: string;
    messages: UIMessage[];
  } | null>(null);

  // ✅ 简化的渲染状态管理（状态机 + 触发追踪）
  // 渲染状态机：idle（未初始化） -> initializing（首次加载中） -> ready（可响应变化）
  const renderStateRef = useRef<"idle" | "initializing" | "ready">("idle");

  // 上次渲染的触发信息（用于检测会话切换和类型变化）
  const lastRenderTriggerRef = useRef<{
    sessionId: string | null;
    diagramType: string;
  } | null>(null);

  // 获取当前引擎的导出能力
  const exportCapability = useMemo(
    () => getExportCapability(diagram.diagram_type),
    [diagram.diagram_type]
  );

  // ✅ 简化的 AI 工具调用处理
  const handleToolResult = useCallback(
    (result: ToolCallResult) => {
      if (!result?.success) {
        if (result?.error_message) {
          handleError(result.error_message, {
            level: "critical",
            userMessage: result.error_message,
          });
        }
        return;
      }

      const newType = result.diagram_type || diagram.diagram_type;
      const newCode = result.diagram_code || diagram.diagram_code;

      // ✅ AI 返回不同类型，直接切换（无需确认）
      if (newType !== diagram.diagram_type) {
        // 保存当前状态用于撤销
        previousStateRef.current = {
          diagram_type: diagram.diagram_type,
          diagram_code: diagram.diagram_code,
          messages: [...messages],
        };

        setDiagram({
          diagram_type: newType,
          diagram_code: newCode,
        });

        // ✅ 渲染由 effect 自动触发
      } else {
        // 类型相同，只更新代码
        setDiagram({ diagram_code: newCode });
      }
    },
    [diagram.diagram_type, diagram.diagram_code, messages, setDiagram, performRender]
  );

  // ✅ 统一的渲染调度器（合并 3 个场景）
  const debouncedCode = useDebounce(diagram.diagram_code, APP_CONFIG.timing.DEBOUNCE_MS);

  useEffect(() => {
    // 场景 1：初始加载（idle -> initializing -> ready）
    if (renderStateRef.current === "idle" && !isSessionLoading) {
      renderStateRef.current = "initializing";

      if (diagram.diagram_code.trim()) {
        performRender(diagram.diagram_type, diagram.diagram_code).finally(() => {
          renderStateRef.current = "ready";
          lastRenderTriggerRef.current = {
            sessionId,
            diagramType: diagram.diagram_type,
          };
        });
      } else {
        // 无内容，直接进入 ready 状态
        renderStateRef.current = "ready";
        lastRenderTriggerRef.current = {
          sessionId,
          diagramType: diagram.diagram_type,
        };
      }
      return;
    }

    // 等待初始化完成
    if (renderStateRef.current !== "ready") return;
    if (!diagram.diagram_code.trim()) return;

    const lastTrigger = lastRenderTriggerRef.current;

    // 场景 2：会话切换（立即渲染）
    const sessionChanged = lastTrigger?.sessionId !== sessionId;
    if (sessionChanged) {
      performRender(diagram.diagram_type, diagram.diagram_code);
      lastRenderTriggerRef.current = {
        sessionId,
        diagramType: diagram.diagram_type,
      };
      return;
    }

    // 场景 3：类型切换（立即渲染，取消防抖）
    const typeChanged = lastTrigger?.diagramType !== diagram.diagram_type;
    if (typeChanged) {
      performRender(diagram.diagram_type, diagram.diagram_code);
      lastRenderTriggerRef.current = {
        sessionId,
        diagramType: diagram.diagram_type,
      };
      return;
    }

    // 场景 4：代码编辑（防抖渲染）
    if (debouncedCode.trim()) {
      performRender(diagram.diagram_type, debouncedCode);
      // 不更新 lastRenderTriggerRef（代码变化不算触发源变化）
    }
  }, [sessionId, isSessionLoading, diagram.diagram_type, diagram.diagram_code, debouncedCode, performRender]);

  // 导出处理
  const handleExport = async (format: "svg" | "png" | "png-opaque" | "jpeg" | "pdf") => {
    const timestamp = Date.now();
    const downloadBlob = (blob: Blob, ext: string) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `diagram-${timestamp}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    };

    try {
      if (format === "svg") {
        downloadBlob(new Blob([svgContent], { type: "image/svg+xml" }), "svg");
      } else if (format === "png") {
        downloadBlob(await exportPng(diagram.diagram_type, diagram.diagram_code), "png");
      } else if (format === "png-opaque") {
        downloadBlob(await exportPngOpaque(diagram.diagram_type, diagram.diagram_code), "png");
      } else if (format === "jpeg") {
        downloadBlob(await exportJpeg(diagram.diagram_type, diagram.diagram_code), "jpg");
      } else if (format === "pdf") {
        downloadBlob(await exportPdf(diagram.diagram_type, diagram.diagram_code), "pdf");
      }
    } catch (error) {
      handleError(error, { level: "critical", userMessage: "导出失败" });
    }
  };

  // 实际执行类型切换（内部函数）
  // ✅ 简化的类型切换逻辑
  const handleTypeChange = useCallback(
    (type: string) => {
      if (type === diagram.diagram_type) return;

      // 保存当前状态用于撤销
      previousStateRef.current = {
        diagram_type: diagram.diagram_type,
        diagram_code: diagram.diagram_code,
        messages: [...messages],
      };

      const newCode = DEFAULT_TEMPLATES[type] || "";

      // ✅ 立即切换（不等待）
      setDiagram({
        diagram_type: type,
        diagram_code: newCode,
      });
      setMessages([]);

      // ✅ 渲染由 effect 自动触发，无需手动调用

      // ✅ 有未保存修改时，显示简短 Toast 提示
      if (hasPendingChanges) {
        toast("未保存的内容已丢失", {
          duration: 3000,
          action: {
            label: "撤销",
            onClick: () => {
              if (previousStateRef.current) {
                setDiagram({
                  diagram_type: previousStateRef.current.diagram_type,
                  diagram_code: previousStateRef.current.diagram_code,
                });
                setMessages(previousStateRef.current.messages);
              }
            },
          },
        });
      }
    },
    [
      diagram.diagram_type,
      diagram.diagram_code,
      messages,
      hasPendingChanges,
      setDiagram,
      setMessages,
      performRender,
    ]
  );

  // ❌ 删除旧的确认对话框逻辑

  // 代码变更处理
  const handleCodeChange = useCallback(
    (code: string) => {
      setDiagram({ diagram_code: code });
    },
    [setDiagram]
  );

  // ❌ 删除 pendingUnsavedAction 状态

  // ✅ 简化的会话切换（Toast 提示）
  const requestNewSession = useCallback(async () => {
    if (hasPendingChanges) {
      previousStateRef.current = {
        diagram_type: diagram.diagram_type,
        diagram_code: diagram.diagram_code,
        messages: [...messages],
      };
      const oldSessionId = sessionId;
      await createNewSession();
      toast.info("已创建新会话，之前的更改未保存", {
        duration: 5000,
        action: {
          label: "保存旧会话",
          onClick: async () => {
            if (previousStateRef.current && oldSessionId) {
              await loadSession(oldSessionId);
              await saveNow();
              toast.success("已保存");
            }
          },
        },
      });
    } else {
      await createNewSession();
    }
  }, [hasPendingChanges, diagram, messages, sessionId, createNewSession, loadSession, saveNow]);

  const requestLoadSession = useCallback(
    async (id: string) => {
      if (hasPendingChanges) {
        previousStateRef.current = {
          diagram_type: diagram.diagram_type,
          diagram_code: diagram.diagram_code,
          messages: [...messages],
        };
        const oldSessionId = sessionId;
        await loadSession(id);
        toast.info("已切换会话，之前的更改未保存", {
          duration: 5000,
          action: {
            label: "保存",
            onClick: async () => {
              if (previousStateRef.current && oldSessionId) {
                await loadSession(oldSessionId);
                await saveNow();
                await loadSession(id);
                toast.success("已保存");
              }
            },
          },
        });
      } else {
        await loadSession(id);
      }
    },
    [hasPendingChanges, diagram, messages, sessionId, loadSession, saveNow]
  );

  // 快捷键：撤销/重做
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 忽略输入框中的快捷键
      const target = e.target as HTMLElement;
      if (target.tagName === "TEXTAREA" || target.tagName === "INPUT") {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  // 加载中状态
  if (isSessionLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          <div className="text-sm text-muted-foreground">加载中...</div>
        </div>
      </div>
    );
  }

  const isLoading = isRendering;

  return (
    <div className="flex flex-col h-screen p-3 gap-3">
      {/* 统一工具栏 */}
      <MainToolbar
        diagramType={diagram.diagram_type}
        onTypeChange={handleTypeChange}
        onSave={async () => {
          await saveNow();
          toast.success("已保存");
        }}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        isLoading={isLoading}
        hasPendingChanges={hasPendingChanges}
      >
        <ExportControls
          exportCapability={exportCapability}
          onExport={handleExport}
          svgContent={svgContent}
          hasPendingChanges={hasPendingChanges}
        />
      </MainToolbar>

      {/* 主内容区 */}
      <Workspace
        diagram={diagram}
        onCodeChange={handleCodeChange}
        svgContent={svgContent}
        errorMessage={errorMessage}
        isLoading={isLoading}
        onExport={handleExport}
        sessionId={sessionId}
        messages={messages}
        setMessages={setMessages}
        onToolResult={handleToolResult}
        sessions={sessions}
        onNewSession={requestNewSession}
        onLoadSession={requestLoadSession}
        onDeleteSession={deleteSessionById}
        onRenameSession={renameSession}
      />

      {/* ❌ 删除对话框组件 - 改用 Toast 提示 */}
    </div>
  );
}
