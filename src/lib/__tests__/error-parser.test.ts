import { describe, test, expect } from 'vitest';
import { extractLineNumber, extractErrorContext, parseKrokiError } from '../error-parser';

describe('extractLineNumber', () => {
  test('Mermaid: Parse error on line 4', () => {
    expect(extractLineNumber('Parse error on line 4:')).toBe(4);
  });

  test('D2: -:3:9: format', () => {
    expect(extractLineNumber('-:3:9: maps must be terminated')).toBe(3);
  });

  test('Graphviz: syntax error in line 4', () => {
    expect(extractLineNumber('syntax error in line 4 near')).toBe(4);
  });

  test('DBML: at line 4:2', () => {
    expect(extractLineNumber('at line 4:2. Expected')).toBe(4);
  });

  test('无行号返回 undefined', () => {
    expect(extractLineNumber('Unknown error')).toBeUndefined();
  });
});

describe('extractErrorContext', () => {
  const code = `line 1
line 2
line 3 error
line 4
line 5`;

  test('正常提取上下文', () => {
    const ctx = extractErrorContext(code, 3);
    expect(ctx).toEqual({
      before: ['line 1', 'line 2'],
      error_line: 'line 3 error',
      after: ['line 4', 'line 5']
    });
  });

  test('第一行（无 before）', () => {
    const ctx = extractErrorContext(code, 1);
    expect(ctx?.before).toEqual([]);
  });

  test('行号超范围返回 undefined', () => {
    expect(extractErrorContext(code, 99)).toBeUndefined();
  });
});

describe('parseKrokiError', () => {
  test('解析完整错误（有代码）', () => {
    const result = parseKrokiError('Parse error on line 3', 'a\nb\nc');
    expect(result.message).toBe('Parse error on line 3');
    expect(result.line).toBe(3);
    expect(result.context?.error_line).toBe('c');
  });

  test('解析错误（无代码）', () => {
    const result = parseKrokiError('error in line 5');
    expect(result.line).toBe(5);
    expect(result.context).toBeUndefined();
  });
});
