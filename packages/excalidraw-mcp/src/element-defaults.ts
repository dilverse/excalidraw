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
  minioStroke: "#9a0016",
  nodeFill: "#ffdad8",
  interactive: "#007aff",
  neutralFill: "#f3f3f8",
  white: "#ffffff",
  transparent: "transparent",
} as const;

const SHAPE_TYPES = new Set(["rectangle", "diamond", "ellipse"]);
const TEXT_BACKGROUND_TYPES = new Set(["text"]);
const LINEAR_TYPES = new Set(["arrow", "line", "freedraw"]);

const DEFAULT_ROUNDNESS = { type: 3 } as const;
const ROLE_STROKE_WIDTH = {
  emphasis: 5,
  container: 4,
  regular: DEFAULT_ELEMENT_PROPS.strokeWidth,
} as const;

type TechnicalPrecisionRole =
  | "minio"
  | "erasureSet"
  | "node"
  | "storage"
  | "dataShard"
  | "parityShard"
  | "panel";

const TECHNICAL_PRECISION_ROLE_ALIASES: Record<string, TechnicalPrecisionRole> =
  {
    minio: "minio",
    erasureset: "erasureSet",
    "erasure-set": "erasureSet",
    node: "node",
    panel: "panel",
    legend: "panel",
    legendpanel: "panel",
    "legend-panel": "panel",
    storage: "storage",
    datashard: "dataShard",
    "data-shard": "dataShard",
    data: "dataShard",
    parityshard: "parityShard",
    "parity-shard": "parityShard",
    parity: "parityShard",
  };

const normalizeRole = (role: unknown): TechnicalPrecisionRole | null => {
  const normalized = String(role ?? "").trim();

  if (!normalized) {
    return null;
  }

  return (
    TECHNICAL_PRECISION_ROLE_ALIASES[
      normalized.replace(/\s+/g, "-").toLowerCase()
    ] ?? null
  );
};

const getLabelText = (element: RawExcalidrawElement) => {
  if (!element.label || typeof element.label !== "object") {
    return "";
  }

  const text = (element.label as Record<string, unknown>).text;

  return typeof text === "string" ? text.trim().toLowerCase() : "";
};

const inferTechnicalPrecisionRole = (
  element: RawExcalidrawElement,
): TechnicalPrecisionRole | null => {
  const explicitRole = normalizeRole(element.role);

  if (explicitRole) {
    return explicitRole;
  }

  if (!SHAPE_TYPES.has(element.type)) {
    return null;
  }

  const id = String(element.id ?? "").toLowerCase();
  const labelText = getLabelText(element);

  if (labelText === "minio" || id.includes("minio")) {
    return "minio";
  }

  if (labelText === "erasure set" || id.includes("erasure")) {
    return "erasureSet";
  }

  if (labelText === "node" || id.startsWith("node")) {
    return "node";
  }

  if (labelText.includes("storage") || id.includes("storage")) {
    return "storage";
  }

  if (labelText === "d" || id.startsWith("data")) {
    return "dataShard";
  }

  if (labelText === "p" || id.startsWith("parity")) {
    return "parityShard";
  }

  return null;
};

const getRoleDefaults = (role: TechnicalPrecisionRole | null) => {
  switch (role) {
    case "minio":
      return {
        backgroundColor: TECHNICAL_PRECISION_COLORS.minioRed,
        strokeColor: TECHNICAL_PRECISION_COLORS.minioStroke,
        strokeWidth: ROLE_STROKE_WIDTH.emphasis,
        labelStrokeColor: TECHNICAL_PRECISION_COLORS.white,
        labelFontSize: 30,
      };
    case "erasureSet":
      return {
        backgroundColor: TECHNICAL_PRECISION_COLORS.transparent,
        strokeColor: TECHNICAL_PRECISION_COLORS.minioRed,
        strokeWidth: 3,
        labelStrokeColor: TECHNICAL_PRECISION_COLORS.primary,
        labelFontSize: 26,
      };
    case "node":
      return {
        backgroundColor: TECHNICAL_PRECISION_COLORS.nodeFill,
        strokeColor: TECHNICAL_PRECISION_COLORS.nodeFill,
        strokeWidth: ROLE_STROKE_WIDTH.container,
        labelStrokeColor: TECHNICAL_PRECISION_COLORS.primary,
        labelFontSize: 30,
      };
    case "storage":
      return {
        backgroundColor: TECHNICAL_PRECISION_COLORS.white,
        strokeColor: TECHNICAL_PRECISION_COLORS.minioRed,
        strokeWidth: ROLE_STROKE_WIDTH.regular,
        labelStrokeColor: TECHNICAL_PRECISION_COLORS.primary,
        labelFontSize: 12,
      };
    case "panel":
      return {
        backgroundColor: TECHNICAL_PRECISION_COLORS.neutralFill,
        strokeColor: TECHNICAL_PRECISION_COLORS.transparent,
        strokeWidth: ROLE_STROKE_WIDTH.regular,
        labelStrokeColor: TECHNICAL_PRECISION_COLORS.primary,
        labelFontSize: DEFAULT_FONT_SIZE,
      };
    case "dataShard":
      return {
        backgroundColor: TECHNICAL_PRECISION_COLORS.primary,
        strokeColor: TECHNICAL_PRECISION_COLORS.primary,
        strokeWidth: 3,
        labelStrokeColor: TECHNICAL_PRECISION_COLORS.white,
        labelFontSize: 14,
      };
    case "parityShard":
      return {
        backgroundColor: TECHNICAL_PRECISION_COLORS.minioRed,
        strokeColor: TECHNICAL_PRECISION_COLORS.primary,
        strokeWidth: 3,
        labelStrokeColor: TECHNICAL_PRECISION_COLORS.white,
        labelFontSize: 14,
      };
    default:
      return null;
  }
};

const defaultLabel = (
  label: unknown,
  strokeColor: unknown,
  fontSize = DEFAULT_FONT_SIZE,
) => {
  if (!label || typeof label !== "object") {
    return label;
  }

  return {
    textAlign: "center",
    verticalAlign: "middle",
    fontSize,
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

  const roleDefaults = getRoleDefaults(inferTechnicalPrecisionRole(element));
  const next: RawExcalidrawElement = {
    ...element,
    strokeColor:
      element.strokeColor ??
      roleDefaults?.strokeColor ??
      DEFAULT_ELEMENT_PROPS.strokeColor,
    fillStyle: element.fillStyle ?? DEFAULT_ELEMENT_PROPS.fillStyle,
    strokeWidth:
      element.strokeWidth ??
      roleDefaults?.strokeWidth ??
      DEFAULT_ELEMENT_PROPS.strokeWidth,
    strokeStyle: element.strokeStyle ?? DEFAULT_ELEMENT_PROPS.strokeStyle,
    roughness: element.roughness ?? DEFAULT_ELEMENT_PROPS.roughness,
    opacity: element.opacity ?? DEFAULT_ELEMENT_PROPS.opacity,
  };

  if (
    TEXT_BACKGROUND_TYPES.has(element.type) ||
    LINEAR_TYPES.has(element.type)
  ) {
    next.backgroundColor =
      element.backgroundColor ?? TECHNICAL_PRECISION_COLORS.transparent;
  } else if (SHAPE_TYPES.has(element.type)) {
    next.backgroundColor =
      element.backgroundColor ??
      roleDefaults?.backgroundColor ??
      DEFAULT_ELEMENT_PROPS.backgroundColor;
  }

  delete next.role;

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
    next.label = defaultLabel(
      element.label,
      roleDefaults?.labelStrokeColor ?? next.strokeColor,
      roleDefaults?.labelFontSize ?? DEFAULT_FONT_SIZE,
    );
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
