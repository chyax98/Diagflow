import { describe, it, expect } from 'vitest';
import {
  getDiagramSyntax,
  listSupportedEngines,
  listDiagramTypes,
  getEngineInfo,
} from '../syntax';

describe('语法库模块', () => {
  describe('listSupportedEngines', () => {
    it('应该返回所有支持的引擎列表', () => {
      const engines = listSupportedEngines();

      expect(engines).toBeInstanceOf(Array);
      expect(engines.length).toBeGreaterThan(0);
      expect(engines).toContain('mermaid');
      expect(engines).toContain('plantuml');
      expect(engines).toContain('d2');
    });
  });

  describe('listDiagramTypes', () => {
    it('应该返回 mermaid 引擎支持的图表类型', () => {
      const types = listDiagramTypes('mermaid');

      expect(types).toBeInstanceOf(Array);
      expect(types.length).toBeGreaterThan(0);
      expect(types).toContain('flowchart');
    });

    it('应该对引擎名称不区分大小写', () => {
      const types1 = listDiagramTypes('MERMAID');
      const types2 = listDiagramTypes('mermaid');

      expect(types1).toEqual(types2);
    });

    it('应该对不支持的引擎返回空数组', () => {
      const types = listDiagramTypes('invalid-engine');

      expect(types).toEqual([]);
    });
  });

  describe('getEngineInfo', () => {
    it('应该返回引擎的元数据信息', () => {
      const info = getEngineInfo('mermaid');

      expect(info).toBeDefined();
      expect(info).toHaveProperty('language');
      expect(info).toHaveProperty('description');
      expect(info).toHaveProperty('docs_url');
      expect(info).toHaveProperty('version');
    });

    it('应该对引擎名称不区分大小写', () => {
      const info1 = getEngineInfo('MERMAID');
      const info2 = getEngineInfo('mermaid');

      expect(info1).toEqual(info2);
    });

    it('应该对不支持的引擎返回 null', () => {
      const info = getEngineInfo('invalid-engine');

      expect(info).toBeNull();
    });
  });

  describe('getDiagramSyntax', () => {
    it('应该返回正确的语法信息', () => {
      const result = getDiagramSyntax('mermaid', 'flowchart');

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('engine', 'mermaid');
      expect(result).toHaveProperty('diagram_type', 'flowchart');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('use_cases');
      expect(result).toHaveProperty('syntax_rules');
      expect(result).toHaveProperty('examples');

      expect(result.use_cases).toBeInstanceOf(Array);
      expect(result.examples).toBeInstanceOf(Array);
    });

    it('应该对引擎名称不区分大小写', () => {
      const result1 = getDiagramSyntax('MERMAID', 'flowchart');
      const result2 = getDiagramSyntax('mermaid', 'flowchart');

      expect(result1).toEqual(result2);
    });

    it('应该对图表类型不区分大小写', () => {
      const result1 = getDiagramSyntax('mermaid', 'FLOWCHART');
      const result2 = getDiagramSyntax('mermaid', 'flowchart');

      expect(result1).toEqual(result2);
    });

    it('应该对不支持的引擎返回错误信息', () => {
      const result = getDiagramSyntax('invalid-engine', 'flowchart');

      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('supported_engines');
      expect(result.error).toContain('不支持的引擎');
      expect(result.supported_engines).toBeInstanceOf(Array);
    });

    it('应该对不支持的图表类型返回错误信息', () => {
      const result = getDiagramSyntax('mermaid', 'invalid-type');

      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('supported_types');
      expect(result.error).toContain('不支持图表类型');
      expect(result.supported_types).toBeInstanceOf(Array);
    });
  });
});
