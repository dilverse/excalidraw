import crypto from "node:crypto";

import {
  applyTechnicalPrecisionDefaults,
} from "./element-defaults.js";
import type { CheckpointStore } from "./checkpoint-store.js";
import type {
  CreateViewResult,
  RawExcalidrawElement,
} from "./types.js";

export const MAX_INPUT_BYTES = 5 * 1024 * 1024;

export class CreateViewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CreateViewError";
  }
}

const createCheckpointId = () =>
  crypto.randomUUID().replace(/-/g, "").slice(0, 18);

const parseElements = (elements: string): RawExcalidrawElement[] => {
  if (Buffer.byteLength(elements, "utf8") > MAX_INPUT_BYTES) {
    throw new CreateViewError(
      `Elements input exceeds ${MAX_INPUT_BYTES} byte limit`,
    );
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(elements);
  } catch (error) {
    throw new CreateViewError(
      `Invalid JSON in elements: ${(error as Error).message}`,
    );
  }

  if (!Array.isArray(parsed)) {
    throw new CreateViewError("Elements input must be a JSON array");
  }

  return parsed as RawExcalidrawElement[];
};

const collectDeleteIds = (elements: RawExcalidrawElement[]) => {
  const deleteIds = new Set<string>();

  for (const element of elements) {
    if (element.type !== "delete") {
      continue;
    }

    for (const id of String(element.ids ?? element.id ?? "").split(",")) {
      const trimmed = id.trim();

      if (trimmed) {
        deleteIds.add(trimmed);
      }
    }
  }

  return deleteIds;
};

const withoutDeletedElements = (
  elements: RawExcalidrawElement[],
  deleteIds: Set<string>,
) =>
  elements.filter(
    (element) =>
      !deleteIds.has(String(element.id ?? "")) &&
      !deleteIds.has(String(element.containerId ?? "")),
  );

const resolveElements = async (
  parsed: RawExcalidrawElement[],
  store: CheckpointStore,
) => {
  const restoreElement = parsed.find(
    (element) => element.type === "restoreCheckpoint",
  );
  const deleteIds = collectDeleteIds(parsed);
  const newElements = parsed.filter(
    (element) =>
      element.type !== "restoreCheckpoint" && element.type !== "delete",
  );

  if (!restoreElement?.id) {
    return withoutDeletedElements(newElements, deleteIds);
  }

  const checkpoint = await store.load(String(restoreElement.id));

  if (!checkpoint) {
    throw new CreateViewError(
      `Checkpoint "${String(
        restoreElement.id,
      )}" not found; recreate the diagram from scratch`,
    );
  }

  return withoutDeletedElements(
    [...checkpoint.elements, ...newElements],
    deleteIds,
  );
};

const collectWarnings = (elements: RawExcalidrawElement[]) => {
  const warnings: string[] = [];
  const badCamera = elements.find((element) => {
    if (element.type !== "cameraUpdate") {
      return false;
    }

    if (typeof element.width !== "number" || typeof element.height !== "number") {
      return false;
    }

    return Math.abs(element.width / element.height - 4 / 3) > 0.15;
  });

  if (badCamera) {
    warnings.push(
      `cameraUpdate ${String(badCamera.width)}x${String(
        badCamera.height,
      )} is not close to a 4:3 viewport`,
    );
  }

  return warnings;
};

export const createViewFromElementsInput = async (
  elements: string,
  store: CheckpointStore,
  checkpointIdFactory = createCheckpointId,
): Promise<CreateViewResult> => {
  const parsed = parseElements(elements);
  const resolvedElements = applyTechnicalPrecisionDefaults(
    await resolveElements(parsed, store),
  );
  const checkpointId = checkpointIdFactory();

  await store.save(checkpointId, { elements: resolvedElements });

  return {
    checkpointId,
    elements: resolvedElements,
    warnings: collectWarnings(parsed),
  };
};
