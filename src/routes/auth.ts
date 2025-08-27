import { Hono } from 'hono';
import { validator } from 'hono/validator';
import { AuthService } from '../services/AuthService';
import { authMiddleware } from '../middleware/auth';
import { 
  registerSchema, 
  loginSchema, 
  updateUserSchema, 
  changePasswordSchema 
} from '../utils/validation';
import { AppBindings } from '../types/bindings';

const auth = new Hono<{ Bindings: AppBindings }>();

/**
 * POST /auth/register - 用户注册
 */
auth.post('/register',
  validator('json', (value, c) => {
    const parsed = registerSchema.safeParse(value);
    if (!parsed.success) {
      return c.json({ 
        success: false, 
        message: 'Validation failed', 
        errors: parsed.error.errors 
      }, 400);
    }
    return parsed.data;
  }),
  async (c) => {
    try {
      const { DB } = c.env;
      const authService = new AuthService(DB);
      const userData = c.req.valid('json');

      const result = await authService.register(userData);

      if (!result.success) {
        return c.json({
          success: false,
          message: result.message || 'Registration failed'
        }, 400);
      }

      // 设置JWT cookie
      if (result.token) {
        c.header('Set-Cookie', `auth-token=${result.token}; HttpOnly; Secure; SameSite=Strict; Max-Age=604800; Path=/`);
      }

      return c.json({
        success: true,
        message: 'Registration successful',
        user: result.user,
        token: result.token
      }, 201);
    } catch (error) {
      console.error('Registration error:', error);
      return c.json({
        success: false,
        message: 'Internal server error'
      }, 500);
    }
  }
);

/**
 * POST /auth/login - 用户登录
 */
auth.post('/login',
  validator('json', (value, c) => {
    const parsed = loginSchema.safeParse(value);
    if (!parsed.success) {
      return c.json({ 
        success: false, 
        message: 'Validation failed', 
        errors: parsed.error.errors 
      }, 400);
    }
    return parsed.data;
  }),
  async (c) => {
    try {
      const { DB } = c.env;
      const authService = new AuthService(DB);
      const loginData = c.req.valid('json');

      const result = await authService.login(loginData);

      if (!result.success) {
        return c.json({
          success: false,
          message: result.message || 'Login failed'
        }, 401);
      }

      // 设置JWT cookie
      if (result.token) {
        c.header('Set-Cookie', `auth-token=${result.token}; HttpOnly; Secure; SameSite=Strict; Max-Age=604800; Path=/`);
      }

      return c.json({
        success: true,
        message: 'Login successful',
        user: result.user,
        token: result.token
      });
    } catch (error) {
      console.error('Login error:', error);
      return c.json({
        success: false,
        message: 'Internal server error'
      }, 500);
    }
  }
);

/**
 * POST /auth/logout - 用户登出
 */
auth.post('/logout', async (c) => {
  try {
    // 清除JWT cookie
    c.header('Set-Cookie', `auth-token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/`);

    return c.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    return c.json({
      success: false,
      message: 'Internal server error'
    }, 500);
  }
});

/**
 * GET /auth/me - 获取当前用户信息
 */
auth.get('/me', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    
    return c.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return c.json({
      success: false,
      message: 'Internal server error'
    }, 500);
  }
});

/**
 * PUT /auth/me - 更新当前用户信息
 */
auth.put('/me',
  authMiddleware,
  validator('json', (value, c) => {
    const parsed = updateUserSchema.safeParse(value);
    if (!parsed.success) {
      return c.json({ 
        success: false, 
        message: 'Validation failed', 
        errors: parsed.error.errors 
      }, 400);
    }
    return parsed.data;
  }),
  async (c) => {
    try {
      const { DB } = c.env;
      const authService = new AuthService(DB);
      const user = c.get('user');
      const updates = c.req.valid('json');

      const result = await authService.updateUser(user.id, updates);

      if (!result.success) {
        return c.json({
          success: false,
          message: result.message || 'Update failed'
        }, 400);
      }

      return c.json({
        success: true,
        message: 'User updated successfully',
        user: result.user
      });
    } catch (error) {
      console.error('Update user error:', error);
      return c.json({
        success: false,
        message: 'Internal server error'
      }, 500);
    }
  }
);

/**
 * POST /auth/change-password - 修改密码
 */
auth.post('/change-password',
  authMiddleware,
  validator('json', (value, c) => {
    const parsed = changePasswordSchema.safeParse(value);
    if (!parsed.success) {
      return c.json({ 
        success: false, 
        message: 'Validation failed', 
        errors: parsed.error.errors 
      }, 400);
    }
    return parsed.data;
  }),
  async (c) => {
    try {
      const { DB } = c.env;
      const authService = new AuthService(DB);
      const user = c.get('user');
      const { currentPassword, newPassword } = c.req.valid('json');

      const result = await authService.changePassword(user.id, currentPassword, newPassword);

      if (!result.success) {
        return c.json({
          success: false,
          message: result.message || 'Password change failed'
        }, 400);
      }

      return c.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      return c.json({
        success: false,
        message: 'Internal server error'
      }, 500);
    }
  }
);

/**
 * GET /auth/verify - 验证token有效性
 */
auth.get('/verify', async (c) => {
  try {
    const { DB } = c.env;
    const authService = new AuthService(DB);
    
    // 从header或cookie中获取token
    const authHeader = c.req.header('Authorization');
    const cookieToken = c.req.header('Cookie')?.match(/auth-token=([^;]+)/)?.[1];
    
    let token: string | null = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (cookieToken) {
      token = cookieToken;
    }

    if (!token) {
      return c.json({
        success: false,
        message: 'No token provided'
      }, 401);
    }

    const result = await authService.verifyToken(token);

    if (!result.success) {
      return c.json({
        success: false,
        message: 'Invalid token'
      }, 401);
    }

    return c.json({
      success: true,
      user: result.user,
      payload: result.payload
    });
  } catch (error) {
    console.error('Verify token error:', error);
    return c.json({
      success: false,
      message: 'Internal server error'
    }, 500);
  }
});

export default auth;