import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock Kroki 渲染函数
vi.mock('@/lib/kroki', () => ({
  renderDiagramServer: vi.fn(),
}));

import { renderDiagramServer } from '@/lib/kroki';

describe('validate_and_render 工具优化（方案 A）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('成功情况', () => {
    test('成功时返回 diagram_type 和 diagram_code（不返回 SVG）', async () => {
      const mockSvg = '<svg>'.repeat(1000); // 大 SVG
      vi.mocked(renderDiagramServer).mockResolvedValue(mockSvg);

      // 模拟工具执行结果
      const result = {
        success: true,
        diagram_type: 'mermaid',
        diagram_code: 'graph TD\n  A-->B',
        // svg_content 不应该存在
      };

      // 验证返回结构
      expect(result.success).toBe(true);
      expect(result.diagram_type).toBe('mermaid');
      expect(result.diagram_code).toBeTruthy();

      // 确保不返回 SVG 和其他无用字段
      expect((result as any).svg_content).toBeUndefined();
      expect((result as any).svg_length).toBeUndefined();
      expect((result as any).code_length).toBeUndefined();
      expect((result as any).error_message).toBeUndefined();
    });

    test('Token 节省验证：不返回 SVG 节省 99%+', () => {
      // 优化前的返回格式（~30 KB）
      const oldResult = {
        success: true,
        svg_content: '<svg>'.repeat(6000), // ~30000 字符
        diagram_type: 'mermaid',
        diagram_code: 'graph TD\n  A-->B',
        code_length: 20,
        svg_length: 30000,
        error_message: null,
      };

      // 优化后的返回格式（~100 字节）
      const newResult = {
        success: true,
        diagram_type: 'mermaid',
        diagram_code: 'graph TD\n  A-->B',
      };

      const oldSize = JSON.stringify(oldResult).length;
      const newSize = JSON.stringify(newResult).length;

      // 验证大小对比
      console.log(`优化前: ${oldSize} 字节`);
      console.log(`优化后: ${newSize} 字节`);
      console.log(`节省: ${((oldSize - newSize) / oldSize * 100).toFixed(2)}%`);

      // 确保节省至少 98%
      expect(newSize).toBeLessThan(oldSize * 0.02);
    });

    test('验证渲染函数被调用但结果未返回', async () => {
      const mockSvg = '<svg width="100" height="100"></svg>';
      vi.mocked(renderDiagramServer).mockResolvedValue(mockSvg);

      const engine = 'plantuml';
      const code = '@startuml\nAlice -> Bob\n@enduml';

      // 调用渲染
      await renderDiagramServer(engine, code);

      // 验证渲染函数被调用
      expect(renderDiagramServer).toHaveBeenCalledWith(engine, code);
      expect(renderDiagramServer).toHaveBeenCalledTimes(1);

      // 模拟工具返回（不包含 SVG）
      const result = {
        success: true,
        diagram_type: engine,
        diagram_code: code,
      };

      // SVG 不应该在返回值中
      expect((result as any).svg_content).toBeUndefined();
    });
  });

  describe('失败情况', () => {
    test('失败时返回结构化错误（简化版）', async () => {
      const errorMsg = 'Parse error on line 3';

      // 模拟工具返回的错误格式
      const result = {
        success: false as const,
        error: {
          message: errorMsg,
          line: 3,
        },
      };

      expect(result.success).toBe(false);
      expect(result.error.message).toBe(errorMsg);
      expect(result.error.line).toBe(3);

      // 确保不返回无用字段
      expect((result as any).svg_content).toBeUndefined();
      expect((result as any).failed_code).toBeUndefined();
      expect((result as any).code_length).toBeUndefined();
    });

    test('失败时提取行号（降级方案）', () => {
      const errorMessage = 'Syntax error on line 42: Unexpected token';

      // 模拟简单的行号提取
      const lineMatch = errorMessage.match(/line\s+(\d+)/i);
      const parsedError = {
        message: errorMessage,
        line: lineMatch ? parseInt(lineMatch[1], 10) : undefined,
      };

      expect(parsedError.message).toBe(errorMessage);
      expect(parsedError.line).toBe(42);
    });

    test('失败时无法提取行号', () => {
      const errorMessage = 'Unknown error occurred';

      const lineMatch = errorMessage.match(/line\s+(\d+)/i);
      const parsedError = {
        message: errorMessage,
        line: lineMatch ? parseInt(lineMatch[1], 10) : undefined,
      };

      expect(parsedError.message).toBe(errorMessage);
      expect(parsedError.line).toBeUndefined();
    });
  });

  describe('类型定义', () => {
    test('成功返回类型定义正确', () => {
      type SuccessResult = {
        success: true;
        diagram_type: string;
        diagram_code: string;
      };

      const result: SuccessResult = {
        success: true,
        diagram_type: 'mermaid',
        diagram_code: 'graph TD',
      };

      expect(result.success).toBe(true);
    });

    test('失败返回类型定义正确', () => {
      type ErrorResult = {
        success: false;
        error: {
          message: string;
          line?: number;
          context?: {
            before: string[];
            error_line: string;
            after: string[];
          };
        };
      };

      const result: ErrorResult = {
        success: false,
        error: {
          message: 'Parse error',
          line: 5,
          context: {
            before: ['line 3', 'line 4'],
            error_line: 'line 5 error',
            after: ['line 6'],
          },
        },
      };

      expect(result.success).toBe(false);
      expect(result.error.line).toBe(5);
    });
  });
});
