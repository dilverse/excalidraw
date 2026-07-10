import { DEFAULT_ELEMENT_PROPS } from "@excalidraw/common";
import { convertToExcalidrawElements } from "@excalidraw/element";

import { MemoryCheckpointStore } from "./checkpoint-store";
import {
  createViewFromElementsInput,
  CreateViewError,
  MAX_INPUT_BYTES,
} from "./create-view";
import { TECHNICAL_PRECISION_COLORS } from "./element-defaults";

describe("createViewFromElementsInput", () => {
  it("rejects invalid JSON", async () => {
    await expect(
      createViewFromElementsInput("{invalid", new MemoryCheckpointStore()),
    ).rejects.toThrow(CreateViewError);
  });

  it("rejects oversized element input", async () => {
    await expect(
      createViewFromElementsInput(
        `[${" ".repeat(MAX_INPUT_BYTES)}]`,
        new MemoryCheckpointStore(),
      ),
    ).rejects.toThrow(`Elements input exceeds ${MAX_INPUT_BYTES} byte limit`);
  });

  it("saves a checkpoint with Technical Precision defaults", async () => {
    const store = new MemoryCheckpointStore();
    const result = await createViewFromElementsInput(
      JSON.stringify([
        { type: "cameraUpdate", x: 0, y: 0, width: 800, height: 600 },
        {
          type: "rectangle",
          id: "node",
          x: 100,
          y: 100,
          width: 180,
          height: 56,
          label: { text: "NODE" },
        },
      ]),
      store,
      () => "fixed_checkpoint",
    );

    expect(result.checkpointId).toBe("fixed_checkpoint");
    expect(result.elements[1]).toMatchObject({
      id: "node",
      strokeColor: TECHNICAL_PRECISION_COLORS.nodeFill,
      backgroundColor: TECHNICAL_PRECISION_COLORS.nodeFill,
      fillStyle: DEFAULT_ELEMENT_PROPS.fillStyle,
      roughness: DEFAULT_ELEMENT_PROPS.roughness,
      label: {
        text: "NODE",
        strokeColor: TECHNICAL_PRECISION_COLORS.primary,
      },
    });
    await expect(store.load("fixed_checkpoint")).resolves.toEqual({
      elements: result.elements,
    });
  });

  it("produces shorthand accepted by Excalidraw element conversion", async () => {
    const result = await createViewFromElementsInput(
      JSON.stringify([
        {
          type: "rectangle",
          id: "node",
          x: 100,
          y: 100,
          width: 180,
          height: 56,
          label: { text: "NODE" },
        },
        {
          type: "arrow",
          id: "node-flow",
          x: 280,
          y: 128,
          width: 120,
          height: 0,
          points: [
            [0, 0],
            [120, 0],
          ],
        },
      ]),
      new MemoryCheckpointStore(),
      () => "compatible",
    );

    const converted = convertToExcalidrawElements(result.elements as any, {
      regenerateIds: false,
    });

    expect(converted.some((element) => element.id === "node")).toBe(true);
    expect(
      converted.some(
        (element: any) =>
          element.type === "text" &&
          element.text === "NODE" &&
          element.containerId === "node",
      ),
    ).toBe(true);
    expect(
      converted.find((element) => element.id === "node-flow"),
    ).toMatchObject({
      type: "arrow",
      endArrowhead: "triangle",
      elbowed: true,
    });
  });

  it("preserves explicit MinIO palette choices", async () => {
    const result = await createViewFromElementsInput(
      JSON.stringify([
        {
          type: "rectangle",
          id: "minio",
          backgroundColor: TECHNICAL_PRECISION_COLORS.minioRed,
        },
      ]),
      new MemoryCheckpointStore(),
      () => "minio_checkpoint",
    );

    expect(result.elements[0]).toMatchObject({
      id: "minio",
      backgroundColor: TECHNICAL_PRECISION_COLORS.minioRed,
    });
  });

  it("applies semantic role defaults without explicit style fields", async () => {
    const result = await createViewFromElementsInput(
      JSON.stringify([
        {
          type: "rectangle",
          id: "service",
          role: "minio",
          label: { text: "SERVICE" },
        },
        { type: "rectangle", id: "disk", role: "storage" },
        {
          type: "rectangle",
          id: "payload",
          role: "data-shard",
          label: { text: "D" },
        },
        {
          type: "rectangle",
          id: "parity",
          role: "parity shard",
          label: { text: "P" },
        },
      ]),
      new MemoryCheckpointStore(),
      () => "semantic_defaults",
    );

    expect(result.elements).toEqual([
      expect.objectContaining({
        id: "service",
        backgroundColor: TECHNICAL_PRECISION_COLORS.minioRed,
        strokeColor: TECHNICAL_PRECISION_COLORS.minioStroke,
        label: expect.objectContaining({
          strokeColor: TECHNICAL_PRECISION_COLORS.white,
        }),
      }),
      expect.objectContaining({
        id: "disk",
        backgroundColor: TECHNICAL_PRECISION_COLORS.white,
        strokeColor: TECHNICAL_PRECISION_COLORS.minioRed,
      }),
      expect.objectContaining({
        id: "payload",
        backgroundColor: TECHNICAL_PRECISION_COLORS.primary,
        strokeColor: TECHNICAL_PRECISION_COLORS.primary,
        label: expect.objectContaining({
          strokeColor: TECHNICAL_PRECISION_COLORS.white,
        }),
      }),
      expect.objectContaining({
        id: "parity",
        backgroundColor: TECHNICAL_PRECISION_COLORS.minioRed,
        strokeColor: TECHNICAL_PRECISION_COLORS.primary,
        label: expect.objectContaining({
          strokeColor: TECHNICAL_PRECISION_COLORS.white,
        }),
      }),
    ]);
    expect(result.elements.every((element) => !("role" in element))).toBe(true);
  });

  it("restores checkpoints and deletes matching ids and bound text", async () => {
    const store = new MemoryCheckpointStore();

    await store.save("base", {
      elements: [
        { type: "rectangle", id: "remove" },
        { type: "text", id: "remove-label", containerId: "remove" },
        { type: "rectangle", id: "keep" },
      ],
    });

    const result = await createViewFromElementsInput(
      JSON.stringify([
        { type: "restoreCheckpoint", id: "base" },
        { type: "delete", ids: "remove" },
        { type: "rectangle", id: "new-node" },
      ]),
      store,
      () => "edited",
    );

    expect(result.elements.map((element) => element.id)).toEqual([
      "keep",
      "new-node",
    ]);
  });

  it("returns a warning for non-4:3 camera viewports", async () => {
    const result = await createViewFromElementsInput(
      JSON.stringify([
        { type: "cameraUpdate", x: 0, y: 0, width: 1000, height: 1000 },
      ]),
      new MemoryCheckpointStore(),
      () => "camera_warning",
    );

    expect(result.warnings).toEqual([
      "cameraUpdate 1000x1000 is not close to a 4:3 viewport",
    ]);
  });
});
