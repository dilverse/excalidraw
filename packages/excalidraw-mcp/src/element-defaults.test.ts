import {
  DEFAULT_ELEMENT_PROPS,
  DEFAULT_END_ARROWHEAD,
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE,
  FONT_FAMILY,
} from "@excalidraw/common";

import {
  applyTechnicalPrecisionDefaultsToElement,
  TECHNICAL_PRECISION_COLORS,
  TECHNICAL_PRECISION_FONT_FAMILIES,
} from "./element-defaults";

describe("applyTechnicalPrecisionDefaultsToElement", () => {
  it("applies Technical Precision defaults to rectangles", () => {
    expect(
      applyTechnicalPrecisionDefaultsToElement({
        type: "rectangle",
        id: "node",
        x: 10,
        y: 20,
        width: 160,
        height: 64,
      }),
    ).toMatchObject({
      type: "rectangle",
      id: "node",
      strokeColor: DEFAULT_ELEMENT_PROPS.strokeColor,
      backgroundColor: DEFAULT_ELEMENT_PROPS.backgroundColor,
      fillStyle: DEFAULT_ELEMENT_PROPS.fillStyle,
      strokeWidth: DEFAULT_ELEMENT_PROPS.strokeWidth,
      strokeStyle: DEFAULT_ELEMENT_PROPS.strokeStyle,
      roughness: DEFAULT_ELEMENT_PROPS.roughness,
      opacity: DEFAULT_ELEMENT_PROPS.opacity,
      roundness: { type: 3 },
    });
  });

  it("preserves explicit MinIO and node colors", () => {
    expect(
      applyTechnicalPrecisionDefaultsToElement({
        type: "rectangle",
        id: "minio",
        backgroundColor: TECHNICAL_PRECISION_COLORS.minioRed,
        strokeColor: "#9a0016",
      }),
    ).toMatchObject({
      backgroundColor: TECHNICAL_PRECISION_COLORS.minioRed,
      strokeColor: "#9a0016",
    });

    expect(
      applyTechnicalPrecisionDefaultsToElement({
        type: "rectangle",
        id: "node",
        backgroundColor: TECHNICAL_PRECISION_COLORS.nodeFill,
      }),
    ).toMatchObject({
      backgroundColor: TECHNICAL_PRECISION_COLORS.nodeFill,
    });
  });

  it("uses clean text defaults without adding shape fill", () => {
    expect(
      applyTechnicalPrecisionDefaultsToElement({
        type: "text",
        id: "label",
        text: "MinIO",
      }),
    ).toMatchObject({
      backgroundColor: "transparent",
      fontFamily: DEFAULT_FONT_FAMILY,
      fontSize: DEFAULT_FONT_SIZE,
      strokeColor: DEFAULT_ELEMENT_PROPS.strokeColor,
    });
  });

  it("defaults arrows to elbowed triangle arrows", () => {
    expect(
      applyTechnicalPrecisionDefaultsToElement({
        type: "arrow",
        id: "flow",
        x: 0,
        y: 0,
        width: 100,
        height: 0,
        points: [
          [0, 0],
          [100, 0],
        ],
      }),
    ).toMatchObject({
      backgroundColor: "transparent",
      endArrowhead: DEFAULT_END_ARROWHEAD,
      elbowed: true,
    });
  });

  it("applies centered Geist label defaults", () => {
    expect(
      applyTechnicalPrecisionDefaultsToElement({
        type: "rectangle",
        id: "labeled",
        label: { text: "NODE" },
      }),
    ).toMatchObject({
      label: {
        text: "NODE",
        textAlign: "center",
        verticalAlign: "middle",
        fontFamily: DEFAULT_FONT_FAMILY,
        fontSize: DEFAULT_FONT_SIZE,
      },
    });
  });

  it("exposes Geist and JetBrains Mono font ids", () => {
    expect(TECHNICAL_PRECISION_FONT_FAMILIES).toEqual({
      body: DEFAULT_FONT_FAMILY,
      code: FONT_FAMILY["JetBrains Mono"],
    });
  });
});
