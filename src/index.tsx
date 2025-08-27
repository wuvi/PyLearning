import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from 'hono/cloudflare-workers';
import auth from './routes/auth';
import projects from './routes/projects';
import files from './routes/files';
import { AppBindings } from './types/bindings';

const app = new Hono<{ Bindings: AppBindings }>();

// Middleware
app.use('*', logger());
app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }));

// API Routes
app.route('/api/auth', auth);
app.route('/api/projects', projects);
app.route('/api/files', files);

// API Routes
app.get('/api/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    version: '1.0.0'
  });
});

// Enhanced AI API for code explanation
app.post('/api/ai/explain', async (c) => {
  try {
    const { code, language, context } = await c.req.json();
    
    if (!code || code.trim().length === 0) {
      return c.json({
        success: false,
        message: '请提供要解释的代码'
      }, 400);
    }
    
    // 使用增强的AI服务
    const aiService = new (await import('./services/AIService')).AIService();
    const result = await aiService.explainCode({ code, language, context });
    
    return c.json({
      success: true,
      data: {
        explanation: result.explanation,
        complexity: result.complexity,
        suggestions: result.suggestions,
        keywords: result.keywords,
        codeStyle: result.codeStyle
      },
      message: '代码解释生成成功',
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('AI explain error:', error);
    return c.json({
      success: false,
      message: '代码解释生成失败'
    }, 500);
  }
});

// Enhanced AI API for code generation
app.post('/api/ai/generate', async (c) => {
  try {
    const { prompt, language, style, includeComments, includeTests } = await c.req.json();
    
    if (!prompt || prompt.trim().length === 0) {
      return c.json({
        success: false,
        message: '请提供代码生成需求描述'
      }, 400);
    }
    
    // 使用增强的AI服务
    const aiService = new (await import('./services/AIService')).AIService();
    const result = await aiService.generateCode({ 
      prompt, 
      language: language || 'python',
      style,
      includeComments: includeComments !== false,
      includeTests: includeTests === true
    });
    
    return c.json({
      success: true,
      data: {
        code: result.code,
        explanation: result.explanation,
        tests: result.tests,
        usage: result.usage
      },
      message: '代码生成成功',
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('AI generate error:', error);
    return c.json({
      success: false,
      message: '代码生成失败'
    }, 500);
  }
});

// New AI API for code optimization
app.post('/api/ai/optimize', async (c) => {
  try {
    const { code } = await c.req.json();
    
    if (!code || code.trim().length === 0) {
      return c.json({
        success: false,
        message: '请提供要优化的代码'
      }, 400);
    }
    
    const aiService = new (await import('./services/AIService')).AIService();
    const result = await aiService.optimizeCode(code);
    
    return c.json({
      success: true,
      data: result,
      message: '代码优化建议生成成功',
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('AI optimize error:', error);
    return c.json({
      success: false,
      message: '代码优化失败'
    }, 500);
  }
});

// Main PyLearn application with user system
app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PyLearn - 在线Python编程学习平台</title>
    
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- Font Awesome -->
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    
    <!-- Monaco Editor -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/editor/editor.main.css">
    
    <style>
        #editor-container { height: 500px; border: 1px solid #e5e7eb; }
        #output-container { 
            height: 200px; 
            background: #1e293b; 
            color: #10b981; 
            font-family: 'Courier New', monospace; 
            overflow-y: auto; 
        }
        .loading-spinner {
            display: inline-block; width: 20px; height: 20px;
            border: 3px solid rgba(0,0,0,.1); border-radius: 50%;
            border-top-color: #3b82f6; animation: spin 0.6s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .modal { display: none; }
        .modal.show { display: flex; }
    </style>
</head>
<body class="bg-gray-50">
    <!-- Navigation -->
    <nav class="bg-white shadow-md border-b">
        <div class="container mx-auto px-4 py-3">
            <div class="flex justify-between items-center">
                <div class="flex items-center space-x-4">
                    <h1 class="text-2xl font-bold text-blue-600">
                        <i class="fas fa-graduation-cap mr-2"></i>PyLearn
                    </h1>
                    <span class="text-sm text-gray-500">在线Python编程学习平台</span>
                </div>
                
                <!-- 未登录状态 -->
                <div id="nav-guest" class="flex items-center space-x-4">
                    <button onclick="showLogin()" class="px-4 py-2 text-blue-600 hover:text-blue-800">
                        <i class="fas fa-sign-in-alt mr-1"></i>登录
                    </button>
                    <button onclick="showRegister()" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                        <i class="fas fa-user-plus mr-1"></i>注册
                    </button>
                </div>
                
                <!-- 已登录状态 -->
                <div id="nav-user" class="hidden flex items-center space-x-4">
                    <div class="flex items-center space-x-2">
                        <img id="user-avatar" src="" class="w-8 h-8 rounded-full" style="display: none;">
                        <span id="user-name" class="text-gray-700 font-medium"></span>
                    </div>
                    <button onclick="showProjectsModal()" class="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm">
                        <i class="fas fa-folder mr-1"></i>我的项目
                    </button>
                    <button onclick="newProject()" class="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm">
                        <i class="fas fa-plus mr-1"></i>新建项目
                    </button>
                    <div class="relative">
                        <button onclick="toggleUserMenu()" class="flex items-center text-gray-700 hover:text-gray-900">
                            <i class="fas fa-user-circle text-xl mr-1"></i>
                            <i class="fas fa-chevron-down text-xs"></i>
                        </button>
                        <div id="user-menu" class="hidden absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50">
                            <a href="#" onclick="showProfile()" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                <i class="fas fa-user mr-2"></i>个人资料
                            </a>
                            <a href="#" onclick="logout()" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                <i class="fas fa-sign-out-alt mr-2"></i>退出登录
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </nav>

    <!-- 游客提示 -->
    <div id="guest-banner" class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <div class="container mx-auto flex items-center">
            <div class="flex">
                <div class="flex-shrink-0">
                    <i class="fas fa-exclamation-triangle text-yellow-400"></i>
                </div>
                <div class="ml-3">
                    <p class="text-sm text-yellow-700">
                        您正在以游客身份使用 PyLearn。
                        <a href="#" onclick="showRegister()" class="font-medium underline hover:text-yellow-600">注册账户</a>
                        以保存您的项目和代码。
                    </p>
                </div>
            </div>
        </div>
    </div>

    <!-- Main Content -->
    <div class="container mx-auto px-4 py-6">
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <!-- Left Panel -->
            <div class="lg:col-span-1 space-y-4">
                <!-- 项目信息 -->
                <div id="project-info" class="bg-white rounded-lg shadow p-4 hidden">
                    <h3 class="font-semibold mb-3 text-gray-700">
                        <i class="fas fa-project-diagram mr-2"></i>当前项目
                    </h3>
                    <div id="current-project-name" class="text-sm font-medium text-gray-900 mb-2"></div>
                    <div id="current-file-name" class="text-xs text-gray-500 mb-3"></div>
                    <div class="flex space-x-2">
                        <button onclick="saveCurrentFile()" class="flex-1 px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600">
                            <i class="fas fa-save mr-1"></i>保存
                        </button>
                        <button onclick="saveProject()" class="flex-1 px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600">
                            <i class="fas fa-download mr-1"></i>下载
                        </button>
                    </div>
                </div>
                
                <!-- 文件管理 -->
                <div id="file-manager" class="bg-white rounded-lg shadow p-4 hidden">
                    <div class="flex justify-between items-center mb-3">
                        <h3 class="font-semibold text-gray-700">
                            <i class="fas fa-folder-open mr-2"></i>文件管理
                        </h3>
                        <button onclick="createFile()" class="text-sm text-blue-600 hover:text-blue-800">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    <div id="file-list" class="space-y-1 max-h-48 overflow-y-auto">
                        <!-- 文件列表将在这里动态填充 -->
                    </div>
                </div>

                <!-- AI Assistant -->
                <div class="bg-white rounded-lg shadow p-4">
                    <h3 class="font-semibold mb-3 text-gray-700">
                        <i class="fas fa-robot mr-2"></i>AI编程助手
                    </h3>
                    <div class="space-y-2">
                        <button onclick="explainCode()" class="w-full px-3 py-2 bg-indigo-500 text-white rounded text-sm hover:bg-indigo-600 transition-colors">
                            <i class="fas fa-search mr-1"></i>深度解释
                        </button>
                        <button onclick="generateCode()" class="w-full px-3 py-2 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors">
                            <i class="fas fa-magic mr-1"></i>智能生成
                        </button>
                        <button onclick="optimizeCode()" class="w-full px-3 py-2 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 transition-colors">
                            <i class="fas fa-cog mr-1"></i>代码优化
                        </button>
                    </div>
                    <div id="ai-response" class="mt-4 bg-gray-50 rounded text-sm hidden"></div>
                    
                    <!-- AI 功能说明 -->
                    <div class="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
                        <div class="font-medium mb-1">💡 AI功能介绍:</div>
                        <ul class="space-y-1">
                            <li>• <strong>深度解释</strong>: 分析代码逻辑和复杂度</li>
                            <li>• <strong>智能生成</strong>: 根据需求生成代码</li>
                            <li>• <strong>代码优化</strong>: 提供性能改进建议</li>
                        </ul>
                    </div>
                </div>

                <!-- 示例代码 -->
                <div class="bg-white rounded-lg shadow p-4">
                    <h3 class="font-semibold mb-3 text-gray-700">
                        <i class="fas fa-lightbulb mr-2"></i>示例代码
                    </h3>
                    <div class="space-y-1">
                        <button onclick="loadExample('hello')" class="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded">
                            <i class="fas fa-play-circle mr-1 text-green-500"></i>Hello World
                        </button>
                        <button onclick="loadExample('fibonacci')" class="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded">
                            <i class="fas fa-calculator mr-1 text-blue-500"></i>斐波那契数列
                        </button>
                        <button onclick="loadExample('sorting')" class="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded">
                            <i class="fas fa-sort-amount-down mr-1 text-purple-500"></i>排序算法
                        </button>
                    </div>
                </div>
            </div>

            <!-- Right Panel - Editor & Output -->
            <div class="lg:col-span-3 space-y-4">
                <!-- Editor -->
                <div class="bg-white rounded-lg shadow">
                    <div class="border-b px-4 py-2 flex justify-between items-center">
                        <span class="font-semibold text-gray-700">
                            <i class="fas fa-code mr-2"></i>代码编辑器
                        </span>
                        <button onclick="runCode()" class="px-4 py-1 bg-green-600 text-white rounded hover:bg-green-700">
                            <i class="fas fa-play mr-1"></i>运行 (F5)
                        </button>
                    </div>
                    <div id="editor-container"></div>
                </div>

                <!-- Output -->
                <div class="bg-white rounded-lg shadow">
                    <div class="border-b px-4 py-2 flex justify-between items-center">
                        <span class="font-semibold text-gray-700">
                            <i class="fas fa-terminal mr-2"></i>运行结果
                        </span>
                        <button onclick="clearOutput()" class="text-sm text-gray-500 hover:text-gray-700">
                            <i class="fas fa-trash-alt mr-1"></i>清空
                        </button>
                    </div>
                    <div id="output-container" class="p-4 text-sm">
                        <div id="output-text">
                            <div class="text-yellow-400">
                                <i class="fas fa-info-circle mr-2"></i>欢迎使用PyLearn！点击"运行"按钮执行代码。
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- 登录模态框 -->
    <div id="login-modal" class="modal fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div class="mt-3">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-medium text-gray-900">登录账户</h3>
                    <button onclick="closeModal('login-modal')" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form id="login-form" onsubmit="handleLogin(event)">
                    <div class="mb-4">
                        <label class="block text-gray-700 text-sm font-bold mb-2">
                            邮箱或用户名
                        </label>
                        <input type="text" name="identifier" required 
                            class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline">
                    </div>
                    <div class="mb-6">
                        <label class="block text-gray-700 text-sm font-bold mb-2">
                            密码
                        </label>
                        <input type="password" name="password" required
                            class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline">
                    </div>
                    <div class="flex items-center justify-between">
                        <button type="submit" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
                            登录
                        </button>
                        <a href="#" onclick="switchToRegister()" class="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800">
                            还没有账户？注册
                        </a>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- 注册模态框 -->
    <div id="register-modal" class="modal fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div class="mt-3">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-medium text-gray-900">注册账户</h3>
                    <button onclick="closeModal('register-modal')" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form id="register-form" onsubmit="handleRegister(event)">
                    <div class="mb-4">
                        <label class="block text-gray-700 text-sm font-bold mb-2">
                            用户名
                        </label>
                        <input type="text" name="username" required 
                            class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline">
                    </div>
                    <div class="mb-4">
                        <label class="block text-gray-700 text-sm font-bold mb-2">
                            邮箱地址
                        </label>
                        <input type="email" name="email" required 
                            class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline">
                    </div>
                    <div class="mb-4">
                        <label class="block text-gray-700 text-sm font-bold mb-2">
                            显示名称
                        </label>
                        <input type="text" name="displayName"
                            class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline">
                    </div>
                    <div class="mb-6">
                        <label class="block text-gray-700 text-sm font-bold mb-2">
                            密码
                        </label>
                        <input type="password" name="password" required minlength="8"
                            class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline">
                        <p class="text-xs text-gray-600 mt-1">密码至少8位，需包含字母和数字</p>
                    </div>
                    <div class="flex items-center justify-between">
                        <button type="submit" class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
                            注册
                        </button>
                        <a href="#" onclick="switchToLogin()" class="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800">
                            已有账户？登录
                        </a>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- 项目管理模态框 -->
    <div id="projects-modal" class="modal fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div class="relative top-10 mx-auto p-5 border w-5/6 max-w-4xl shadow-lg rounded-md bg-white">
            <div class="mt-3">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-medium text-gray-900">项目管理</h3>
                    <button onclick="closeModal('projects-modal')" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="flex justify-between items-center mb-4">
                    <input type="text" id="project-search" placeholder="搜索项目..." 
                        class="border rounded px-3 py-2 w-64" onkeyup="searchProjects()">
                    <button onclick="showNewProjectForm()" class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
                        <i class="fas fa-plus mr-1"></i>新建项目
                    </button>
                </div>
                <div id="projects-list" class="space-y-2 max-h-96 overflow-y-auto">
                    <!-- 项目列表将在这里动态填充 -->
                </div>
            </div>
        </div>
    </div>

    <!-- 新建项目模态框 -->
    <div id="new-project-modal" class="modal fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div class="mt-3">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-medium text-gray-900">创建新项目</h3>
                    <button onclick="closeModal('new-project-modal')" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form id="new-project-form" onsubmit="handleNewProject(event)">
                    <div class="mb-4">
                        <label class="block text-gray-700 text-sm font-bold mb-2">
                            项目名称
                        </label>
                        <input type="text" name="name" required 
                            class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline">
                    </div>
                    <div class="mb-4">
                        <label class="block text-gray-700 text-sm font-bold mb-2">
                            项目描述
                        </label>
                        <textarea name="description" rows="3"
                            class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"></textarea>
                    </div>
                    <div class="mb-4">
                        <label class="block text-gray-700 text-sm font-bold mb-2">
                            编程语言
                        </label>
                        <select name="language" 
                            class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline">
                            <option value="python">Python</option>
                            <option value="javascript">JavaScript</option>
                        </select>
                    </div>
                    <div class="mb-4">
                        <label class="block text-gray-700 text-sm font-bold mb-2">
                            模板
                        </label>
                        <select name="template" 
                            class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline">
                            <option value="">基础模板</option>
                            <option value="basic-python">Python基础</option>
                            <option value="flask-app">Flask应用</option>
                            <option value="data-analysis">数据分析</option>
                        </select>
                    </div>
                    <div class="mb-6">
                        <label class="flex items-center">
                            <input type="checkbox" name="isPublic" class="mr-2">
                            <span class="text-sm text-gray-700">公开项目（其他人可以查看）</span>
                        </label>
                    </div>
                    <div class="flex items-center justify-between">
                        <button type="submit" class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
                            创建项目
                        </button>
                        <button type="button" onclick="closeModal('new-project-modal')" class="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
                            取消
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Load Pyodide -->
    <script src="https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js"></script>
    
    <!-- Load Monaco Editor -->
    <script src="https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js"></script>
    
    <script>
        let editor = null;
        let pyodide = null;
        let isRunning = false;
        let currentUser = null;
        let currentProject = null;
        let currentFile = null;
        let authToken = null;

        // Example code templates
        const examples = {
            hello: \`# Hello World 示例
print("Hello, PyLearn!")
print("欢迎使用在线Python编程平台！")

# 基本变量和数据类型
name = "Python学习者"
age = 18
height = 175.5

print(f"姓名: {name}")
print(f"年龄: {age}")
print(f"身高: {height}cm")\`,

            fibonacci: \`# 斐波那契数列
def fibonacci(n):
    """生成斐波那契数列"""
    if n <= 0:
        return []
    elif n == 1:
        return [0]
    elif n == 2:
        return [0, 1]
    
    fib = [0, 1]
    for i in range(2, n):
        fib.append(fib[i-1] + fib[i-2])
    return fib

# 生成前10个斐波那契数
result = fibonacci(10)
print("斐波那契数列前10项:")
print(result)

# 计算第n项
def fib_nth(n):
    """计算斐波那契数列第n项"""
    if n <= 1:
        return n
    return fib_nth(n-1) + fib_nth(n-2)

print(f"\\n第8项: {fib_nth(8)}")\`,

            sorting: \`# 排序算法示例
def bubble_sort(arr):
    """冒泡排序"""
    n = len(arr)
    for i in range(n):
        swapped = False
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
                swapped = True
        if not swapped:
            break
    return arr

def quick_sort(arr):
    """快速排序"""
    if len(arr) <= 1:
        return arr
    
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    
    return quick_sort(left) + middle + quick_sort(right)

# 测试数据
test_data = [64, 34, 25, 12, 22, 11, 90]
print(f"原始数据: {test_data}")

# 冒泡排序
bubble_result = bubble_sort(test_data.copy())
print(f"冒泡排序结果: {bubble_result}")

# 快速排序
quick_result = quick_sort(test_data.copy())
print(f"快速排序结果: {quick_result}")\`
        };

        // Initialize Monaco Editor
        require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' }});

        require(['vs/editor/editor.main'], function() {
            editor = monaco.editor.create(document.getElementById('editor-container'), {
                value: examples.hello,
                language: 'python',
                theme: 'vs-light',
                fontSize: 14,
                minimap: { enabled: false },
                automaticLayout: true,
                scrollBeyondLastLine: false,
                wordWrap: 'on'
            });

            editor.addCommand(monaco.KeyCode.F5, runCode);
        });

        // Initialize Pyodide
        async function initPyodide() {
            const outputDiv = document.getElementById('output-text');
            outputDiv.innerHTML = '<div class="text-yellow-400"><i class="fas fa-spinner fa-spin mr-2"></i>正在加载Python环境...</div>';
            
            try {
                pyodide = await loadPyodide({
                    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/'
                });
                
                pyodide.runPython(\`
                    import sys
                    from io import StringIO
                    
                    class OutputCapture:
                        def __init__(self):
                            self.output = []
                        
                        def write(self, text):
                            self.output.append(text)
                        
                        def flush(self):
                            pass
                        
                        def get_output(self):
                            return ''.join(self.output)
                        
                        def clear(self):
                            self.output = []
                    
                    sys.stdout = OutputCapture()
                    sys.stderr = OutputCapture()
                \`);
                
                outputDiv.innerHTML = '<div class="text-green-400"><i class="fas fa-check-circle mr-2"></i>Python环境加载完成！点击"运行"按钮执行代码。</div>';
            } catch (error) {
                outputDiv.innerHTML = \`<div class="text-red-400"><i class="fas fa-exclamation-circle mr-2"></i>Python环境加载失败: \${error.message}</div>\`;
            }
        }

        // Run Python code
        async function runCode() {
            if (!pyodide) {
                alert('Python环境还在加载中，请稍候...');
                return;
            }
            
            if (isRunning) return;
            
            isRunning = true;
            const code = editor.getValue();
            const outputDiv = document.getElementById('output-text');
            
            outputDiv.innerHTML = '<div class="text-gray-400">执行代码中...</div>';
            
            try {
                pyodide.runPython('sys.stdout.clear(); sys.stderr.clear()');
                
                const startTime = performance.now();
                await pyodide.runPythonAsync(code);
                const endTime = performance.now();
                const executionTime = ((endTime - startTime) / 1000).toFixed(3);
                
                const stdout = pyodide.runPython('sys.stdout.get_output()');
                const stderr = pyodide.runPython('sys.stderr.get_output()');
                
                let outputHtml = '';
                if (stdout) {
                    outputHtml += \`<div class="text-green-400">\${escapeHtml(stdout)}</div>\`;
                }
                if (stderr) {
                    outputHtml += \`<div class="text-red-400">\${escapeHtml(stderr)}</div>\`;
                }
                if (!stdout && !stderr) {
                    outputHtml = '<div class="text-gray-400">代码执行完成，无输出。</div>';
                }
                
                outputHtml += \`<div class="text-gray-500 mt-2 text-xs">执行时间: \${executionTime}秒</div>\`;
                outputDiv.innerHTML = outputHtml;
                
            } catch (error) {
                outputDiv.innerHTML = \`<div class="text-red-400">
                    <div class="font-semibold mb-1">执行错误:</div>
                    <pre>\${escapeHtml(error.toString())}</pre>
                </div>\`;
            } finally {
                isRunning = false;
            }
        }

        // Enhanced AI Functions
        async function explainCode() {
            const code = editor.getValue().trim();
            
            if (!code) {
                showMessage('请先在编辑器中编写一些代码', 'error');
                return;
            }
            
            const responseDiv = document.getElementById('ai-response');
            responseDiv.classList.remove('hidden');
            responseDiv.innerHTML = '<div class="loading-spinner"></div> AI正在深度分析代码...';
            
            try {
                const response = await fetch('/api/ai/explain', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        code,
                        language: 'python',
                        context: currentProject ? currentProject.name : undefined
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    const { explanation, complexity, suggestions, keywords, codeStyle } = data.data;
                    
                    // 代码质量颜色
                    const styleColors = {
                        'excellent': 'text-green-600',
                        'good': 'text-blue-600', 
                        'needs_improvement': 'text-yellow-600'
                    };
                    
                    const styleTexts = {
                        'excellent': '优秀',
                        'good': '良好',
                        'needs_improvement': '需要改进'
                    };
                    
                    responseDiv.innerHTML = \`
                        <div class="space-y-3">
                            <div class="flex justify-between items-center">
                                <div class="font-semibold text-blue-600">📖 代码分析结果</div>
                                <div class="text-xs \${styleColors[codeStyle]}">
                                    代码质量: \${styleTexts[codeStyle]}
                                </div>
                            </div>
                            
                            <div class="bg-blue-50 p-3 rounded text-sm">
                                <div class="font-medium text-blue-800 mb-1">功能解释:</div>
                                <div class="text-blue-700 whitespace-pre-line">\${explanation}</div>
                            </div>
                            
                            <div class="grid grid-cols-2 gap-2 text-xs">
                                <div class="bg-purple-50 p-2 rounded">
                                    <div class="font-medium text-purple-800">复杂度:</div>
                                    <div class="text-purple-700">\${complexity}</div>
                                </div>
                                <div class="bg-indigo-50 p-2 rounded">
                                    <div class="font-medium text-indigo-800">关键字:</div>
                                    <div class="text-indigo-700">\${keywords.join(', ') || '无'}</div>
                                </div>
                            </div>
                            
                            \${suggestions.length > 0 ? \`
                                <div class="bg-yellow-50 p-3 rounded">
                                    <div class="font-medium text-yellow-800 mb-1">💡 优化建议:</div>
                                    <ul class="list-disc list-inside text-yellow-700 text-sm space-y-1">
                                        \${suggestions.map(s => \`<li>\${s}</li>\`).join('')}
                                    </ul>
                                </div>
                            \` : ''}
                            
                            <div class="flex space-x-2">
                                <button onclick="optimizeCode()" class="px-3 py-1 bg-purple-500 text-white rounded text-xs hover:bg-purple-600">
                                    <i class="fas fa-magic mr-1"></i>代码优化
                                </button>
                                <button onclick="hideAIResponse()" class="px-3 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600">
                                    关闭
                                </button>
                            </div>
                        </div>
                    \`;
                } else {
                    responseDiv.innerHTML = \`<div class="text-red-500">
                        <i class="fas fa-exclamation-circle mr-1"></i>\${data.message || 'AI服务暂时不可用'}
                    </div>\`;
                }
            } catch (error) {
                console.error('AI explain error:', error);
                responseDiv.innerHTML = '<div class="text-red-500"><i class="fas fa-wifi mr-1"></i>网络错误，请稍后重试</div>';
            }
        }

        async function generateCode() {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50';
            modal.innerHTML = \`
                <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                    <div class="mt-3">
                        <h3 class="text-lg font-medium text-gray-900 mb-4">🤖 AI代码生成</h3>
                        <form id="generate-form">
                            <div class="mb-4">
                                <label class="block text-gray-700 text-sm font-bold mb-2">
                                    需求描述 *
                                </label>
                                <textarea name="prompt" required rows="3" placeholder="例如：创建一个冒泡排序函数，包含注释和测试"
                                    class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"></textarea>
                            </div>
                            <div class="mb-4">
                                <label class="block text-gray-700 text-sm font-bold mb-2">
                                    代码风格
                                </label>
                                <select name="style" class="shadow border rounded w-full py-2 px-3 text-gray-700">
                                    <option value="">标准风格</option>
                                    <option value="simple">简洁风格</option>
                                    <option value="detailed">详细风格</option>
                                    <option value="educational">教学风格</option>
                                </select>
                            </div>
                            <div class="mb-4 space-y-2">
                                <label class="flex items-center">
                                    <input type="checkbox" name="includeComments" checked class="mr-2">
                                    <span class="text-sm">包含注释</span>
                                </label>
                                <label class="flex items-center">
                                    <input type="checkbox" name="includeTests" class="mr-2">
                                    <span class="text-sm">包含测试代码</span>
                                </label>
                            </div>
                            <div class="flex items-center justify-between">
                                <button type="submit" class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
                                    生成代码
                                </button>
                                <button type="button" onclick="this.closest('.fixed').remove()" 
                                    class="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">
                                    取消
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            \`;
            
            document.body.appendChild(modal);
            
            document.getElementById('generate-form').onsubmit = async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                
                const responseDiv = document.getElementById('ai-response');
                responseDiv.classList.remove('hidden');
                responseDiv.innerHTML = '<div class="loading-spinner"></div> AI正在生成代码...';
                
                try {
                    const response = await fetch('/api/ai/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            prompt: formData.get('prompt'),
                            language: 'python',
                            style: formData.get('style'),
                            includeComments: formData.get('includeComments') === 'on',
                            includeTests: formData.get('includeTests') === 'on'
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        const { code, explanation, tests, usage } = data.data;
                        
                        responseDiv.innerHTML = \`
                            <div class="space-y-3">
                                <div class="font-semibold text-green-600">🎉 代码生成成功</div>
                                
                                <div class="bg-green-50 p-3 rounded text-sm">
                                    <div class="font-medium text-green-800 mb-1">说明:</div>
                                    <div class="text-green-700">\${explanation}</div>
                                </div>
                                
                                <div>
                                    <div class="font-medium text-gray-800 mb-2">生成的代码:</div>
                                    <pre class="bg-gray-100 p-3 rounded text-xs overflow-x-auto max-h-48">\${escapeHtml(code)}</pre>
                                </div>
                                
                                \${tests ? \`
                                    <div>
                                        <div class="font-medium text-gray-800 mb-2">测试代码:</div>
                                        <pre class="bg-blue-50 p-3 rounded text-xs overflow-x-auto max-h-32">\${escapeHtml(tests)}</pre>
                                    </div>
                                \` : ''}
                                
                                \${usage ? \`
                                    <div>
                                        <div class="font-medium text-gray-800 mb-2">使用示例:</div>
                                        <pre class="bg-yellow-50 p-3 rounded text-xs overflow-x-auto max-h-32">\${escapeHtml(usage)}</pre>
                                    </div>
                                \` : ''}
                                
                                <div class="flex space-x-2">
                                    <button onclick="insertGeneratedCode(\\\`\${code.replace(/\\\`/g, '\\\\\\\`')}\\\`)" 
                                        class="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">
                                        <i class="fas fa-plus mr-1"></i>插入到编辑器
                                    </button>
                                    <button onclick="replaceEditorContent(\\\`\${code.replace(/\\\`/g, '\\\\\\\`')}\\\`)"
                                        class="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600">
                                        <i class="fas fa-refresh mr-1"></i>替换当前内容
                                    </button>
                                    <button onclick="hideAIResponse()" 
                                        class="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600">
                                        关闭
                                    </button>
                                </div>
                            </div>
                        \`;
                    } else {
                        responseDiv.innerHTML = \`<div class="text-red-500">
                            <i class="fas fa-exclamation-circle mr-1"></i>\${data.message || '代码生成失败'}
                        </div>\`;
                    }
                    
                    modal.remove();
                } catch (error) {
                    console.error('AI generate error:', error);
                    responseDiv.innerHTML = '<div class="text-red-500"><i class="fas fa-wifi mr-1"></i>网络错误，请稍后重试</div>';
                    modal.remove();
                }
            };
        }

        async function optimizeCode() {
            const code = editor.getValue().trim();
            
            if (!code) {
                showMessage('请先在编辑器中编写一些代码', 'error');
                return;
            }
            
            const responseDiv = document.getElementById('ai-response');
            responseDiv.innerHTML = '<div class="loading-spinner"></div> AI正在优化代码...';
            
            try {
                const response = await fetch('/api/ai/optimize', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    const { optimizedCode, improvements, performanceGains } = data.data;
                    
                    responseDiv.innerHTML = \`
                        <div class="space-y-3">
                            <div class="font-semibold text-purple-600">🔧 代码优化建议</div>
                            
                            \${improvements.length > 0 ? \`
                                <div class="bg-purple-50 p-3 rounded">
                                    <div class="font-medium text-purple-800 mb-1">改进建议:</div>
                                    <ul class="list-disc list-inside text-purple-700 text-sm space-y-1">
                                        \${improvements.map(imp => \`<li>\${imp}</li>\`).join('')}
                                    </ul>
                                </div>
                            \` : ''}
                            
                            \${performanceGains.length > 0 ? \`
                                <div class="bg-green-50 p-3 rounded">
                                    <div class="font-medium text-green-800 mb-1">性能提升:</div>
                                    <ul class="list-disc list-inside text-green-700 text-sm space-y-1">
                                        \${performanceGains.map(gain => \`<li>\${gain}</li>\`).join('')}
                                    </ul>
                                </div>
                            \` : ''}
                            
                            <div class="flex space-x-2">
                                <button onclick="hideAIResponse()" 
                                    class="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600">
                                    关闭
                                </button>
                            </div>
                        </div>
                    \`;
                } else {
                    responseDiv.innerHTML = \`<div class="text-red-500">
                        <i class="fas fa-exclamation-circle mr-1"></i>\${data.message || '代码优化失败'}
                    </div>\`;
                }
            } catch (error) {
                console.error('AI optimize error:', error);
                responseDiv.innerHTML = '<div class="text-red-500"><i class="fas fa-wifi mr-1"></i>网络错误，请稍后重试</div>';
            }
        }

        function insertGeneratedCode(code) {
            if (editor) {
                const position = editor.getPosition();
                editor.executeEdits('', [{
                    range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                    text: '\\n\\n' + code,
                    forceMoveMarkers: true
                }]);
                showMessage('代码已插入到编辑器', 'success');
            }
        }

        function replaceEditorContent(code) {
            if (editor) {
                editor.setValue(code);
                showMessage('编辑器内容已替换', 'success');
            }
        }

        function hideAIResponse() {
            const responseDiv = document.getElementById('ai-response');
            responseDiv.classList.add('hidden');
        }

        // Helper functions
        function loadExample(type) {
            if (editor && examples[type]) {
                editor.setValue(examples[type]);
                clearOutput();
            }
        }

        function insertCode(code) {
            if (editor) {
                const position = editor.getPosition();
                editor.executeEdits('', [{
                    range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                    text: '\\n' + code,
                    forceMoveMarkers: true
                }]);
            }
        }
        
        // Store insertCode in global scope for onclick handler
        window.insertCode = insertCode;

        function clearOutput() {
            document.getElementById('output-text').innerHTML = '<div class="text-gray-400">输出已清空</div>';
        }

        function newProject() {
            if (confirm('创建新项目将清空当前代码，是否继续？')) {
                editor.setValue('# 新项目\\n\\nprint("Hello, World!")');
                clearOutput();
            }
        }

        function saveProject() {
            const code = editor.getValue();
            const blob = new Blob([code], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'pylearn_project.py';
            a.click();
            URL.revokeObjectURL(url);
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML.replace(/\\n/g, '<br>');
        }

        // Authentication functions
        async function handleLogin(event) {
            event.preventDefault();
            const form = event.target;
            const formData = new FormData(form);
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: formData.get('identifier'),
                        username: formData.get('identifier'),
                        password: formData.get('password')
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    currentUser = data.user;
                    authToken = data.token;
                    updateUI();
                    closeModal('login-modal');
                    showMessage('登录成功！', 'success');
                    loadUserProjects();
                } else {
                    showMessage(data.message || '登录失败', 'error');
                }
            } catch (error) {
                showMessage('网络错误，请稍后重试', 'error');
            }
        }

        async function handleRegister(event) {
            event.preventDefault();
            const form = event.target;
            const formData = new FormData(form);
            
            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: formData.get('username'),
                        email: formData.get('email'),
                        displayName: formData.get('displayName') || formData.get('username'),
                        password: formData.get('password')
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    currentUser = data.user;
                    authToken = data.token;
                    updateUI();
                    closeModal('register-modal');
                    showMessage('注册成功！欢迎使用PyLearn！', 'success');
                    loadUserProjects();
                } else {
                    showMessage(data.message || '注册失败', 'error');
                }
            } catch (error) {
                showMessage('网络错误，请稍后重试', 'error');
            }
        }

        async function logout() {
            try {
                await fetch('/api/auth/logout', { method: 'POST' });
                currentUser = null;
                authToken = null;
                currentProject = null;
                currentFile = null;
                updateUI();
                showMessage('已退出登录', 'info');
            } catch (error) {
                console.error('Logout error:', error);
            }
        }

        async function checkAuthStatus() {
            try {
                const response = await fetch('/api/auth/verify');
                const data = await response.json();
                
                if (data.success) {
                    currentUser = data.user;
                    authToken = 'verified'; // Token is in cookie
                    updateUI();
                    loadUserProjects();
                }
            } catch (error) {
                console.error('Auth check failed:', error);
            }
        }

        // Project management functions
        async function handleNewProject(event) {
            event.preventDefault();
            const form = event.target;
            const formData = new FormData(form);
            
            if (!currentUser) {
                showMessage('请先登录', 'error');
                return;
            }
            
            try {
                const response = await fetch('/api/projects', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: formData.get('name'),
                        description: formData.get('description'),
                        language: formData.get('language'),
                        template: formData.get('template'),
                        isPublic: formData.get('isPublic') === 'on'
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    currentProject = data.project;
                    closeModal('new-project-modal');
                    showMessage('项目创建成功！', 'success');
                    updateProjectInfo();
                    loadProjectFiles();
                    form.reset();
                } else {
                    showMessage(data.message || '项目创建失败', 'error');
                }
            } catch (error) {
                showMessage('网络错误，请稍后重试', 'error');
            }
        }

        async function loadUserProjects() {
            if (!currentUser) return;
            
            try {
                const response = await fetch('/api/projects');
                const data = await response.json();
                
                if (data.success) {
                    displayProjects(data.projects);
                }
            } catch (error) {
                console.error('Failed to load projects:', error);
            }
        }

        async function loadProject(projectId) {
            try {
                const response = await fetch(\`/api/projects/\${projectId}\`);
                const data = await response.json();
                
                if (data.success) {
                    currentProject = data.project;
                    updateProjectInfo();
                    loadProjectFiles();
                    closeModal('projects-modal');
                    showMessage(\`已加载项目：\${data.project.name}\`, 'success');
                }
            } catch (error) {
                console.error('Failed to load project:', error);
            }
        }

        async function loadProjectFiles() {
            if (!currentProject) return;
            
            try {
                const response = await fetch(\`/api/projects/\${currentProject.id}/files\`);
                const data = await response.json();
                
                if (data.success && data.files.length > 0) {
                    displayFiles(data.files);
                    // Load first file by default
                    if (data.files[0]) {
                        loadFile(data.files[0].id);
                    }
                }
            } catch (error) {
                console.error('Failed to load project files:', error);
            }
        }

        async function loadFile(fileId) {
            try {
                const response = await fetch(\`/api/files/\${fileId}/content\`);
                const data = await response.json();
                
                if (data.success) {
                    currentFile = { id: fileId, ...data.content };
                    editor.setValue(data.content.content);
                    updateCurrentFileInfo();
                }
            } catch (error) {
                console.error('Failed to load file:', error);
            }
        }

        async function saveCurrentFile() {
            if (!currentFile || !currentUser) {
                showMessage('请先登录并选择文件', 'error');
                return;
            }
            
            try {
                const content = editor.getValue();
                const response = await fetch(\`/api/files/\${currentFile.id}\`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showMessage('文件保存成功！', 'success');
                    currentFile.content = content;
                } else {
                    showMessage(data.message || '文件保存失败', 'error');
                }
            } catch (error) {
                showMessage('网络错误，请稍后重试', 'error');
            }
        }

        // UI update functions
        function updateUI() {
            const navGuest = document.getElementById('nav-guest');
            const navUser = document.getElementById('nav-user');
            const guestBanner = document.getElementById('guest-banner');
            const projectInfo = document.getElementById('project-info');
            const fileManager = document.getElementById('file-manager');
            
            if (currentUser) {
                navGuest.classList.add('hidden');
                navUser.classList.remove('hidden');
                guestBanner.classList.add('hidden');
                projectInfo.classList.remove('hidden');
                fileManager.classList.remove('hidden');
                
                document.getElementById('user-name').textContent = currentUser.displayName || currentUser.username;
                if (currentUser.avatarUrl) {
                    document.getElementById('user-avatar').src = currentUser.avatarUrl;
                    document.getElementById('user-avatar').style.display = 'block';
                }
            } else {
                navGuest.classList.remove('hidden');
                navUser.classList.add('hidden');
                guestBanner.classList.remove('hidden');
                projectInfo.classList.add('hidden');
                fileManager.classList.add('hidden');
            }
        }

        function updateProjectInfo() {
            if (currentProject) {
                document.getElementById('current-project-name').textContent = currentProject.name;
            }
        }

        function updateCurrentFileInfo() {
            if (currentFile) {
                const fileName = currentFile.name || 'untitled.py';
                document.getElementById('current-file-name').textContent = fileName;
            }
        }

        function displayProjects(projects) {
            const projectsList = document.getElementById('projects-list');
            projectsList.innerHTML = '';
            
            if (projects.length === 0) {
                projectsList.innerHTML = '<div class="text-gray-500 text-center py-8">暂无项目，创建您的第一个项目吧！</div>';
                return;
            }
            
            projects.forEach(project => {
                const projectDiv = document.createElement('div');
                projectDiv.className = 'border rounded p-4 hover:bg-gray-50 cursor-pointer';
                projectDiv.onclick = () => loadProject(project.id);
                
                projectDiv.innerHTML = \`
                    <div class="flex justify-between items-start">
                        <div class="flex-1">
                            <h4 class="font-medium text-gray-900">\${project.name}</h4>
                            <p class="text-sm text-gray-600 mt-1">\${project.description || '无描述'}</p>
                            <div class="flex items-center mt-2 space-x-2">
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    \${project.language}
                                </span>
                                \${project.isPublic ? '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">公开</span>' : '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">私有</span>'}
                            </div>
                        </div>
                        <div class="text-sm text-gray-500">
                            \${new Date(project.updatedAt).toLocaleDateString()}
                        </div>
                    </div>
                \`;
                
                projectsList.appendChild(projectDiv);
            });
        }

        function displayFiles(files) {
            const fileList = document.getElementById('file-list');
            fileList.innerHTML = '';
            
            files.forEach(file => {
                const fileDiv = document.createElement('div');
                fileDiv.className = 'flex items-center justify-between p-2 hover:bg-gray-100 rounded cursor-pointer';
                fileDiv.onclick = () => loadFile(file.id);
                
                fileDiv.innerHTML = \`
                    <div class="flex items-center">
                        <i class="fas fa-file-code text-blue-500 mr-2"></i>
                        <span class="text-sm">\${file.name}</span>
                    </div>
                    <div class="text-xs text-gray-500">
                        \${(file.size / 1024).toFixed(1)}KB
                    </div>
                \`;
                
                fileList.appendChild(fileDiv);
            });
        }

        // Modal functions
        function showLogin() {
            document.getElementById('login-modal').classList.add('show');
        }

        function showRegister() {
            document.getElementById('register-modal').classList.add('show');
        }

        function showProjectsModal() {
            document.getElementById('projects-modal').classList.add('show');
            loadUserProjects();
        }

        function showNewProjectForm() {
            document.getElementById('new-project-modal').classList.add('show');
        }

        function closeModal(modalId) {
            document.getElementById(modalId).classList.remove('show');
        }

        function switchToLogin() {
            closeModal('register-modal');
            showLogin();
        }

        function switchToRegister() {
            closeModal('login-modal');
            showRegister();
        }

        function toggleUserMenu() {
            const menu = document.getElementById('user-menu');
            menu.classList.toggle('hidden');
        }

        // Utility functions
        function showMessage(message, type = 'info') {
            const colors = {
                success: 'bg-green-100 border-green-400 text-green-700',
                error: 'bg-red-100 border-red-400 text-red-700',
                info: 'bg-blue-100 border-blue-400 text-blue-700'
            };
            
            const messageDiv = document.createElement('div');
            messageDiv.className = \`fixed top-4 right-4 p-4 border-l-4 rounded shadow-lg z-50 \${colors[type]}\`;
            messageDiv.textContent = message;
            
            document.body.appendChild(messageDiv);
            
            setTimeout(() => {
                document.body.removeChild(messageDiv);
            }, 3000);
        }

        // Override existing functions
        function newProject() {
            if (currentUser) {
                showNewProjectForm();
            } else {
                showMessage('请先登录以创建项目', 'error');
                showLogin();
            }
        }

        function saveProject() {
            if (!currentProject) {
                // Guest mode - download file
                const code = editor.getValue();
                const blob = new Blob([code], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'pylearn_project.py';
                a.click();
                URL.revokeObjectURL(url);
            } else {
                // Logged in - save to cloud
                saveCurrentFile();
            }
        }

        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
            initPyodide();
            checkAuthStatus();
        });

        // Close modals when clicking outside
        window.onclick = function(event) {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                if (event.target === modal) {
                    modal.classList.remove('show');
                }
            });
        };
    </script>
</body>
</html>`);
});

// 404 handler
app.notFound((c) => {
  return c.json({ 
    success: false,
    error: {
      code: 'RESOURCE_001',
      message: '请求的资源不存在'
    }
  }, 404);
});

export default app;