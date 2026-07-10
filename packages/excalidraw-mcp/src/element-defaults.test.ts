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
        id: "generic-rectangle",
        x: 10,
        y: 20,
        width: 160,
        height: 64,
      }),
    ).toMatchObject({
      type: "rectangle",
      id: "generic-rectangle",
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

  it("infers MinIO diagram role colors from ids and labels", () => {
    expect(
      applyTechnicalPrecisionDefaultsToElement({
        type: "rectangle",
        id: "minio",
        label: { text: "MinIO" },
      }),
    ).toMatchObject({
      backgroundColor: TECHNICAL_PRECISION_COLORS.minioRed,
      strokeColor: TECHNICAL_PRECISION_COLORS.minioStroke,
      strokeWidth: 5,
      label: {
        fontSize: 30,
        strokeColor: TECHNICAL_PRECISION_COLORS.white,
      },
    });

    expect(
      applyTechnicalPrecisionDefaultsToElement({
        type: "rectangle",
        id: "erasure",
        label: { text: "ERASURE SET" },
      }),
    ).toMatchObject({
      backgroundColor: TECHNICAL_PRECISION_COLORS.transparent,
      strokeColor: TECHNICAL_PRECISION_COLORS.minioRed,
      strokeWidth: 3,
      label: {
        fontSize: 26,
        strokeColor: TECHNICAL_PRECISION_COLORS.primary,
      },
    });

    expect(
      applyTechnicalPrecisionDefaultsToElement({
        type: "rectangle",
        id: "node-a",
        label: { text: "NODE" },
      }),
    ).toMatchObject({
      backgroundColor: TECHNICAL_PRECISION_COLORS.nodeFill,
      strokeColor: TECHNICAL_PRECISION_COLORS.nodeFill,
      strokeWidth: 4,
      label: {
        fontSize: 30,
        strokeColor: TECHNICAL_PRECISION_COLORS.primary,
      },
    });

    expect(
      applyTechnicalPrecisionDefaultsToElement({
        type: "rectangle",
        id: "data-a",
        label: { text: "D" },
      }),
    ).toMatchObject({
      backgroundColor: TECHNICAL_PRECISION_COLORS.primary,
      strokeColor: TECHNICAL_PRECISION_COLORS.primary,
      strokeWidth: 3,
      label: {
        fontSize: 14,
        strokeColor: TECHNICAL_PRECISION_COLORS.white,
      },
    });

    expect(
      applyTechnicalPrecisionDefaultsToElement({
        type: "rectangle",
        id: "parity-a",
        label: { text: "P" },
      }),
    ).toMatchObject({
      backgroundColor: TECHNICAL_PRECISION_COLORS.minioRed,
      strokeColor: TECHNICAL_PRECISION_COLORS.primary,
      strokeWidth: 3,
      label: {
        fontSize: 14,
        strokeColor: TECHNICAL_PRECISION_COLORS.white,
      },
    });
  });

  it("uses explicit semantic roles as defaults without leaking role output", () => {
    const result = applyTechnicalPrecisionDefaultsToElement({
      type: "rectangle",
      id: "disk-1",
      role: "storage",
    });

    expect(result).toMatchObject({
      backgroundColor: TECHNICAL_PRECISION_COLORS.white,
      strokeColor: TECHNICAL_PRECISION_COLORS.minioRed,
      strokeWidth: DEFAULT_ELEMENT_PROPS.strokeWidth,
    });
    expect(result).not.toHaveProperty("role");
  });

  it("uses neutral panel role defaults for legends and sidebars", () => {
    const result = applyTechnicalPrecisionDefaultsToElement({
      type: "rectangle",
      id: "legend",
      role: "legend-panel",
    });

    expect(result).toMatchObject({
      backgroundColor: TECHNICAL_PRECISION_COLORS.neutralFill,
      strokeColor: TECHNICAL_PRECISION_COLORS.transparent,
      strokeWidth: DEFAULT_ELEMENT_PROPS.strokeWidth,
    });
    expect(result).not.toHaveProperty("role");
  });

  it("accepts readable semantic role aliases", () => {
    expect(
      applyTechnicalPrecisionDefaultsToElement({
        type: "rectangle",
        id: "disk-1",
        role: "data-shard",
      }),
    ).toMatchObject({
      backgroundColor: TECHNICAL_PRECISION_COLORS.primary,
      strokeColor: TECHNICAL_PRECISION_COLORS.primary,
    });

    expect(
      applyTechnicalPrecisionDefaultsToElement({
        type: "rectangle",
        id: "disk-2",
        role: "parity shard",
      }),
    ).toMatchObject({
      backgroundColor: TECHNICAL_PRECISION_COLORS.minioRed,
      strokeColor: TECHNICAL_PRECISION_COLORS.primary,
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

  it("does not infer semantic shape roles for free text or connectors", () => {
    expect(
      applyTechnicalPrecisionDefaultsToElement({
        type: "text",
        id: "legend-storage-label",
        text: "Storage (HDD, SSD, NVMe)",
      }),
    ).toMatchObject({
      strokeColor: DEFAULT_ELEMENT_PROPS.strokeColor,
      fontSize: DEFAULT_FONT_SIZE,
    });

    expect(
      applyTechnicalPrecisionDefaultsToElement({
        type: "line",
        id: "node-bus",
        points: [
          [0, 0],
          [100, 0],
        ],
      }),
    ).toMatchObject({
      strokeColor: DEFAULT_ELEMENT_PROPS.strokeColor,
      strokeWidth: DEFAULT_ELEMENT_PROPS.strokeWidth,
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
        label: { text: "GENERIC" },
      }),
    ).toMatchObject({
      label: {
        text: "GENERIC",
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
