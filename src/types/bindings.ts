/**
 * Cloudflare Workers绑定类型定义
 * 
 * 这些类型定义了可以在Workers环境中访问的资源
 * 包括D1数据库、KV存储、R2存储等Cloudflare服务
 */

export interface AppBindings {
  // D1 数据库 - 用于存储结构化数据
  DB: D1Database;
  
  // KV 存储 - 用于缓存和会话管理
  KV?: KVNamespace;
  
  // R2 对象存储 - 用于文件存储
  R2?: R2Bucket;
  
  // 环境变量
  ENVIRONMENT?: string;
  JWT_SECRET?: string;
  
  // API密钥 (用于第三方服务)
  OPENAI_API_KEY?: string;
  GITHUB_API_KEY?: string;
  
  // 其他配置
  FRONTEND_URL?: string;
  API_BASE_URL?: string;
}