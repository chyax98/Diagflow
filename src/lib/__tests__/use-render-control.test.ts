/**
 * useRenderControl Hook 测试
 * 测试渲染调度、竞态保护、防抖处理
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useRenderControl } from "../use-render-control";
import { renderDiagram } from "../kroki";

// Mock Kroki 渲染
vi.mock("../kroki", () => ({
  renderDiagram: vi.fn(),
}));

const mockRenderDiagram = vi.mocked(renderDiagram);

describe("useRenderControl 基础功能", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRenderDiagram.mockImplementation(async (type, code) => {
      await new Promise((resolve) => setTimeout(resolve, 50)); // 模拟网络延迟
      return `<svg>${code}</svg>`;
    });
  });

  it("初始状态正确", () => {
    const { result } = renderHook(() => useRenderControl());

    expect(result.current.svgContent).toBe("");
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.isRendering).toBe(false);
  });

  it("成功渲染图表", async () => {
    const { result } = renderHook(() => useRenderControl());

    await result.current.performRender("mermaid", "graph TD; A-->B");

    await waitFor(() => {
      expect(result.current.isRendering).toBe(false);
    });

    expect(result.current.svgContent).toBe("<svg>graph TD; A-->B</svg>");
    expect(result.current.errorMessage).toBeNull();
    expect(mockRenderDiagram).toHaveBeenCalledTimes(1);
    expect(mockRenderDiagram).toHaveBeenCalledWith("mermaid", "graph TD; A-->B");
  });

  it("处理渲染错误", async () => {
    mockRenderDiagram.mockRejectedValueOnce(new Error("语法错误"));

    const { result } = renderHook(() => useRenderControl());

    await act(async () => {
      await result.current.performRender("mermaid", "invalid code");
    });

    await waitFor(() => {
      expect(result.current.isRendering).toBe(false);
    });

    expect(result.current.svgContent).toBe("");
    expect(result.current.errorMessage).toBe("语法错误");
  });

  it("跳过空内容渲染", async () => {
    const { result } = renderHook(() => useRenderControl());

    await result.current.performRender("mermaid", "");
    await result.current.performRender("mermaid", "   ");

    expect(mockRenderDiagram).not.toHaveBeenCalled();
    expect(result.current.svgContent).toBe("");
  });

  it("clearRender 清除状态", async () => {
    const { result } = renderHook(() => useRenderControl());

    await act(async () => {
      await result.current.performRender("mermaid", "graph TD; A-->B");
    });
    await waitFor(() => expect(result.current.svgContent).toBeTruthy());

    act(() => {
      result.current.clearRender();
    });

    expect(result.current.svgContent).toBe("");
    expect(result.current.errorMessage).toBeNull();
  });
});

describe("useRenderControl 竞态条件保护", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("快速连续渲染，只保留最后结果", async () => {
    let resolveRender1: (value: string) => void;
    let resolveRender2: (value: string) => void;

    mockRenderDiagram
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRender1 = resolve;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRender2 = resolve;
          })
      );

    const { result } = renderHook(() => useRenderControl());

    // 发起第一次渲染（慢）
    const render1 = result.current.performRender("mermaid", "code1");

    // 快速发起第二次渲染（快）
    const render2 = result.current.performRender("mermaid", "code2");

    // 第二次先完成
    resolveRender2!("<svg>code2</svg>");
    await render2;

    await waitFor(() => {
      expect(result.current.svgContent).toBe("<svg>code2</svg>");
    });

    // 第一次后完成（应该被忽略）
    resolveRender1!("<svg>code1</svg>");
    await render1;

    // 等待确保没有状态变化
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 确认仍然是第二次的结果
    expect(result.current.svgContent).toBe("<svg>code2</svg>");
  });

  it("渲染中组件卸载不报错", async () => {
    mockRenderDiagram.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve("<svg>test</svg>"), 100))
    );

    const { result, unmount } = renderHook(() => useRenderControl());

    const renderPromise = result.current.performRender("mermaid", "code");

    // 渲染进行中卸载
    unmount();

    // 等待渲染完成，不应该抛出错误
    await expect(renderPromise).resolves.not.toThrow();
  });
});

describe("useRenderControl 渲染优化", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRenderDiagram.mockImplementation(async (_type, code) => `<svg>${code}</svg>`);
  });

  it("相同内容不重复渲染", async () => {
    const { result } = renderHook(() => useRenderControl());

    await act(async () => {
      await result.current.performRender("mermaid", "graph TD; A-->B");
    });
    await waitFor(() => expect(result.current.isRendering).toBe(false));

    // 清除 mock 调用记录
    mockRenderDiagram.mockClear();

    // 再次渲染相同内容
    await act(async () => {
      await result.current.performRender("mermaid", "graph TD; A-->B");
    });

    // 应该跳过，mockClear 后应该是 0 次
    expect(mockRenderDiagram).not.toHaveBeenCalled();
  });

  it("内容变化时重新渲染", async () => {
    const { result } = renderHook(() => useRenderControl());

    await result.current.performRender("mermaid", "code1");
    await waitFor(() => expect(mockRenderDiagram).toHaveBeenCalledTimes(1));

    await result.current.performRender("mermaid", "code2");
    await waitFor(() => expect(mockRenderDiagram).toHaveBeenCalledTimes(2));
  });
});

describe("useRenderControl 渲染调度", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRenderDiagram.mockImplementation(async (_type, code) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return `<svg>${code}</svg>`;
    });
  });

  it("初始加载时只渲染一次", async () => {
    const { result } = renderHook(() => useRenderControl());

    await act(async () => {
      await result.current.performRender("mermaid", "graph TD");
    });

    // 等待渲染完成
    await waitFor(() => {
      expect(result.current.isRendering).toBe(false);
    });

    // 验证只调用一次
    expect(mockRenderDiagram).toHaveBeenCalledTimes(1);
    expect(mockRenderDiagram).toHaveBeenCalledWith("mermaid", "graph TD");
    expect(result.current.svgContent).toBe("<svg>graph TD</svg>");
  });

  it("快速连续调用只保留最后一次结果", async () => {
    let resolve1: ((value: string) => void) | undefined;
    let resolve2: ((value: string) => void) | undefined;
    let resolve3: ((value: string) => void) | undefined;

    mockRenderDiagram
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolve1 = resolve;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolve2 = resolve;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolve3 = resolve;
          })
      );

    const { result } = renderHook(() => useRenderControl());

    // 快速连续调用 3 次（用 act 包裹避免警告）
    let p1: Promise<void>, p2: Promise<void>, p3: Promise<void>;
    act(() => {
      p1 = result.current.performRender("mermaid", "code1");
      p2 = result.current.performRender("mermaid", "code2");
      p3 = result.current.performRender("mermaid", "code3");
    });

    // 先完成第一次（版本 1）- 应该被忽略
    act(() => {
      resolve1!("<svg>code1</svg>");
    });
    await act(async () => {
      await p1;
    });

    // 再完成第三次（版本 3）- 应该被应用
    act(() => {
      resolve3!("<svg>code3</svg>");
    });
    await act(async () => {
      await p3;
    });

    // 最后完成第二次（版本 2）- 应该被忽略
    act(() => {
      resolve2!("<svg>code2</svg>");
    });
    await act(async () => {
      await p2;
    });

    // 等待确保所有状态更新完成
    await waitFor(() => {
      expect(result.current.isRendering).toBe(false);
    });

    // 验证最终结果是第三次调用（版本最新）
    expect(result.current.svgContent).toBe("<svg>code3</svg>");
    expect(mockRenderDiagram).toHaveBeenCalledTimes(3);
  });

  it("组件卸载后不更新状态", async () => {
    let resolveRender: ((value: string) => void) | undefined;

    mockRenderDiagram.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRender = resolve;
        })
    );

    const { result, unmount } = renderHook(() => useRenderControl());

    const renderPromise = result.current.performRender("mermaid", "graph TD");

    // 渲染进行中卸载组件
    unmount();

    // 完成渲染
    resolveRender!("<svg>graph TD</svg>");

    // 不应抛错（即使组件已卸载）
    await expect(renderPromise).resolves.not.toThrow();
  });
});
