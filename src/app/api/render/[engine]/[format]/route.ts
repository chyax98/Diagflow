import { NextRequest, NextResponse } from 'next/server';
import { renderKroki, KrokiRenderError, KrokiTimeoutError } from '@/lib/kroki';

/**
 * Next.js API Route：Kroki 渲染代理
 *
 * 架构：浏览器 → Next.js API Route → Kroki API
 *
 * 为什么需要这个代理？
 * 1. 统一错误处理
 * 2. 添加缓存策略
 * 3. 避免浏览器 CORS 问题
 * 4. 隐藏 Kroki 服务地址
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ engine: string; format: string }> }
) {
  const { engine, format } = await params;

  try {
    const code = await request.text();

    if (!code) {
      return NextResponse.json(
        { error: "图表代码不能为空" },
        { status: 400 }
      );
    }

    // 使用统一的 Kroki 渲染函数
    const result = await renderKroki(engine, format, code);

    return new NextResponse(result.content, {
      status: 200,
      headers: {
        'Content-Type': result.contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";

    // 根据错误类型返回不同状态码
    let status = 500;
    if (error instanceof KrokiTimeoutError) {
      status = 504;
    } else if (error instanceof KrokiRenderError) {
      // 代码语法错误是客户端错误
      status = 400;
    }

    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
