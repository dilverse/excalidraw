import { COLOR_PALETTE, COLOR_WHITE } from "@excalidraw/common";

import type { ExcalidrawElement } from "./types";

const TECHNICAL_PRECISION_WHITE_TEXT_FILLS = new Set<string>([
  COLOR_PALETTE.black,
  COLOR_PALETTE.red[3],
  COLOR_PALETTE.red[4],
]);

export const getDefaultBoundTextStrokeColor = (
  container: ExcalidrawElement,
  fallbackStrokeColor: string,
  explicitStrokeColor?: string,
) => {
  if (explicitStrokeColor) {
    return explicitStrokeColor;
  }

  if (
    TECHNICAL_PRECISION_WHITE_TEXT_FILLS.has(
      container.backgroundColor.toLowerCase(),
    )
  ) {
    return COLOR_WHITE;
  }

  return fallbackStrokeColor;
};
