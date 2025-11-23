const REQUEST_TIMEOUT = 30000; // 30 秒超时

/**
 * 通用的 Kroki HTTP 请求函数（通过 Next.js API Route 代理）
 *
 * 为什么用 Next.js API Route 代理？
 * - Next.js API Route 在服务端运行，可以访问 Docker 内网（如 http://kroki:8000）
 * - 浏览器只需访问本域名的 /api/render，无需知道 Kroki 地址
 * - 不增加后端（FastAPI）负担，后端只处理 AI Agent 逻辑
 * - Next.js 提供自动缓存优化
 */
async function krokiRequest(
  endpoint: string,
  code: string,
  options: {
    timeout?: number;
    extraHeaders?: Record<string, string>;
  } = {}
): Promise<Response> {
  const { timeout = REQUEST_TIMEOUT, extraHeaders = {} } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // 调用 Next.js API Route: /api/render/{engine}/{format}
    const response = await fetch(`/api/render/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        ...extraHeaders
      },
      body: code,
      signal: controller.signal
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
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('请求超时，请简化图表或稍后重试');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function renderDiagram(
  diagramType: string,
  code: string
): Promise<string> {
  const response = await krokiRequest(`${diagramType}/svg`, code);
  const svg = await response.text();
  return svg.replace(/^<\?xml[^?]*\?>\s*/i, '');
}

export async function exportPng(
  diagramType: string,
  code: string
): Promise<Blob> {
  const response = await krokiRequest(`${diagramType}/png`, code);
  return response.blob();
}

export async function exportJpeg(
  diagramType: string,
  code: string
): Promise<Blob> {
  const response = await krokiRequest(`${diagramType}/jpeg`, code);
  return response.blob();
}

export async function exportPdf(
  diagramType: string,
  code: string
): Promise<Blob> {
  const response = await krokiRequest(`${diagramType}/pdf`, code);
  return response.blob();
}

// PNG 导出（白色背景，非透明）
// 注意：只有 BlockDiag 系列（blockdiag, seqdiag, nwdiag）支持 no-transparency 参数
export async function exportPngOpaque(
  diagramType: string,
  code: string
): Promise<Blob> {
  const response = await krokiRequest(`${diagramType}/png`, code, {
    extraHeaders: {
      // 根据 Kroki 官方文档，flag 类型的参数使用空字符串
      'Kroki-Diagram-Options-no-transparency': ''
    }
  });
  return response.blob();
}
