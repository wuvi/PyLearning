// 通用类型定义

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
  timestamp: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
}

export interface CloudflareBindings {
  DB: D1Database;
  KV_SESSIONS: KVNamespace;
  KV_CACHE: KVNamespace;
  R2_STORAGE: R2Bucket;
  ENVIRONMENT: string;
}

export interface RequestContext {
  userId?: string;
  user?: import('./auth').User;
  requestId: string;
  startTime: number;
}

export const ErrorCodes = {
  // 认证错误
  AUTH_001: 'AUTH_001', // 用户未登录
  AUTH_002: 'AUTH_002', // Token已过期
  AUTH_003: 'AUTH_003', // 无权限访问
  AUTH_004: 'AUTH_004', // 用户名或密码错误
  
  // 验证错误
  VALID_001: 'VALID_001', // 参数验证失败
  VALID_002: 'VALID_002', // 必填参数缺失
  
  // 资源错误
  RESOURCE_001: 'RESOURCE_001', // 资源不存在
  RESOURCE_002: 'RESOURCE_002', // 资源已存在
  
  // 配额错误
  QUOTA_001: 'QUOTA_001', // 配额已用完
  
  // 服务器错误
  SERVER_001: 'SERVER_001', // 服务器内部错误
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];