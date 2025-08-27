import { Hono } from 'hono';
import { validator } from 'hono/validator';
import { ProjectService } from '../services/ProjectService';
import { FileService } from '../services/FileService';
import { authMiddleware } from '../middleware/auth';
import { 
  createProjectSchema, 
  updateProjectSchema,
  paginationSchema 
} from '../utils/validation';
import { AppBindings } from '../types/bindings';

const projects = new Hono<{ Bindings: AppBindings }>();

/**
 * GET /projects - 获取用户项目列表
 */
projects.get('/',
  authMiddleware,
  validator('query', (value, c) => {
    const parsed = paginationSchema.safeParse(value);
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
      const projectService = new ProjectService(DB);
      const user = c.get('user');
      const { page, limit, search } = c.req.valid('query');

      const result = await projectService.getUserProjects(user.id, page, limit, search);

      if (!result.success) {
        return c.json({
          success: false,
          message: result.message || 'Failed to get projects'
        }, 400);
      }

      return c.json({
        success: true,
        projects: result.projects,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil((result.total || 0) / limit)
        }
      });
    } catch (error) {
      console.error('Get projects error:', error);
      return c.json({
        success: false,
        message: 'Internal server error'
      }, 500);
    }
  }
);

/**
 * GET /projects/public - 获取公开项目列表
 */
projects.get('/public',
  validator('query', (value, c) => {
    const parsed = paginationSchema.safeParse(value);
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
      const projectService = new ProjectService(DB);
      const { page, limit, search } = c.req.valid('query');

      const result = await projectService.getPublicProjects(page, limit, search);

      if (!result.success) {
        return c.json({
          success: false,
          message: result.message || 'Failed to get public projects'
        }, 400);
      }

      return c.json({
        success: true,
        projects: result.projects,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil((result.total || 0) / limit)
        }
      });
    } catch (error) {
      console.error('Get public projects error:', error);
      return c.json({
        success: false,
        message: 'Internal server error'
      }, 500);
    }
  }
);

/**
 * POST /projects - 创建新项目
 */
projects.post('/',
  authMiddleware,
  validator('json', (value, c) => {
    const parsed = createProjectSchema.safeParse(value);
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
      const projectService = new ProjectService(DB);
      const user = c.get('user');
      const projectData = c.req.valid('json');

      const result = await projectService.createProject(user.id, projectData);

      if (!result.success) {
        return c.json({
          success: false,
          message: result.message || 'Failed to create project'
        }, 400);
      }

      return c.json({
        success: true,
        message: 'Project created successfully',
        project: result.project
      }, 201);
    } catch (error) {
      console.error('Create project error:', error);
      return c.json({
        success: false,
        message: 'Internal server error'
      }, 500);
    }
  }
);

/**
 * GET /projects/:id - 获取项目详情
 */
projects.get('/:id', async (c) => {
  try {
    const { DB } = c.env;
    const projectService = new ProjectService(DB);
    const projectId = c.req.param('id');
    
    // 获取用户ID（如果已认证）
    let userId: number | undefined;
    try {
      const user = c.get('user');
      userId = user?.id;
    } catch {
      // 未认证用户可以访问公开项目
    }

    const project = await projectService.getProjectById(projectId, userId);

    if (!project) {
      return c.json({
        success: false,
        message: 'Project not found or access denied'
      }, 404);
    }

    return c.json({
      success: true,
      project
    });
  } catch (error) {
    console.error('Get project error:', error);
    return c.json({
      success: false,
      message: 'Internal server error'
    }, 500);
  }
});

/**
 * PUT /projects/:id - 更新项目信息
 */
projects.put('/:id',
  authMiddleware,
  validator('json', (value, c) => {
    const parsed = updateProjectSchema.safeParse(value);
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
      const projectService = new ProjectService(DB);
      const user = c.get('user');
      const projectId = c.req.param('id');
      const updates = c.req.valid('json');

      const result = await projectService.updateProject(projectId, user.id, updates);

      if (!result.success) {
        return c.json({
          success: false,
          message: result.message || 'Failed to update project'
        }, 400);
      }

      return c.json({
        success: true,
        message: 'Project updated successfully',
        project: result.project
      });
    } catch (error) {
      console.error('Update project error:', error);
      return c.json({
        success: false,
        message: 'Internal server error'
      }, 500);
    }
  }
);

/**
 * DELETE /projects/:id - 删除项目
 */
projects.delete('/:id', authMiddleware, async (c) => {
  try {
    const { DB } = c.env;
    const projectService = new ProjectService(DB);
    const user = c.get('user');
    const projectId = c.req.param('id');

    const result = await projectService.deleteProject(projectId, user.id);

    if (!result.success) {
      return c.json({
        success: false,
        message: result.message || 'Failed to delete project'
      }, 400);
    }

    return c.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Delete project error:', error);
    return c.json({
      success: false,
      message: 'Internal server error'
    }, 500);
  }
});

/**
 * GET /projects/:id/stats - 获取项目统计信息
 */
projects.get('/:id/stats', authMiddleware, async (c) => {
  try {
    const { DB } = c.env;
    const projectService = new ProjectService(DB);
    const user = c.get('user');
    const projectId = c.req.param('id');

    const result = await projectService.getProjectStats(projectId, user.id);

    if (!result.success) {
      return c.json({
        success: false,
        message: result.message || 'Failed to get project stats'
      }, 400);
    }

    return c.json({
      success: true,
      stats: result.stats
    });
  } catch (error) {
    console.error('Get project stats error:', error);
    return c.json({
      success: false,
      message: 'Internal server error'
    }, 500);
  }
});

/**
 * GET /projects/:id/files - 获取项目文件列表
 */
projects.get('/:id/files', async (c) => {
  try {
    const { DB } = c.env;
    const fileService = new FileService(DB);
    const projectId = c.req.param('id');
    const path = c.req.query('path');
    
    // 获取用户ID（如果已认证）
    let userId: number | undefined;
    try {
      const user = c.get('user');
      userId = user?.id;
    } catch {
      // 未认证用户可以访问公开项目的文件
      userId = 0; // 使用0作为匿名用户ID
    }

    const result = await fileService.getProjectFiles(projectId, userId!, path);

    if (!result.success) {
      return c.json({
        success: false,
        message: result.message || 'Failed to get files'
      }, 400);
    }

    return c.json({
      success: true,
      files: result.files
    });
  } catch (error) {
    console.error('Get project files error:', error);
    return c.json({
      success: false,
      message: 'Internal server error'
    }, 500);
  }
});

export default projects;