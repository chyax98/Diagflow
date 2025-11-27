"use client";

import type { ExportCapability } from "@/lib/kroki";

type ExportFormat = "svg" | "png" | "png-opaque" | "jpeg" | "pdf";

interface ExportControlsProps {
  exportCapability: ExportCapability;
  onExport: (format: ExportFormat) => void;
  svgContent: string;
  hasPendingChanges: boolean;
}

export function ExportControls({
  exportCapability,
  onExport,
  svgContent,
  hasPendingChanges,
}: ExportControlsProps) {
  return (
    <div className="flex items-center gap-3">
      {/* AI 状态指示器 */}
      <div className="ai-indicator">
        <div className="ai-indicator-dot" />
        {hasPendingChanges ? "未保存" : "Agent 就绪"}
      </div>

      <div className="w-px h-6 bg-border mx-1" />

      {/* 导出按钮 - 根据引擎能力显示 */}
      <button
        onClick={() => onExport("svg")}
        disabled={!svgContent}
        className="px-3.5 py-1.5 text-[13px] font-medium bg-secondary hover:bg-secondary-hover rounded-lg transition-colors disabled:opacity-40"
      >
        SVG
      </button>
      {exportCapability.png && (
        <button
          onClick={() => onExport("png")}
          disabled={!svgContent}
          className="px-3.5 py-1.5 text-[13px] font-medium bg-secondary hover:bg-secondary-hover rounded-lg transition-colors disabled:opacity-40"
        >
          PNG
        </button>
      )}
      {exportCapability.pdf && (
        <button
          onClick={() => onExport("pdf")}
          disabled={!svgContent}
          className="px-3.5 py-1.5 text-[13px] font-medium bg-secondary hover:bg-secondary-hover rounded-lg transition-colors disabled:opacity-40"
        >
          PDF
        </button>
      )}
      {exportCapability.jpeg && (
        <button
          onClick={() => onExport("jpeg")}
          disabled={!svgContent}
          className="px-3.5 py-1.5 text-[13px] font-medium bg-secondary hover:bg-secondary-hover rounded-lg transition-colors disabled:opacity-40"
        >
          JPEG
        </button>
      )}
    </div>
  );
}
