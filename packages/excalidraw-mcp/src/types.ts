export interface RawExcalidrawElement {
  type: string;
  id?: string;
  containerId?: string;
  [key: string]: unknown;
}

export interface CheckpointData {
  elements: RawExcalidrawElement[];
}

export interface CreateViewResult {
  checkpointId: string;
  elements: RawExcalidrawElement[];
  warnings: string[];
}

export const PSEUDO_ELEMENT_TYPES = new Set([
  "cameraUpdate",
  "delete",
  "restoreCheckpoint",
]);

export const isPseudoElement = (element: RawExcalidrawElement) =>
  PSEUDO_ELEMENT_TYPES.has(element.type);
