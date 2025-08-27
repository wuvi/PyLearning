import { Hono } from 'hono';
import { validator } from 'hono/validator';
import { FileService } from '../services/FileService';
import { authMiddleware } from '../middleware/auth';
import { 
  createFileSchema, 
  updateFileSchema 
} from '../utils/validation';
import { AppBindings } from '../types/bindings';

const files = new Hono<{ Bindings: AppBindings }>();

/**
 * POST /files - 创建新文件
 */
files.post('/',
  authMiddleware,
  validator('json', (value, c) => {
    const parsed = createFileSchema.safeParse(value);
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
      const fileService = new FileService(DB);
      const user = c.get('user');
      const fileData = c.req.valid('json');
      const projectId = c.req.query('projectId');

      if (!projectId) {
        return c.json({
          success: false,
          message: 'Project ID is required'
        }, 400);
      }

      const result = await fileService.createFile(projectId, user.id, fileData);

      if (!result.success) {
        return c.json({
          success: false,
          message: result.message || 'Failed to create file'
        }, 400);
      }

      return c.json({
        success: true,
        message: 'File created successfully',
        file: result.file
      }, 201);
    } catch (error) {
      console.error('Create file error:', error);
      return c.json({
        success: false,
        message: 'Internal server error'
      }, 500);
    }
  }
);

/**
 * GET /files/:id - 获取文件信息
 */
files.get('/:id', async (c) => {
  try {
    const { DB } = c.env;
    const fileService = new FileService(DB);
    const fileId = c.req.param('id');
    
    // 获取用户ID（如果已认证）
    let userId: number | undefined;
    try {
      const user = c.get('user');
      userId = user?.id;
    } catch {
      // 未认证用户可以访问公开项目的文件
      userId = 0;
    }

    const file = await fileService.getFileById(fileId, userId!);

    if (!file) {
      return c.json({
        success: false,
        message: 'File not found or access denied'
      }, 404);
    }

    return c.json({
      success: true,
      file
    });
  } catch (error) {
    console.error('Get file error:', error);
    return c.json({
      success: false,
      message: 'Internal server error'
    }, 500);
  }
});

/**
 * GET /files/:id/content - 获取文件内容
 */
files.get('/:id/content', async (c) => {
  try {
    const { DB } = c.env;
    const fileService = new FileService(DB);
    const fileId = c.req.param('id');
    
    // 获取用户ID（如果已认证）
    let userId: number | undefined;
    try {
      const user = c.get('user');
      userId = user?.id;
    } catch {
      // 未认证用户可以访问公开项目的文件
      userId = 0;
    }

    const result = await fileService.getFileContent(fileId, userId!);

    if (!result.success) {
      return c.json({
        success: false,
        message: result.message || 'Failed to get file content'
      }, result.message === 'File not found or access denied' ? 404 : 400);
    }

    return c.json({
      success: true,
      content: result.content
    });
  } catch (error) {
    console.error('Get file content error:', error);
    return c.json({
      success: false,
      message: 'Internal server error'
    }, 500);
  }
});

/**
 * PUT /files/:id - 更新文件内容
 */
files.put('/:id',
  authMiddleware,
  validator('json', (value, c) => {
    const parsed = updateFileSchema.safeParse(value);
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
      const fileService = new FileService(DB);
      const user = c.get('user');
      const fileId = c.req.param('id');
      const updates = c.req.valid('json');

      const result = await fileService.updateFile(fileId, user.id, updates);

      if (!result.success) {
        return c.json({
          success: false,
          message: result.message || 'Failed to update file'
        }, 400);
      }

      return c.json({
        success: true,
        message: 'File updated successfully',
        file: result.file
      });
    } catch (error) {
      console.error('Update file error:', error);
      return c.json({
        success: false,
        message: 'Internal server error'
      }, 500);
    }
  }
);

/**
 * DELETE /files/:id - 删除文件
 */
files.delete('/:id', authMiddleware, async (c) => {
  try {
    const { DB } = c.env;
    const fileService = new FileService(DB);
    const user = c.get('user');
    const fileId = c.req.param('id');

    const result = await fileService.deleteFile(fileId, user.id);

    if (!result.success) {
      return c.json({
        success: false,
        message: result.message || 'Failed to delete file'
      }, 400);
    }

    return c.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Delete file error:', error);
    return c.json({
      success: false,
      message: 'Internal server error'
    }, 500);
  }
});

/**
 * POST /files/:id/rename - 重命名文件
 */
files.post('/:id/rename',
  authMiddleware,
  validator('json', (value, c) => {
    const schema = c.req.valid('json', {
      name: 'string',
      path: 'string?'
    });
    return schema;
  }),
  async (c) => {
    try {
      const { DB } = c.env;
      const fileService = new FileService(DB);
      const user = c.get('user');
      const fileId = c.req.param('id');
      const { name, path } = await c.req.json();

      if (!name || name.trim().length === 0) {
        return c.json({
          success: false,
          message: 'File name is required'
        }, 400);
      }

      const result = await fileService.renameFile(fileId, user.id, name.trim(), path);

      if (!result.success) {
        return c.json({
          success: false,
          message: result.message || 'Failed to rename file'
        }, 400);
      }

      return c.json({
        success: true,
        message: 'File renamed successfully',
        file: result.file
      });
    } catch (error) {
      console.error('Rename file error:', error);
      return c.json({
        success: false,
        message: 'Internal server error'
      }, 500);
    }
  }
);

/**
 * POST /files/:id/move - 移动文件
 */
files.post('/:id/move',
  authMiddleware,
  validator('json', (value, c) => {
    const schema = c.req.valid('json', {
      path: 'string'
    });
    return schema;
  }),
  async (c) => {
    try {
      const { DB } = c.env;
      const fileService = new FileService(DB);
      const user = c.get('user');
      const fileId = c.req.param('id');
      const { path } = await c.req.json();

      if (!path || path.trim().length === 0) {
        return c.json({
          success: false,
          message: 'Target path is required'
        }, 400);
      }

      const result = await fileService.moveFile(fileId, user.id, path.trim());

      if (!result.success) {
        return c.json({
          success: false,
          message: result.message || 'Failed to move file'
        }, 400);
      }

      return c.json({
        success: true,
        message: 'File moved successfully',
        file: result.file
      });
    } catch (error) {
      console.error('Move file error:', error);
      return c.json({
        success: false,
        message: 'Internal server error'
      }, 500);
    }
  }
);

/**
 * GET /files/:id/versions - 获取文件版本历史
 */
files.get('/:id/versions', authMiddleware, async (c) => {
  try {
    const { DB } = c.env;
    const fileService = new FileService(DB);
    const user = c.get('user');
    const fileId = c.req.param('id');
    const limit = parseInt(c.req.query('limit') || '20');

    const result = await fileService.getFileVersions(fileId, user.id, limit);

    if (!result.success) {
      return c.json({
        success: false,
        message: result.message || 'Failed to get file versions'
      }, 400);
    }

    return c.json({
      success: true,
      versions: result.versions
    });
  } catch (error) {
    console.error('Get file versions error:', error);
    return c.json({
      success: false,
      message: 'Internal server error'
    }, 500);
  }
});

/**
 * GET /files/:id/versions/:version - 获取特定版本的文件内容
 */
files.get('/:id/versions/:version', authMiddleware, async (c) => {
  try {
    const { DB } = c.env;
    const fileService = new FileService(DB);
    const user = c.get('user');
    const fileId = c.req.param('id');
    const version = parseInt(c.req.param('version'));

    if (isNaN(version) || version <= 0) {
      return c.json({
        success: false,
        message: 'Invalid version number'
      }, 400);
    }

    const result = await fileService.getFileVersionContent(fileId, version, user.id);

    if (!result.success) {
      return c.json({
        success: false,
        message: result.message || 'Failed to get version content'
      }, result.message === 'Version not found' ? 404 : 400);
    }

    return c.json({
      success: true,
      content: result.content
    });
  } catch (error) {
    console.error('Get file version content error:', error);
    return c.json({
      success: false,
      message: 'Internal server error'
    }, 500);
  }
});

export default files;