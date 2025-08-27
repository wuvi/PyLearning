import type { Context, Next } from 'hono';
import type { CloudflareBindings } from '../types/common';
import { generateRequestId } from '../utils/crypto';

// 日志中间件
export async function loggerMiddleware(c: Context<{ Bindings: CloudflareBindings }>, next: Next) {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  // 设置请求ID
  c.set('requestId', requestId);
  c.set('startTime', startTime);
  
  // 获取请求信息
  const method = c.req.method;
  const url = new URL(c.req.url);
  const path = url.pathname;
  const userAgent = c.req.header('User-Agent') || '';
  const ip = c.req.header('CF-Connecting-IP') || 
             c.req.header('X-Forwarded-For') || 
             c.req.header('X-Real-IP') || 
             'unknown';
  
  // 记录请求开始
  console.log(`[${requestId}] ${method} ${path} - Start`);
  
  try {
    await next();
  } catch (error) {
    // 记录错误
    console.error(`[${requestId}] Error:`, error);
    throw error;
  } finally {
    // 记录请求结束
    const duration = Date.now() - startTime;
    const status = c.res.status;
    const userId = c.get('userId');
    
    console.log(`[${requestId}] ${method} ${path} ${status} - ${duration}ms`);
    
    // 如果响应时间过长，记录警告
    if (duration > 1000) {
      console.warn(`[${requestId}] Slow request: ${duration}ms`);
    }
    
    // 记录到数据库（异步，不阻塞响应）
    if (c.env?.DB) {
      saveRequestLog(c.env.DB, {
        requestId,
        method,
        path,
        status,
        duration,
        userId,
        ip,
        userAgent,
        timestamp: new Date().toISOString(),
      }).catch(error => {
        console.error('Failed to save request log:', error);
      });
    }
    
    // 添加响应头
    c.res.headers.set('X-Request-ID', requestId);
    c.res.headers.set('X-Response-Time', `${duration}ms`);
  }
}

// 保存请求日志到数据库
async function saveRequestLog(db: D1Database, logData: {
  requestId: string;
  method: string;
  path: string;
  status: number;
  duration: number;
  userId?: string;
  ip: string;
  userAgent: string;
  timestamp: string;
}) {
  try {
    await db.prepare(`
      INSERT INTO system_logs (
        request_id, action, resource_type, user_id, 
        ip_address, user_agent, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      logData.requestId,
      `${logData.method} ${logData.path}`,
      'http_request',
      logData.userId || null,
      logData.ip,
      logData.userAgent,
      JSON.stringify({
        method: logData.method,
        path: logData.path,
        status: logData.status,
        duration: logData.duration,
      }),
      logData.timestamp
    ).run();
  } catch (error) {
    console.error('Failed to save request log to database:', error);
  }
}

// 结构化日志记录器
export class Logger {
  private requestId: string;
  private userId?: string;
  
  constructor(c: Context) {
    this.requestId = c.get('requestId') || 'unknown';
    this.userId = c.get('userId');
  }
  
  info(message: string, metadata?: any) {
    this.log('INFO', message, metadata);
  }
  
  warn(message: string, metadata?: any) {
    this.log('WARN', message, metadata);
  }
  
  error(message: string, error?: Error, metadata?: any) {
    this.log('ERROR', message, {
      ...metadata,
      error: error?.message,
      stack: error?.stack,
    });
  }
  
  private log(level: string, message: string, metadata?: any) {
    const logEntry = {
      level,
      message,
      requestId: this.requestId,
      userId: this.userId,
      timestamp: new Date().toISOString(),
      ...metadata,
    };
    
    console.log(JSON.stringify(logEntry));
  }
}