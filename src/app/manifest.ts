import type { MetadataRoute } from "next";

// P2 — PWA manifest: cài app lên màn hình điện thoại/desktop, mở fullscreen.
// Icon SVG được Chromium hỗ trợ; theme màu khớp dark theme của app.

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Seryn Marketing Ops",
    short_name: "Seryn Ops",
    description: "Bảng điều hành Marketing — task, phối hợp, báo cáo",
    start_url: "/",
    display: "standalone",
    background_color: "#131315",
    theme_color: "#131315",
    icons: [
      {
        src: "/app-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/app-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
