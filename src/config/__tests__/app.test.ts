import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAppConfig, getAIConfig } from '../app';

describe('APP_CONFIG', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getAppConfig', () => {
    it('提供默认配置值', () => {
      const config = getAppConfig();
      expect(config.timing.DEBOUNCE_MS).toBe(500);
      expect(config.timing.REQUEST_TIMEOUT).toBe(60000);
      expect(config.timing.AUTO_SAVE_INTERVAL).toBe(30000);
      expect(config.ai.MAX_DURATION_SEC).toBe(120);
      expect(config.ai.MAX_STEPS).toBe(15);
      expect(config.ai.MAX_RETRIES).toBe(3);
    });

    it('环境变量覆盖默认值', () => {
      process.env.NEXT_PUBLIC_DEBOUNCE_MS = '300';
      process.env.NEXT_PUBLIC_REQUEST_TIMEOUT = '90000';

      const config = getAppConfig();
      expect(config.timing.DEBOUNCE_MS).toBe(300);
      expect(config.timing.REQUEST_TIMEOUT).toBe(90000);
    });

    it('无效环境变量使用默认值', () => {
      process.env.NEXT_PUBLIC_DEBOUNCE_MS = 'invalid';

      const config = getAppConfig();
      expect(config.timing.DEBOUNCE_MS).toBe(500);
    });
  });

  describe('getAIConfig', () => {
    it('AI 配置验证：缺少所有 API Key 抛错', () => {
      delete process.env.DIAGFLOW_OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;
      delete process.env.DIAGFLOW_ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      expect(() => getAIConfig()).toThrow('必须配置至少一个 AI Provider 的 API Key');
    });

    it('AI 配置验证：有 OpenAI Key 通过', () => {
      process.env.OPENAI_API_KEY = 'sk-test-openai';
      delete process.env.ANTHROPIC_API_KEY;

      const config = getAIConfig();
      expect(config.openai.apiKey).toBe('sk-test-openai');
      expect(config.anthropic.apiKey).toBe('');
    });

    it('AI 配置验证：有 Anthropic Key 通过', () => {
      delete process.env.OPENAI_API_KEY;
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';

      const config = getAIConfig();
      expect(config.anthropic.apiKey).toBe('sk-ant-test');
      expect(config.openai.apiKey).toBe('');
    });

    it('DIAGFLOW_ 前缀优先级高于普通环境变量', () => {
      process.env.OPENAI_API_KEY = 'sk-normal';
      process.env.DIAGFLOW_OPENAI_API_KEY = 'sk-diagflow';

      const config = getAIConfig();
      expect(config.openai.apiKey).toBe('sk-diagflow');
    });

    it('使用默认 OpenAI 配置', () => {
      process.env.OPENAI_API_KEY = 'sk-test';

      const config = getAIConfig();
      expect(config.openai.baseURL).toBe('https://api.openai.com/v1');
      expect(config.openai.model).toBe('gpt-4');
    });

    it('环境变量覆盖 OpenAI 配置', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      process.env.DIAGFLOW_OPENAI_BASE_URL = 'https://api.custom.com/v1';
      process.env.DIAGFLOW_OPENAI_MODEL = 'gpt-4-turbo';

      const config = getAIConfig();
      expect(config.openai.baseURL).toBe('https://api.custom.com/v1');
      expect(config.openai.model).toBe('gpt-4-turbo');
    });
  });
});
