export const PWA_BACKGROUND = "#061947"

// CSS screen dimensions and pixel ratios; iOS matches these before loading HTML.
// Keep both orientations, including iPad, rather than stretching a phone image.
const appleScreens = [
  [320, 568, 2],
  [375, 667, 2],
  [414, 736, 3],
  [375, 812, 3],
  [390, 844, 3],
  [393, 852, 3],
  [402, 874, 3],
  [414, 896, 2],
  [414, 896, 3],
  [420, 912, 3],
  [428, 926, 3],
  [430, 932, 3],
  [440, 956, 3],
  [744, 1133, 2],
  [744, 1137, 2],
  [768, 1024, 2],
  [810, 1080, 2],
  [820, 1180, 2],
  [834, 1112, 2],
  [834, 1194, 2],
  [834, 1210, 2],
  [1024, 1366, 2],
  [1032, 1376, 2],
] as const

export const appleStartupImages = appleScreens.flatMap(([width, height, ratio]) =>
  (["portrait", "landscape"] as const).map((orientation) => {
    const landscape = orientation === "landscape"
    const pixelWidth = (landscape ? height : width) * ratio
    const pixelHeight = (landscape ? width : height) * ratio

    return {
      url: `/splash/apple-${pixelWidth}x${pixelHeight}.png`,
      media: `(device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: ${orientation})`,
      pixelWidth,
      pixelHeight,
      ratio,
    }
  }),
)
