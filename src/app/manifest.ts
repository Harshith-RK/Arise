import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Winter Arc",
    short_name: "Winter Arc",
    description: "A local-first training and diet tracker styled as the System.",
    start_url: "/app/quest",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0A0D0F",
    theme_color: "#0A0D0F",
    categories: ["health", "fitness", "lifestyle"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
