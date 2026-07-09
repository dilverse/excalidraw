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
- Fill style: ${DEFAULT_ELEMENT_PROPS.fillStyle}
- Stroke width: ${DEFAULT_ELEMENT_PROPS.strokeWidth}
- Roughness: ${DEFAULT_ELEMENT_PROPS.roughness}
- Body font family id: ${DEFAULT_FONT_FAMILY} (Geist)
- Code font family id: ${FONT_FAMILY["JetBrains Mono"]} (JetBrains Mono)
- Default arrowhead: ${DEFAULT_END_ARROWHEAD}

## Element Rules

- Use labeled rectangles for most system boxes.
- Use rectangle roundness {"type":3} for compact 4px-style technical corners.
- Use elbow arrows for infrastructure diagrams; omitted arrowheads default to triangle.
- Keep at least 24px between sibling boxes and at least 32px between levels.
- Use cameraUpdate as the first element for viewport framing.
- Use restoreCheckpoint as the first element when editing a previous diagram.
- Use delete pseudo-elements to remove ids from a restored checkpoint.

## MinIO Example

[
  {"type":"cameraUpdate","x":0,"y":0,"width":900,"height":675},
  {"type":"rectangle","id":"minio","x":330,"y":40,"width":260,"height":64,"backgroundColor":"${TECHNICAL_PRECISION_COLORS.minioRed}","strokeColor":"#9a0016","label":{"text":"MinIO","fontSize":28,"strokeColor":"#ffffff"}},
  {"type":"rectangle","id":"erasure","x":300,"y":150,"width":320,"height":48,"backgroundColor":"transparent","strokeColor":"${TECHNICAL_PRECISION_COLORS.minioRed}","label":{"text":"ERASURE SET","fontSize":22}},
  {"type":"arrow","id":"minio-erasure","x":460,"y":104,"width":0,"height":46,"points":[[0,0],[0,46]],"strokeColor":"${TECHNICAL_PRECISION_COLORS.primary}"},
  {"type":"rectangle","id":"node-a","x":120,"y":300,"width":180,"height":52,"backgroundColor":"${TECHNICAL_PRECISION_COLORS.nodeFill}","label":{"text":"NODE","fontSize":26}},
  {"type":"rectangle","id":"data-a","x":180,"y":470,"width":34,"height":34,"backgroundColor":"${TECHNICAL_PRECISION_COLORS.primary}","strokeColor":"${TECHNICAL_PRECISION_COLORS.primary}","label":{"text":"D","fontSize":14,"strokeColor":"#ffffff"}},
  {"type":"rectangle","id":"parity-a","x":245,"y":470,"width":34,"height":34,"backgroundColor":"${TECHNICAL_PRECISION_COLORS.minioRed}","strokeColor":"${TECHNICAL_PRECISION_COLORS.primary}","label":{"text":"P","fontSize":14,"strokeColor":"#ffffff"}}
]

The returned checkpointId can be reused by starting the next call with {"type":"restoreCheckpoint","id":"<checkpointId>"}.
`;
