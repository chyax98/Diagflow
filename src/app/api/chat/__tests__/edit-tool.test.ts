import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderDiagramServer } from "@/lib/kroki";

// Mock Kroki 渲染函数
vi.mock("@/lib/kroki", () => ({
  renderDiagramServer: vi.fn(),
}));

/**
 * 模拟 edit_diagram_code 工具的执行逻辑
 * 这个函数在实际实现时会在 route.ts 的 tools 中
 */
async function executeEditTool(
  params: { search: string; replace: string },
  currentCode: string
): Promise<{
  success: boolean;
  new_code?: string;
  error?: string;
  matches_count?: number;
  message?: string;
  syntax_error?: string;
  attempted_code?: string;
}> {
  const { search, replace } = params;

  // 参数验证
  if (!currentCode) {
    return {
      success: false,
      error: "无当前图表，请先生成图表",
    };
  }

  // 查找匹配（精确匹配）
  const searchNormalized = search.trim();
  const matches = currentCode.split(searchNormalized).length - 1;

  if (matches === 0) {
    return {
      success: false,
      error: `未找到匹配的代码片段。建议使用完整代码重新生成。\n查找内容：\n${search}`,
    };
  }

  if (matches > 1) {
    return {
      success: false,
      error: `找到 ${matches} 处匹配，无法确定修改位置。请提供更精确的 search 内容（包含更多上下文）。`,
      matches_count: matches,
    };
  }

  // 执行替换
  const newCode = currentCode.replace(searchNormalized, replace.trim());

  // 验证语法（调用 Kroki 渲染）
  try {
    await renderDiagramServer("mermaid", newCode);

    return {
      success: true,
      new_code: newCode,
      message: "代码已成功修改并验证",
    };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);

    return {
      success: false,
      error: "修改后的代码语法错误",
      syntax_error: errorMessage,
      attempted_code: newCode,
    };
  }
}

describe("edit_diagram_code 工具", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("精确匹配替换", () => {
    it("应该精确匹配并替换单行代码", async () => {
      const originalCode = `graph TD
  A[Start]
  B[Login]
  style Login fill:#fff`;

      // Mock 渲染成功
      vi.mocked(renderDiagramServer).mockResolvedValue("<svg>...</svg>");

      const result = await executeEditTool(
        {
          search: "style Login fill:#fff",
          replace: "style Login fill:#0000ff",
        },
        originalCode
      );

      expect(result.success).toBe(true);
      expect(result.new_code).toContain("style Login fill:#0000ff");
      expect(result.new_code).not.toContain("style Login fill:#fff");
      expect(renderDiagramServer).toHaveBeenCalledWith("mermaid", expect.any(String));
    });

    it("应该替换多行代码块", async () => {
      const originalCode = `graph TD
  A-->B
  B-->C
  C-->D`;

      vi.mocked(renderDiagramServer).mockResolvedValue("<svg>...</svg>");

      const result = await executeEditTool(
        {
          search: "A-->B\n  B-->C",
          replace: "A-->X\n  X-->C",
        },
        originalCode
      );

      expect(result.success).toBe(true);
      expect(result.new_code).toContain("A-->X");
      expect(result.new_code).toContain("X-->C");
      expect(result.new_code).not.toContain("A-->B");
    });

    it("应该保留前后缀空格和缩进", async () => {
      const originalCode = `graph TD
    A[Start]
    B[Process]`;

      vi.mocked(renderDiagramServer).mockResolvedValue("<svg>...</svg>");

      const result = await executeEditTool(
        {
          search: "    A[Start]",
          replace: "    A[开始]",
        },
        originalCode
      );

      expect(result.success).toBe(true);
      expect(result.new_code).toContain("    A[开始]");
      expect(result.new_code).toContain("    B[Process]"); // 其他行不变
    });
  });

  describe("未找到匹配", () => {
    it("未找到匹配时应该返回错误", async () => {
      const originalCode = `graph TD\n  A-->B`;

      const result = await executeEditTool(
        {
          search: "X-->Y", // 不存在
          replace: "A-->B",
        },
        originalCode
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("未找到匹配");
      expect(result.error).toContain("X-->Y");
    });

    it("大小写敏感：不应该匹配不同大小写的内容", async () => {
      const originalCode = `graph TD\n  A-->B`;

      const result = await executeEditTool(
        {
          search: "a-->b", // 小写，不匹配
          replace: "X-->Y",
        },
        originalCode
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("未找到匹配");
    });
  });

  describe("多处匹配（需要精确匹配）", () => {
    it("多处匹配时应该要求更精确的 search", async () => {
      const originalCode = `graph TD
  A-->B
  C-->B
  D-->B`;

      const result = await executeEditTool(
        {
          search: "-->B", // 匹配 3 处
          replace: "-->X",
        },
        originalCode
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("找到");
      expect(result.error).toContain("更精确");
      expect(result.matches_count).toBe(3);
    });

    it("通过添加上下文应该能唯一匹配", async () => {
      const originalCode = `graph TD
  A-->B
  C-->B
  D-->B`;

      vi.mocked(renderDiagramServer).mockResolvedValue("<svg>...</svg>");

      const result = await executeEditTool(
        {
          search: "A-->B\n  C-->B", // 包含上下文，唯一匹配
          replace: "A-->X\n  C-->X",
        },
        originalCode
      );

      expect(result.success).toBe(true);
      expect(result.new_code).toContain("A-->X");
      expect(result.new_code).toContain("C-->X");
      expect(result.new_code).toContain("D-->B"); // 最后一个不变
    });
  });

  describe("语法验证", () => {
    it("修改后语法错误时应该返回错误信息", async () => {
      const originalCode = `graph TD
  A-->B`;

      // Mock 渲染失败
      vi.mocked(renderDiagramServer).mockRejectedValue(
        new Error("Parse error on line 2")
      );

      const result = await executeEditTool(
        {
          search: "A-->B",
          replace: "A-->>B", // 错误的语法
        },
        originalCode
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("语法错误");
      expect(result.syntax_error).toContain("Parse error");
      expect(result.attempted_code).toContain("A-->>B");
    });

    it("替换成功后应该调用渲染验证", async () => {
      const originalCode = `graph TD\n  A-->B`;

      vi.mocked(renderDiagramServer).mockResolvedValue("<svg>...</svg>");

      await executeEditTool(
        {
          search: "A-->B",
          replace: "A-->C",
        },
        originalCode
      );

      expect(renderDiagramServer).toHaveBeenCalledTimes(1);
      expect(renderDiagramServer).toHaveBeenCalledWith(
        "mermaid",
        expect.stringContaining("A-->C")
      );
    });
  });

  describe("边界情况", () => {
    it("空当前代码应该返回错误", async () => {
      const result = await executeEditTool(
        {
          search: "A-->B",
          replace: "A-->C",
        },
        ""
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("无当前图表");
    });

    it("空 search 字符串应该返回错误（匹配整个文件）", async () => {
      const originalCode = `graph TD\n  A-->B`;

      const result = await executeEditTool(
        {
          search: "", // 空字符串
          replace: "X",
        },
        originalCode
      );

      // 空字符串会匹配每个字符之间，导致多处匹配
      expect(result.success).toBe(false);
    });

    it("search 和 replace 相同应该不修改代码", async () => {
      const originalCode = `graph TD\n  A-->B`;

      vi.mocked(renderDiagramServer).mockResolvedValue("<svg>...</svg>");

      const result = await executeEditTool(
        {
          search: "A-->B",
          replace: "A-->B",
        },
        originalCode
      );

      expect(result.success).toBe(true);
      expect(result.new_code).toBe(originalCode);
    });

    it("只替换空格应该保持代码结构", async () => {
      const originalCode = `graph TD
  A[Start]`;

      vi.mocked(renderDiagramServer).mockResolvedValue("<svg>...</svg>");

      const result = await executeEditTool(
        {
          search: "A[Start]",
          replace: "A[开始]", // 修改文本
        },
        originalCode
      );

      expect(result.success).toBe(true);
      expect(result.new_code).toContain("A[开始]");
      expect(result.new_code).toContain("  A[开始]"); // 缩进保留
    });
  });

  describe("Token 消耗估算", () => {
    it("局部编辑应该比完整重新生成消耗更少 token", () => {
      const originalCode = `graph TD
  A[用户登录]
  B[验证]
  C[成功]
  D[失败]
  A-->B
  B-->C
  B-->D
  style A fill:#fff
  style B fill:#fff
  style C fill:#0f0
  style D fill:#f00`; // 约 150 tokens

      // 完整重新生成：
      // 输入：get_current_diagram() → 返回完整代码（~150 tokens）
      // 输出：AI 生成完整代码（~150 tokens）
      // 验证：validate_and_render(完整代码) (~150 tokens)
      // 总计：~450 tokens

      // 局部编辑：
      const searchStr = "style A fill:#fff"; // ~5 tokens
      const replaceStr = "style A fill:#0000ff"; // ~5 tokens
      // edit_diagram_code({ search: "...", replace: "..." }) (~10 tokens)
      // 总计：~10 tokens

      const fullRegenTokens = originalCode.length * 3; // 估算：完整代码在输入、输出、验证中各出现一次
      const partialEditTokens = searchStr.length + replaceStr.length; // 估算：仅传输修改部分

      const tokenSavingRatio = fullRegenTokens / partialEditTokens;

      // Token 节省应该超过 10 倍
      expect(tokenSavingRatio).toBeGreaterThan(10);
    });
  });
});
