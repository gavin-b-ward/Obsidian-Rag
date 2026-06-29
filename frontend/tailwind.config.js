import forms from "@tailwindcss/forms";

export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        background: "#131315",
        surface: "#131315",
        "surface-dim": "#131315",
        "surface-container-lowest": "#0e0e10",
        "surface-container-low": "#1c1b1d",
        "surface-container": "#201f22",
        "surface-container-high": "#2a2a2c",
        "surface-container-highest": "#353437",
        primary: "#ffffff",
        "primary-container": "#e2e2e5",
        "on-primary-container": "#636467",
        "on-surface": "#e5e1e4",
        "on-surface-variant": "#c5c6ca",
        outline: "#8f9194",
        "outline-variant": "#45474a",
      },
      spacing: {
        gutter: "1.5rem",
        "stack-sm": "0.5rem",
        "stack-md": "1rem",
        "stack-lg": "2rem",
        "sidebar-width": "260px",
      },
      maxWidth: {
        "container-max": "800px",
      },
      fontFamily: {
        "body-base": ["Inter", "sans-serif"],
        "headline-md": ["Geist", "Inter", "sans-serif"],
        "code-label": ["JetBrains Mono", "monospace"],
      },
      fontSize: {
        "body-base": ["16px", { lineHeight: "1.6", letterSpacing: "0", fontWeight: "400" }],
        "body-sm": ["14px", { lineHeight: "1.5", letterSpacing: "0", fontWeight: "400" }],
        "headline-md": ["24px", { lineHeight: "1.2", letterSpacing: "-0.01em", fontWeight: "600" }],
        "code-label": ["12px", { lineHeight: "1", letterSpacing: "0.05em", fontWeight: "500" }],
      },
    },
  },
  plugins: [forms],
};
