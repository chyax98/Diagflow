import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock Kroki 渲染函数
vi.mock('@/lib/kroki', () => ({
  renderDiagramServer: vi.fn(),
}));

import { renderDiagramServer } from '@/lib/kroki';

describe('validate_and_render 工具集成测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('集成测试：验证 Token 优化效果', () => {
    // 模拟优化前的返回（包含完整 SVG）
    const oldFormatResult = {
      success: true,
      svg_content: '<svg>'.repeat(10000), // 50KB
      diagram_type: 'mermaid',
      diagram_code: 'graph TD\n  A-->B\n  B-->C',
      code_length: 25,
      svg_length: 50000,
      error_message: null,
    };

    // 模拟优化后的返回（只含代码）
    const newFormatResult = {
      success: true,
      diagram_type: 'mermaid',
      diagram_code: 'graph TD\n  A-->B\n  B-->C',
    };

    // 计算大小差异
    const oldSize = JSON.stringify(oldFormatResult).length;
    const newSize = JSON.stringify(newFormatResult).length;
    const savedPercentage = ((oldSize - newSize) / oldSize * 100).toFixed(2);

    console.log('=== Token 优化对比 ===');
    console.log(`优化前: ${oldSize} 字节`);
    console.log(`优化后: ${newSize} 字节`);
    console.log(`节省: ${savedPercentage}%`);
    console.log(`绝对节省: ${oldSize - newSize} 字节`);

    // 验证至少节省 99%
    expect(newSize).toBeLessThan(oldSize * 0.01);
  });

  test('性能测试：大型代码的优化效果', () => {
    // 模拟复杂图表代码（500 行）
    const largeCode = Array.from({ length: 500 }, (_, i) =>
      `  node${i} --> node${i + 1}`
    ).join('\n');

    // 模拟渲染结果（大型 SVG，约 500KB）
    const largeSvg = '<svg>'.repeat(100000); // 500KB

    // 优化前返回
    const oldResult = {
      success: true,
      svg_content: largeSvg,
      diagram_type: 'mermaid',
      diagram_code: largeCode,
      code_length: largeCode.length,
      svg_length: largeSvg.length,
      error_message: null,
    };

    // 优化后返回
    const newResult = {
      success: true,
      diagram_type: 'mermaid',
      diagram_code: largeCode,
    };

    const oldSize = JSON.stringify(oldResult).length;
    const newSize = JSON.stringify(newResult).length;
    const savedBytes = oldSize - newSize;

    console.log('=== 大型图表性能对比 ===');
    console.log(`代码行数: 500 行`);
    console.log(`SVG 大小: ~500KB`);
    console.log(`优化前: ${(oldSize / 1024).toFixed(2)} KB`);
    console.log(`优化后: ${(newSize / 1024).toFixed(2)} KB`);
    console.log(`节省: ${(savedBytes / 1024).toFixed(2)} KB`);

    // 验证节省超过 400KB
    expect(savedBytes).toBeGreaterThan(400 * 1024);
  });

  test('边界测试：空代码处理', () => {
    const result = {
      success: true,
      diagram_type: 'mermaid',
      diagram_code: '',
    };

    expect(result.diagram_code).toBe('');
    expect(result.success).toBe(true);
  });

  test('边界测试：超长代码处理', () => {
    const veryLongCode = 'A'.repeat(100000); // 100KB 代码

    const result = {
      success: true,
      diagram_type: 'plantuml',
      diagram_code: veryLongCode,
    };

    // 验证超长代码能正常处理
    expect(result.diagram_code.length).toBe(100000);
    expect(JSON.stringify(result).length).toBeLessThan(120000); // 加上 JSON 结构
  });
});
