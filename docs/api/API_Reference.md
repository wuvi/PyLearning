# PyLearn - API接口参考文档

## 1. API概览

### 1.1 基础信息
- **Base URL**: `https://pylearn.pages.dev/api/v1`
- **协议**: HTTPS
- **认证方式**: Bearer Token (JWT)
- **数据格式**: JSON
- **字符编码**: UTF-8

### 1.2 通用响应格式

#### 成功响应
```json
{
  "success": true,
  "data": {
    // 响应数据
  },
  "message": "操作成功",
  "timestamp": 1706320800000
}
```

#### 错误响应
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": {
      // 错误详情（可选）
    }
  },
  "timestamp": 1706320800000
}
```

### 1.3 HTTP状态码
| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未授权/Token失效 |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 409 | 资源冲突 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |

### 1.4 错误代码表
| 错误码 | 描述 | HTTP状态码 |
|--------|------|-----------|
| AUTH_001 | 用户未登录 | 401 |
| AUTH_002 | Token已过期 | 401 |
| AUTH_003 | 无权限访问 | 403 |
| AUTH_004 | 用户名或密码错误 | 401 |
| VALID_001 | 参数验证失败 | 400 |
| VALID_002 | 必填参数缺失 | 400 |
| RESOURCE_001 | 资源不存在 | 404 |
| RESOURCE_002 | 资源已存在 | 409 |
| QUOTA_001 | 配额已用完 | 429 |
| SERVER_001 | 服务器内部错误 | 500 |

## 2. 认证相关API

### 2.1 用户注册

**接口地址**: `POST /auth/register`
**需要认证**: 否

**请求参数**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "nickname": "编程学习者",
  "captcha": "abc123"
}
```

**参数说明**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| email | string | 是 | 邮箱地址，必须唯一 |
| password | string | 是 | 密码，8-50字符 |
| nickname | string | 是 | 用户昵称，2-30字符 |
| captcha | string | 否 | 验证码 |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "userId": "usr_1234567890",
    "email": "user@example.com",
    "nickname": "编程学习者",
    "emailVerified": false,
    "createdAt": "2024-01-27T10:00:00Z"
  },
  "message": "注册成功，请查收验证邮件",
  "timestamp": 1706320800000
}
```

### 2.2 用户登录

**接口地址**: `POST /auth/login`
**需要认证**: 否

**请求参数**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "rememberMe": true
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400,
    "user": {
      "userId": "usr_1234567890",
      "email": "user@example.com",
      "nickname": "编程学习者",
      "avatar": "https://example.com/avatar.jpg",
      "settings": {
        "theme": "light",
        "language": "zh-CN"
      }
    }
  },
  "message": "登录成功",
  "timestamp": 1706320800000
}
```

### 2.3 刷新Token

**接口地址**: `POST /auth/refresh`
**需要认证**: 否

**请求参数**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2.4 用户登出

**接口地址**: `POST /auth/logout`
**需要认证**: 是

**响应示例**:
```json
{
  "success": true,
  "message": "登出成功",
  "timestamp": 1706320800000
}
```

## 3. 用户管理API

### 3.1 获取用户信息

**接口地址**: `GET /users/profile`
**需要认证**: 是

**响应示例**:
```json
{
  "success": true,
  "data": {
    "userId": "usr_1234567890",
    "email": "user@example.com",
    "nickname": "编程学习者",
    "avatar": "https://example.com/avatar.jpg",
    "bio": "热爱编程的学习者",
    "settings": {
      "theme": "dark",
      "language": "zh-CN",
      "editorFontSize": 14,
      "autoSave": true
    },
    "stats": {
      "projectCount": 15,
      "totalCodeLines": 1250,
      "runCount": 245,
      "studyTime": 3600,
      "achievements": ["初学者", "代码达人"]
    },
    "createdAt": "2024-01-01T00:00:00Z",
    "lastLoginAt": "2024-01-27T10:00:00Z"
  },
  "timestamp": 1706320800000
}
```

### 3.2 更新用户信息

**接口地址**: `PUT /users/profile`
**需要认证**: 是

**请求参数**:
```json
{
  "nickname": "新昵称",
  "bio": "个人简介",
  "avatar": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEA...",
  "settings": {
    "theme": "dark",
    "language": "en-US",
    "editorFontSize": 16,
    "autoSave": false
  }
}
```

### 3.3 修改密码

**接口地址**: `PUT /users/password`
**需要认证**: 是

**请求参数**:
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123",
  "confirmPassword": "newpassword123"
}
```

## 4. 项目管理API

### 4.1 获取项目列表

**接口地址**: `GET /projects`
**需要认证**: 是

**查询参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | integer | 否 | 页码，默认1 |
| limit | integer | 否 | 每页数量，默认20，最大100 |
| sort | string | 否 | 排序字段：createdAt, updatedAt, name |
| order | string | 否 | 排序方向：asc, desc |
| search | string | 否 | 搜索关键词 |
| tag | string | 否 | 标签筛选 |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "projectId": "proj_abc123",
        "name": "Python基础练习",
        "description": "学习Python基础语法",
        "language": "python",
        "isPublic": false,
        "tags": ["基础", "练习"],
        "fileCount": 5,
        "lastRunAt": "2024-01-27T09:30:00Z",
        "createdAt": "2024-01-25T14:20:00Z",
        "updatedAt": "2024-01-27T09:30:00Z",
        "stats": {
          "runCount": 25,
          "viewCount": 0
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15,
      "pages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  },
  "timestamp": 1706320800000
}
```

### 4.2 创建项目

**接口地址**: `POST /projects`
**需要认证**: 是

**请求参数**:
```json
{
  "name": "新项目名称",
  "description": "项目描述",
  "language": "python",
  "isPublic": false,
  "template": "basic",
  "tags": ["学习", "练习"]
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "projectId": "proj_xyz789",
    "name": "新项目名称",
    "description": "项目描述",
    "createdAt": "2024-01-27T10:00:00Z",
    "defaultFiles": [
      {
        "fileId": "file_main001",
        "name": "main.py",
        "path": "/main.py",
        "content": "# 欢迎使用PyLearn\\nprint('Hello, World!')"
      }
    ]
  },
  "message": "项目创建成功",
  "timestamp": 1706320800000
}
```

### 4.3 获取项目详情

**接口地址**: `GET /projects/{projectId}`
**需要认证**: 是（私有项目）/ 否（公开项目）

**响应示例**:
```json
{
  "success": true,
  "data": {
    "projectId": "proj_abc123",
    "name": "Python基础练习",
    "description": "学习Python基础语法",
    "language": "python",
    "isPublic": false,
    "tags": ["基础", "练习"],
    "owner": {
      "userId": "usr_1234567890",
      "nickname": "编程学习者",
      "avatar": "https://example.com/avatar.jpg"
    },
    "settings": {
      "pythonVersion": "3.11",
      "allowedPackages": ["numpy", "pandas", "matplotlib"]
    },
    "files": [
      {
        "fileId": "file_main001",
        "name": "main.py",
        "path": "/main.py",
        "size": 256,
        "lastModified": "2024-01-27T09:30:00Z"
      }
    ],
    "stats": {
      "runCount": 25,
      "totalRuntime": 1200,
      "lastRunAt": "2024-01-27T09:30:00Z",
      "viewCount": 0
    },
    "createdAt": "2024-01-25T14:20:00Z",
    "updatedAt": "2024-01-27T09:30:00Z"
  },
  "timestamp": 1706320800000
}
```

### 4.4 更新项目

**接口地址**: `PUT /projects/{projectId}`
**需要认证**: 是

**请求参数**:
```json
{
  "name": "更新后的项目名称",
  "description": "更新后的描述",
  "isPublic": true,
  "tags": ["更新", "标签"]
}
```

### 4.5 删除项目

**接口地址**: `DELETE /projects/{projectId}`
**需要认证**: 是

**响应示例**:
```json
{
  "success": true,
  "message": "项目删除成功",
  "timestamp": 1706320800000
}
```

## 5. 文件管理API

### 5.1 获取文件内容

**接口地址**: `GET /projects/{projectId}/files/{fileId}`
**需要认证**: 是

**响应示例**:
```json
{
  "success": true,
  "data": {
    "fileId": "file_main001",
    "name": "main.py",
    "path": "/main.py",
    "content": "# Python代码\\nprint('Hello, World!')",
    "contentType": "text/x-python",
    "size": 256,
    "encoding": "utf-8",
    "version": 3,
    "lastModified": "2024-01-27T09:30:00Z",
    "createdAt": "2024-01-25T14:20:00Z"
  },
  "timestamp": 1706320800000
}
```

### 5.2 创建文件

**接口地址**: `POST /projects/{projectId}/files`
**需要认证**: 是

**请求参数**:
```json
{
  "name": "utils.py",
  "path": "/utils.py",
  "content": "# 工具函数\\ndef helper():\\n    pass",
  "parentPath": "/"
}
```

### 5.3 更新文件内容

**接口地址**: `PUT /projects/{projectId}/files/{fileId}`
**需要认证**: 是

**请求参数**:
```json
{
  "content": "# 更新后的代码\\nprint('Updated!')",
  "autoSave": false
}
```

### 5.4 删除文件

**接口地址**: `DELETE /projects/{projectId}/files/{fileId}`
**需要认证**: 是

### 5.5 重命名文件

**接口地址**: `PATCH /projects/{projectId}/files/{fileId}/rename`
**需要认证**: 是

**请求参数**:
```json
{
  "newName": "新文件名.py",
  "newPath": "/新文件名.py"
}
```

## 6. 代码执行API

### 6.1 执行代码

**接口地址**: `POST /code/run`
**需要认证**: 是

**请求参数**:
```json
{
  "projectId": "proj_abc123",
  "fileId": "file_main001",
  "code": "print('Hello, World!')",
  "stdin": "",
  "timeout": 5000,
  "packages": ["numpy"]
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "runId": "run_xyz789",
    "status": "completed",
    "stdout": "Hello, World!\\n",
    "stderr": "",
    "exitCode": 0,
    "executionTime": 125,
    "memoryUsage": 2048576,
    "packageVersions": {
      "numpy": "1.24.3"
    },
    "createdAt": "2024-01-27T10:00:00Z"
  },
  "message": "代码执行成功",
  "timestamp": 1706320800000
}
```

### 6.2 获取执行历史

**接口地址**: `GET /code/runs`
**需要认证**: 是

**查询参数**:
- `projectId`: 项目ID（可选）
- `limit`: 返回数量，默认20
- `offset`: 偏移量，默认0

## 7. AI助手API

### 7.1 代码解释

**接口地址**: `POST /ai/explain`
**需要认证**: 是

**请求参数**:
```json
{
  "code": "def fibonacci(n):\\n    if n <= 1:\\n        return n\\n    return fibonacci(n-1) + fibonacci(n-2)",
  "language": "python",
  "context": "递归算法学习"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "explanation": "这是一个使用递归方式实现的斐波那契数列函数...",
    "complexity": {
      "time": "O(2^n)",
      "space": "O(n)"
    },
    "suggestions": [
      "可以使用动态规划优化时间复杂度",
      "考虑添加缓存避免重复计算"
    ],
    "concepts": ["递归", "斐波那契数列", "算法复杂度"],
    "relatedExamples": [
      {
        "title": "斐波那契数列（动态规划版本）",
        "code": "def fibonacci_dp(n):\\n    # 动态规划实现..."
      }
    ]
  },
  "message": "代码解释成功",
  "timestamp": 1706320800000
}
```

### 7.2 错误诊断

**接口地址**: `POST /ai/diagnose`
**需要认证**: 是

**请求参数**:
```json
{
  "code": "print(undefined_variable)",
  "error": "NameError: name 'undefined_variable' is not defined",
  "errorLine": 1,
  "context": "变量使用"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "diagnosis": "变量 'undefined_variable' 在使用前未定义",
    "errorType": "NameError",
    "severity": "error",
    "fixes": [
      {
        "description": "在使用前定义变量",
        "code": "undefined_variable = 'some value'\\nprint(undefined_variable)",
        "explanation": "Python要求在使用变量前必须先定义"
      }
    ],
    "preventionTips": [
      "使用IDE的语法检查功能",
      "养成先定义后使用的习惯"
    ]
  },
  "message": "错误诊断完成",
  "timestamp": 1706320800000
}
```

### 7.3 代码生成

**接口地址**: `POST /ai/generate`
**需要认证**: 是

**请求参数**:
```json
{
  "prompt": "生成一个冒泡排序算法",
  "language": "python",
  "style": "教学版本",
  "includeComments": true,
  "includeTests": true
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "code": "def bubble_sort(arr):\\n    \\"\\"\\"\\n    冒泡排序算法实现...",
    "explanation": "冒泡排序是一种简单的排序算法...",
    "tests": "# 测试代码\\ntest_arr = [64, 34, 25, 12]...",
    "complexity": {
      "time": "O(n²)",
      "space": "O(1)"
    },
    "usageExample": "sorted_arr = bubble_sort([3, 1, 4, 1, 5])"
  },
  "message": "代码生成成功",
  "timestamp": 1706320800000
}
```

### 7.4 智能问答

**接口地址**: `POST /ai/chat`
**需要认证**: 是

**请求参数**:
```json
{
  "message": "什么是Python装饰器？",
  "conversationId": "conv_abc123",
  "context": {
    "projectId": "proj_xyz789",
    "currentCode": "def my_function():..."
  }
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "reply": "Python装饰器是一个特殊的函数...",
    "conversationId": "conv_abc123",
    "messageId": "msg_def456",
    "examples": [
      {
        "title": "基础装饰器示例",
        "code": "@decorator\\ndef function():\\n    pass"
      }
    ],
    "references": [
      {
        "title": "Python官方文档 - 装饰器",
        "url": "https://docs.python.org/3/glossary.html#term-decorator"
      }
    ],
    "followupQuestions": [
      "如何创建自定义装饰器？",
      "装饰器的实际应用场景有哪些？"
    ]
  },
  "message": "回复生成成功",
  "timestamp": 1706320800000
}
```

## 8. 分享功能API

### 8.1 创建分享链接

**接口地址**: `POST /projects/{projectId}/share`
**需要认证**: 是

**请求参数**:
```json
{
  "expiresIn": 86400,
  "allowEdit": false,
  "password": "optional_password",
  "includeFiles": true
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "shareId": "share_abc123",
    "shortUrl": "https://pylearn.dev/s/abc123",
    "fullUrl": "https://pylearn.pages.dev/share/abc123",
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "expiresAt": "2024-01-28T10:00:00Z",
    "settings": {
      "allowEdit": false,
      "passwordProtected": true,
      "includeFiles": true
    }
  },
  "message": "分享链接创建成功",
  "timestamp": 1706320800000
}
```

### 8.2 访问分享项目

**接口地址**: `GET /share/{shareId}`
**需要认证**: 否

**查询参数**:
- `password`: 分享密码（如果需要）

## 9. 数据统计API

### 9.1 用户统计

**接口地址**: `GET /analytics/user`
**需要认证**: 是

**响应示例**:
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalProjects": 15,
      "totalFiles": 45,
      "totalRuns": 234,
      "studyTime": 3600,
      "lastActive": "2024-01-27T10:00:00Z"
    },
    "weeklyActivity": [
      {"date": "2024-01-21", "runs": 12, "studyTime": 300},
      {"date": "2024-01-22", "runs": 8, "studyTime": 240}
    ],
    "languageStats": {
      "python": {"runs": 200, "studyTime": 3200}
    },
    "achievements": [
      {
        "id": "first_run",
        "name": "初次运行",
        "description": "完成第一次代码运行",
        "unlockedAt": "2024-01-01T00:00:00Z"
      }
    ]
  },
  "timestamp": 1706320800000
}
```

### 9.2 项目统计

**接口地址**: `GET /analytics/project/{projectId}`
**需要认证**: 是

## 10. 系统管理API

### 10.1 健康检查

**接口地址**: `GET /health`
**需要认证**: 否

**响应示例**:
```json
{
  "status": "healthy",
  "timestamp": 1706320800000,
  "version": "1.0.0",
  "uptime": 86400,
  "services": {
    "database": "healthy",
    "storage": "healthy",
    "ai": "healthy"
  }
}
```

### 10.2 API使用统计

**接口地址**: `GET /stats/usage`
**需要认证**: 是

## 11. 限流规则

| API类别 | 限制 | 时间窗口 | 说明 |
|---------|------|---------|------|
| 认证相关 | 5次 | 1分钟 | 防止暴力破解 |
| 代码执行 | 10次 | 1分钟 | 防止滥用计算资源 |
| AI调用 | 20次 | 1小时 | 控制AI API成本 |
| 文件操作 | 100次 | 1分钟 | 正常使用限制 |
| 普通API | 1000次 | 1小时 | 整体请求限制 |

## 12. SDK和工具

### 12.1 JavaScript SDK
```javascript
// PyLearn API Client
class PyLearnAPI {
  constructor(apiKey) {
    this.baseURL = 'https://pylearn.pages.dev/api/v1';
    this.apiKey = apiKey;
  }
  
  async createProject(data) {
    return this.request('POST', '/projects', data);
  }
  
  async runCode(code, options = {}) {
    return this.request('POST', '/code/run', { code, ...options });
  }
}
```

### 12.2 Python SDK
```python
# PyLearn Python Client
import requests

class PyLearnClient:
    def __init__(self, api_key):
        self.base_url = 'https://pylearn.pages.dev/api/v1'
        self.headers = {'Authorization': f'Bearer {api_key}'}
    
    def create_project(self, **data):
        return requests.post(f'{self.base_url}/projects', 
                           json=data, headers=self.headers)
```

---

*文档版本：1.0*  
*创建日期：2024-01-27*  
*作者：PyLearn API团队*