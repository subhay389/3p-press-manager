import type { MetadataRoute } from "next";

// Used by "Add to Home Screen". start_url "/" redirects to the user's landing tab,
// so the shortcut is the same whichever page it was added from.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "3P",
    short_name: "3P",
    description: "Job and paper stock records for 3P press",
    start_url: "/",
    scope: "/",
    display: "browser",
    background_color: "#1b2d5b",
    theme_color: "#1b2d5b",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
