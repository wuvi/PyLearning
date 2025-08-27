import { z } from 'zod';

// 通用验证规则
export const emailSchema = z.string()
  .email('请输入有效的邮箱地址')
  .max(255, '邮箱地址太长');

export const passwordSchema = z.string()
  .min(8, '密码至少8位')
  .max(50, '密码不能超过50位')
  .regex(/^(?=.*[a-zA-Z])(?=.*\d)/, '密码必须包含字母和数字');

export const usernameSchema = z.string()
  .min(3, '用户名至少3个字符')
  .max(30, '用户名不能超过30个字符')
  .regex(/^[a-zA-Z0-9_-]+$/, '用户名只能包含英文、数字、下划线和短横线');

export const nicknameSchema = z.string()
  .min(2, '昵称至少2个字符')
  .max(30, '昵称不能超过30个字符')
  .regex(/^[a-zA-Z0-9\u4e00-\u9fa5_-]+$/, '昵称只能包含中英文、数字、下划线和短横线');

// 用户相关验证
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema,
  displayName: nicknameSchema.optional(),
  avatarUrl: z.string().url().optional(),
  bio: z.string().max(500, '个人简介不能超过500字').optional(),
  captcha: z.string().optional(),
});

export const loginSchema = z.object({
  email: emailSchema.optional(),
  username: usernameSchema.optional(),
  password: z.string().min(1, '请输入密码'),
  rememberMe: z.boolean().optional(),
}).refine((data) => data.email || data.username, {
  message: '请提供邮箱或用户名',
  path: ['email'],
});

export const updateUserSchema = z.object({
  displayName: nicknameSchema.optional(),
  bio: z.string().max(500, '个人简介不能超过500字').optional(),
  avatarUrl: z.string().url().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '请输入当前密码'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
});

// 项目相关验证
export const projectNameSchema = z.string()
  .min(1, '项目名称不能为空')
  .max(100, '项目名称不能超过100个字符')
  .regex(/^[^/\\:*?"<>|]+$/, '项目名称不能包含特殊字符');

export const createProjectSchema = z.object({
  name: projectNameSchema,
  description: z.string().max(1000, '项目描述不能超过1000字').optional(),
  language: z.string().default('python'),
  isPublic: z.boolean().default(false),
  template: z.string().optional(),
  tags: z.array(z.string()).max(10, '标签不能超过10个').optional(),
});

export const updateProjectSchema = z.object({
  name: projectNameSchema.optional(),
  description: z.string().max(1000, '项目描述不能超过1000字').optional(),
  isPublic: z.boolean().optional(),
  tags: z.array(z.string()).max(10, '标签不能超过10个').optional(),
});

// 文件相关验证
export const fileNameSchema = z.string()
  .min(1, '文件名不能为空')
  .max(255, '文件名不能超过255个字符')
  .regex(/^[^/\\:*?"<>|]+$/, '文件名不能包含特殊字符');

export const createFileSchema = z.object({
  name: fileNameSchema,
  path: z.string().regex(/^\/.*$/, '路径必须以/开头'),
  content: z.string().max(10 * 1024 * 1024, '文件内容不能超过10MB').optional(),
  parentPath: z.string().optional(),
});

export const updateFileSchema = z.object({
  content: z.string().max(10 * 1024 * 1024, '文件内容不能超过10MB'),
  autoSave: z.boolean().optional(),
});

// 代码执行验证
export const runCodeSchema = z.object({
  projectId: z.string().optional(),
  fileId: z.string().optional(),
  code: z.string().max(1024 * 1024, '代码长度不能超过1MB'),
  stdin: z.string().optional(),
  timeout: z.number().min(1000).max(30000).optional(),
  packages: z.array(z.string()).max(20, '不能超过20个包').optional(),
});

// AI相关验证
export const aiExplainSchema = z.object({
  code: z.string().min(1, '代码不能为空').max(100000, '代码太长'),
  language: z.string().default('python'),
  context: z.string().optional(),
});

export const aiGenerateSchema = z.object({
  prompt: z.string().min(1, '描述不能为空').max(1000, '描述太长'),
  language: z.string().default('python'),
  style: z.string().optional(),
  includeComments: z.boolean().optional(),
  includeTests: z.boolean().optional(),
});

export const aiChatSchema = z.object({
  message: z.string().min(1, '消息不能为空').max(2000, '消息太长'),
  conversationId: z.string().optional(),
  context: z.object({
    projectId: z.string().optional(),
    currentCode: z.string().optional(),
  }).optional(),
});

// 分享相关验证
export const createShareSchema = z.object({
  expiresIn: z.number().min(3600).max(30 * 24 * 3600).optional(), // 1小时到30天
  allowEdit: z.boolean().default(false),
  password: z.string().min(4).max(20).optional(),
  includeFiles: z.boolean().default(true),
});

// 分页参数验证
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
});

// 验证函数
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: z.ZodError;
} {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
}