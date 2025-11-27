/**
 * 页面渲染集成测试
 * 测试完整的渲染流程：初始加载、编辑、类型切换、会话切换
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import Home from "../page";
import { renderDiagram } from "@/lib/kroki";

// Mock dependencies
vi.mock("@/lib/kroki", () => ({
  renderDiagram: vi.fn(),
  exportPng: vi.fn(),
  exportPngOpaque: vi.fn(),
  exportJpeg: vi.fn(),
  exportPdf: vi.fn(),
  getExportCapability: vi.fn(() => ({
    svg: true,
    png: true,
    jpeg: true,
    pdf: true,
  })),
}));

vi.mock("@/lib/use-session", () => ({
  useSession: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: vi.fn(),
}));

const mockRenderDiagram = vi.mocked(renderDiagram);

describe("页面渲染集成测试", () => {
  const mockUseSession = vi.hoisted(() => vi.fn());

  // 创建默认 session mock 的辅助函数
  const createMockSession = (overrides = {}) => ({
    sessionId: "session-1",
    isLoading: false,
    diagram: {
      diagram_type: "mermaid",
      diagram_code: "graph TD; A-->B",
    },
    canUndo: false,
    canRedo: false,
    setDiagram: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    messages: [],
    setMessages: vi.fn(),
    sessions: [],
    createNewSession: vi.fn(),
    loadSession: vi.fn(),
    deleteSessionById: vi.fn(),
    renameSession: vi.fn(),
    saveNow: vi.fn(),
    hasPendingChanges: false,
    ...overrides,
  });

  beforeEach(async () => {
    const { useSession } = await import("@/lib/use-session");
    vi.mocked(useSession).mockImplementation(mockUseSession);
    vi.clearAllMocks();

    // 默认 mock: 同步返回，无延迟
    mockRenderDiagram.mockImplementation(async (type, code) => {
      return `<svg data-type="${type}">${code}</svg>`;
    });

    mockUseSession.mockReturnValue(createMockSession());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("初始化流程", () => {
    it("会话加载中显示加载状态", () => {
      mockUseSession.mockReturnValue(createMockSession({ isLoading: true }));

      render(<Home />);

      expect(screen.getByText("加载中...")).toBeInTheDocument();
      expect(mockRenderDiagram).not.toHaveBeenCalled();
    });

    it("会话加载完成后自动渲染", async () => {
      mockUseSession.mockReturnValue(createMockSession({ isLoading: true }));
      const { rerender } = render(<Home />);

      // 加载完成
      mockUseSession.mockReturnValue(createMockSession({ isLoading: false }));
      rerender(<Home />);

      await waitFor(() => {
        expect(mockRenderDiagram).toHaveBeenCalledWith("mermaid", "graph TD; A-->B");
      });
    });

    it("初始加载时只渲染一次", async () => {
      mockUseSession.mockReturnValue(createMockSession({ isLoading: true }));
      const { rerender } = render(<Home />);

      mockUseSession.mockReturnValue(createMockSession({ isLoading: false }));
      rerender(<Home />);

      await waitFor(() => {
        expect(mockRenderDiagram).toHaveBeenCalledTimes(1);
      });

      // 再次 rerender 不应该触发渲染
      rerender(<Home />);

      // 等待一小段时间确保没有额外渲染
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(mockRenderDiagram).toHaveBeenCalledTimes(1);
    });
  });

  describe("代码编辑流程", () => {
    it("代码变化触发防抖渲染（500ms）", async () => {
      // 使用 shouldAdvanceTime 让 fake timers 与 async 操作协同工作
      vi.useFakeTimers({ shouldAdvanceTime: true });

      const { rerender } = render(<Home />);

      // 等待初始渲染
      await vi.waitFor(() => {
        expect(mockRenderDiagram).toHaveBeenCalledTimes(1);
      });

      // 模拟代码变化
      mockUseSession.mockReturnValue(
        createMockSession({
          diagram: {
            diagram_type: "mermaid",
            diagram_code: "graph TD; A-->B-->C",
          },
        })
      );
      rerender(<Home />);

      // 防抖期间不应该渲染
      await vi.advanceTimersByTimeAsync(300);
      expect(mockRenderDiagram).toHaveBeenCalledTimes(1);

      // 500ms 后触发渲染
      await vi.advanceTimersByTimeAsync(200);

      await vi.waitFor(() => {
        expect(mockRenderDiagram).toHaveBeenCalledTimes(2);
        expect(mockRenderDiagram).toHaveBeenLastCalledWith("mermaid", "graph TD; A-->B-->C");
      });
    });
  });

  describe("类型切换流程", () => {
    it("类型切换立即渲染（不等防抖）", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      const { rerender } = render(<Home />);

      // 等待初始渲染
      await vi.waitFor(() => {
        expect(mockRenderDiagram).toHaveBeenCalledTimes(1);
      });

      // 模拟类型切换
      mockUseSession.mockReturnValue(
        createMockSession({
          diagram: {
            diagram_type: "plantuml",
            diagram_code: "@startuml\nA -> B\n@enduml",
          },
        })
      );
      rerender(<Home />);

      // 类型切换应该立即渲染（不等 500ms 防抖）
      await vi.waitFor(() => {
        expect(mockRenderDiagram).toHaveBeenCalledTimes(2);
        expect(mockRenderDiagram).toHaveBeenLastCalledWith(
          "plantuml",
          "@startuml\nA -> B\n@enduml"
        );
      });
    });
  });

  describe("会话切换流程", () => {
    it("会话切换正确渲染新图表", async () => {
      const { rerender } = render(<Home />);

      // 等待初始渲染
      await waitFor(() => {
        expect(mockRenderDiagram).toHaveBeenCalledWith("mermaid", "graph TD; A-->B");
      });

      // 切换到新会话
      mockUseSession.mockReturnValue(
        createMockSession({
          sessionId: "session-2",
          diagram: {
            diagram_type: "plantuml",
            diagram_code: "@startuml\nA -> B\n@enduml",
          },
        })
      );
      rerender(<Home />);

      // 应该立即渲染新会话的图表
      await waitFor(() => {
        expect(mockRenderDiagram).toHaveBeenCalledWith(
          "plantuml",
          "@startuml\nA -> B\n@enduml"
        );
      });
    });
  });

  describe("渲染竞态保护", () => {
    it("快速连续变化只保留最后一次渲染", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      let renderCount = 0;
      mockRenderDiagram.mockImplementation(async (_type, code) => {
        renderCount++;
        const currentCount = renderCount;
        // 模拟渲染延迟
        await new Promise((resolve) => setTimeout(resolve, 50));
        return `<svg data-render="${currentCount}">${code}</svg>`;
      });

      const { rerender } = render(<Home />);

      // 等待初始渲染开始
      await vi.waitFor(() => {
        expect(mockRenderDiagram).toHaveBeenCalledTimes(1);
      });

      // 推进时间让初始渲染完成
      await vi.advanceTimersByTimeAsync(100);

      // 快速连续变化 - 第一次
      mockUseSession.mockReturnValue(
        createMockSession({
          diagram: {
            diagram_type: "mermaid",
            diagram_code: "code2",
          },
        })
      );
      rerender(<Home />);

      // 推进防抖时间
      await vi.advanceTimersByTimeAsync(500);

      // 快速连续变化 - 第二次
      mockUseSession.mockReturnValue(
        createMockSession({
          diagram: {
            diagram_type: "mermaid",
            diagram_code: "code3",
          },
        })
      );
      rerender(<Home />);

      // 推进防抖时间
      await vi.advanceTimersByTimeAsync(500);

      // 推进渲染时间
      await vi.advanceTimersByTimeAsync(100);

      // 应该有渲染调用，最终应该包含 code3
      await vi.waitFor(() => {
        expect(mockRenderDiagram).toHaveBeenCalledWith("mermaid", "code3");
      });
    });
  });
});
