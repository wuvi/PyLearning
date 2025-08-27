# PyLearn - 数据库设计文档

## 1. 数据库架构概览

### 1.1 存储策略
- **Cloudflare D1**：关系型数据（用户、项目、文件元数据）
- **Cloudflare KV**：键值对存储（会话、缓存、配置）
- **Cloudflare R2**：对象存储（文件内容、媒体资源）

### 1.2 设计原则
- **数据规范化**：避免数据冗余，保持一致性
- **性能优化**：合理使用索引，优化查询性能
- **扩展性**：预留字段支持未来功能扩展
- **安全性**：敏感数据加密，访问控制

## 2. Cloudflare D1 数据库设计

### 2.1 用户表 (users)

```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,                    -- 用户ID: usr_xxxxxxxxxx
    email TEXT UNIQUE NOT NULL,             -- 邮箱地址
    password_hash TEXT NOT NULL,            -- 密码哈希
    nickname TEXT NOT NULL,                 -- 用户昵称
    avatar_url TEXT,                        -- 头像URL
    bio TEXT,                              -- 个人简介
    status TEXT DEFAULT 'active'           -- 账户状态: active, inactive, banned
        CHECK(status IN ('active', 'inactive', 'banned')),
    email_verified BOOLEAN DEFAULT FALSE,   -- 邮箱验证状态
    settings JSON,                          -- 用户设置
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login_at DATETIME                  -- 最后登录时间
);

-- 索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);
```

**字段说明**:
- `settings`: JSON格式存储用户偏好设置
  ```json
  {
    "theme": "dark|light",
    "language": "zh-CN|en-US", 
    "editorFontSize": 14,
    "autoSave": true,
    "notifications": {
      "email": true,
      "browser": true
    }
  }
  ```

### 2.2 项目表 (projects)

```sql
CREATE TABLE projects (
    id TEXT PRIMARY KEY,                    -- 项目ID: proj_xxxxxxxxxx
    user_id TEXT NOT NULL,                  -- 所属用户ID
    name TEXT NOT NULL,                     -- 项目名称
    description TEXT,                       -- 项目描述
    language TEXT DEFAULT 'python',        -- 编程语言
    is_public BOOLEAN DEFAULT FALSE,        -- 是否公开
    is_deleted BOOLEAN DEFAULT FALSE,       -- 软删除标记
    template TEXT,                          -- 使用的模板
    tags JSON,                              -- 项目标签数组
    settings JSON,                          -- 项目设置
    star_count INTEGER DEFAULT 0,           -- 收藏数
    view_count INTEGER DEFAULT 0,           -- 浏览数
    fork_count INTEGER DEFAULT 0,           -- Fork数
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_run_at DATETIME,                   -- 最后运行时间
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_is_public ON projects(is_public);
CREATE INDEX idx_projects_created_at ON projects(created_at);
CREATE INDEX idx_projects_updated_at ON projects(updated_at);
CREATE INDEX idx_projects_name ON projects(name);
```

**字段说明**:
- `tags`: JSON数组格式存储项目标签
  ```json
  ["Python", "基础", "练习", "算法"]
  ```
- `settings`: JSON格式存储项目配置
  ```json
  {
    "pythonVersion": "3.11",
    "allowedPackages": ["numpy", "pandas", "matplotlib"],
    "entryFile": "main.py",
    "autoRun": false
  }
  ```

### 2.3 文件表 (files)

```sql
CREATE TABLE files (
    id TEXT PRIMARY KEY,                    -- 文件ID: file_xxxxxxxxxx
    project_id TEXT NOT NULL,               -- 所属项目ID
    name TEXT NOT NULL,                     -- 文件名
    path TEXT NOT NULL,                     -- 文件路径
    parent_id TEXT,                         -- 父目录ID（用于文件夹结构）
    content_hash TEXT,                      -- 内容哈希值
    size INTEGER DEFAULT 0,                 -- 文件大小（字节）
    mime_type TEXT,                         -- MIME类型
    is_binary BOOLEAN DEFAULT FALSE,        -- 是否为二进制文件
    is_deleted BOOLEAN DEFAULT FALSE,       -- 软删除标记
    version INTEGER DEFAULT 1,              -- 版本号
    encoding TEXT DEFAULT 'utf-8',          -- 文件编码
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES files(id) ON DELETE CASCADE,
    UNIQUE(project_id, path)                -- 同项目下路径唯一
);

-- 索引
CREATE INDEX idx_files_project_id ON files(project_id);
CREATE INDEX idx_files_parent_id ON files(parent_id);
CREATE INDEX idx_files_path ON files(path);
CREATE INDEX idx_files_name ON files(name);
CREATE INDEX idx_files_updated_at ON files(updated_at);
```

### 2.4 文件版本表 (file_versions)

```sql
CREATE TABLE file_versions (
    id TEXT PRIMARY KEY,                    -- 版本ID: ver_xxxxxxxxxx
    file_id TEXT NOT NULL,                  -- 文件ID
    version INTEGER NOT NULL,               -- 版本号
    content_hash TEXT NOT NULL,             -- 内容哈希
    size INTEGER NOT NULL,                  -- 文件大小
    created_by TEXT NOT NULL,               -- 创建者ID
    change_summary TEXT,                    -- 变更摘要
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE(file_id, version)
);

-- 索引
CREATE INDEX idx_file_versions_file_id ON file_versions(file_id);
CREATE INDEX idx_file_versions_created_at ON file_versions(created_at);
```

### 2.5 代码运行历史表 (run_history)

```sql
CREATE TABLE run_history (
    id TEXT PRIMARY KEY,                    -- 运行ID: run_xxxxxxxxxx
    project_id TEXT NOT NULL,               -- 项目ID
    user_id TEXT NOT NULL,                  -- 用户ID
    file_id TEXT,                           -- 执行的文件ID
    code TEXT NOT NULL,                     -- 执行的代码
    stdin TEXT,                             -- 输入数据
    stdout TEXT,                            -- 标准输出
    stderr TEXT,                            -- 错误输出
    exit_code INTEGER,                      -- 退出代码
    execution_time INTEGER,                 -- 执行时间（毫秒）
    memory_usage INTEGER,                   -- 内存使用（字节）
    status TEXT DEFAULT 'pending'           -- 执行状态
        CHECK(status IN ('pending', 'running', 'completed', 'failed', 'timeout')),
    error_message TEXT,                     -- 错误信息
    packages JSON,                          -- 使用的包列表
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (file_id) REFERENCES files(id)
);

-- 索引
CREATE INDEX idx_run_history_project_id ON run_history(project_id);
CREATE INDEX idx_run_history_user_id ON run_history(user_id);
CREATE INDEX idx_run_history_created_at ON run_history(created_at);
CREATE INDEX idx_run_history_status ON run_history(status);
```

### 2.6 AI对话表 (ai_conversations)

```sql
CREATE TABLE ai_conversations (
    id TEXT PRIMARY KEY,                    -- 对话ID: conv_xxxxxxxxxx
    user_id TEXT NOT NULL,                  -- 用户ID
    project_id TEXT,                        -- 关联项目ID（可选）
    title TEXT,                             -- 对话标题
    status TEXT DEFAULT 'active'            -- 对话状态
        CHECK(status IN ('active', 'archived', 'deleted')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

-- 索引
CREATE INDEX idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_project_id ON ai_conversations(project_id);
CREATE INDEX idx_ai_conversations_created_at ON ai_conversations(created_at);
```

### 2.7 AI消息表 (ai_messages)

```sql
CREATE TABLE ai_messages (
    id TEXT PRIMARY KEY,                    -- 消息ID: msg_xxxxxxxxxx
    conversation_id TEXT NOT NULL,          -- 对话ID
    role TEXT NOT NULL                      -- 消息角色
        CHECK(role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,                  -- 消息内容
    message_type TEXT DEFAULT 'chat'        -- 消息类型
        CHECK(message_type IN ('chat', 'explain', 'diagnose', 'generate')),
    metadata JSON,                          -- 附加信息
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_ai_messages_conversation_id ON ai_messages(conversation_id);
CREATE INDEX idx_ai_messages_role ON ai_messages(role);
CREATE INDEX idx_ai_messages_created_at ON ai_messages(created_at);
```

**metadata字段示例**:
```json
{
  "codeSnippet": "def hello():\n    print('hello')",
  "errorType": "SyntaxError",
  "executionTime": 125,
  "suggestions": ["使用try-except处理异常"]
}
```

### 2.8 分享表 (shares)

```sql
CREATE TABLE shares (
    id TEXT PRIMARY KEY,                    -- 分享ID: share_xxxxxxxxxx
    project_id TEXT NOT NULL,               -- 项目ID
    created_by TEXT NOT NULL,               -- 创建者ID
    share_code TEXT UNIQUE NOT NULL,        -- 分享码
    password_hash TEXT,                     -- 访问密码哈希（可选）
    allow_edit BOOLEAN DEFAULT FALSE,       -- 是否允许编辑
    allow_run BOOLEAN DEFAULT TRUE,         -- 是否允许运行
    view_count INTEGER DEFAULT 0,           -- 访问次数
    expires_at DATETIME,                    -- 过期时间
    is_active BOOLEAN DEFAULT TRUE,         -- 是否激活
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 索引
CREATE INDEX idx_shares_share_code ON shares(share_code);
CREATE INDEX idx_shares_project_id ON shares(project_id);
CREATE INDEX idx_shares_expires_at ON shares(expires_at);
CREATE INDEX idx_shares_created_by ON shares(created_by);
```

### 2.9 用户统计表 (user_stats)

```sql
CREATE TABLE user_stats (
    user_id TEXT PRIMARY KEY,               -- 用户ID
    total_projects INTEGER DEFAULT 0,       -- 总项目数
    total_files INTEGER DEFAULT 0,          -- 总文件数
    total_runs INTEGER DEFAULT 0,           -- 总运行次数
    total_runtime INTEGER DEFAULT 0,        -- 总运行时间（秒）
    total_ai_calls INTEGER DEFAULT 0,       -- AI调用次数
    study_time INTEGER DEFAULT 0,           -- 学习时间（秒）
    last_active_at DATETIME,                -- 最后活跃时间
    achievements JSON,                      -- 成就列表
    skill_points INTEGER DEFAULT 0,         -- 技能点数
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_user_stats_last_active_at ON user_stats(last_active_at);
CREATE INDEX idx_user_stats_skill_points ON user_stats(skill_points);
```

**achievements字段示例**:
```json
{
  "badges": [
    {
      "id": "first_run",
      "name": "初次运行",
      "description": "完成第一次代码运行",
      "unlockedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "milestones": [
    {
      "type": "runs",
      "count": 100,
      "achievedAt": "2024-01-15T00:00:00Z"
    }
  ]
}
```

### 2.10 系统日志表 (system_logs)

```sql
CREATE TABLE system_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,   -- 日志ID（自增）
    user_id TEXT,                           -- 用户ID（可选）
    action TEXT NOT NULL,                   -- 操作类型
    resource_type TEXT,                     -- 资源类型
    resource_id TEXT,                       -- 资源ID
    ip_address TEXT,                        -- IP地址
    user_agent TEXT,                        -- 用户代理
    request_id TEXT,                        -- 请求ID
    metadata JSON,                          -- 附加信息
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 索引
CREATE INDEX idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX idx_system_logs_action ON system_logs(action);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at);
CREATE INDEX idx_system_logs_resource_type ON system_logs(resource_type);
```

## 3. Cloudflare KV 存储设计

### 3.1 用户会话存储
**Namespace**: `sessions`

```typescript
interface SessionData {
  userId: string;
  email: string;
  nickname: string;
  createdAt: number;
  expiresAt: number;
  lastActivity: number;
  permissions: string[];
}

// Key格式: session:{sessionId}
// TTL: 24小时（或用户设置的记住我时间）
```

### 3.2 API限流存储
**Namespace**: `rate_limits`

```typescript
interface RateLimitData {
  count: number;
  windowStart: number;
  windowDuration: number;
}

// Key格式: rate:{userId}:{endpoint}:{window}
// TTL: 根据限流窗口时间设置
```

### 3.3 缓存存储
**Namespace**: `cache`

```typescript
// 项目列表缓存
// Key: cache:projects:{userId}
// Value: Project[]
// TTL: 300秒

// 用户信息缓存  
// Key: cache:user:{userId}
// Value: User
// TTL: 600秒

// 热门项目缓存
// Key: cache:trending:projects
// Value: Project[]
// TTL: 3600秒
```

### 3.4 临时数据存储
**Namespace**: `temp`

```typescript
// 邮箱验证码
interface EmailVerification {
  code: string;
  email: string;
  attempts: number;
  createdAt: number;
}
// Key: temp:verify:{email}
// TTL: 600秒

// 密码重置Token
interface PasswordReset {
  userId: string;
  token: string;
  createdAt: number;
}
// Key: temp:reset:{token}
// TTL: 1800秒
```

### 3.5 配置存储
**Namespace**: `config`

```typescript
// 系统配置
interface SystemConfig {
  maintenance: boolean;
  aiApiEnabled: boolean;
  maxFileSize: number;
  allowedExtensions: string[];
}
// Key: config:system

// 功能开关
interface FeatureFlags {
  aiAssistant: boolean;
  collaboration: boolean;
  publicSharing: boolean;
}
// Key: config:features
```

## 4. Cloudflare R2 存储设计

### 4.1 文件内容存储
```typescript
// 文件存储路径规则
interface FileStorage {
  // 项目文件内容
  projectFiles: `projects/${projectId}/files/${fileId}`;
  
  // 用户头像
  userAvatars: `users/${userId}/avatar/${filename}`;
  
  // 项目资源文件
  projectAssets: `projects/${projectId}/assets/${filename}`;
  
  // 系统资源
  systemAssets: `system/${category}/${filename}`;
  
  // 临时文件
  tempFiles: `temp/${userId}/${timestamp}/${filename}`;
}
```

### 4.2 存储桶策略
```typescript
// 主要存储桶
const buckets = {
  // 项目相关文件
  'pylearn-projects': {
    purpose: '项目文件和代码',
    retention: '永久',
    publicRead: false
  },
  
  // 用户资源文件
  'pylearn-users': {
    purpose: '用户上传的文件',
    retention: '永久', 
    publicRead: true // 头像等公开资源
  },
  
  // 临时文件
  'pylearn-temp': {
    purpose: '临时文件和缓存',
    retention: '7天',
    publicRead: false
  },
  
  // 系统备份
  'pylearn-backups': {
    purpose: '数据备份',
    retention: '30天',
    publicRead: false
  }
};
```

## 5. 数据迁移脚本

### 5.1 初始化脚本
```sql
-- migrations/001_init_schema.sql
-- 创建所有基础表
-- ... (上述所有CREATE TABLE语句)

-- 插入默认数据
INSERT INTO users (id, email, password_hash, nickname, status) 
VALUES ('usr_admin', 'admin@pylearn.dev', '$2a$12$...', 'System Admin', 'active');

-- 创建系统配置
-- 这部分数据会存储在KV中
```

### 5.2 迁移管理
```typescript
interface Migration {
  version: number;
  name: string;
  up: string;    // 升级SQL
  down: string;  // 回滚SQL
  appliedAt?: Date;
}

// 迁移记录表
CREATE TABLE schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 6. 数据备份策略

### 6.1 自动备份
```typescript
// 每日备份任务
interface BackupSchedule {
  // D1数据库备份
  d1Backup: {
    frequency: 'daily',
    retention: '30 days',
    format: 'sqlite_dump'
  };
  
  // R2文件备份  
  r2Backup: {
    frequency: 'weekly',
    retention: '12 weeks',
    strategy: 'incremental'
  };
  
  // KV数据导出
  kvExport: {
    frequency: 'daily',
    retention: '7 days',
    format: 'json'
  };
}
```

### 6.2 数据恢复
```typescript
// 恢复策略
interface RecoveryProcedure {
  rpo: '1 hour';     // Recovery Point Objective
  rto: '4 hours';    // Recovery Time Objective
  
  steps: [
    '1. 从最近的D1备份恢复数据库',
    '2. 从R2备份恢复文件内容', 
    '3. 重建KV缓存数据',
    '4. 验证数据完整性',
    '5. 恢复服务访问'
  ];
}
```

## 7. 性能优化

### 7.1 查询优化
```sql
-- 常用查询优化示例

-- 1. 用户项目列表（支持分页和搜索）
SELECT p.*, u.nickname as owner_nickname
FROM projects p
JOIN users u ON p.user_id = u.id
WHERE p.user_id = ? 
  AND p.is_deleted = FALSE
  AND (p.name LIKE ? OR p.description LIKE ?)
ORDER BY p.updated_at DESC
LIMIT ? OFFSET ?;

-- 2. 项目文件树
WITH RECURSIVE file_tree AS (
  SELECT id, name, path, parent_id, 0 as level
  FROM files 
  WHERE project_id = ? AND parent_id IS NULL AND is_deleted = FALSE
  
  UNION ALL
  
  SELECT f.id, f.name, f.path, f.parent_id, ft.level + 1
  FROM files f
  JOIN file_tree ft ON f.parent_id = ft.id
  WHERE f.is_deleted = FALSE
)
SELECT * FROM file_tree ORDER BY level, name;

-- 3. 用户活跃度统计
SELECT 
  DATE(created_at) as date,
  COUNT(*) as run_count,
  SUM(execution_time) as total_time
FROM run_history 
WHERE user_id = ? 
  AND created_at >= datetime('now', '-30 days')
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### 7.2 索引策略
```sql
-- 复合索引优化
CREATE INDEX idx_projects_user_public_updated 
ON projects(user_id, is_public, updated_at);

CREATE INDEX idx_files_project_parent_deleted
ON files(project_id, parent_id, is_deleted);

CREATE INDEX idx_run_history_user_created
ON run_history(user_id, created_at);

-- 覆盖索引
CREATE INDEX idx_projects_list_cover
ON projects(user_id, is_deleted, updated_at, id, name, description);
```

## 8. 数据完整性约束

### 8.1 触发器
```sql
-- 更新时间戳触发器
CREATE TRIGGER update_projects_timestamp 
AFTER UPDATE ON projects
BEGIN
  UPDATE projects 
  SET updated_at = CURRENT_TIMESTAMP 
  WHERE id = NEW.id;
END;

-- 用户统计更新触发器
CREATE TRIGGER update_user_stats_on_run
AFTER INSERT ON run_history
BEGIN
  INSERT OR REPLACE INTO user_stats (
    user_id, total_runs, last_active_at, updated_at
  ) 
  VALUES (
    NEW.user_id,
    COALESCE((SELECT total_runs FROM user_stats WHERE user_id = NEW.user_id), 0) + 1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );
END;
```

### 8.2 数据验证
```typescript
// 数据验证规则
interface ValidationRules {
  users: {
    email: 'valid email format';
    nickname: 'length 2-30, no special chars';
    password: 'min 8 chars, include letter and number';
  };
  
  projects: {
    name: 'length 1-100, no path separators';
    description: 'max 1000 chars';
    language: 'enum: python, javascript, etc';
  };
  
  files: {
    name: 'valid filename, no path separators';
    path: 'valid unix path, starts with /';
    size: 'max 10MB per file';
  };
}
```

---

*文档版本：1.0*  
*创建日期：2024-01-27*  
*作者：PyLearn数据库团队*