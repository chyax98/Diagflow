import { NextRequest, NextResponse } from 'next/server';

// 后端 API 地址（内网）
// Docker 环境: http://backend:8000（通过环境变量设置）
// 开发环境: http://localhost:8000（默认值）
const AGENT_URL = process.env.AGENT_URL || "http://localhost:8000";

/**
 * Next.js API Route：转发渲染请求到后端
 *
 * 架构：浏览器 → Next.js → 后端 → Kroki
 *
 * 为什么这样设计？
 * 1. 后端不对外暴露，只在内网运行
 * 2. 前端和 Agent 工具都通过后端统一调用 Kroki
 * 3. Nginx/宝塔只需代理前端 3000 端口
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ engine: string; format: string }> }
) {
  const { engine, format } = await params;

  try {
    // 读取请求体（图表代码）
    const code = await request.text();

    if (!code) {
      return NextResponse.json(
        { error: "图表代码不能为空" },
        { status: 400 }
      );
    }

    // 转发到后端的 /api/render 端点
    const backendUrl = `${AGENT_URL.replace(/\/$/, "")}/api/render/${engine}/${format}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s 超时

    try {
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: code,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
          return NextResponse.json(errorJson, { status: response.status });
        } catch {
          return NextResponse.json(
            { error: errorText },
            { status: response.status }
          );
        }
      }

      // 返回渲染结果
      const contentType = response.headers.get('content-type') || 'image/svg+xml';
      const content = await response.arrayBuffer();

      return new NextResponse(content, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600', // 缓存 1 小时
        },
      });
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        return NextResponse.json(
          { error: "渲染超时，请简化图表或稍后重试" },
          { status: 504 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('后端代理错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "未知错误" },
      { status: 500 }
    );
  }
}
