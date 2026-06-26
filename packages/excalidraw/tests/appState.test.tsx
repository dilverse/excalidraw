import React from "react";

import {
  ARROW_TYPE,
  DEFAULT_ELEMENT_PROPS,
  DEFAULT_ELEMENT_STROKE_WIDTH_KEY,
  DEFAULT_END_ARROWHEAD,
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE,
  DEFAULT_START_ARROWHEAD,
  EXPORT_DATA_TYPES,
  MIME_TYPES,
} from "@excalidraw/common";

import type { ExcalidrawTextElement } from "@excalidraw/element/types";

import { getDefaultAppState } from "../appState";
import { Excalidraw } from "../index";

import { API } from "./helpers/api";
import { Pointer, UI } from "./helpers/ui";
import { fireEvent, queryByTestId, render, waitFor } from "./test-utils";

const { h } = window;

describe("appState", () => {
  it("uses Technical Precision as the native drawing defaults", () => {
    const defaultAppState = getDefaultAppState();

    expect(defaultAppState.currentItemStrokeColor).toBe(
      DEFAULT_ELEMENT_PROPS.strokeColor,
    );
    expect(defaultAppState.currentItemStrokeColor).toBe("#0c2430");
    expect(defaultAppState.currentItemBackgroundColor).toBe(
      DEFAULT_ELEMENT_PROPS.backgroundColor,
    );
    expect(defaultAppState.currentItemBackgroundColor).toBe("#f3f3f8");
    expect(defaultAppState.currentItemFillStyle).toBe("solid");
    expect(defaultAppState.currentItemStrokeWidthKey).toBe(
      DEFAULT_ELEMENT_STROKE_WIDTH_KEY,
    );
    expect(defaultAppState.currentItemRoughness).toBe(0);
    expect(defaultAppState.currentItemRoundness).toBe("sharp");
    expect(defaultAppState.currentItemArrowType).toBe(ARROW_TYPE.elbow);
    expect(defaultAppState.currentItemStartArrowhead).toBe(
      DEFAULT_START_ARROWHEAD,
    );
    expect(defaultAppState.currentItemEndArrowhead).toBe(DEFAULT_END_ARROWHEAD);
    expect(defaultAppState.currentItemEndArrowhead).toBe("triangle");
    expect(defaultAppState.currentItemFontFamily).toBe(DEFAULT_FONT_FAMILY);
    expect(defaultAppState.currentItemFontSize).toBe(DEFAULT_FONT_SIZE);
  });

  it("drag&drop file doesn't reset non-persisted appState", async () => {
    const defaultAppState = getDefaultAppState();
    const exportBackground = !defaultAppState.exportBackground;

    await render(
      <Excalidraw
        initialData={{
          appState: {
            exportBackground,
            viewBackgroundColor: "#F00",
          },
        }}
      />,
      {},
    );

    await waitFor(() => {
      expect(h.state.exportBackground).toBe(exportBackground);
      expect(h.state.viewBackgroundColor).toBe("#F00");
    });

    await API.drop([
      {
        kind: "file",
        file: new Blob(
          [
            JSON.stringify({
              type: EXPORT_DATA_TYPES.excalidraw,
              appState: {
                viewBackgroundColor: "#000",
              },
              elements: [API.createElement({ type: "rectangle", id: "A" })],
            }),
          ],
          { type: MIME_TYPES.json },
        ),
      },
    ]);

    await waitFor(() => {
      expect(h.elements).toEqual([expect.objectContaining({ id: "A" })]);
      // non-imported prop → retain
      expect(h.state.exportBackground).toBe(exportBackground);
      // imported prop → overwrite
      expect(h.state.viewBackgroundColor).toBe("#000");
    });
  });

  it("changing fontSize with text tool selected (no element created yet)", async () => {
    const { container } = await render(
      <Excalidraw
        initialData={{
          appState: {
            currentItemFontSize: 30,
          },
        }}
      />,
    );

    UI.clickTool("text");

    expect(h.state.currentItemFontSize).toBe(30);
    fireEvent.click(queryByTestId(container, "fontSize-small")!);
    expect(h.state.currentItemFontSize).toBe(16);

    const mouse = new Pointer("mouse");

    mouse.clickAt(100, 100);

    expect((h.elements[0] as ExcalidrawTextElement).fontSize).toBe(16);
  });
});
