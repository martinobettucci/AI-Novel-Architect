import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AI Novel Architect",
    short_name: "NovelArchitect",
    description: "Local-first writing studio for planning, drafting, revision, and publishing prep.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f6f2",
    theme_color: "#0f766e",
    lang: "fr",
    icons: [
      {
        src: "/next.svg",
        sizes: "192x192",
        type: "image/svg+xml",
      },
      {
        src: "/vercel.svg",
        sizes: "512x512",
        type: "image/svg+xml",
      },
    ],
  };
}
