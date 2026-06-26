import { type ExcalidrawFontFaceDescriptor } from "../Fonts";

import GeistBold from "./Geist-Bold.woff2";
import GeistMedium from "./Geist-Medium.woff2";
import GeistRegular from "./Geist-Regular.woff2";
import GeistSemiBold from "./Geist-SemiBold.woff2";

export const GeistFontFaces: ExcalidrawFontFaceDescriptor[] = [
  {
    uri: GeistRegular,
    descriptors: { weight: "400" },
  },
  {
    uri: GeistMedium,
    descriptors: { weight: "500" },
  },
  {
    uri: GeistSemiBold,
    descriptors: { weight: "600" },
  },
  {
    uri: GeistBold,
    descriptors: { weight: "700" },
  },
];
