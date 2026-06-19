import { ImageResponse } from "next/og";

// Required for `output: 'export'` — tells Next this route is pre-renderable
// without a running server, so the PNG is emitted at build time.
export const dynamic = "force-static";

/**
 * Static OG card — "neon terminal" brand (the app's dark signature).
 *
 * 1200×630 PNG emitted at build time via next/og + satori. Inline JSX, no
 * external font fetch (robust under static export). Carries Sky's byline so a
 * shared link unfurls as attributed work, not an anonymous demo.
 *
 * Palette mirrors tailwind.config: night #080A12 / surface #0E1120,
 * electric-cyan accent #22D3EE, paper text #C9D1E0 / muted #7B8AA0.
 * Next auto-wires this as the route's og:image + twitter:image.
 */

export const alt = "Prompt Library — run your prompts against Claude. Built by Sky Halisky.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          background: "linear-gradient(150deg, #080A12 0%, #0E1120 60%, #0B1224 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Cyan horizon glow near the bottom */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 280,
            background:
              "linear-gradient(180deg, transparent 0%, rgba(34,211,238,0.06) 55%, rgba(34,211,238,0.14) 100%)",
          }}
        />

        {/* Left accent bar — the app's cyan signature */}
        <div
          style={{
            position: "absolute",
            left: 80,
            top: 80,
            bottom: 80,
            width: 3,
            borderRadius: 2,
            background: "#22D3EE",
            opacity: 0.8,
          }}
        />

        {/* Main text block */}
        <div
          style={{
            position: "absolute",
            left: 112,
            bottom: 104,
            display: "flex",
            flexDirection: "column",
            gap: 18,
            maxWidth: 820,
          }}
        >
          {/* Mono terminal eyebrow */}
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 22,
              letterSpacing: "0.06em",
              color: "#22D3EE",
              display: "flex",
            }}
          >
            › prompts.skypistudio.com
          </div>

          {/* Title */}
          <div
            style={{
              fontFamily: "serif",
              fontSize: 92,
              fontWeight: 300,
              lineHeight: 1.0,
              color: "#EAF0FA",
              letterSpacing: "-0.02em",
              display: "flex",
            }}
          >
            Prompt Library
          </div>

          {/* Tagline */}
          <div
            style={{
              fontFamily: "sans-serif",
              fontSize: 27,
              fontWeight: 300,
              color: "#C9D1E0",
              lineHeight: 1.4,
              letterSpacing: "-0.01em",
              display: "flex",
            }}
          >
            Run your prompts against Claude — streaming, your key, on-device.
          </div>
        </div>

        {/* Bottom-right byline badge */}
        <div
          style={{
            position: "absolute",
            right: 80,
            bottom: 56,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: "#22D3EE",
              opacity: 0.85,
              display: "flex",
            }}
          />
          <span
            style={{
              fontFamily: "sans-serif",
              fontSize: 19,
              letterSpacing: "0.04em",
              color: "#7B8AA0",
              display: "flex",
            }}
          >
            Built by Sky Halisky
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
