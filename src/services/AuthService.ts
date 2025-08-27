import { D1Database } from '@cloudflare/workers-types';
import { hashPassword, verifyPassword, generateToken, verifyToken } from '../utils/crypto';
import { User, LoginRequest, RegisterRequest, JWTPayload } from '../types/auth';

export class AuthService {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  /**
   * 用户注册
   */
  async register(userData: RegisterRequest): Promise<{ success: boolean; user?: User; message?: string; token?: string }> {
    try {
      // 检查用户是否已存在
      const existingUser = await this.getUserByEmail(userData.email);
      if (existingUser) {
        return { success: false, message: 'Email already exists' };
      }

      // 检查用户名是否已存在
      const existingUsername = await this.getUserByUsername(userData.username);
      if (existingUsername) {
        return { success: false, message: 'Username already exists' };
      }

      // 哈希密码
      const hashedPassword = await hashPassword(userData.password);

      // 创建用户
      const result = await this.db.prepare(`
        INSERT INTO users (username, email, password_hash, display_name, avatar_url, bio, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).bind(
        userData.username,
        userData.email,
        hashedPassword,
        userData.displayName || userData.username,
        userData.avatarUrl || null,
        userData.bio || null
      ).run();

      if (!result.success) {
        return { success: false, message: 'Failed to create user' };
      }

      // 获取创建的用户
      const user = await this.getUserById(result.meta.last_row_id as number);
      if (!user) {
        return { success: false, message: 'Failed to retrieve created user' };
      }

      // 生成JWT token
      const token = await generateToken(user.id.toString(), user.email);

      return { success: true, user, token };
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  /**
   * 用户登录
   */
  async login(loginData: LoginRequest): Promise<{ success: boolean; user?: User; message?: string; token?: string }> {
    try {
      // 根据邮箱或用户名查找用户
      const user = await this.getUserByEmailOrUsername(loginData.email || loginData.username || '');
      if (!user) {
        return { success: false, message: 'Invalid credentials' };
      }

      // 验证密码
      const isValidPassword = await verifyPassword(loginData.password, user.passwordHash);
      if (!isValidPassword) {
        return { success: false, message: 'Invalid credentials' };
      }

      // 更新最后登录时间
      await this.updateLastLogin(user.id);

      // 生成JWT token
      const token = await generateToken(user.id.toString(), user.email);

      // 移除敏感信息
      const { passwordHash, ...userWithoutPassword } = user;

      return { success: true, user: userWithoutPassword as User, token };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  /**
   * 验证JWT token
   */
  async verifyToken(token: string): Promise<{ success: boolean; user?: User; payload?: JWTPayload }> {
    try {
      const payload = await verifyToken(token);
      if (!payload) {
        return { success: false };
      }

      const user = await this.getUserById(payload.userId);
      if (!user) {
        return { success: false };
      }

      // 移除敏感信息
      const { passwordHash, ...userWithoutPassword } = user;

      return { success: true, user: userWithoutPassword as User, payload };
    } catch (error) {
      console.error('Token verification error:', error);
      return { success: false };
    }
  }

  /**
   * 更新用户信息
   */
  async updateUser(userId: number, updates: Partial<User>): Promise<{ success: boolean; user?: User; message?: string }> {
    try {
      const allowedFields = ['displayName', 'avatarUrl', 'bio'];
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      Object.entries(updates).forEach(([key, value]) => {
        if (allowedFields.includes(key) && value !== undefined) {
          updateFields.push(`${key.replace(/([A-Z])/g, '_$1').toLowerCase()} = ?`);
          updateValues.push(value);
        }
      });

      if (updateFields.length === 0) {
        return { success: false, message: 'No valid fields to update' };
      }

      updateValues.push(userId);

      await this.db.prepare(`
        UPDATE users 
        SET ${updateFields.join(', ')}, updated_at = datetime('now')
        WHERE id = ?
      `).bind(...updateValues).run();

      const user = await this.getUserById(userId);
      return user ? { success: true, user } : { success: false, message: 'User not found' };
    } catch (error) {
      console.error('Update user error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  /**
   * 更改密码
   */
  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<{ success: boolean; message?: string }> {
    try {
      const user = await this.getUserById(userId, true);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // 验证当前密码
      const isValidPassword = await verifyPassword(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        return { success: false, message: 'Current password is incorrect' };
      }

      // 哈希新密码
      const hashedPassword = await hashPassword(newPassword);

      // 更新密码
      await this.db.prepare(`
        UPDATE users 
        SET password_hash = ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(hashedPassword, userId).run();

      return { success: true };
    } catch (error) {
      console.error('Change password error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  /**
   * 根据ID获取用户
   */
  private async getUserById(id: number, includePassword = false): Promise<(User & { passwordHash: string }) | null> {
    try {
      const result = await this.db.prepare(`
        SELECT id, username, email, password_hash, display_name, avatar_url, bio, 
               is_active, last_login_at, created_at, updated_at
        FROM users 
        WHERE id = ?
      `).bind(id).first();

      if (!result) return null;

      const user = {
        id: result.id as number,
        username: result.username as string,
        email: result.email as string,
        passwordHash: result.password_hash as string,
        displayName: result.display_name as string,
        avatarUrl: result.avatar_url as string || null,
        bio: result.bio as string || null,
        isActive: Boolean(result.is_active),
        lastLoginAt: result.last_login_at as string || null,
        createdAt: result.created_at as string,
        updatedAt: result.updated_at as string
      };

      return includePassword ? user : { ...user, passwordHash: user.passwordHash };
    } catch (error) {
      console.error('Get user by ID error:', error);
      return null;
    }
  }

  /**
   * 根据邮箱获取用户
   */
  private async getUserByEmail(email: string): Promise<(User & { passwordHash: string }) | null> {
    try {
      const result = await this.db.prepare(`
        SELECT id, username, email, password_hash, display_name, avatar_url, bio,
               is_active, last_login_at, created_at, updated_at
        FROM users 
        WHERE email = ?
      `).bind(email).first();

      if (!result) return null;

      return {
        id: result.id as number,
        username: result.username as string,
        email: result.email as string,
        passwordHash: result.password_hash as string,
        displayName: result.display_name as string,
        avatarUrl: result.avatar_url as string || null,
        bio: result.bio as string || null,
        isActive: Boolean(result.is_active),
        lastLoginAt: result.last_login_at as string || null,
        createdAt: result.created_at as string,
        updatedAt: result.updated_at as string
      };
    } catch (error) {
      console.error('Get user by email error:', error);
      return null;
    }
  }

  /**
   * 根据用户名获取用户
   */
  private async getUserByUsername(username: string): Promise<(User & { passwordHash: string }) | null> {
    try {
      const result = await this.db.prepare(`
        SELECT id, username, email, password_hash, display_name, avatar_url, bio,
               is_active, last_login_at, created_at, updated_at
        FROM users 
        WHERE username = ?
      `).bind(username).first();

      if (!result) return null;

      return {
        id: result.id as number,
        username: result.username as string,
        email: result.email as string,
        passwordHash: result.password_hash as string,
        displayName: result.display_name as string,
        avatarUrl: result.avatar_url as string || null,
        bio: result.bio as string || null,
        isActive: Boolean(result.is_active),
        lastLoginAt: result.last_login_at as string || null,
        createdAt: result.created_at as string,
        updatedAt: result.updated_at as string
      };
    } catch (error) {
      console.error('Get user by username error:', error);
      return null;
    }
  }

  /**
   * 根据邮箱或用户名获取用户
   */
  private async getUserByEmailOrUsername(identifier: string): Promise<(User & { passwordHash: string }) | null> {
    try {
      const result = await this.db.prepare(`
        SELECT id, username, email, password_hash, display_name, avatar_url, bio,
               is_active, last_login_at, created_at, updated_at
        FROM users 
        WHERE email = ? OR username = ?
      `).bind(identifier, identifier).first();

      if (!result) return null;

      return {
        id: result.id as number,
        username: result.username as string,
        email: result.email as string,
        passwordHash: result.password_hash as string,
        displayName: result.display_name as string,
        avatarUrl: result.avatar_url as string || null,
        bio: result.bio as string || null,
        isActive: Boolean(result.is_active),
        lastLoginAt: result.last_login_at as string || null,
        createdAt: result.created_at as string,
        updatedAt: result.updated_at as string
      };
    } catch (error) {
      console.error('Get user by email or username error:', error);
      return null;
    }
  }

  /**
   * 更新最后登录时间
   */
  private async updateLastLogin(userId: number): Promise<void> {
    try {
      await this.db.prepare(`
        UPDATE users 
        SET last_login_at = datetime('now')
        WHERE id = ?
      `).bind(userId).run();
    } catch (error) {
      console.error('Update last login error:', error);
    }
  }
}