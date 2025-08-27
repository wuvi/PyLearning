import type { Context, Next } from 'hono';
import type { CloudflareBindings, RequestContext } from '../types/common';
import type { User } from '../types/auth';
import { verifyToken } from '../utils/crypto';
import { unauthorizedResponse } from '../utils/response';

// 认证中间件 - 验证JWT Token
export async function authMiddleware(c: Context<{ Bindings: CloudflareBindings }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorizedResponse(c);
  }
  
  const token = authHeader.substring(7); // 移除 "Bearer " 前缀
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return unauthorizedResponse(c);
  }
  
  try {
    // 从数据库获取用户信息
    const user = await getUserById(c.env.DB, decoded.userId);
    
    if (!user) {
      return unauthorizedResponse(c);
    }
    
    if (user.status !== 'active') {
      return c.json({ 
        success: false, 
        error: { code: 'AUTH_003', message: '账户已被禁用' } 
      }, 403);
    }
    
    // 将用户信息存储在上下文中
    c.set('userId', user.id);
    c.set('user', user);
    
    await next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return c.json({ 
      success: false, 
      error: { code: 'SERVER_001', message: '认证服务异常' } 
    }, 500);
  }
}

// 可选认证中间件 - 如果有Token则验证，没有则跳过
export async function optionalAuthMiddleware(c: Context<{ Bindings: CloudflareBindings }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (decoded) {
      try {
        const user = await getUserById(c.env.DB, decoded.userId);
        if (user && user.status === 'active') {
          c.set('userId', user.id);
          c.set('user', user);
        }
      } catch (error) {
        console.error('Optional auth error:', error);
      }
    }
  }
  
  await next();
}

// 从数据库获取用户信息
async function getUserById(db: D1Database, userId: string): Promise<User | null> {
  try {
    const result = await db.prepare(`
      SELECT id, email, nickname, avatar_url, bio, status, 
             email_verified, settings, created_at, updated_at, last_login_at
      FROM users 
      WHERE id = ? AND status != 'deleted'
    `).bind(userId).first();
    
    if (!result) {
      return null;
    }
    
    return {
      id: result.id as string,
      email: result.email as string,
      nickname: result.nickname as string,
      avatarUrl: result.avatar_url as string || undefined,
      bio: result.bio as string || undefined,
      status: result.status as User['status'],
      emailVerified: Boolean(result.email_verified),
      settings: result.settings ? JSON.parse(result.settings as string) : undefined,
      createdAt: result.created_at as string,
      updatedAt: result.updated_at as string,
      lastLoginAt: result.last_login_at as string || undefined,
    };
  } catch (error) {
    console.error('Failed to get user by id:', error);
    return null;
  }
}