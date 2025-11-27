/**
 * 图表语法知识库
 * 直接从 Markdown 文件加载语法数据
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

// 类型定义
interface SyntaxMeta {
  language: string;
  description: string;
  docs_url: string;
  version: string;
}

interface DiagramType {
  description: string;
  use_cases: string[];
  syntax_rules: string;
  examples: string[];
}

interface SyntaxData {
  meta: SyntaxMeta;
  types: Record<string, DiagramType>;
}

// 语法目录路径
const SYNTAX_DIR = join(process.cwd(), 'src/lib/syntax-md');

/**
 * 解析简单 YAML（无需外部依赖）
 */
function parseYaml(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = content.trim().split('\n');

  let currentKey = '';
  let currentArray: string[] = [];
  let inArray = false;

  for (const line of lines) {
    if (line.startsWith('  - ')) {
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
    mermaid: ['mermaid'],
    plantuml: ['plantuml'],
    d2: ['d2'],
    dbml: ['dbml'],
    graphviz: ['dot', 'graphviz'],
    c4plantuml: ['plantuml', 'c4plantuml'],
    nomnoml: ['nomnoml'],
    erd: ['erd'],
    ditaa: ['ditaa'],
    svgbob: ['svgbob'],
    seqdiag: ['seqdiag'],
    nwdiag: ['nwdiag'],
    blockdiag: ['blockdiag'],
    wavedrom: ['json', 'wavedrom'],
  };

  const aliases = langAliases[engine] || [engine];
  const examples: string[] = [];

  for (const lang of aliases) {
    const regex = new RegExp(`\`\`\`${lang}\\n([\\s\\S]*?)\`\`\``, 'g');
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

  const metaPath = join(engineDir, '_meta.yaml');
  if (!existsSync(metaPath)) {
    return null;
  }

  const metaContent = readFileSync(metaPath, 'utf8');
  const meta = parseYaml(metaContent) as unknown as SyntaxMeta;

  const types: Record<string, DiagramType> = {};
  const files = readdirSync(engineDir).filter((f) => f.endsWith('.md'));

  for (const file of files) {
    const filePath = join(engineDir, file);
    const content = readFileSync(filePath, 'utf8');
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

  return { meta, types };
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

  const engines = readdirSync(SYNTAX_DIR).filter((f) => {
    const enginePath = join(SYNTAX_DIR, f);
    return existsSync(join(enginePath, '_meta.yaml'));
  });

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
  const typeData = engineData.types[typeLower];

  if (!typeData) {
    const supportedTypes = Object.keys(engineData.types);
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

  return Object.keys(engineData.types);
}

/**
 * 获取引擎的元数据信息
 */
export function getEngineInfo(engine: string) {
  const engineLower = engine.toLowerCase();
  const engineData = loadAllSyntax()[engineLower];

  if (!engineData) {
    return null;
  }

  return engineData.meta;
}
