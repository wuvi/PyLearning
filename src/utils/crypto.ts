import { nanoid } from 'nanoid';
import type { JWTPayload } from '../types/auth';

// JWT密钥 - 生产环境应该从环境变量获取
const JWT_SECRET = 'pylearn-jwt-secret-2024-change-in-production';

// Web Crypto API工具函数
async function importJWTKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyData = enc.encode(JWT_SECRET);
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

// ID生成器
export function generateUserId(): string {
  return `usr_${nanoid(10)}`;
}

export function generateProjectId(): string {
  return `proj_${nanoid(10)}`;
}

export function generateFileId(): string {
  return `file_${nanoid(10)}`;
}

export function generateRunId(): string {
  return `run_${nanoid(10)}`;
}

export function generateConversationId(): string {
  return `conv_${nanoid(10)}`;
}

export function generateMessageId(): string {
  return `msg_${nanoid(10)}`;
}

export function generateShareCode(): string {
  return nanoid(8);
}

export function generateRequestId(): string {
  return nanoid(12);
}

// 密码哈希 - 使用Web Crypto API的简化版本
export async function hashPassword(password: string): Promise<string> {
  // 生成盐值
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const enc = new TextEncoder();
  const keyMaterial = enc.encode(password);
  
  // 使用PBKDF2哈希
  const key = await crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    key,
    256
  );
  
  // 组合盐值和哈希
  const hashArray = new Uint8Array(hashBuffer);
  const combined = new Uint8Array(salt.length + hashArray.length);
  combined.set(salt);
  combined.set(hashArray, salt.length);
  
  // 转换为Base64
  return btoa(String.fromCharCode(...combined));
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    // 解码Base64
    const combined = new Uint8Array(
      atob(hash).split('').map(c => c.charCodeAt(0))
    );
    
    // 提取盐值和哈希
    const salt = combined.slice(0, 16);
    const storedHash = combined.slice(16);
    
    const enc = new TextEncoder();
    const keyMaterial = enc.encode(password);
    
    // 使用相同的盐值重新计算哈希
    const key = await crypto.subtle.importKey(
      'raw',
      keyMaterial,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    
    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      key,
      256
    );
    
    const computedHash = new Uint8Array(hashBuffer);
    
    // 比较哈希
    if (computedHash.length !== storedHash.length) {
      return false;
    }
    
    for (let i = 0; i < computedHash.length; i++) {
      if (computedHash[i] !== storedHash[i]) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

// JWT Token管理 - 使用Web Crypto API的简化版本
export async function generateToken(userId: string, email: string, expiresIn: number = 24 * 3600): Promise<string> {
  const payload: JWTPayload = {
    userId: parseInt(userId),
    email,
    exp: Math.floor(Date.now() / 1000) + expiresIn,
    iat: Math.floor(Date.now() / 1000),
  };
  
  // 简化的JWT实现
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  
  const key = await importJWTKey();
  const enc = new TextEncoder();
  const data = enc.encode(`${encodedHeader}.${encodedPayload}`);
  
  const signature = await crypto.subtle.sign('HMAC', key, data);
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)));
  
  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    
    // 验证签名
    const key = await importJWTKey();
    const enc = new TextEncoder();
    const data = enc.encode(`${encodedHeader}.${encodedPayload}`);
    
    const signature = new Uint8Array(
      atob(encodedSignature).split('').map(c => c.charCodeAt(0))
    );
    
    const isValid = await crypto.subtle.verify('HMAC', key, signature, data);
    if (!isValid) {
      return null;
    }
    
    // 解码payload
    const payload = JSON.parse(atob(encodedPayload)) as JWTPayload;
    
    // 检查是否过期
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    
    return payload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export async function generateRefreshToken(userId: string, email: string): Promise<string> {
  // 刷新Token有效期30天
  return await generateToken(userId, email, 30 * 24 * 3600);
}

// 内容哈希
export async function generateContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 随机字符串生成
export function generateRandomString(length: number = 32): string {
  return nanoid(length);
}

// 通用ID生成器（向后兼容）
export function generateId(): string {
  return nanoid(12);
}

// 内容哈希（向后兼容）
export async function hashContent(content: string): Promise<string> {
  return generateContentHash(content);
}

// 验证码生成
export function generateVerificationCode(): string {
  return Math.random().toString().slice(2, 8); // 6位数字
}