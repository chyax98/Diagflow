export interface ErrorContext {
  before: string[];
  error_line: string;
  after: string[];
}

export interface DiagramError {
  message: string;
  line?: number;
  column?: number;
  context?: ErrorContext;
}

const LINE_PATTERNS: Array<{ pattern: RegExp; lineGroup: number; columnGroup?: number }> = [
  { pattern: /-:(\d+):(\d+):/, lineGroup: 1, columnGroup: 2 },
  { pattern: /at line (\d+):(\d+)/i, lineGroup: 1, columnGroup: 2 },
  { pattern: /on line (\d+)/i, lineGroup: 1 },
  { pattern: /in line (\d+)/i, lineGroup: 1 },
  { pattern: /line\s+(\d+)/i, lineGroup: 1 },
];

export function extractLineNumber(errorMessage: string): number | undefined {
  for (const { pattern, lineGroup } of LINE_PATTERNS) {
    const match = errorMessage.match(pattern);
    if (match) return parseInt(match[lineGroup], 10);
  }
  return undefined;
}

export function extractErrorContext(code: string, lineNumber: number): ErrorContext | undefined {
  const lines = code.split('\n');
  if (lineNumber < 1 || lineNumber > lines.length) return undefined;

  const idx = lineNumber - 1;
  return {
    before: lines.slice(Math.max(0, idx - 2), idx),
    error_line: lines[idx],
    after: lines.slice(idx + 1, Math.min(lines.length, idx + 3))
  };
}

export function parseKrokiError(errorMessage: string, diagramCode?: string): DiagramError {
  const line = extractLineNumber(errorMessage);
  const context = (line && diagramCode) ? extractErrorContext(diagramCode, line) : undefined;
  return { message: errorMessage, line, context };
}
