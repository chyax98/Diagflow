import React, { useState, useRef, useCallback, useMemo } from "react";
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from "react-zoom-pan-pinch";

// Kroki 各引擎支持的导出格式
const ENGINE_EXPORT_SUPPORT: Record<string, {
  png: boolean;
  jpeg: boolean;
  pdf: boolean;
  pngTransparency: boolean; // 是否支持透明度控制（透明/不透明两种 PNG）
}> = {
  mermaid: { png: true, jpeg: false, pdf: false, pngTransparency: false },
  plantuml: { png: true, jpeg: true, pdf: true, pngTransparency: false },
  d2: { png: false, jpeg: false, pdf: false, pngTransparency: false },
  dbml: { png: false, jpeg: false, pdf: false, pngTransparency: false },
  graphviz: { png: true, jpeg: true, pdf: true, pngTransparency: false },
  c4plantuml: { png: true, jpeg: true, pdf: true, pngTransparency: false },
  erd: { png: true, jpeg: true, pdf: true, pngTransparency: false },
  nomnoml: { png: false, jpeg: false, pdf: false, pngTransparency: false },
  ditaa: { png: true, jpeg: false, pdf: false, pngTransparency: false },
  svgbob: { png: false, jpeg: false, pdf: false, pngTransparency: false },
  wavedrom: { png: false, jpeg: false, pdf: false, pngTransparency: false },
  // BlockDiag 系列支持 no-transparency 参数（根据 Kroki 官方文档）
  blockdiag: { png: true, jpeg: false, pdf: true, pngTransparency: true },
  seqdiag: { png: true, jpeg: false, pdf: true, pngTransparency: true },
  nwdiag: { png: true, jpeg: false, pdf: true, pngTransparency: true },
};

type ExportFormat = "svg" | "png" | "png-opaque" | "jpeg" | "pdf";

interface SvgPreviewProps {
  svg: string;
  diagramType?: string;
  isLoading?: boolean;
  error?: string | null;
  onExport?: (format: ExportFormat) => void;
}

export function SvgPreview({
  svg,
  diagramType = "mermaid",
  isLoading = false,
  error = null,
  onExport,
}: SvgPreviewProps) {
  // 获取当前引擎支持的导出格式
  const exportSupport = ENGINE_EXPORT_SUPPORT[diagramType] || {
    png: false,
    jpeg: false,
    pdf: false,
    pngTransparency: false
  };
  const [isFullscreen, setIsFullscreen] = useState(false);
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

  // 将 SVG 转换为 data URI，避免 dangerouslySetInnerHTML 的各种问题
  const svgDataUri = useMemo(() => {
    if (!svg) return null;
    // 使用 data URI 方式渲染 SVG，更可靠
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }, [svg]);

  const toolbarButton = "p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors";
  const exportButton = "px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors";
  const divider = "w-px h-5 bg-gray-200 mx-1";

  const content = (
    <div className={`flex flex-col h-full ${isFullscreen ? "fixed inset-0 z-50 bg-white" : "relative"}`}>
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-3 border-b bg-white shrink-0" style={{ height: "56px" }}>
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-gray-700 mr-2">预览</span>

          {/* 缩放控制 */}
          {svgDataUri && (
            <>
              <button onClick={handleZoomOut} className={toolbarButton} title="缩小">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                </svg>
              </button>
              <button onClick={handleZoomIn} className={toolbarButton} title="放大">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </button>
              <button onClick={handleReset} className={toolbarButton} title="重置">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button onClick={handleCenter} className={toolbarButton} title="居中">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </button>
              <div className={divider} />
              <button onClick={handleFullscreen} className={toolbarButton} title={isFullscreen ? "退出全屏" : "全屏"}>
                {isFullscreen ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                  </svg>
                )}
              </button>
            </>
          )}

          {isLoading && (
            <span className="text-xs text-blue-600 flex items-center ml-2">
              <svg className="w-3 h-3 animate-spin mr-1" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              渲染中
            </span>
          )}
        </div>

        <div className="flex items-center">
          {/* 导出按钮 - 根据引擎支持动态显示 */}
          {onExport && (
            <div className="flex items-center gap-0.5">
              <button onClick={() => onExport("svg")} className={exportButton} title="导出 SVG">SVG</button>
              {exportSupport.png && (
                <>
                  {exportSupport.pngTransparency ? (
                    // BlockDiag 系列：支持透明/不透明两种 PNG
                    <>
                      <button onClick={() => onExport("png")} className={exportButton} title="导出 PNG（透明背景）">PNG</button>
                      <button onClick={() => onExport("png-opaque")} className={exportButton} title="导出 PNG（白色背景）">PNG白底</button>
                    </>
                  ) : (
                    // 其他引擎：只有一个 PNG 按钮（默认格式）
                    <button onClick={() => onExport("png")} className={exportButton} title="导出 PNG">PNG</button>
                  )}
                </>
              )}
              {exportSupport.jpeg && (
                <button onClick={() => onExport("jpeg")} className={exportButton} title="导出 JPEG">JPG</button>
              )}
              {exportSupport.pdf && (
                <button onClick={() => onExport("pdf")} className={exportButton} title="导出 PDF">PDF</button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 预览区域 */}
      <div className="flex-1 overflow-hidden bg-gray-50 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-30">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
              <div className="text-sm text-gray-500">渲染中...</div>
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
          !isLoading && !error && (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              暂无图表
            </div>
          )
        )}

        {/* 错误提示 */}
        {error && (
          <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-30">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-red-800 mb-1">渲染失败</div>
                  <pre className="text-xs text-red-600 whitespace-pre-wrap break-words font-mono max-h-24 overflow-y-auto">
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
