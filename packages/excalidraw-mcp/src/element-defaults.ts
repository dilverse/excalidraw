import {
  DEFAULT_ELEMENT_PROPS,
  DEFAULT_END_ARROWHEAD,
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE,
  DEFAULT_START_ARROWHEAD,
  FONT_FAMILY,
} from "@excalidraw/common/constants";

import { isPseudoElement, type RawExcalidrawElement } from "./types.js";

export const TECHNICAL_PRECISION_COLORS = {
  primary: "#0c2430",
  minioRed: "#c8102e",
  nodeFill: "#ffdad8",
  interactive: "#007aff",
  neutralFill: "#f3f3f8",
  transparent: "transparent",
} as const;

const SHAPE_TYPES = new Set(["rectangle", "diamond", "ellipse"]);
const TEXT_BACKGROUND_TYPES = new Set(["text"]);
const LINEAR_TYPES = new Set(["arrow", "line", "freedraw"]);

const DEFAULT_ROUNDNESS = { type: 3 } as const;

const defaultLabel = (label: unknown, strokeColor: unknown) => {
  if (!label || typeof label !== "object") {
    return label;
  }

  return {
    textAlign: "center",
    verticalAlign: "middle",
    fontSize: DEFAULT_FONT_SIZE,
    fontFamily: DEFAULT_FONT_FAMILY,
    strokeColor,
    ...(label as Record<string, unknown>),
  };
};

export const applyTechnicalPrecisionDefaultsToElement = (
  element: RawExcalidrawElement,
): RawExcalidrawElement => {
  if (isPseudoElement(element)) {
    return { ...element };
  }

  const next: RawExcalidrawElement = {
    ...element,
    strokeColor: element.strokeColor ?? DEFAULT_ELEMENT_PROPS.strokeColor,
    fillStyle: element.fillStyle ?? DEFAULT_ELEMENT_PROPS.fillStyle,
    strokeWidth: element.strokeWidth ?? DEFAULT_ELEMENT_PROPS.strokeWidth,
    strokeStyle: element.strokeStyle ?? DEFAULT_ELEMENT_PROPS.strokeStyle,
    roughness: element.roughness ?? DEFAULT_ELEMENT_PROPS.roughness,
    opacity: element.opacity ?? DEFAULT_ELEMENT_PROPS.opacity,
  };

  if (TEXT_BACKGROUND_TYPES.has(element.type) || LINEAR_TYPES.has(element.type)) {
    next.backgroundColor =
      element.backgroundColor ?? TECHNICAL_PRECISION_COLORS.transparent;
  } else if (SHAPE_TYPES.has(element.type)) {
    next.backgroundColor =
      element.backgroundColor ?? DEFAULT_ELEMENT_PROPS.backgroundColor;
  }

  if (element.type === "rectangle") {
    next.roundness = element.roundness ?? DEFAULT_ROUNDNESS;
  }

  if (element.type === "text") {
    next.fontSize = element.fontSize ?? DEFAULT_FONT_SIZE;
    next.fontFamily = element.fontFamily ?? DEFAULT_FONT_FAMILY;
  }

  if (element.type === "arrow") {
    next.startArrowhead = element.startArrowhead ?? DEFAULT_START_ARROWHEAD;
    next.endArrowhead = element.endArrowhead ?? DEFAULT_END_ARROWHEAD;
    next.elbowed = element.elbowed ?? true;
  }

  if (element.label) {
    next.label = defaultLabel(element.label, next.strokeColor);
  }

  return next;
};

export const applyTechnicalPrecisionDefaults = (
  elements: RawExcalidrawElement[],
) => elements.map(applyTechnicalPrecisionDefaultsToElement);

export const TECHNICAL_PRECISION_FONT_FAMILIES = {
  body: DEFAULT_FONT_FAMILY,
  code: FONT_FAMILY["JetBrains Mono"],
} as const;
