import {
  DEFAULT_ELEMENT_PROPS,
  DEFAULT_END_ARROWHEAD,
  DEFAULT_FONT_FAMILY,
  FONT_FAMILY,
} from "@excalidraw/common/constants";

import { TECHNICAL_PRECISION_COLORS } from "./element-defaults.js";

export const TECHNICAL_PRECISION_REFERENCE = `# Excalidraw MCP Element Format

Call create_view with a JSON array string of Excalidraw-style elements. The server applies this repository's Technical Precision defaults when fields are omitted.

## Native Defaults

- Stroke: ${DEFAULT_ELEMENT_PROPS.strokeColor}
- Neutral shape fill: ${DEFAULT_ELEMENT_PROPS.backgroundColor}
- MinIO/parity red: ${TECHNICAL_PRECISION_COLORS.minioRed}
- Node fill: ${TECHNICAL_PRECISION_COLORS.nodeFill}
- Active flow accent: ${TECHNICAL_PRECISION_COLORS.interactive}
- White foreground: ${TECHNICAL_PRECISION_COLORS.white}
- Fill style: ${DEFAULT_ELEMENT_PROPS.fillStyle}
- Stroke width: ${DEFAULT_ELEMENT_PROPS.strokeWidth}
- Roughness: ${DEFAULT_ELEMENT_PROPS.roughness}
- Body font family id: ${DEFAULT_FONT_FAMILY} (Geist)
- Code font family id: ${FONT_FAMILY["JetBrains Mono"]} (JetBrains Mono)
- Default arrowhead: ${DEFAULT_END_ARROWHEAD}

## Semantic Roles

When drawing Technical Precision infrastructure diagrams, omit explicit style fields and set a role hint instead. The role hint is consumed by the server and removed from the returned elements.

- role "minio": red fill, dark red stroke, white label text.
- role "erasureSet" or "erasure-set": transparent fill, red stroke, primary label text.
- role "node": pale red node fill and primary label text.
- role "storage": white fill, red stroke, primary label text.
- role "dataShard", "data-shard", or "data": primary fill with white label text.
- role "parityShard", "parity-shard", or "parity": red fill with primary stroke and white label text.
- role "panel", "legend", or "legend-panel": neutral surface fill with no visible stroke.
- Roles also set the matching component stroke weight and label size; do not send fontSize or strokeWidth unless the user asks for an override.

## Element Rules

- A new MCP session starts with an empty scene. Do not create a starter diagram.
- Only call create_view after the user asks for a diagram or a concrete edit.
- Use labeled rectangles for most system boxes.
- Omit style fields unless the user asks for a deliberate override.
- Omitted rectangle roundness defaults to compact 4px-style technical corners.
- Use elbow arrows for infrastructure diagrams; omitted arrowheads default to triangle.
- Keep at least 24px between sibling boxes and at least 32px between levels.
- Use cameraUpdate as the first element for viewport framing.
- Use restoreCheckpoint as the first element when editing a previous diagram.
- Use delete pseudo-elements to remove ids from a restored checkpoint.

## Blank-First Example

[
  {"type":"cameraUpdate","x":0,"y":0,"width":640,"height":360},
  {"type":"rectangle","id":"service","role":"minio","x":210,"y":96,"width":220,"height":64,"label":{"text":"SERVICE","fontSize":26}},
  {"type":"rectangle","id":"worker","role":"node","x":210,"y":220,"width":220,"height":52,"label":{"text":"WORKER","fontSize":24}},
  {"type":"arrow","id":"service-worker","x":320,"y":160,"width":0,"height":60,"points":[[0,0],[0,60]]}
]

The returned checkpointId can be reused by starting the next call with {"type":"restoreCheckpoint","id":"<checkpointId>"}.
`;
