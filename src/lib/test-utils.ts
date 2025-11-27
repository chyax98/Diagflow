import { vi } from "vitest";

/**
 * Mock fetch 响应辅助函数
 */
export function mockFetch(response: Response) {
  global.fetch = vi.fn().mockResolvedValue(response);
}

/**
 * Mock fetch 错误辅助函数
 */
export function mockFetchError(error: Error) {
  global.fetch = vi.fn().mockRejectedValue(error);
}

/**
 * 创建 mock Response 对象
 */
export function createMockResponse(body: string, init?: ResponseInit): Response {
  return new Response(body, {
    status: 200,
    headers: { "content-type": "image/svg+xml" },
    ...init,
  });
}
