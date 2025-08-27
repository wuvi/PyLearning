# PyLearn 部署指南

## 📋 目录
1. [部署概述](#部署概述)
2. [环境要求](#环境要求)
3. [本地开发部署](#本地开发部署)
4. [Cloudflare Pages生产部署](#cloudflare-pages生产部署)
5. [数据库配置](#数据库配置)
6. [环境变量配置](#环境变量配置)
7. [域名和SSL配置](#域名和ssl配置)
8. [监控和维护](#监控和维护)
9. [故障排除](#故障排除)

---

## 🌐 部署概述

PyLearn是一个基于Cloudflare Workers/Pages的边缘计算Web应用，具有以下特点：

### 架构特性
- **无服务器架构**: 基于Cloudflare Workers边缘计算
- **全球分布式**: 自动部署到全球200+数据中心
- **零运维成本**: 无需管理服务器和基础设施
- **弹性扩展**: 自动处理流量峰值
- **快速冷启动**: <10ms启动时间

### 技术栈
- **前端**: HTML5 + Tailwind CSS + Monaco Editor + Pyodide
- **后端**: Hono Framework (TypeScript)
- **运行时**: Cloudflare Workers
- **数据库**: Cloudflare D1 (SQLite)
- **构建工具**: Vite + Wrangler

---

## 💻 环境要求

### 开发环境
```bash
# Node.js版本要求
Node.js >= 18.0.0
npm >= 9.0.0

# 全局工具
npm install -g wrangler@latest
npm install -g pm2@latest  # 可选，用于开发服务器管理
```

### Cloudflare账户要求
- **免费账户**: 足够支持基础使用
- **付费账户**: 获得更好的性能和更高限制
- **必需权限**: Workers、Pages、D1数据库访问权限

---

## 🛠 本地开发部署

### 1. 克隆和初始化项目
```bash
# 克隆项目
git clone <repository-url>
cd pylearn

# 安装依赖
npm install

# 初始化配置
cp wrangler.jsonc.example wrangler.jsonc
cp .dev.vars.example .dev.vars
```

### 2. 配置本地环境
```bash
# 配置Wrangler认证
npx wrangler login

# 验证登录状态
npx wrangler whoami
```

### 3. 数据库设置
```bash
# 本地开发使用自动SQLite数据库
# 无需手动创建，wrangler会自动处理

# 确认数据库配置
ls .wrangler/state/v3/d1/  # 本地数据库文件
```

### 4. 构建和启动
```bash
# 构建项目
npm run build

# 启动开发服务器（方式1：直接启动）
npm run dev:sandbox

# 启动开发服务器（方式2：使用PM2，推荐）
pm2 start ecosystem.config.cjs

# 检查服务状态
curl http://localhost:3000/api/health

# 查看服务日志
pm2 logs pylearn --nostream
```

### 5. 开发工作流
```bash
# 文件监听和热重载
# wrangler pages dev 自动支持热重载

# 重启服务
pm2 restart pylearn

# 停止服务
pm2 stop pylearn
pm2 delete pylearn

# 清理端口
fuser -k 3000/tcp 2>/dev/null || true
```

---

## ☁️ Cloudflare Pages生产部署

### 1. 创建生产数据库
```bash
# 创建D1数据库
npx wrangler d1 create pylearn-production

# 复制输出的database_id到wrangler.jsonc中：
# "database_id": "your-database-id-here"
```

### 2. 应用数据库迁移
```bash
# 应用迁移到生产数据库
npx wrangler d1 migrations apply pylearn-production

# 验证迁移
npx wrangler d1 execute pylearn-production --command="SELECT name FROM sqlite_master WHERE type='table'"
```

### 3. 配置生产环境变量
```bash
# 设置JWT密钥
npx wrangler pages secret put JWT_SECRET --project-name pylearn
# 输入一个强随机字符串，例如：PyLearn-JWT-Secret-2024-Production-Key

# 设置其他环境变量
npx wrangler pages secret put ENVIRONMENT --project-name pylearn
# 输入：production

# 列出已设置的密钥
npx wrangler pages secret list --project-name pylearn
```

### 4. 创建Pages项目
```bash
# 创建Cloudflare Pages项目
npx wrangler pages project create pylearn \
  --production-branch main \
  --compatibility-date 2024-01-01

# 确认项目创建
npx wrangler pages project list
```

### 5. 构建和部署
```bash
# 构建生产版本
npm run build

# 部署到Cloudflare Pages
npx wrangler pages deploy dist --project-name pylearn

# 部署成功后会显示：
# ✨ Success! Uploaded 0 files (X already uploaded)
# ✨ Deployment complete! Take a look at your site at https://random-id.pylearn.pages.dev
```

### 6. 验证部署
```bash
# 测试生产API
curl https://your-project.pylearn.pages.dev/api/health

# 测试数据库连接
curl https://your-project.pylearn.pages.dev/api/auth/verify

# 查看部署日志
npx wrangler pages deployment list --project-name pylearn
```

---

## 🗄 数据库配置

### D1数据库配置
```jsonc
// wrangler.jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "pylearn-production",
      "database_id": "your-database-id-from-step-1",
      "migrations_dir": "./migrations"
    }
  ]
}
```

### 数据库操作命令
```bash
# 本地数据库操作
npx wrangler d1 execute pylearn-production --local --command="SELECT COUNT(*) FROM users"
npx wrangler d1 execute pylearn-production --local --file=./migrations/seed.sql

# 生产数据库操作
npx wrangler d1 execute pylearn-production --command="SELECT COUNT(*) FROM users"
npx wrangler d1 execute pylearn-production --file=./migrations/seed.sql

# 备份数据库
npx wrangler d1 export pylearn-production --output=backup.sql

# 重置本地数据库
rm -rf .wrangler/state/v3/d1
npm run db:migrate:local
```

---

## ⚙️ 环境变量配置

### 本地开发环境变量(.dev.vars)
```bash
# .dev.vars (本地开发)
JWT_SECRET=your-local-jwt-secret
ENVIRONMENT=development
```

### 生产环境变量
```bash
# 通过wrangler命令设置
npx wrangler pages secret put JWT_SECRET --project-name pylearn
npx wrangler pages secret put ENVIRONMENT --project-name pylearn
npx wrangler pages secret put OPENAI_API_KEY --project-name pylearn  # 可选，用于AI功能
```

### 环境变量列表
| 变量名 | 类型 | 描述 | 必需 |
|--------|------|------|------|
| JWT_SECRET | String | JWT令牌签名密钥 | ✅ |
| ENVIRONMENT | String | 运行环境(development/production) | ✅ |
| OPENAI_API_KEY | String | OpenAI API密钥(未来AI增强) | ❌ |
| GITHUB_API_KEY | String | GitHub API密钥(未来功能) | ❌ |

---

## 🌍 域名和SSL配置

### 自定义域名配置
```bash
# 添加自定义域名
npx wrangler pages domain add your-domain.com --project-name pylearn

# 查看域名状态
npx wrangler pages domain list --project-name pylearn

# 删除域名
npx wrangler pages domain remove your-domain.com --project-name pylearn
```

### DNS配置
```dns
# 在域名DNS中添加CNAME记录
# Name: your-domain.com (或 @)
# Type: CNAME  
# Value: pylearn.pages.dev
# TTL: Auto 或 300

# 子域名配置
# Name: app
# Type: CNAME
# Value: pylearn.pages.dev
```

### SSL证书
- **自动配置**: Cloudflare自动提供免费SSL证书
- **证书类型**: Universal SSL (Let's Encrypt)
- **支持协议**: TLS 1.2, TLS 1.3
- **HSTS**: 自动启用HTTP严格传输安全

---

## 📊 监控和维护

### 部署监控
```bash
# 查看部署历史
npx wrangler pages deployment list --project-name pylearn

# 查看特定部署详情
npx wrangler pages deployment tail --project-name pylearn

# 查看实时日志
npx wrangler tail --project-name pylearn
```

### 性能监控
- **Cloudflare Analytics**: 自动提供流量和性能统计
- **Core Web Vitals**: 监控页面性能指标
- **Error Tracking**: 自动错误日志收集
- **Uptime Monitoring**: 99.9%+ 可用性保证

### 维护操作
```bash
# 回滚到前一版本
npx wrangler pages deployment list --project-name pylearn
npx wrangler pages deployment promote <deployment-id> --project-name pylearn

# 更新依赖
npm update
npm audit fix

# 重新部署
npm run build
npx wrangler pages deploy dist --project-name pylearn
```

---

## 🔧 故障排除

### 常见问题和解决方案

#### 1. 构建失败
```bash
# 问题：vite build失败
# 解决：检查TypeScript错误
npm run build 2>&1 | grep -i error

# 清理并重新构建
rm -rf dist node_modules
npm install
npm run build
```

#### 2. 数据库连接失败
```bash
# 问题：D1数据库访问失败
# 解决：检查wrangler.jsonc配置
npx wrangler d1 list
npx wrangler d1 info pylearn-production

# 重新应用迁移
npx wrangler d1 migrations apply pylearn-production
```

#### 3. 部署超时
```bash
# 问题：pages deploy超时
# 解决：检查文件大小和网络
du -sh dist/
ls -la dist/

# 使用压缩部署
gzip -r dist/
npx wrangler pages deploy dist --project-name pylearn
```

#### 4. 环境变量问题
```bash
# 问题：生产环境变量不生效
# 解决：重新设置密钥
npx wrangler pages secret delete JWT_SECRET --project-name pylearn
npx wrangler pages secret put JWT_SECRET --project-name pylearn
```

#### 5. 域名解析问题
```bash
# 问题：自定义域名无法访问
# 解决：检查DNS配置
nslookup your-domain.com
dig your-domain.com CNAME

# 验证Cloudflare配置
npx wrangler pages domain list --project-name pylearn
```

### 调试工具
```bash
# 本地调试
npx wrangler dev --local --persist

# 远程调试
npx wrangler tail --project-name pylearn --format pretty

# 网络调试
curl -v https://your-domain.com/api/health
curl -H "Content-Type: application/json" -d '{"test":"data"}' https://your-domain.com/api/test
```

### 日志分析
```bash
# 查看最近的错误日志
npx wrangler tail --project-name pylearn --format json | jq '.exceptions[]'

# 过滤特定错误
npx wrangler tail --project-name pylearn | grep -i error

# 保存日志到文件
npx wrangler tail --project-name pylearn > deployment.log
```

---

## ✅ 部署检查清单

### 部署前检查
- [ ] 代码通过本地测试
- [ ] 所有TypeScript错误已解决
- [ ] 数据库迁移文件完整
- [ ] 环境变量已正确配置
- [ ] 构建产物大小合理(<25MB)

### 部署后验证
- [ ] 主页面正常加载
- [ ] API健康检查通过
- [ ] 用户注册/登录功能正常
- [ ] 代码编辑和运行功能正常
- [ ] AI助手功能响应正常
- [ ] 数据库读写操作正常

### 性能检查
- [ ] 首屏加载时间 <3s
- [ ] API响应时间 <500ms
- [ ] 代码执行响应及时
- [ ] 移动端适配正常
- [ ] 跨浏览器兼容性测试通过

---

## 📞 支持和帮助

- **Cloudflare文档**: https://developers.cloudflare.com/
- **Wrangler CLI文档**: https://developers.cloudflare.com/workers/wrangler/
- **Hono框架文档**: https://hono.dev/
- **项目Issue**: 通过GitHub Issues报告问题

---

**祝您部署顺利！** 🚀