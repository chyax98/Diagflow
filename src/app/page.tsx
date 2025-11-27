"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { MainToolbar } from "@/components/layout/main-toolbar";
import { ExportControls } from "@/components/layout/export-controls";
import { Workspace } from "@/components/layout/workspace";
import { UnsavedChangesDialog } from "@/components/dialogs/unsaved-changes-dialog";
import { TypeChangeDialog } from "@/components/dialogs/type-change-dialog";
import { type ToolCallResult } from "@/components/chat-panel";
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
    resetPendingChanges,
  } = useSession();

  // 渲染控制（统一入口）
  const { svgContent, errorMessage, isRendering, performRender } = useRenderControl();

  // 类型切换确认弹框状态
  const [pendingTypeChange, setPendingTypeChange] = useState<string | null>(null);
  
  // 保存确认弹框状态
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // 会话加载状态跟踪
  const prevSessionLoadingRef = useRef(true);
  const initialRenderPendingRef = useRef(true);

  // 会话切换时立即重新渲染（不等 debounce）
  const sessionIdRef = useRef(sessionId);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    // 跳过初始加载
    if (!sessionId || isSessionLoading) {
      sessionIdRef.current = sessionId;
      return;
    }

    // 首次加载完成，标记已初始化，由初始渲染 effect 处理
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      sessionIdRef.current = sessionId;
      return;
    }

    // 相同会话不重复渲染
    if (sessionIdRef.current === sessionId) {
      return;
    }
    sessionIdRef.current = sessionId;

    // 会话切换：使用统一渲染函数
    performRender(diagram.diagram_type, diagram.diagram_code);
  }, [sessionId, isSessionLoading, diagram.diagram_type, diagram.diagram_code, performRender]);

  // 获取当前引擎的导出能力
  const exportCapability = useMemo(
    () => getExportCapability(diagram.diagram_type),
    [diagram.diagram_type]
  );

  // 处理工具调用结果（AI 生成的图表）
  const handleToolResult = useCallback((result: ToolCallResult) => {
    if (result?.success) {
      const newType = result.diagram_type || diagram.diagram_type;
      const newCode = result.diagram_code || diagram.diagram_code;

      setDiagram({
        diagram_type: newType,
        diagram_code: newCode,
      });

      // 渲染会由 sessionId/diagram 变化的 effect 自动触发
      // 不需要手动调用 performRender（避免重复渲染）
    } else if (result?.error_message) {
      // errorMessage 由 useRenderControl 管理，这里无需设置
      toast.error(result.error_message);
    }
  }, [diagram.diagram_type, diagram.diagram_code, setDiagram]);

  // Debounce 渲染
  const debouncedCode = useDebounce(diagram.diagram_code, 500);

  useEffect(() => {
    // 跳过初始加载期间（由初始渲染 effect 处理）
    if (!hasInitializedRef.current) return;
    // 跳过初始渲染待处理期间
    if (initialRenderPendingRef.current) return;
    // 跳过空内容
    if (!debouncedCode.trim()) return;

    // 使用统一渲染函数（自动处理版本控制和重复检测）
    performRender(diagram.diagram_type, debouncedCode);
  }, [debouncedCode, diagram.diagram_type, performRender]);

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
      toast.error(error instanceof Error ? error.message : "导出失败");
    }
  };

  // 实际执行类型切换（内部函数）
  const performTypeChange = useCallback(async (type: string) => {
    const newCode = DEFAULT_TEMPLATES[type] || "";

    // 更新状态
    setDiagram({
      diagram_type: type,
      diagram_code: newCode,
    });

    // 使用统一渲染函数
    await performRender(type, newCode);
  }, [setDiagram, performRender]);

  const proceedTypeChangeCheck = useCallback((type: string) => {
    if (type === diagram.diagram_type) return;
    const currentDefault = DEFAULT_TEMPLATES[diagram.diagram_type] || "";
    const isModified = diagram.diagram_code.trim() !== currentDefault.trim();
    if (isModified) {
      setPendingTypeChange(type);
    } else {
      performTypeChange(type);
    }
  }, [diagram.diagram_type, diagram.diagram_code, performTypeChange]);

  const handleTypeChange = useCallback((type: string) => {
    if (type === diagram.diagram_type) return;
    if (hasPendingChanges) {
      setPendingUnsavedAction({ kind: "typeChange", type });
      return;
    }
    proceedTypeChangeCheck(type);
  }, [diagram.diagram_type, hasPendingChanges, proceedTypeChangeCheck]);

  // 确认切换：在当前会话中切换
  const handleConfirmTypeChange = useCallback(() => {
    if (pendingTypeChange) {
      performTypeChange(pendingTypeChange);
      setPendingTypeChange(null);
    }
  }, [pendingTypeChange, performTypeChange]);

  // 确认切换：创建新会话
  const handleTypeChangeWithNewSession = useCallback(async () => {
    if (!pendingTypeChange) return;

    try {
      // createNewSession 会创建默认 mermaid 会话
      // performTypeChange 会覆盖为目标类型
      await createNewSession();
      await performTypeChange(pendingTypeChange);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "创建会话失败");
    } finally {
      setPendingTypeChange(null);
    }
  }, [pendingTypeChange, createNewSession, performTypeChange]);

  // 代码变更处理
  const handleCodeChange = useCallback((code: string) => {
    setDiagram({ diagram_code: code });
  }, [setDiagram]);

  const [pendingUnsavedAction, setPendingUnsavedAction] = useState<
    | { kind: "typeChange"; type: string }
    | { kind: "newSession" }
    | { kind: "loadSession"; id: string }
    | null
  >(null);

  const requestNewSession = useCallback(async () => {
    if (hasPendingChanges) {
      setPendingUnsavedAction({ kind: "newSession" });
    } else {
      await createNewSession();
    }
  }, [hasPendingChanges, createNewSession]);

  const requestLoadSession = useCallback(async (id: string) => {
    if (hasPendingChanges) {
      setPendingUnsavedAction({ kind: "loadSession", id });
    } else {
      await loadSession(id);
    }
  }, [hasPendingChanges, loadSession]);

  const handleUnsavedProceed = useCallback(async (save: boolean) => {
    const action = pendingUnsavedAction;
    if (!action) return;
    if (save) {
      await saveNow();
    }
    if (action.kind === "newSession") {
      await createNewSession();
    } else if (action.kind === "loadSession") {
      await loadSession(action.id);
    } else if (action.kind === "typeChange") {
      proceedTypeChangeCheck(action.type);
    }
    setPendingUnsavedAction(null);
  }, [pendingUnsavedAction, saveNow, createNewSession, loadSession, proceedTypeChangeCheck]);

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

  // 初始渲染（仅在会话加载完成时触发一次）
  useEffect(() => {
    const wasLoading = prevSessionLoadingRef.current;
    prevSessionLoadingRef.current = isSessionLoading;

    // 仅在从加载中变为加载完成时触发初始渲染
    if (wasLoading && !isSessionLoading) {
      if (diagram.diagram_code) {
        // 使用统一渲染函数
        performRender(diagram.diagram_type, diagram.diagram_code).finally(() => {
          // 初始渲染完成，允许 debounce effect 工作
          initialRenderPendingRef.current = false;
        });
      } else {
        // 没有需要渲染的内容，直接允许 debounce effect 工作
        initialRenderPendingRef.current = false;
      }
    }
  }, [isSessionLoading, diagram.diagram_code, diagram.diagram_type, performRender]);

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

      {/* 弹框组件 */}
      <TypeChangeDialog
        pendingType={pendingTypeChange}
        onConfirm={handleConfirmTypeChange}
        onNewSession={handleTypeChangeWithNewSession}
        onCancel={() => setPendingTypeChange(null)}
      />

      <UnsavedChangesDialog
        pendingAction={pendingUnsavedAction}
        onProceed={handleUnsavedProceed}
        onCancel={() => setPendingUnsavedAction(null)}
      />
    </div>
  );
}
