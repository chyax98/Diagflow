/**
 * 图表语法知识库
 * 直接从 Markdown 文件加载语法数据
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

// 类型定义
interface DiagramType {
  description: string;
  use_cases: string[];
  syntax_rules: string;
  examples: string[];
}

// SyntaxData 只包含 types，不再需要 meta
type SyntaxData = Record<string, DiagramType>;

// 语法目录路径
const SYNTAX_DIR = join(process.cwd(), "src/lib/syntax-md");

/**
 * 解析简单 YAML（无需外部依赖）
 */
function parseYaml(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = content.trim().split("\n");

  let currentKey = "";
  let currentArray: string[] = [];
  let inArray = false;

  for (const line of lines) {
    if (line.startsWith("  - ")) {
      currentArray.push(line.slice(4).trim());
      continue;
    }

    if (inArray && currentArray.length > 0) {
      result[currentKey] = currentArray;
      currentArray = [];
      inArray = false;
    }

    const match = line.match(/^(\w+):\s*(.*)$/);
    if (match) {
      const [, key, value] = match;
      if (value) {
        result[key] = value;
      } else {
        currentKey = key;
        inArray = true;
      }
    }
  }

  if (inArray && currentArray.length > 0) {
    result[currentKey] = currentArray;
  }

  return result;
}

/**
 * 解析 Markdown frontmatter
 */
function parseFrontmatter(content: string): {
  data: Record<string, unknown>;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { data: {}, body: content };
  }

  const [, frontmatter, body] = match;
  return {
    data: parseYaml(frontmatter),
    body: body.trim(),
  };
}

/**
 * 从 Markdown 中提取代码块作为示例
 */
function extractExamples(markdown: string, engine: string): string[] {
  const langAliases: Record<string, string[]> = {
    mermaid: ["mermaid"],
    plantuml: ["plantuml"],
    d2: ["d2"],
    dbml: ["dbml"],
    graphviz: ["dot", "graphviz"],
    c4plantuml: ["plantuml", "c4plantuml"],
    nomnoml: ["nomnoml"],
    erd: ["erd"],
    ditaa: ["ditaa"],
    svgbob: ["svgbob"],
    seqdiag: ["seqdiag"],
    nwdiag: ["nwdiag"],
    blockdiag: ["blockdiag"],
    wavedrom: ["json", "wavedrom"],
  };

  const aliases = langAliases[engine] || [engine];
  const examples: string[] = [];

  for (const lang of aliases) {
    const regex = new RegExp(`\`\`\`${lang}\\n([\\s\\S]*?)\`\`\``, "g");
    let match;
    while ((match = regex.exec(markdown)) !== null) {
      examples.push(match[1].trim());
    }
  }

  return examples;
}

/**
 * 提取语法规则（移除示例部分）
 */
function extractSyntaxRules(markdown: string): string {
  const exampleIndex = markdown.search(/^## 示例/m);
  return exampleIndex > 0 ? markdown.slice(0, exampleIndex).trim() : markdown;
}

/**
 * 加载单个引擎的语法数据
 */
function loadEngine(engine: string): SyntaxData | null {
  const engineDir = join(SYNTAX_DIR, engine);

  if (!existsSync(engineDir)) {
    return null;
  }

  // 检查是否有 .md 文件（排除 CLAUDE.md 等非语法文件）
  const files = readdirSync(engineDir).filter(
    (f) => f.endsWith(".md") && !f.startsWith("_") && f !== "CLAUDE.md"
  );

  if (files.length === 0) {
    return null;
  }

  const types: SyntaxData = {};

  for (const file of files) {
    const filePath = join(engineDir, file);
    const content = readFileSync(filePath, "utf8");
    const { data, body } = parseFrontmatter(content);

    const typeName = data.type as string;
    if (!typeName) continue;

    types[typeName] = {
      description: data.description as string,
      use_cases: (data.use_cases as string[]) || [],
      syntax_rules: extractSyntaxRules(body),
      examples: extractExamples(body, engine),
    };
  }

  return Object.keys(types).length > 0 ? types : null;
}

/**
 * 加载所有语法数据（带缓存）
 */
let syntaxCache: Record<string, SyntaxData> | null = null;

function loadAllSyntax(): Record<string, SyntaxData> {
  if (syntaxCache) {
    return syntaxCache;
  }

  const result: Record<string, SyntaxData> = {};

  if (!existsSync(SYNTAX_DIR)) {
    console.warn(`语法目录不存在: ${SYNTAX_DIR}`);
    return result;
  }

  // 扫描所有子目录，检查是否包含 .md 文件
  const entries = readdirSync(SYNTAX_DIR, { withFileTypes: true });
  const engines = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name);

  for (const engine of engines) {
    const data = loadEngine(engine);
    if (data) {
      result[engine] = data;
    }
  }

  syntaxCache = result;
  return result;
}

// 导出语法数据（懒加载）
export const DIAGRAM_SYNTAX = new Proxy({} as Record<string, SyntaxData>, {
  get(_, prop: string) {
    return loadAllSyntax()[prop];
  },
  ownKeys() {
    return Object.keys(loadAllSyntax());
  },
  getOwnPropertyDescriptor(_, prop: string) {
    const data = loadAllSyntax();
    if (prop in data) {
      return { enumerable: true, configurable: true, value: data[prop] };
    }
    return undefined;
  },
});

/**
 * 获取指定引擎和图表类型的语法信息
 */
export function getDiagramSyntax(engine: string, diagramType: string) {
  const engineLower = engine.toLowerCase();
  const syntax = loadAllSyntax();
  const engineData = syntax[engineLower];

  if (!engineData) {
    const supported = Object.keys(syntax);
    return {
      error: `不支持的引擎: ${engine}`,
      supported_engines: supported,
    };
  }

  const typeLower = diagramType.toLowerCase();
  const typeData = engineData[typeLower];

  if (!typeData) {
    const supportedTypes = Object.keys(engineData);
    return {
      error: `引擎 ${engine} 不支持图表类型: ${diagramType}`,
      supported_types: supportedTypes,
    };
  }

  return {
    success: true,
    engine: engineLower,
    diagram_type: typeLower,
    description: typeData.description,
    use_cases: typeData.use_cases,
    syntax_rules: typeData.syntax_rules,
    examples: typeData.examples,
  };
}

/**
 * 获取所有支持的引擎列表
 */
export function listSupportedEngines(): string[] {
  return Object.keys(loadAllSyntax());
}

/**
 * 获取指定引擎支持的图表类型列表
 */
export function listDiagramTypes(engine: string): string[] {
  const engineLower = engine.toLowerCase();
  const engineData = loadAllSyntax()[engineLower];

  if (!engineData) {
    return [];
  }

  return Object.keys(engineData);
}

/**
 * 生成引擎选择策略文本（用于 SYSTEM_PROMPT）
 * 简洁的 engine/type 映射表
 */
export function generateEngineSelectionText(): string {
  const syntax = loadAllSyntax();
  const lines: string[] = [];

  lines.push("| engine | type | 说明 | 典型场景 |");
  lines.push("|--------|------|------|----------|");

  for (const [engine, types] of Object.entries(syntax)) {
    for (const [type, info] of Object.entries(types)) {
      const scenes = info.use_cases.slice(0, 2).join("、");
      lines.push(`| ${engine} | ${type} | ${info.description} | ${scenes} |`);
    }
  }

  return lines.join("\n");
}
