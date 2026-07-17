import type { MetadataRoute } from "next";

// Required for `output: 'export'` — emit a static /manifest.webmanifest at build
// time (same contract as opengraph-image.tsx / apple-icon.tsx).
export const dynamic = "force-static";

// S18 — web app manifest. Next auto-injects <link rel="manifest"> and, under
// output:'export', emits a static /manifest.webmanifest. Colors come from the
// LOCKED palette (tailwind.config.ts cream #FDF6E3); theme_color == background
// so an installed shell has no splash→chrome color jump. NO `orientation` key —
// never lock orientation (WCAG 1.3.4). The scalable icon.svg (sizes:"any")
// serves modern installs; iOS uses the apple-icon (apple-touch-icon) instead.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Prompt Library",
    short_name: "Prompts",
    description: "Search, customize, and run your prompts with Claude in seconds.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#FDF6E3",
    theme_color: "#FDF6E3",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
