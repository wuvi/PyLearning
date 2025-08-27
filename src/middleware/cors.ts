import type { Context, Next } from 'hono';
import { cors } from 'hono/cors';

// CORS配置
export const corsMiddleware = cors({
  origin: (origin) => {
    // 开发环境允许所有域名
    if (process.env.NODE_ENV === 'development') {
      return origin || '*';
    }
    
    // 生产环境只允许指定域名
    const allowedOrigins = [
      'https://pylearn.pages.dev',
      'https://pylearn.dev',
      'https://www.pylearn.dev',
    ];
    
    if (!origin) return '*'; // 允许非浏览器请求
    
    return allowedOrigins.includes(origin) ? origin : false;
  },
  
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: [
    'Content-Type',
    'Authorization', 
    'X-Requested-With',
    'X-Request-ID',
    'Accept',
  ],
  exposeHeaders: [
    'X-Request-ID',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
  ],
  credentials: true,
  maxAge: 86400, // 24小时
});

// 自定义CORS中间件（更精细控制）
export async function customCorsMiddleware(c: Context, next: Next) {
  // 预检请求处理
  if (c.req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': getOrigin(c),
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Request-ID',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
      },
    });
  }
  
  await next();
  
  // 添加CORS响应头
  c.res.headers.set('Access-Control-Allow-Origin', getOrigin(c));
  c.res.headers.set('Access-Control-Allow-Credentials', 'true');
}

function getOrigin(c: Context): string {
  const origin = c.req.header('Origin');
  
  if (process.env.NODE_ENV === 'development') {
    return origin || '*';
  }
  
  const allowedOrigins = [
    'https://pylearn.pages.dev',
    'https://pylearn.dev', 
    'https://www.pylearn.dev',
  ];
  
  return origin && allowedOrigins.includes(origin) ? origin : 'https://pylearn.pages.dev';
}