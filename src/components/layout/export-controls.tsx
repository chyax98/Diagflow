"use client";

interface ToolbarStatusProps {
  onSave: () => void;
  hasPendingChanges: boolean;
}

export function ToolbarStatus({
  onSave,
  hasPendingChanges,
}: ToolbarStatusProps) {
  return (
    <div className="flex items-center gap-3">
      {/* AI 状态指示器 */}
      <div className="ai-indicator">
        <div className="ai-indicator-dot" />
        {hasPendingChanges ? "未保存" : "Agent 就绪"}
      </div>

      <div className="w-px h-6 bg-border mx-1" />

      {/* 保存按钮 */}
      <button
        onClick={onSave}
        disabled={!hasPendingChanges}
        className="px-3.5 py-1.5 text-[13px] font-medium bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors disabled:opacity-40"
        title="保存会话"
      >
        保存
      </button>
    </div>
  );
}
