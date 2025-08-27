#!/bin/bash

# PyLearn 部署就绪检查脚本

echo "🚀 PyLearn 部署就绪检查"
echo "========================="

# 检查项目结构
echo "📁 检查项目结构..."
if [ ! -f "package.json" ]; then
    echo "❌ package.json 文件缺失"
    exit 1
fi

if [ ! -f "wrangler.jsonc" ]; then
    echo "❌ wrangler.jsonc 文件缺失"
    exit 1
fi

if [ ! -d "src" ]; then
    echo "❌ src 目录缺失"
    exit 1
fi

echo "✅ 项目结构检查通过"

# 检查依赖
echo "📦 检查依赖..."
if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules 目录不存在，请运行 npm install"
    exit 1
fi

echo "✅ 依赖检查通过"

# 构建测试
echo "🔨 构建测试..."
npm run build > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ 构建失败，请检查代码错误"
    exit 1
fi

echo "✅ 构建测试通过"

# 检查构建产物
echo "📦 检查构建产物..."
if [ ! -d "dist" ]; then
    echo "❌ dist 目录不存在"
    exit 1
fi

if [ ! -f "dist/_worker.js" ]; then
    echo "❌ _worker.js 文件缺失"
    exit 1
fi

# 检查文件大小
WORKER_SIZE=$(stat -c%s "dist/_worker.js")
MAX_SIZE=$((25 * 1024 * 1024)) # 25MB

if [ $WORKER_SIZE -gt $MAX_SIZE ]; then
    echo "❌ Worker文件过大: $(($WORKER_SIZE / 1024 / 1024))MB > 25MB"
    exit 1
fi

echo "✅ 构建产物检查通过 ($(($WORKER_SIZE / 1024))KB)"

# 检查环境配置
echo "⚙️  检查环境配置..."
if ! grep -q "pylearn" wrangler.jsonc; then
    echo "⚠️  请在 wrangler.jsonc 中配置项目名称"
fi

echo "✅ 环境配置检查通过"

# 检查数据库迁移
echo "🗄️  检查数据库迁移..."
if [ ! -d "migrations" ]; then
    echo "❌ migrations 目录缺失"
    exit 1
fi

if [ ! -f "migrations/001_init_schema.sql" ]; then
    echo "❌ 初始化迁移文件缺失"
    exit 1
fi

echo "✅ 数据库迁移检查通过"

# 最终检查总结
echo ""
echo "🎉 所有检查通过！项目已准备好部署"
echo ""
echo "🚀 部署步骤："
echo "1. 配置 Cloudflare API 密钥"
echo "2. 创建 D1 数据库: npx wrangler d1 create pylearn-production"
echo "3. 更新 wrangler.jsonc 中的 database_id"
echo "4. 应用数据库迁移: npx wrangler d1 migrations apply pylearn-production"
echo "5. 创建 Pages 项目: npx wrangler pages project create pylearn"
echo "6. 部署应用: npx wrangler pages deploy dist --project-name pylearn"
echo ""
echo "📖 详细说明请参考: docs/deployment/Deployment_Guide.md"