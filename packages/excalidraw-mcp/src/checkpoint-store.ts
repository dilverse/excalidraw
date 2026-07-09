import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type { CheckpointData } from "./types.js";

const MAX_CHECKPOINT_BYTES = 5 * 1024 * 1024;
const MAX_FILE_CHECKPOINTS = 100;

export const validateCheckpointId = (id: string) => {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error(
      "Invalid checkpoint id: must be alphanumeric, hyphens, or underscores",
    );
  }

  if (id.length > 64) {
    throw new Error("Invalid checkpoint id: exceeds 64 character limit");
  }
};

const assertCheckpointSize = (data: CheckpointData) => {
  const serialized = JSON.stringify(data);

  if (Buffer.byteLength(serialized, "utf8") > MAX_CHECKPOINT_BYTES) {
    throw new Error(`Checkpoint data exceeds ${MAX_CHECKPOINT_BYTES} byte limit`);
  }

  return serialized;
};

export interface CheckpointStore {
  save(id: string, data: CheckpointData): Promise<void>;
  load(id: string): Promise<CheckpointData | null>;
}

export class FileCheckpointStore implements CheckpointStore {
  private readonly dir: string;

  constructor(dir = path.join(os.tmpdir(), "excalidraw-mcp-checkpoints")) {
    this.dir = dir;
    fs.mkdirSync(this.dir, { recursive: true });
  }

  async save(id: string, data: CheckpointData): Promise<void> {
    validateCheckpointId(id);

    const serialized = assertCheckpointSize(data);
    const filePath = this.getCheckpointPath(id);

    await fs.promises.writeFile(filePath, serialized);
    await this.pruneOldCheckpoints();
  }

  async load(id: string): Promise<CheckpointData | null> {
    validateCheckpointId(id);

    try {
      return JSON.parse(
        await fs.promises.readFile(this.getCheckpointPath(id), "utf8"),
      );
    } catch {
      return null;
    }
  }

  private getCheckpointPath(id: string) {
    const filePath = path.join(this.dir, `${id}.json`);
    const resolvedDir = path.resolve(this.dir);
    const resolvedFilePath = path.resolve(filePath);

    if (!resolvedFilePath.startsWith(`${resolvedDir}${path.sep}`)) {
      throw new Error("Invalid checkpoint path");
    }

    return resolvedFilePath;
  }

  private async pruneOldCheckpoints() {
    try {
      const entries = await fs.promises.readdir(this.dir);
      const jsonFiles = entries.filter((entry) => entry.endsWith(".json"));

      if (jsonFiles.length <= MAX_FILE_CHECKPOINTS) {
        return;
      }

      const stats = await Promise.all(
        jsonFiles.map(async (name) => ({
          name,
          mtime: (await fs.promises.stat(path.join(this.dir, name))).mtimeMs,
        })),
      );

      stats.sort((a, b) => a.mtime - b.mtime);

      await Promise.all(
        stats
          .slice(0, stats.length - MAX_FILE_CHECKPOINTS)
          .map(({ name }) =>
            fs.promises.unlink(path.join(this.dir, name)).catch(() => {}),
          ),
      );
    } catch {
      // Checkpoint pruning is best-effort and should not fail diagram creation.
    }
  }
}

export class MemoryCheckpointStore implements CheckpointStore {
  private readonly checkpoints = new Map<string, string>();

  async save(id: string, data: CheckpointData): Promise<void> {
    validateCheckpointId(id);

    this.checkpoints.set(id, assertCheckpointSize(data));

    if (this.checkpoints.size > MAX_FILE_CHECKPOINTS) {
      const oldest = this.checkpoints.keys().next().value;

      if (oldest) {
        this.checkpoints.delete(oldest);
      }
    }
  }

  async load(id: string): Promise<CheckpointData | null> {
    validateCheckpointId(id);

    const serialized = this.checkpoints.get(id);

    if (!serialized) {
      return null;
    }

    try {
      return JSON.parse(serialized);
    } catch {
      return null;
    }
  }
}
