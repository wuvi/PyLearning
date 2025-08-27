// 项目相关类型定义

export interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string;
  language: string;
  isPublic: boolean;
  isDeleted: boolean;
  template?: string;
  tags?: string[];
  settings?: ProjectSettings;
  starCount: number;
  viewCount: number;
  forkCount: number;
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
}

export interface ProjectSettings {
  pythonVersion: string;
  allowedPackages: string[];
  entryFile: string;
  autoRun: boolean;
}

export interface File {
  id: string;
  projectId: string;
  name: string;
  path: string;
  parentId?: string;
  contentHash?: string;
  size: number;
  mimeType?: string;
  isBinary: boolean;
  isDeleted: boolean;
  version: number;
  encoding: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileContent extends File {
  content: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  language?: string;
  isPublic?: boolean;
  template?: string;
  tags?: string[];
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  isPublic?: boolean;
  tags?: string[];
}

export interface CreateFileRequest {
  name: string;
  path: string;
  content?: string;
  parentPath?: string;
}

export interface UpdateFileRequest {
  content: string;
  autoSave?: boolean;
}

export interface ProjectListResponse {
  projects: Project[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface RunCodeRequest {
  projectId?: string;
  fileId?: string;
  code: string;
  stdin?: string;
  timeout?: number;
  packages?: string[];
}

export interface RunCodeResponse {
  runId: string;
  status: 'completed' | 'failed' | 'timeout';
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  executionTime: number;
  memoryUsage?: number;
  packageVersions?: Record<string, string>;
  createdAt: string;
}