import { type ExcalidrawFontFaceDescriptor } from "../Fonts";

import JetBrainsMonoBold from "./JetBrainsMono-Bold.woff2";
import JetBrainsMonoMedium from "./JetBrainsMono-Medium.woff2";
import JetBrainsMonoRegular from "./JetBrainsMono-Regular.woff2";
import JetBrainsMonoSemiBold from "./JetBrainsMono-SemiBold.woff2";

export const JetBrainsMonoFontFaces: ExcalidrawFontFaceDescriptor[] = [
  {
    uri: JetBrainsMonoRegular,
    descriptors: { weight: "400" },
  },
  {
    uri: JetBrainsMonoMedium,
    descriptors: { weight: "500" },
  },
  {
    uri: JetBrainsMonoSemiBold,
    descriptors: { weight: "600" },
  },
  {
    uri: JetBrainsMonoBold,
    descriptors: { weight: "700" },
  },
];
