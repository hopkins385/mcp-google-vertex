import { existsSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { CONFIG } from "./config.js";

/**
 * Storage utility for saving generated images and videos locally
 */
export class StorageService {
  private storagePath: string;

  constructor(storagePath: string = CONFIG.storage.path) {
    this.storagePath = storagePath;
  }

  /**
   * Initialize storage directory
   */
  async init(): Promise<void> {
    if (!existsSync(this.storagePath)) {
      await mkdir(this.storagePath, { recursive: true });
    }
  }

  /**
   * Save image data to local storage
   */
  async saveImage(data: Buffer, filename: string): Promise<string> {
    const filePath = join(this.storagePath, filename);
    await this.ensureDirectory(filePath);
    await writeFile(filePath, data);
    return filePath;
  }

  /**
   * Save video data to local storage
   */
  async saveVideo(data: Buffer, filename: string): Promise<string> {
    const filePath = join(this.storagePath, filename);
    await this.ensureDirectory(filePath);
    await writeFile(filePath, data);
    return filePath;
  }

  /**
   * Save text data to local storage
   */
  async saveText(text: string, filename: string): Promise<string> {
    const filePath = join(this.storagePath, filename);
    await this.ensureDirectory(filePath);
    await writeFile(filePath, text, "utf-8");
    return filePath;
  }

  /**
   * Generate unique filename with timestamp
   */
  generateFilename(prefix: string, extension: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}.${extension}`;
  }

  /**
   * Ensure directory exists for file path
   */
  private async ensureDirectory(filePath: string): Promise<void> {
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }

  /**
   * Get absolute path for a filename
   */
  getAbsolutePath(filename: string): string {
    return join(process.cwd(), this.storagePath, filename);
  }
}
