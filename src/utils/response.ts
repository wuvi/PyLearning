import type { Context } from 'hono';
import type { ApiResponse, ApiError, ErrorCode } from '../types/common';

export function successResponse<T>(
  c: Context,
  data: T,
  message: string = '操作成功',
  statusCode: number = 200
): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
    timestamp: Date.now(),
  };
  return c.json(response, statusCode);
}

export function errorResponse(
  c: Context,
  code: ErrorCode,
  message: string,
  statusCode: number = 400,
  details?: any
): Response {
  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: Date.now(),
  };
  return c.json(response, statusCode);
}

export function validationErrorResponse(
  c: Context,
  errors: any[]
): Response {
  return errorResponse(
    c,
    'VALID_001',
    '参数验证失败',
    400,
    { validationErrors: errors }
  );
}

export function unauthorizedResponse(c: Context): Response {
  return errorResponse(
    c,
    'AUTH_001',
    '用户未登录',
    401
  );
}

export function forbiddenResponse(c: Context): Response {
  return errorResponse(
    c,
    'AUTH_003',
    '无权限访问',
    403
  );
}

export function notFoundResponse(c: Context, resource: string = '资源'): Response {
  return errorResponse(
    c,
    'RESOURCE_001',
    `${resource}不存在`,
    404
  );
}

export function conflictResponse(c: Context, resource: string = '资源'): Response {
  return errorResponse(
    c,
    'RESOURCE_002',
    `${resource}已存在`,
    409
  );
}

export function serverErrorResponse(c: Context, error?: Error): Response {
  console.error('Server error:', error);
  return errorResponse(
    c,
    'SERVER_001',
    '服务器内部错误',
    500,
    process.env.NODE_ENV === 'development' ? error?.stack : undefined
  );
}