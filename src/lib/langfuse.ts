import { Langfuse } from 'langfuse';

// 创建 Langfuse 客户端（仅在配置密钥时初始化）
export const langfuse =
  process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY
    ? new Langfuse({
        publicKey: process.env.LANGFUSE_PUBLIC_KEY,
        secretKey: process.env.LANGFUSE_SECRET_KEY,
        baseUrl: process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com',
      })
    : null;

export function isLangfuseEnabled(): boolean {
  return langfuse !== null;
}
