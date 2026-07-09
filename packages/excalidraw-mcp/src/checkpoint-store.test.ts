import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  FileCheckpointStore,
  MemoryCheckpointStore,
  validateCheckpointId,
} from "./checkpoint-store";

describe("checkpoint stores", () => {
  it("rejects unsafe checkpoint ids", () => {
    expect(() => validateCheckpointId("../secret")).toThrow(
      "Invalid checkpoint id",
    );
    expect(() => validateCheckpointId("with/slash")).toThrow(
      "Invalid checkpoint id",
    );
  });

  it("saves and loads file checkpoints from the configured directory", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "excalidraw-mcp-"));
    const store = new FileCheckpointStore(dir);

    await store.save("diagram_1", {
      elements: [{ type: "rectangle", id: "node" }],
    });

    await expect(store.load("diagram_1")).resolves.toEqual({
      elements: [{ type: "rectangle", id: "node" }],
    });
  });

  it("saves and loads memory checkpoints", async () => {
    const store = new MemoryCheckpointStore();

    await store.save("diagram_1", {
      elements: [{ type: "text", id: "title", text: "MinIO" }],
    });

    await expect(store.load("diagram_1")).resolves.toEqual({
      elements: [{ type: "text", id: "title", text: "MinIO" }],
    });
  });
});
