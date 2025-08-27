# PyLearn - 系统架构设计文档

## 1. 系统架构概述

### 1.1 架构设计原则
- **前后端分离**：清晰的职责划分，便于开发和维护
- **微服务架构**：模块化设计，易于扩展和部署
- **边缘计算**：基于Cloudflare Workers，全球低延迟
- **安全优先**：多层安全机制，保护用户数据
- **高可用性**：分布式部署，故障自动恢复

### 1.2 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                           用户层                                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐│
│  │   浏览器    │ │   移动端    │ │    平板     │ │   API    ││
│  │   Chrome    │ │   Safari    │ │   iPad      │ │  Client  ││
│  │   Firefox   │ │   Chrome    │ │   Android   │ │          ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘│
└─────────────────────────────────────────────────────────────────┘
                                │
                          HTTPS/WSS
                                │
┌─────────────────────────────────────────────────────────────────┐
│                       Cloudflare网络层                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐│
│  │    CDN      │ │    WAF      │ │    DDoS     │ │   DNS    ││
│  │  全球加速   │ │   安全防护  │ │    防护     │ │  域名解析││
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘│
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                        前端应用层                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Cloudflare Pages                      │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐│   │
│  │  │ Monaco   │ │ Pyodide  │ │   UI     │ │   Auth     ││   │
│  │  │ Editor   │ │ Runtime  │ │Framework │ │   Client   ││   │
│  │  └──────────┘ └──────────┘ └──────────┘ └────────────┘│   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                            API调用
                                │
┌─────────────────────────────────────────────────────────────────┐
│                      后端服务层                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 Cloudflare Workers                      │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐│   │
│  │  │   Auth   │ │ Project  │ │   File   │ │    AI      ││   │
│  │  │ Service  │ │ Service  │ │ Service  │ │  Service   ││   │
│  │  └──────────┘ └──────────┘ └──────────┘ └────────────┘│   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐│   │
│  │  │   User   │ │   Run    │ │  Share   │ │  Analytics ││   │
│  │  │ Service  │ │ Service  │ │ Service  │ │  Service   ││   │
│  │  └──────────┘ └──────────┘ └──────────┘ └────────────┘│   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                        数据层                                   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐│
│  │Cloudflare D1│ │Cloudflare KV│ │Cloudflare R2│ │  Cache   ││
│  │  关系数据   │ │  键值存储   │ │  对象存储   │ │   缓存   ││
│  │   SQLite    │ │  Session    │ │   Files     │ │  Redis   ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘│
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                       外部服务层                                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐│
│  │  AI APIs    │ │ Email API   │ │ GitHub API  │ │  Others  ││
│  │OpenAI/Claude│ │  SendGrid   │ │    OAuth    │ │   APIs   ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## 2. 前端架构设计

### 2.1 前端技术栈
- **基础技术**：HTML5 + CSS3 + ES2022
- **样式框架**：TailwindCSS 3.x
- **代码编辑器**：Monaco Editor 0.45+
- **Python运行时**：Pyodide 0.24+
- **构建工具**：Vite 5.x
- **类型检查**：TypeScript 5.x

### 2.2 前端模块架构

```
src/frontend/
├── components/           # UI组件
│   ├── Editor/          # 代码编辑器组件
│   ├── Terminal/        # 终端组件  
│   ├── FileTree/        # 文件树组件
│   ├── AIAssistant/     # AI助手组件
│   └── Common/          # 通用组件
├── services/            # 前端服务层
│   ├── api.js          # API调用封装
│   ├── auth.js         # 认证服务
│   ├── pyodide.js      # Python运行时
│   └── storage.js      # 本地存储
├── utils/              # 工具函数
│   ├── constants.js    # 常量定义
│   ├── helpers.js      # 辅助函数
│   └── validators.js   # 验证函数
└── styles/             # 样式文件
    ├── components.css  # 组件样式
    └── themes.css      # 主题样式
```

### 2.3 状态管理
```javascript
// 使用原生JavaScript进行状态管理
class AppState {
  constructor() {
    this.user = null;
    this.currentProject = null;
    this.currentFile = null;
    this.theme = 'light';
    this.settings = {};
  }
  
  setState(key, value) {
    this[key] = value;
    this.notifyObservers(key, value);
  }
  
  // 观察者模式实现状态变化通知
  subscribe(key, callback) { /* ... */ }
}
```

## 3. 后端架构设计

### 3.1 后端技术栈
- **运行时**：Cloudflare Workers
- **Web框架**：Hono 4.x
- **开发语言**：TypeScript 5.x
- **ORM/查询**：原生SQL + D1 API
- **认证方案**：JWT + bcrypt
- **API设计**：RESTful API

### 3.2 服务层架构

```
src/
├── index.tsx           # 应用入口
├── routes/             # 路由层
│   ├── auth.ts        # 认证路由
│   ├── users.ts       # 用户管理
│   ├── projects.ts    # 项目管理
│   ├── files.ts       # 文件管理
│   ├── ai.ts          # AI服务
│   └── analytics.ts   # 数据分析
├── services/           # 业务逻辑层
│   ├── AuthService.ts # 认证服务
│   ├── UserService.ts # 用户服务
│   ├── ProjectService.ts # 项目服务
│   ├── FileService.ts # 文件服务
│   └── AIService.ts   # AI服务
├── middleware/         # 中间件
│   ├── auth.ts        # 认证中间件
│   ├── cors.ts        # 跨域中间件
│   ├── logger.ts      # 日志中间件
│   └── rateLimit.ts   # 限流中间件
├── utils/              # 工具函数
│   ├── crypto.ts      # 加密工具
│   ├── validation.ts  # 数据验证
│   └── response.ts    # 响应格式
└── types/              # 类型定义
    ├── auth.ts        # 认证类型
    ├── user.ts        # 用户类型
    └── project.ts     # 项目类型
```

### 3.3 API设计模式

```typescript
// 统一响应格式
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: number;
}

// 错误处理中间件
const errorHandler = async (c: Context, next: Function) => {
  try {
    await next();
  } catch (error) {
    return c.json({
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || '服务器内部错误'
      },
      timestamp: Date.now()
    }, 500);
  }
};
```

## 4. 数据架构设计

### 4.1 数据存储策略

#### 4.1.1 Cloudflare D1 (关系型数据)
- 用户信息和认证数据
- 项目元数据和配置
- 文件元数据和关系
- 运行历史和统计数据

#### 4.1.2 Cloudflare KV (键值存储)
- 用户会话和Token
- 缓存热点数据
- 临时数据存储
- 配置信息

#### 4.1.3 Cloudflare R2 (对象存储)
- 用户头像和资源文件
- 项目文件内容
- 生成的图表和报告
- 备份文件

### 4.2 核心数据模型

```sql
-- 用户表
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nickname TEXT NOT NULL,
  avatar_url TEXT,
  settings JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 项目表  
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  settings JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 文件表
CREATE TABLE files (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  content_hash TEXT,
  size INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

## 5. 安全架构设计

### 5.1 认证与授权
```typescript
// JWT认证流程
class AuthService {
  generateToken(userId: string): string {
    return jwt.sign(
      { userId, exp: Date.now() + 24 * 3600 * 1000 },
      JWT_SECRET
    );
  }
  
  verifyToken(token: string): { userId: string } | null {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch {
      return null;
    }
  }
}

// 权限验证中间件
const requireAuth = async (c: Context, next: Function) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  const decoded = AuthService.verifyToken(token);
  if (!decoded) {
    return c.json({ error: 'Invalid token' }, 401);
  }
  
  c.set('userId', decoded.userId);
  await next();
};
```

### 5.2 数据安全
- **传输加密**：全站HTTPS，TLS 1.3
- **存储加密**：敏感数据AES-256加密
- **密码安全**：bcrypt哈希，salt rounds≥12
- **SQL注入防护**：参数化查询
- **XSS防护**：输入验证和输出编码

### 5.3 代码执行安全
```javascript
// Pyodide沙箱配置
const initPyodide = async () => {
  const pyodide = await loadPyodide({
    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/",
    packages: ["numpy", "pandas", "matplotlib"]
  });
  
  // 禁用危险模块
  pyodide.runPython(`
    import sys
    forbidden_modules = ['os', 'subprocess', 'socket', 'requests']
    for module in forbidden_modules:
        sys.modules[module] = None
  `);
  
  return pyodide;
};
```

## 6. 性能优化架构

### 6.1 前端性能优化
- **代码分割**：按路由和功能分割
- **懒加载**：Monaco Editor和Pyodide按需加载
- **缓存策略**：浏览器缓存+Service Worker
- **资源优化**：图片压缩，CSS/JS压缩

### 6.2 后端性能优化
- **边缘计算**：Cloudflare Workers全球分布
- **数据库优化**：索引优化，查询优化
- **缓存层**：KV存储热点数据
- **CDN加速**：静态资源全球分发

### 6.3 监控体系
```typescript
// 性能监控中间件
const performanceMonitor = async (c: Context, next: Function) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  
  // 记录API响应时间
  console.log(`${c.req.method} ${c.req.path} - ${duration}ms`);
  
  // 慢查询告警
  if (duration > 1000) {
    console.warn(`Slow API detected: ${c.req.path}`);
  }
};
```

## 7. 扩展性设计

### 7.1 微服务架构
```typescript
// 服务接口定义
interface IUserService {
  createUser(data: CreateUserData): Promise<User>;
  getUserById(id: string): Promise<User | null>;
  updateUser(id: string, data: UpdateUserData): Promise<User>;
}

// 服务实现
class UserService implements IUserService {
  constructor(private db: D1Database) {}
  
  async createUser(data: CreateUserData): Promise<User> {
    // 实现用户创建逻辑
  }
}
```

### 7.2 插件系统设计
```typescript
// 插件接口
interface IPlugin {
  name: string;
  version: string;
  install(app: Hono): void;
  uninstall(): void;
}

// AI插件实现
class OpenAIPlugin implements IPlugin {
  name = 'openai-assistant';
  version = '1.0.0';
  
  install(app: Hono) {
    app.post('/api/ai/chat', this.handleChat);
  }
  
  private async handleChat(c: Context) {
    // OpenAI API调用逻辑
  }
}
```

## 8. 部署架构

### 8.1 Cloudflare部署架构
```yaml
# wrangler.jsonc
{
  "name": "pylearn",
  "compatibility_date": "2024-01-01",
  "main": "src/index.tsx",
  "d1_databases": [{
    "binding": "DB",
    "database_name": "pylearn-production",
    "database_id": "your-d1-id"
  }],
  "kv_namespaces": [{
    "binding": "KV",
    "id": "your-kv-id"
  }],
  "r2_buckets": [{
    "binding": "R2", 
    "bucket_name": "pylearn-storage"
  }]
}
```

### 8.2 CI/CD流程
```yaml
# .github/workflows/deploy.yml
name: Deploy PyLearn
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
      - name: Build
        run: npm run build
      - name: Deploy to Cloudflare
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

## 9. 监控与运维架构

### 9.1 日志系统
```typescript
// 结构化日志
interface LogEntry {
  level: 'info' | 'warn' | 'error';
  message: string;
  userId?: string;
  requestId: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

class Logger {
  static log(entry: LogEntry) {
    console.log(JSON.stringify(entry));
  }
}
```

### 9.2 错误监控
```typescript
// 全局错误处理
app.onError((error, c) => {
  Logger.log({
    level: 'error',
    message: error.message,
    requestId: c.get('requestId'),
    timestamp: Date.now(),
    metadata: {
      stack: error.stack,
      url: c.req.url,
      method: c.req.method
    }
  });
  
  return c.json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' }
  }, 500);
});
```

## 10. 技术决策说明

### 10.1 为什么选择Cloudflare Workers？
- **边缘计算**：全球200+数据中心，低延迟
- **自动扩缩容**：按需扩容，无需服务器管理
- **成本效益**：按请求计费，小规模应用成本低
- **生态完整**：D1/KV/R2提供完整存储方案

### 10.2 为什么选择Pyodide？
- **浏览器兼容**：无需服务器端Python环境
- **安全隔离**：天然的沙箱环境
- **性能可接受**：对于学习场景足够
- **库支持丰富**：支持numpy、pandas等常用库

### 10.3 为什么选择Hono框架？
- **轻量级**：适合边缘环境，启动快
- **TypeScript原生支持**：类型安全
- **中间件生态**：丰富的中间件支持
- **Cloudflare优化**：专门为Cloudflare Workers优化

---

*文档版本：1.0*  
*创建日期：2024-01-27*  
*作者：PyLearn架构团队*