import { DEFAULT_ELEMENT_PROPS, DEFAULT_FONT_FAMILY } from "@excalidraw/common";

import { TECHNICAL_PRECISION_COLORS } from "./element-defaults";
import { TECHNICAL_PRECISION_REFERENCE } from "./technical-precision-reference";

describe("TECHNICAL_PRECISION_REFERENCE", () => {
  it("teaches agents the repo-native Technical Precision defaults", () => {
    expect(TECHNICAL_PRECISION_REFERENCE).toContain(
      DEFAULT_ELEMENT_PROPS.strokeColor,
    );
    expect(TECHNICAL_PRECISION_REFERENCE).toContain(
      DEFAULT_ELEMENT_PROPS.backgroundColor,
    );
    expect(TECHNICAL_PRECISION_REFERENCE).toContain(
      TECHNICAL_PRECISION_COLORS.minioRed,
    );
    expect(TECHNICAL_PRECISION_REFERENCE).toContain(
      TECHNICAL_PRECISION_COLORS.nodeFill,
    );
    expect(TECHNICAL_PRECISION_REFERENCE).toContain("Geist");
    expect(TECHNICAL_PRECISION_REFERENCE).toContain("JetBrains Mono");
    expect(TECHNICAL_PRECISION_REFERENCE).toContain(
      `Body font family id: ${DEFAULT_FONT_FAMILY}`,
    );
  });

  it("includes a MinIO-oriented example", () => {
    expect(TECHNICAL_PRECISION_REFERENCE).toContain('"text":"MinIO"');
    expect(TECHNICAL_PRECISION_REFERENCE).toContain('"text":"ERASURE SET"');
    expect(TECHNICAL_PRECISION_REFERENCE).toContain('"text":"NODE"');
  });
});
