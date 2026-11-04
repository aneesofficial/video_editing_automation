import fs from 'node:fs';
import path from 'node:path';
import { env } from '../../config/env.js';

export class StorageService {
  private baseDir: string;
  public uploadsDir: string;
  public exportsDir: string;
  public tempDir: string;
  public thumbnailsDir: string;

  constructor() {
    this.baseDir = path.resolve(process.cwd(), env.STORAGE_DIR);
    this.uploadsDir = path.join(this.baseDir, 'uploads');
    this.exportsDir = path.join(this.baseDir, 'exports');
    this.tempDir = path.join(this.baseDir, 'temp');
    this.thumbnailsDir = path.join(this.baseDir, 'thumbnails');

    this.ensureDirs();
  }

  private ensureDirs(): void {
    const dirs = [this.baseDir, this.uploadsDir, this.exportsDir, this.tempDir, this.thumbnailsDir];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  public getUploadPath(filename: string): string {
    return path.join(this.uploadsDir, filename);
  }

  public getExportPath(filename: string): string {
    return path.join(this.exportsDir, filename);
  }

  public getTempPath(filename: string): string {
    return path.join(this.tempDir, filename);
  }

  public getThumbnailPath(filename: string): string {
    return path.join(this.thumbnailsDir, filename);
  }

  public fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  public getFileSize(filePath: string): number {
    try {
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  public deleteFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.warn(`Failed to delete file ${filePath}:`, err);
    }
  }

  public getPublicUrl(storagePath: string): string {
    const relative = path.relative(this.baseDir, storagePath).replace(/\\/g, '/');
    return `/storage/${relative}`;
  }
}

export const storageService = new StorageService();

