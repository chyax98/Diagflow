import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderDiagram, exportPng, exportJpeg, exportPdf, exportPngOpaque } from "../kroki";
import { mockFetch, mockFetchError, createMockResponse } from "../test-utils";

describe("Kroki 客户端模块", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("renderDiagram", () => {
    it("应该成功渲染图表并返回 SVG", async () => {
      const svgContent = '<?xml version="1.0"?><svg></svg>';
      mockFetch(createMockResponse(svgContent));

      const result = await renderDiagram("mermaid", "flowchart TD\nA-->B");

      expect(result).toBe("<svg></svg>"); // XML 声明被移除
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/render/mermaid/svg",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "text/plain",
          }),
          body: "flowchart TD\nA-->B",
        })
      );
    });

    it("应该移除 XML 声明", async () => {
      const svgWithXml = '<?xml version="1.0" encoding="UTF-8"?>\n<svg></svg>';
      mockFetch(createMockResponse(svgWithXml));

      const result = await renderDiagram("mermaid", "graph TD\nA-->B");

      expect(result).toBe("<svg></svg>");
      expect(result).not.toContain("<?xml");
    });

    it("应该处理渲染失败的情况", async () => {
      mockFetch(
        createMockResponse(JSON.stringify({ error: "语法错误" }), {
          status: 400,
          headers: { "content-type": "application/json" },
        })
      );

      await expect(renderDiagram("mermaid", "invalid code")).rejects.toThrow("语法错误");
    });

    it("应该处理网络错误", async () => {
      mockFetchError(new Error("网络连接失败"));

      await expect(renderDiagram("mermaid", "graph TD\nA-->B")).rejects.toThrow("网络连接失败");
    });
  });

  describe("exportPng", () => {
    it("应该导出 PNG 格式", async () => {
      const blob = new Blob(["fake-png-data"], { type: "image/png" });
      const mockResponse = new Response(blob, {
        status: 200,
        headers: { "content-type": "image/png" },
      });
      mockFetch(mockResponse);

      const result = await exportPng("mermaid", "graph TD\nA-->B");

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe("image/png");
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/render/mermaid/png",
        expect.objectContaining({
          method: "POST",
        })
      );
    });
  });

  describe("exportJpeg", () => {
    it("应该导出 JPEG 格式", async () => {
      const blob = new Blob(["fake-jpeg-data"], { type: "image/jpeg" });
      const mockResponse = new Response(blob, {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      });
      mockFetch(mockResponse);

      const result = await exportJpeg("mermaid", "graph TD\nA-->B");

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe("image/jpeg");
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/render/mermaid/jpeg",
        expect.objectContaining({
          method: "POST",
        })
      );
    });
  });

  describe("exportPdf", () => {
    it("应该导出 PDF 格式", async () => {
      const blob = new Blob(["fake-pdf-data"], { type: "application/pdf" });
      const mockResponse = new Response(blob, {
        status: 200,
        headers: { "content-type": "application/pdf" },
      });
      mockFetch(mockResponse);

      const result = await exportPdf("mermaid", "graph TD\nA-->B");

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe("application/pdf");
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/render/mermaid/pdf",
        expect.objectContaining({
          method: "POST",
        })
      );
    });
  });

  describe("exportPngOpaque", () => {
    it("应该导出不透明 PNG 并带自定义 header", async () => {
      const blob = new Blob(["fake-png-data"], { type: "image/png" });
      const mockResponse = new Response(blob, {
        status: 200,
        headers: { "content-type": "image/png" },
      });
      mockFetch(mockResponse);

      const result = await exportPngOpaque("blockdiag", "blockdiag { A -> B }");

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe("image/png");
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/render/blockdiag/png",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "text/plain",
            "Kroki-Diagram-Options-no-transparency": "",
          }),
        })
      );
    });
  });
});
