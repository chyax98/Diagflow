"use client";

import React from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DiagramType {
  value: string;
  label: string;
}

const DIAGRAM_TYPES: DiagramType[] = [
  { value: "mermaid", label: "Mermaid" },
  { value: "plantuml", label: "PlantUML" },
  { value: "d2", label: "D2" },
  { value: "dbml", label: "DBML" },
  { value: "graphviz", label: "Graphviz" },
  { value: "c4plantuml", label: "C4-PlantUML" },
  { value: "wavedrom", label: "WaveDrom" },
];

interface MainToolbarProps {
  diagramType: string;
  onTypeChange: (type: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  isLoading: boolean;
  children?: React.ReactNode; // 导出控制组件插槽
}

export function MainToolbar({
  diagramType,
  onTypeChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isLoading,
  children,
}: MainToolbarProps) {
  return (
    <div className="toolbar flex items-center justify-between px-4 h-[52px] shrink-0">
      <div className="flex items-center gap-3">
        {/* Logo */}
        <div className="flex items-center gap-2.5 pr-4 border-r border-border mr-1">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-[#5856d6] rounded-lg flex items-center justify-center shadow-md">
            <svg
              className="w-[18px] h-[18px] text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 3L2 12h3v9h14v-9h3L12 3z" />
            </svg>
          </div>
          <span className="text-[17px] font-semibold bg-gradient-to-r from-foreground to-gray-5 bg-clip-text text-transparent">
            DiagFlow
          </span>
        </div>

        {/* 图表类型选择 */}
        <Select value={diagramType} onValueChange={onTypeChange} disabled={isLoading}>
          <SelectTrigger className="min-w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DIAGRAM_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 撤销/重做按钮 */}
        <div className="btn-group">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="撤销 (Ctrl+Z)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
              />
            </svg>
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="重做 (Ctrl+Shift+Z)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3"
              />
            </svg>
          </button>
        </div>

      </div>

      {/* 右侧导出控制 */}
      {children}
    </div>
  );
}
