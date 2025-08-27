import { D1Database } from '@cloudflare/workers-types';
import { Project, CreateProjectRequest, UpdateProjectRequest } from '../types/project';
import { generateId } from '../utils/crypto';

export class ProjectService {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  /**
   * 创建新项目
   */
  async createProject(userId: number, projectData: CreateProjectRequest): Promise<{ success: boolean; project?: Project; message?: string }> {
    try {
      const projectId = generateId();
      
      const result = await this.db.prepare(`
        INSERT INTO projects (id, user_id, name, description, language, is_public, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).bind(
        projectId,
        userId,
        projectData.name,
        projectData.description || null,
        projectData.language || 'python',
        projectData.isPublic || false
      ).run();

      if (!result.success) {
        return { success: false, message: 'Failed to create project' };
      }

      // 创建项目标签关联
      if (projectData.tags && projectData.tags.length > 0) {
        await this.addProjectTags(projectId, projectData.tags);
      }

      // 如果有模板，创建初始文件
      if (projectData.template) {
        await this.createTemplateFiles(projectId, projectData.template);
      } else {
        // 创建默认的main.py文件
        await this.createDefaultFile(projectId, projectData.language || 'python');
      }

      const project = await this.getProjectById(projectId, userId);
      return project ? { success: true, project } : { success: false, message: 'Failed to retrieve created project' };
    } catch (error) {
      console.error('Create project error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  /**
   * 获取用户项目列表
   */
  async getUserProjects(userId: number, page = 1, limit = 20, search?: string): Promise<{ success: boolean; projects?: Project[]; total?: number; message?: string }> {
    try {
      const offset = (page - 1) * limit;
      
      let whereClause = 'WHERE p.user_id = ?';
      let params: any[] = [userId];
      
      if (search) {
        whereClause += ' AND (p.name LIKE ? OR p.description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      // 获取项目列表
      const projectsResult = await this.db.prepare(`
        SELECT p.*, u.username, u.display_name as user_display_name
        FROM projects p
        JOIN users u ON p.user_id = u.id
        ${whereClause}
        ORDER BY p.updated_at DESC
        LIMIT ? OFFSET ?
      `).bind(...params, limit, offset).all();

      // 获取总数
      const countResult = await this.db.prepare(`
        SELECT COUNT(*) as count
        FROM projects p
        ${whereClause}
      `).bind(...params).first();

      const projects = await Promise.all(
        projectsResult.results.map(async (row: any) => {
          const project = this.mapRowToProject(row);
          // 获取项目标签
          project.tags = await this.getProjectTags(project.id);
          return project;
        })
      );

      return {
        success: true,
        projects,
        total: countResult?.count as number || 0
      };
    } catch (error) {
      console.error('Get user projects error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  /**
   * 获取公开项目列表
   */
  async getPublicProjects(page = 1, limit = 20, search?: string): Promise<{ success: boolean; projects?: Project[]; total?: number; message?: string }> {
    try {
      const offset = (page - 1) * limit;
      
      let whereClause = 'WHERE p.is_public = 1';
      let params: any[] = [];
      
      if (search) {
        whereClause += ' AND (p.name LIKE ? OR p.description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      // 获取项目列表
      const projectsResult = await this.db.prepare(`
        SELECT p.*, u.username, u.display_name as user_display_name
        FROM projects p
        JOIN users u ON p.user_id = u.id
        ${whereClause}
        ORDER BY p.updated_at DESC
        LIMIT ? OFFSET ?
      `).bind(...params, limit, offset).all();

      // 获取总数
      const countResult = await this.db.prepare(`
        SELECT COUNT(*) as count
        FROM projects p
        ${whereClause}
      `).bind(...params).first();

      const projects = await Promise.all(
        projectsResult.results.map(async (row: any) => {
          const project = this.mapRowToProject(row);
          // 获取项目标签
          project.tags = await this.getProjectTags(project.id);
          return project;
        })
      );

      return {
        success: true,
        projects,
        total: countResult?.count as number || 0
      };
    } catch (error) {
      console.error('Get public projects error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  /**
   * 根据ID获取项目
   */
  async getProjectById(projectId: string, userId?: number): Promise<Project | null> {
    try {
      const result = await this.db.prepare(`
        SELECT p.*, u.username, u.display_name as user_display_name
        FROM projects p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = ?
      `).bind(projectId).first();

      if (!result) return null;

      const project = this.mapRowToProject(result);
      
      // 检查访问权限
      if (!project.isPublic && userId !== project.userId) {
        return null;
      }

      // 获取项目标签
      project.tags = await this.getProjectTags(projectId);

      return project;
    } catch (error) {
      console.error('Get project by ID error:', error);
      return null;
    }
  }

  /**
   * 更新项目信息
   */
  async updateProject(projectId: string, userId: number, updates: UpdateProjectRequest): Promise<{ success: boolean; project?: Project; message?: string }> {
    try {
      // 验证权限
      const existingProject = await this.getProjectById(projectId, userId);
      if (!existingProject || existingProject.userId !== userId) {
        return { success: false, message: 'Project not found or access denied' };
      }

      const updateFields: string[] = [];
      const updateValues: any[] = [];

      if (updates.name !== undefined) {
        updateFields.push('name = ?');
        updateValues.push(updates.name);
      }
      if (updates.description !== undefined) {
        updateFields.push('description = ?');
        updateValues.push(updates.description);
      }
      if (updates.isPublic !== undefined) {
        updateFields.push('is_public = ?');
        updateValues.push(updates.isPublic);
      }

      if (updateFields.length > 0) {
        updateValues.push(projectId);

        await this.db.prepare(`
          UPDATE projects 
          SET ${updateFields.join(', ')}, updated_at = datetime('now')
          WHERE id = ?
        `).bind(...updateValues).run();
      }

      // 更新标签
      if (updates.tags !== undefined) {
        await this.updateProjectTags(projectId, updates.tags);
      }

      const project = await this.getProjectById(projectId, userId);
      return project ? { success: true, project } : { success: false, message: 'Failed to retrieve updated project' };
    } catch (error) {
      console.error('Update project error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  /**
   * 删除项目
   */
  async deleteProject(projectId: string, userId: number): Promise<{ success: boolean; message?: string }> {
    try {
      // 验证权限
      const project = await this.getProjectById(projectId, userId);
      if (!project || project.userId !== userId) {
        return { success: false, message: 'Project not found or access denied' };
      }

      // 删除项目相关数据（级联删除）
      await this.db.batch([
        this.db.prepare('DELETE FROM project_tags WHERE project_id = ?').bind(projectId),
        this.db.prepare('DELETE FROM files WHERE project_id = ?').bind(projectId),
        this.db.prepare('DELETE FROM file_versions WHERE project_id = ?').bind(projectId),
        this.db.prepare('DELETE FROM project_shares WHERE project_id = ?').bind(projectId),
        this.db.prepare('DELETE FROM projects WHERE id = ?').bind(projectId)
      ]);

      return { success: true };
    } catch (error) {
      console.error('Delete project error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  /**
   * 获取项目统计信息
   */
  async getProjectStats(projectId: string, userId: number): Promise<{ success: boolean; stats?: any; message?: string }> {
    try {
      // 验证权限
      const project = await this.getProjectById(projectId, userId);
      if (!project || project.userId !== userId) {
        return { success: false, message: 'Project not found or access denied' };
      }

      const [fileCount, totalSize, lastModified] = await Promise.all([
        this.db.prepare('SELECT COUNT(*) as count FROM files WHERE project_id = ?').bind(projectId).first(),
        this.db.prepare('SELECT SUM(size) as total FROM files WHERE project_id = ?').bind(projectId).first(),
        this.db.prepare('SELECT MAX(updated_at) as last_modified FROM files WHERE project_id = ?').bind(projectId).first()
      ]);

      return {
        success: true,
        stats: {
          fileCount: fileCount?.count || 0,
          totalSize: totalSize?.total || 0,
          lastModified: lastModified?.last_modified || project.updatedAt
        }
      };
    } catch (error) {
      console.error('Get project stats error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  /**
   * 映射数据库行到项目对象
   */
  private mapRowToProject(row: any): Project {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      language: row.language,
      isPublic: Boolean(row.is_public),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      username: row.username,
      userDisplayName: row.user_display_name,
      tags: [] // 将在后续填充
    };
  }

  /**
   * 获取项目标签
   */
  private async getProjectTags(projectId: string): Promise<string[]> {
    try {
      const result = await this.db.prepare(`
        SELECT t.name
        FROM project_tags pt
        JOIN tags t ON pt.tag_id = t.id
        WHERE pt.project_id = ?
        ORDER BY t.name
      `).bind(projectId).all();

      return result.results.map((row: any) => row.name);
    } catch (error) {
      console.error('Get project tags error:', error);
      return [];
    }
  }

  /**
   * 添加项目标签
   */
  private async addProjectTags(projectId: string, tags: string[]): Promise<void> {
    try {
      for (const tagName of tags) {
        // 确保标签存在
        await this.db.prepare(`
          INSERT OR IGNORE INTO tags (name, created_at)
          VALUES (?, datetime('now'))
        `).bind(tagName).run();

        // 获取标签ID
        const tagResult = await this.db.prepare('SELECT id FROM tags WHERE name = ?').bind(tagName).first();
        
        if (tagResult) {
          // 创建项目标签关联
          await this.db.prepare(`
            INSERT OR IGNORE INTO project_tags (project_id, tag_id, created_at)
            VALUES (?, ?, datetime('now'))
          `).bind(projectId, tagResult.id).run();
        }
      }
    } catch (error) {
      console.error('Add project tags error:', error);
    }
  }

  /**
   * 更新项目标签
   */
  private async updateProjectTags(projectId: string, tags: string[]): Promise<void> {
    try {
      // 删除现有标签关联
      await this.db.prepare('DELETE FROM project_tags WHERE project_id = ?').bind(projectId).run();

      // 添加新标签
      if (tags.length > 0) {
        await this.addProjectTags(projectId, tags);
      }
    } catch (error) {
      console.error('Update project tags error:', error);
    }
  }

  /**
   * 创建模板文件
   */
  private async createTemplateFiles(projectId: string, template: string): Promise<void> {
    try {
      switch (template) {
        case 'basic-python':
          await this.createFileForProject(projectId, 'main.py', 'print("Hello, World!")');
          break;
        case 'flask-app':
          await this.createFileForProject(projectId, 'app.py', `from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello():
    return "Hello, World!"

if __name__ == '__main__':
    app.run(debug=True)
`);
          await this.createFileForProject(projectId, 'requirements.txt', 'Flask==2.3.3');
          break;
        case 'data-analysis':
          await this.createFileForProject(projectId, 'analysis.py', `import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

# Your data analysis code here
print("Data Analysis Project")
`);
          await this.createFileForProject(projectId, 'requirements.txt', `pandas>=1.5.0
numpy>=1.24.0
matplotlib>=3.6.0
`);
          break;
        default:
          await this.createDefaultFile(projectId, 'python');
      }
    } catch (error) {
      console.error('Create template files error:', error);
    }
  }

  /**
   * 创建默认文件
   */
  private async createDefaultFile(projectId: string, language: string): Promise<void> {
    try {
      switch (language) {
        case 'python':
          await this.createFileForProject(projectId, 'main.py', '# Welcome to PyLearn!\nprint("Hello, World!")');
          break;
        case 'javascript':
          await this.createFileForProject(projectId, 'main.js', '// Welcome to PyLearn!\nconsole.log("Hello, World!");');
          break;
        default:
          await this.createFileForProject(projectId, 'main.py', '# Welcome to PyLearn!\nprint("Hello, World!")');
      }
    } catch (error) {
      console.error('Create default file error:', error);
    }
  }

  /**
   * 为项目创建文件
   */
  private async createFileForProject(projectId: string, fileName: string, content: string): Promise<void> {
    try {
      const fileId = generateId();
      
      await this.db.prepare(`
        INSERT INTO files (id, project_id, name, path, content, size, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).bind(
        fileId,
        projectId,
        fileName,
        `/${fileName}`,
        content,
        content.length
      ).run();
    } catch (error) {
      console.error('Create file for project error:', error);
    }
  }
}