import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../[engine]/[format]/route";
import { NextRequest } from "next/server";

describe("Kroki 渲染 API", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * 创建测试用的 NextRequest
   */
  function createRequest(body: string, init?: Omit<RequestInit, "signal">): NextRequest {
    return new NextRequest("http://localhost:3000/api/render/mermaid/svg", {
      method: "POST",
      body,
      ...init,
    });
  }

  /**
   * 创建测试用的 params promise
   */
  function createParams(engine: string, format: string) {
    return Promise.resolve({ engine, format });
  }

  describe("参数验证", () => {
    it("应该拒绝空代码请求", async () => {
      const request = createRequest("");
      const params = createParams("mermaid", "svg");

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("代码不能为空");
    });
  });

  describe("成功渲染", () => {
    it("应该成功渲染 SVG", async () => {
      const svgContent = "<svg></svg>";
      global.fetch = vi.fn().mockResolvedValue(
        new Response(svgContent, {
          status: 200,
          headers: { "content-type": "image/svg+xml" },
        })
      );

      const request = createRequest("graph TD\nA-->B");
      const params = createParams("mermaid", "svg");

      const response = await POST(request, { params });

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("image/svg+xml");
      expect(response.headers.get("cache-control")).toContain("public");

      const body = await response.text();
      expect(body).toBe(svgContent);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("mermaid/svg"),
        expect.objectContaining({
          method: "POST",
          body: "graph TD\nA-->B",
        })
      );
    });

    it("应该正确处理不同的格式", async () => {
      global.fetch = vi.fn().mockResolvedValue(
        new Response(new Uint8Array([137, 80, 78, 71]), {
          status: 200,
          headers: { "content-type": "image/png" },
        })
      );

      const request = createRequest("graph TD\nA-->B");
      const params = createParams("mermaid", "png");

      const response = await POST(request, { params });

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("image/png");
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("mermaid/png"),
        expect.any(Object)
      );
    });
  });

  describe("错误处理", () => {
    it("应该处理 Kroki 返回的错误", async () => {
      global.fetch = vi.fn().mockResolvedValue(
        new Response("语法错误", {
          status: 400,
          headers: { "content-type": "text/plain" },
        })
      );

      const request = createRequest("invalid code");
      const params = createParams("mermaid", "svg");

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Kroki 渲染失败");
    });

    it("应该处理超时错误", async () => {
      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";
      global.fetch = vi.fn().mockRejectedValue(abortError);

      const request = createRequest("graph TD\nA-->B");
      const params = createParams("mermaid", "svg");

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(504);
      expect(data.error).toContain("超时");
    });

    it("应该处理网络错误", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("网络连接失败"));

      const request = createRequest("graph TD\nA-->B");
      const params = createParams("mermaid", "svg");

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  describe("Kroki URL 构建", () => {
    it("应该使用默认 Kroki URL", async () => {
      global.fetch = vi.fn().mockResolvedValue(
        new Response("<svg></svg>", {
          status: 200,
          headers: { "content-type": "image/svg+xml" },
        })
      );

      const request = createRequest("graph TD\nA-->B");
      const params = createParams("plantuml", "svg");

      await POST(request, { params });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/https:\/\/kroki\.io\/plantuml\/svg$/),
        expect.any(Object)
      );
    });
  });
});
