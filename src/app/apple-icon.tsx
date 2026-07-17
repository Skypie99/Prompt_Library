import { ImageResponse } from "next/og";

// Required for `output: 'export'` — pre-render the PNG at build time (mirrors
// opengraph-image.tsx).
export const dynamic = "force-static";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// S18 — apple-touch-icon (iOS Add-to-Home-Screen). A faithful 5.625× scale-up of
// src/app/icon.svg: the SAME rect/path/circle and hexes, drawn at 180px. Not a
// redraw — the mark is unchanged; iOS applies its own squircle mask on top, and
// the terracotta fill bleeds under the glyph so that mask reads clean.
export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%" }}>
      <svg width="180" height="180" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" rx="8" fill="#DC6B4E" />
        <path
          d="M16 6.5c.5 3.2 1.8 4.5 5 5-3.2.5-4.5 1.8-5 5-.5-3.2-1.8-4.5-5-5 3.2-.5 4.5-1.8 5-5Z"
          fill="#FFFDF9"
        />
        <circle cx="22.5" cy="22.5" r="2.2" fill="#FFFDF9" opacity={0.85} />
      </svg>
    </div>,
    { ...size },
  );
}
