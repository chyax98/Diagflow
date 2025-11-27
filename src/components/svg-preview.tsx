import React, { useState, useRef, useCallback, useMemo } from "react";
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PreviewBackground = "grid" | "dots" | "solid" | "blueprint";

const BACKGROUND_OPTIONS: { value: PreviewBackground; label: string }[] = [
  { value: "grid", label: "网格" },
  { value: "dots", label: "点阵" },
  { value: "solid", label: "纯色" },
  { value: "blueprint", label: "蓝图" },
];

interface SvgPreviewProps {
  svg: string;
  diagramType?: string;
  isLoading?: boolean;
  error?: string | null;
  onExport?: (format: "svg" | "png" | "png-opaque" | "jpeg" | "pdf") => void;
}

export function SvgPreview({
  svg,
  diagramType: _diagramType = "mermaid",
  isLoading = false,
  error = null,
  onExport: _onExport,
}: SvgPreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewBg, setPreviewBg] = useState<PreviewBackground>("grid");
  const transformRef = useRef<ReactZoomPanPinchRef>(null);

  const handleZoomIn = useCallback(() => {
    transformRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    transformRef.current?.zoomOut();
  }, []);

  const handleReset = useCallback(() => {
    transformRef.current?.resetTransform();
  }, []);

  const handleCenter = useCallback(() => {
    transformRef.current?.centerView();
  }, []);

  const handleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // 将 SVG 转换为 data URI
  const svgDataUri = useMemo(() => {
    if (!svg) return null;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }, [svg]);

  const bgClassName = `preview-bg-${previewBg}`;

  const content = (
    <div
      className={`panel flex flex-col h-full overflow-hidden ${isFullscreen ? "fixed inset-3 z-50" : ""}`}
    >
      {/* 面板头部 */}
      <div className="panel-header flex items-center justify-between rounded-t-xl">
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-semibold text-foreground">预览</span>

          {/* 背景切换 */}
          <Select
            value={previewBg}
            onValueChange={(value) => setPreviewBg(value as PreviewBackground)}
          >
            <SelectTrigger size="sm" className="min-w-[72px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BACKGROUND_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isLoading && (
            <span className="text-xs text-primary flex items-center">
              <svg className="w-3 h-3 animate-spin mr-1" viewBox="0 0 24 24" fill="none">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              渲染中
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5">
          {/* 缩放控制 */}
          {svgDataUri && (
            <>
              <button
                onClick={handleZoomOut}
                className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="缩小"
              >
                <svg
                  className="w-[15px] h-[15px]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
                  />
                </svg>
              </button>
              <button
                onClick={handleZoomIn}
                className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="放大"
              >
                <svg
                  className="w-[15px] h-[15px]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                  />
                </svg>
              </button>
              <button
                onClick={handleReset}
                className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="重置"
              >
                <svg
                  className="w-[15px] h-[15px]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
              <button
                onClick={handleCenter}
                className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="居中"
              >
                <svg
                  className="w-[15px] h-[15px]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                  />
                </svg>
              </button>
              <div className="w-px h-5 bg-border mx-1" />
            </>
          )}

          {/* 全屏按钮 */}
          <button
            onClick={handleFullscreen}
            className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title={isFullscreen ? "退出全屏" : "全屏"}
          >
            {isFullscreen ? (
              <svg
                className="w-[15px] h-[15px]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
                />
              </svg>
            ) : (
              <svg
                className="w-[15px] h-[15px]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* 预览区域 */}
      <div className={`flex-1 overflow-hidden relative rounded-b-xl ${bgClassName}`}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-30">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
              <div className="text-sm text-muted-foreground">渲染中...</div>
            </div>
          </div>
        )}

        {svgDataUri ? (
          <TransformWrapper
            ref={transformRef}
            initialScale={1}
            minScale={0.1}
            maxScale={4}
            centerOnInit={true}
            wheel={{ step: 0.1 }}
            doubleClick={{ disabled: false, mode: "reset" }}
            panning={{ disabled: false }}
          >
            <TransformComponent
              wrapperClass="!w-full !h-full"
              contentClass="!w-full !h-full flex items-center justify-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={svgDataUri}
                alt="Diagram"
                className={`max-w-full max-h-full transition-opacity ${error ? "opacity-50 grayscale" : ""}`}
                style={{ objectFit: "contain" }}
              />
            </TransformComponent>
          </TransformWrapper>
        ) : (
          !isLoading &&
          !error && (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              暂无图表
            </div>
          )
        )}

        {/* 错误提示 */}
        {error && (
          <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-30">
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 backdrop-blur-sm">
              <div className="flex items-start gap-2">
                <svg
                  className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-destructive mb-1">渲染失败</div>
                  <pre className="text-xs text-destructive/80 whitespace-pre-wrap break-words font-mono max-h-24 overflow-y-auto">
                    {error}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return content;
}
