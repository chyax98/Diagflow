import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockFetch, mockFetchError, createMockResponse } from "../test-utils";

describe("测试辅助工具", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("createMockResponse", () => {
    it("应该创建默认的成功响应", () => {
      const body = "<svg></svg>";
      const response = createMockResponse(body);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("image/svg+xml");
    });

    it("应该支持自定义响应配置", () => {
      const body = "<svg></svg>";
      const response = createMockResponse(body, {
        status: 404,
        headers: { "content-type": "text/plain" },
      });

      expect(response.status).toBe(404);
      expect(response.headers.get("content-type")).toBe("text/plain");
    });
  });

  describe("mockFetch", () => {
    it("应该正确 mock fetch 响应", async () => {
      const mockResponse = createMockResponse("<svg></svg>");
      mockFetch(mockResponse);

      const result = await fetch("https://example.com");
      expect(result.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("mockFetchError", () => {
    it("应该正确 mock fetch 错误", async () => {
      const error = new Error("网络错误");
      mockFetchError(error);

      await expect(fetch("https://example.com")).rejects.toThrow("网络错误");
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
});
