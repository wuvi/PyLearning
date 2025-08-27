import { D1Database } from '@cloudflare/workers-types';
import { File, FileContent, CreateFileRequest, UpdateFileRequest } from '../types/project';
import { generateId, hashContent } from '../utils/crypto';

export class FileService {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  /**
   * 创建文件
   */
  async createFile(projectId: string, userId: number, fileData: CreateFileRequest): Promise<{ success: boolean; file?: File; message?: string }> {
    try {
      // 验证项目权限
      const hasAccess = await this.checkProjectAccess(projectId, userId);
      if (!hasAccess) {
        return { success: false, message: 'Project not found or access denied' };
      }

      // 检查文件是否已存在
      const existingFile = await this.getFileByPath(projectId, fileData.path);
      if (existingFile) {
        return { success: false, message: 'File already exists at this path' };
      }

      const fileId = generateId();
      const content = fileData.content || '';
      const contentHash = await hashContent(content);

      const result = await this.db.prepare(`
        INSERT INTO files (id, project_id, name, path, content, size, hash, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).bind(
        fileId,
        projectId,
        fileData.name,
        fileData.path,
        content,
        content.length,
        contentHash
      ).run();

      if (!result.success) {
        return { success: false, message: 'Failed to create file' };
      }

      // 创建初始版本记录
      await this.createFileVersion(fileId, projectId, content, contentHash, 1, 'Initial version');

      const file = await this.getFileById(fileId, userId);
      return file ? { success: true, file } : { success: false, message: 'Failed to retrieve created file' };
    } catch (error) {
      console.error('Create file error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  /**
   * 获取项目文件列表
   */
  async getProjectFiles(projectId: string, userId: number, path?: string): Promise<{ success: boolean; files?: File[]; message?: string }> {
    try {
      // 验证项目权限
      const hasAccess = await this.checkProjectAccess(projectId, userId);
      if (!hasAccess) {
        return { success: false, message: 'Project not found or access denied' };
      }

      let whereClause = 'WHERE project_id = ?';
      let params: any[] = [projectId];

      if (path) {
        whereClause += ' AND path LIKE ?';
        params.push(`${path}%`);
      }

      const result = await this.db.prepare(`
        SELECT id, project_id, name, path, size, hash, created_at, updated_at
        FROM files
        ${whereClause}
        ORDER BY path, name
      `).bind(...params).all();

      const files = result.results.map((row: any) => this.mapRowToFile(row));

      return { success: true, files };
    } catch (error) {
      console.error('Get project files error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  /**
   * 根据ID获取文件
   */
  async getFileById(fileId: string, userId: number, includeContent = false): Promise<File | null> {
    try {
      const query = includeContent 
        ? 'SELECT * FROM files WHERE id = ?'
        : 'SELECT id, project_id, name, path, size, hash, created_at, updated_at FROM files WHERE id = ?';

      const result = await this.db.prepare(query).bind(fileId).first();

      if (!result) return null;

      // 验证项目权限
      const hasAccess = await this.checkProjectAccess(result.project_id as string, userId);
      if (!hasAccess) {
        return null;
      }

      return this.mapRowToFile(result, includeContent);
    } catch (error) {
      console.error('Get file by ID error:', error);
      return null;
    }
  }

  /**
   * 根据路径获取文件
   */
  async getFileByPath(projectId: string, path: string): Promise<File | null> {
    try {
      const result = await this.db.prepare(`
        SELECT id, project_id, name, path, size, hash, created_at, updated_at
        FROM files
        WHERE project_id = ? AND path = ?
      `).bind(projectId, path).first();

      if (!result) return null;

      return this.mapRowToFile(result);
    } catch (error) {
      console.error('Get file by path error:', error);
      return null;
    }
  }

  /**
   * 获取文件内容
   */
  async getFileContent(fileId: string, userId: number): Promise<{ success: boolean; content?: FileContent; message?: string }> {
    try {
      const file = await this.getFileById(fileId, userId, true);
      if (!file) {
        return { success: false, message: 'File not found or access denied' };
      }

      return {
        success: true,
        content: {
          fileId,
          content: file.content || '',
          size: file.size,
          hash: file.hash,
          updatedAt: file.updatedAt
        }
      };
    } catch (error) {
      console.error('Get file content error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  /**
   * 更新文件内容
   */
  async updateFile(fileId: string, userId: number, updates: UpdateFileRequest): Promise<{ success: boolean; file?: File; message?: string }> {
    try {
      const file = await this.getFileById(fileId, userId, true);
      if (!file) {
        return { success: false, message: 'File not found or access denied' };
      }

      const newContent = updates.content;
      const newHash = await hashContent(newContent);

      // 检查内容是否有变化
      if (newHash === file.hash) {
        return { success: true, file };
      }

      // 获取当前版本号
      const versionResult = await this.db.prepare(`
        SELECT MAX(version) as max_version
        FROM file_versions
        WHERE file_id = ?
      `).bind(fileId).first();

      const nextVersion = (versionResult?.max_version as number || 0) + 1;

      // 更新文件
      await this.db.prepare(`
        UPDATE files
        SET content = ?, size = ?, hash = ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(newContent, newContent.length, newHash, fileId).run();

      // 创建版本记录
      await this.createFileVersion(
        fileId,
        file.projectId,
        newContent,
        newHash,
        nextVersion,
        updates.autoSave ? 'Auto save' : 'Manual save'
      );

      const updatedFile = await this.getFileById(fileId, userId);
      return updatedFile ? { success: true, file: updatedFile } : { success: false, message: 'Failed to retrieve updated file' };
    } catch (error) {
      console.error('Update file error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(fileId: string, userId: number): Promise<{ success: boolean; message?: string }> {
    try {
      const file = await this.getFileById(fileId, userId);
      if (!file) {
        return { success: false, message: 'File not found or access denied' };
      }

      // 删除文件和相关版本记录
      await this.db.batch([
        this.db.prepare('DELETE FROM file_versions WHERE file_id = ?').bind(fileId),
        this.db.prepare('DELETE FROM files WHERE id = ?').bind(fileId)
      ]);

      return { success: true };
    } catch (error) {
      console.error('Delete file error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  /**
   * 重命名文件
   */
  async renameFile(fileId: string, userId: number, newName: string, newPath?: string): Promise<{ success: boolean; file?: File; message?: string }> {
    try {
      const file = await this.getFileById(fileId, userId);
      if (!file) {
        return { success: false, message: 'File not found or access denied' };
      }

      const finalPath = newPath || file.path.replace(/[^/]*$/, newName);

      // 检查新路径是否已存在
      const existingFile = await this.getFileByPath(file.projectId, finalPath);
      if (existingFile && existingFile.id !== fileId) {
        return { success: false, message: 'A file already exists at the target path' };
      }

      await this.db.prepare(`
        UPDATE files
        SET name = ?, path = ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(newName, finalPath, fileId).run();

      const updatedFile = await this.getFileById(fileId, userId);
      return updatedFile ? { success: true, file: updatedFile } : { success: false, message: 'Failed to retrieve updated file' };
    } catch (error) {
      console.error('Rename file error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  /**
   * 移动文件
   */
  async moveFile(fileId: string, userId: number, newPath: string): Promise<{ success: boolean; file?: File; message?: string }> {
    try {
      const file = await this.getFileById(fileId, userId);
      if (!file) {
        return { success: false, message: 'File not found or access denied' };
      }

      // 检查新路径是否已存在
      const existingFile = await this.getFileByPath(file.projectId, newPath);
      if (existingFile && existingFile.id !== fileId) {
        return { success: false, message: 'A file already exists at the target path' };
      }

      const newName = newPath.split('/').pop() || file.name;

      await this.db.prepare(`
        UPDATE files
        SET name = ?, path = ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(newName, newPath, fileId).run();

      const updatedFile = await this.getFileById(fileId, userId);
      return updatedFile ? { success: true, file: updatedFile } : { success: false, message: 'Failed to retrieve updated file' };
    } catch (error) {
      console.error('Move file error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  /**
   * 获取文件版本历史
   */
  async getFileVersions(fileId: string, userId: number, limit = 20): Promise<{ success: boolean; versions?: any[]; message?: string }> {
    try {
      const file = await this.getFileById(fileId, userId);
      if (!file) {
        return { success: false, message: 'File not found or access denied' };
      }

      const result = await this.db.prepare(`
        SELECT version, content_hash, description, created_at
        FROM file_versions
        WHERE file_id = ?
        ORDER BY version DESC
        LIMIT ?
      `).bind(fileId, limit).all();

      const versions = result.results.map((row: any) => ({
        version: row.version,
        contentHash: row.content_hash,
        description: row.description,
        createdAt: row.created_at
      }));

      return { success: true, versions };
    } catch (error) {
      console.error('Get file versions error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  /**
   * 获取特定版本的文件内容
   */
  async getFileVersionContent(fileId: string, version: number, userId: number): Promise<{ success: boolean; content?: string; message?: string }> {
    try {
      const file = await this.getFileById(fileId, userId);
      if (!file) {
        return { success: false, message: 'File not found or access denied' };
      }

      const result = await this.db.prepare(`
        SELECT content
        FROM file_versions
        WHERE file_id = ? AND version = ?
      `).bind(fileId, version).first();

      if (!result) {
        return { success: false, message: 'Version not found' };
      }

      return { success: true, content: result.content as string };
    } catch (error) {
      console.error('Get file version content error:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  /**
   * 映射数据库行到文件对象
   */
  private mapRowToFile(row: any, includeContent = false): File {
    const file: File = {
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      path: row.path,
      size: row.size,
      hash: row.hash,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    if (includeContent) {
      file.content = row.content;
    }

    return file;
  }

  /**
   * 检查项目访问权限
   */
  private async checkProjectAccess(projectId: string, userId: number): Promise<boolean> {
    try {
      const result = await this.db.prepare(`
        SELECT user_id, is_public
        FROM projects
        WHERE id = ?
      `).bind(projectId).first();

      if (!result) return false;

      // 项目所有者或公开项目可以访问
      return result.user_id === userId || Boolean(result.is_public);
    } catch (error) {
      console.error('Check project access error:', error);
      return false;
    }
  }

  /**
   * 创建文件版本记录
   */
  private async createFileVersion(fileId: string, projectId: string, content: string, contentHash: string, version: number, description: string): Promise<void> {
    try {
      await this.db.prepare(`
        INSERT INTO file_versions (file_id, project_id, version, content, content_hash, description, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(fileId, projectId, version, content, contentHash, description).run();
    } catch (error) {
      console.error('Create file version error:', error);
    }
  }
}