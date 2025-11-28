import { APP_CONFIG } from "@/config/app";

const REQUEST_TIMEOUT = APP_CONFIG.timing.REQUEST_TIMEOUT;

// Kroki 服务地址
const KROKI_BASE_URL = process.env.KROKI_BASE_URL || "https://kroki.io";

// ============================================================================
// 自定义错误类型
// ============================================================================

/**
 * Kroki 渲染错误（代码语法问题 - 客户端错误）
 */
export class KrokiRenderError extends Error {
  readonly isClientError = true;

  constructor(message: string) {
    super(message);
    this.name = "KrokiRenderError";
  }
}

/**
 * Kroki 超时错误
 */
export class KrokiTimeoutError extends Error {
  readonly isTimeout = true;

  constructor(message = "请求超时，请简化图表或稍后重试") {
    super(message);
    this.name = "KrokiTimeoutError";
  }
}

// ============================================================================
// 导出格式能力映射（基于 Kroki 官方文档）
// ============================================================================

export type ExportFormat = "svg" | "png" | "pdf" | "jpeg";

export interface ExportCapability {
  svg: boolean;
  png: boolean;
  pdf: boolean;
  jpeg: boolean;
  /** 是否支持白底 PNG（no-transparency 选项） */
  pngOpaque: boolean;
}

/**
 * 各图表引擎支持的导出格式
 *
 * 数据来源：https://kroki.io/ 官方支持表格
 * 更新时间：2025-11
 */
export const EXPORT_CAPABILITIES: Record<string, ExportCapability> = {
  // 完整格式支持 - png, svg, jpeg, pdf
  graphviz: { svg: true, png: true, pdf: true, jpeg: true, pngOpaque: false },
  plantuml: { svg: true, png: true, pdf: true, jpeg: true, pngOpaque: false },
  c4plantuml: { svg: true, png: true, pdf: true, jpeg: true, pngOpaque: false },

  // png + svg
  mermaid: { svg: true, png: true, pdf: false, jpeg: false, pngOpaque: false },
  d2: { svg: true, png: true, pdf: false, jpeg: false, pngOpaque: false },
  dbml: { svg: true, png: true, pdf: false, jpeg: false, pngOpaque: false },
  wavedrom: { svg: true, png: true, pdf: false, jpeg: false, pngOpaque: false },
};

/**
 * 获取指定引擎的导出能力
 */
export function getExportCapability(engine: string): ExportCapability {
  return (
    EXPORT_CAPABILITIES[engine] || {
      svg: true,
      png: false,
      pdf: false,
      jpeg: false,
      pngOpaque: false,
    }
  );
}

/**
 * 检查引擎是否支持指定格式
 */
export function supportsFormat(engine: string, format: ExportFormat): boolean {
  const cap = getExportCapability(engine);
  return cap[format];
}

/**
 * 检查引擎是否支持白底 PNG
 */
export function supportsOpaqueFormat(engine: string): boolean {
  return getExportCapability(engine).pngOpaque;
}

// ============================================================================
// 核心 Kroki 调用函数（服务端使用）
// ============================================================================

export interface KrokiResult {
  content: ArrayBuffer;
  contentType: string;
}

/**
 * 核心 Kroki 渲染函数（服务端直接调用 Kroki API）
 *
 * 被以下场景使用：
 * 1. API Route 代理 (/api/render/[engine]/[format])
 * 2. AI Agent 工具调用 (validate_and_render)
 */
export async function renderKroki(
  engine: string,
  format: string,
  code: string,
  options: { extraHeaders?: Record<string, string> } = {}
): Promise<KrokiResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const krokiUrl = `${KROKI_BASE_URL.replace(/\/$/, "")}/${engine}/${format}`;

    const response = await fetch(krokiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        ...options.extraHeaders,
      },
      body: code,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new KrokiRenderError(`Kroki 渲染失败: ${errorText}`);
    }

    const content = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/svg+xml";

    return { content, contentType };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new KrokiTimeoutError();
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 服务端渲染 SVG（用于 AI Agent 工具调用）
 */
export async function renderDiagramServer(diagramType: string, code: string): Promise<string> {
  const result = await renderKroki(diagramType, "svg", code);
  const svg = new TextDecoder().decode(result.content);
  return svg.replace(/^<\?xml[^?]*\?>\s*/i, "");
}

// ============================================================================
// 浏览器端函数（通过 API Route 代理）
// ============================================================================

/**
 * 浏览器端 Kroki 请求（通过 Next.js API Route 代理）
 *
 * 为什么用代理？
 * - 避免 CORS 问题
 * - 隐藏 Kroki 服务地址
 * - 统一缓存策略
 */
async function krokiRequestClient(
  endpoint: string,
  code: string,
  options: { extraHeaders?: Record<string, string> } = {}
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(`/api/render/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        ...options.extraHeaders,
      },
      body: code,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.error || errorText);
      } catch {
        throw new Error(errorText);
      }
    }

    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("请求超时，请简化图表或稍后重试");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 浏览器端渲染 SVG（通过 API Route 代理）
 */
export async function renderDiagram(diagramType: string, code: string): Promise<string> {
  const response = await krokiRequestClient(`${diagramType}/svg`, code);
  const svg = await response.text();
  return svg.replace(/^<\?xml[^?]*\?>\s*/i, "");
}

/**
 * 导出 PNG（透明背景）
 */
export async function exportPng(diagramType: string, code: string): Promise<Blob> {
  const response = await krokiRequestClient(`${diagramType}/png`, code);
  return response.blob();
}

/**
 * 导出 PNG（白色背景）
 * 注意：大部分引擎不支持白底 PNG，检查 EXPORT_CAPABILITIES.pngOpaque
 */
export async function exportPngOpaque(diagramType: string, code: string): Promise<Blob> {
  const response = await krokiRequestClient(`${diagramType}/png`, code, {
    extraHeaders: {
      "Kroki-Diagram-Options-no-transparency": "",
    },
  });
  return response.blob();
}

/**
 * 导出 JPEG
 */
export async function exportJpeg(diagramType: string, code: string): Promise<Blob> {
  const response = await krokiRequestClient(`${diagramType}/jpeg`, code);
  return response.blob();
}

/**
 * 导出 PDF
 */
export async function exportPdf(diagramType: string, code: string): Promise<Blob> {
  const response = await krokiRequestClient(`${diagramType}/pdf`, code);
  return response.blob();
}
