// 认证相关类型定义

export interface User {
  id: string;
  email: string;
  nickname: string;
  avatarUrl?: string;
  bio?: string;
  status: 'active' | 'inactive' | 'banned';
  emailVerified: boolean;
  settings?: UserSettings;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface UserSettings {
  theme: 'light' | 'dark';
  language: 'zh-CN' | 'en-US';
  editorFontSize: number;
  autoSave: boolean;
  notifications: {
    email: boolean;
    browser: boolean;
  };
}

export interface RegisterRequest {
  email: string;
  password: string;
  nickname: string;
  captcha?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export interface JWTPayload {
  userId: string;
  email: string;
  exp: number;
  iat: number;
}

export interface AuthContext {
  user: User | null;
  isAuthenticated: boolean;
}

export interface SessionData {
  userId: string;
  email: string;
  nickname: string;
  createdAt: number;
  expiresAt: number;
  lastActivity: number;
  permissions: string[];
}