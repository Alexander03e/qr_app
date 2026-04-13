import type { ThemeConfig } from "antd";

export const APP_THEME = {
  token: {
    fontFamily:
      '"Geometria", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  components: {
    Typography: {
      fontSizeHeading3: 40,
      lineHeightHeading3: 1,
      titleMarginBottom: 4,
      fontWeightStrong: 700,
      lineHeight: 1.05,
    },
  },
} as ThemeConfig;
