/**
 * FileSystemProvider — abstract interface for file system operations.
 *
 * Provides a consistent, Promise-based API over Node.js `fs` so that the
 * rest of the server code never imports `fs` directly. This makes it easy
 * to swap implementations (e.g. in-memory for tests).
 */

import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Error helpers
// ---------------------------------------------------------------------------

export class FsError extends Error {
  constructor(
    public readonly code: "NOT_FOUND" | "ALREADY_EXISTS" | "PERMISSION" | "IO",
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "FsError";
  }
}

function mapNodeError(err: unknown): never {
  if (err instanceof Error && "code" in err) {
    const nodeErr = err as NodeJS.ErrnoException;
    switch (nodeErr.code) {
      case "ENOENT":
        throw new FsError("NOT_FOUND", nodeErr.message, err);
      case "EEXIST":
        throw new FsError("ALREADY_EXISTS", nodeErr.message, err);
      case "EACCES":
      case "EPERM":
        throw new FsError("PERMISSION", nodeErr.message, err);
    }
  }
  throw new FsError("IO", err instanceof Error ? err.message : String(err), err);
}

// ---------------------------------------------------------------------------
// File metadata
// ---------------------------------------------------------------------------

export interface FileStat {
  isFile: boolean;
  isDirectory: boolean;
  size: number;
  createdAt: Date;
  modifiedAt: Date;
}

// ---------------------------------------------------------------------------
// IFileSystemProvider interface
// ---------------------------------------------------------------------------

export interface IFileSystemProvider {
  readFile(filePath: string): Promise<string>;
  readFileBuffer(filePath: string): Promise<Buffer>;
  writeFile(filePath: string, content: string): Promise<void>;
  writeJson<T>(filePath: string, data: T): Promise<void>;
  readJson<T>(filePath: string): Promise<T>;
  appendFile(filePath: string, content: string): Promise<void>;
  exists(filePath: string): Promise<boolean>;
  stat(filePath: string): Promise<FileStat>;
  deleteFile(filePath: string): Promise<void>;
  mkdir(dirPath: string): Promise<void>;
  mkdirp(dirPath: string): Promise<void>;
  readdir(dirPath: string): Promise<string[]>;
  copyFile(src: string, dest: string): Promise<void>;
  moveFile(src: string, dest: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Node.js implementation
// ---------------------------------------------------------------------------

export class NodeFileSystemProvider implements IFileSystemProvider {
  async readFile(filePath: string): Promise<string> {
    try {
      return await fs.promises.readFile(filePath, "utf-8");
    } catch (err) {
      mapNodeError(err);
    }
  }

  async readFileBuffer(filePath: string): Promise<Buffer> {
    try {
      return await fs.promises.readFile(filePath);
    } catch (err) {
      mapNodeError(err);
    }
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      await fs.promises.writeFile(filePath, content, "utf-8");
    } catch (err) {
      mapNodeError(err);
    }
  }

  async writeJson<T>(filePath: string, data: T): Promise<void> {
    await this.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  async readJson<T>(filePath: string): Promise<T> {
    const raw = await this.readFile(filePath);
    return JSON.parse(raw) as T;
  }

  async appendFile(filePath: string, content: string): Promise<void> {
    try {
      await fs.promises.appendFile(filePath, content, "utf-8");
    } catch (err) {
      mapNodeError(err);
    }
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async stat(filePath: string): Promise<FileStat> {
    try {
      const s = await fs.promises.stat(filePath);
      return {
        isFile: s.isFile(),
        isDirectory: s.isDirectory(),
        size: s.size,
        createdAt: s.birthtime,
        modifiedAt: s.mtime,
      };
    } catch (err) {
      mapNodeError(err);
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.promises.unlink(filePath);
    } catch (err) {
      mapNodeError(err);
    }
  }

  async mkdir(dirPath: string): Promise<void> {
    try {
      await fs.promises.mkdir(dirPath);
    } catch (err) {
      mapNodeError(err);
    }
  }

  async mkdirp(dirPath: string): Promise<void> {
    try {
      await fs.promises.mkdir(dirPath, { recursive: true });
    } catch (err) {
      mapNodeError(err);
    }
  }

  async readdir(dirPath: string): Promise<string[]> {
    try {
      return await fs.promises.readdir(dirPath);
    } catch (err) {
      mapNodeError(err);
    }
  }

  async copyFile(src: string, dest: string): Promise<void> {
    try {
      const destDir = path.dirname(dest);
      await fs.promises.mkdir(destDir, { recursive: true });
      await fs.promises.copyFile(src, dest);
    } catch (err) {
      mapNodeError(err);
    }
  }

  async moveFile(src: string, dest: string): Promise<void> {
    try {
      const destDir = path.dirname(dest);
      await fs.promises.mkdir(destDir, { recursive: true });
      await fs.promises.rename(src, dest);
    } catch (err) {
      mapNodeError(err);
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton (default) provider
// ---------------------------------------------------------------------------

let providerInstance: IFileSystemProvider | null = null;

export function getFileSystemProvider(): IFileSystemProvider {
  if (!providerInstance) {
    providerInstance = new NodeFileSystemProvider();
  }
  return providerInstance;
}

/** Replace the provider (useful in tests). */
export function setFileSystemProvider(provider: IFileSystemProvider): void {
  providerInstance = provider;
}
