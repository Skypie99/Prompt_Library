# Prompt Library

A fast, private prompt library for the browser. Save your best AI prompts, fill in their `{{variables}}` from a clean form, and run them against the Anthropic API with your own key — all without an account, a backend, or a single byte of your data leaving your machine.

**Live:** [prompts.skypistudio.com](https://prompts.skypistudio.com)

![screenshot](docs/screenshot.png)

<!-- {{SKY: add screenshot}} — drop a real screenshot at docs/screenshot.png (the app on a desktop, light or dark theme). The image above 404s until then. -->

## Privacy model

Everything is on-device by design:

- **Bring your own key.** You paste your own Anthropic API key; it's stored only in your browser and used only to call the API directly from your machine.
- **All data stays in this browser.** Your prompts, run history, and settings live in `localStorage`. There is no server, no account, and no telemetry — nothing is collected and nothing is sent anywhere except the Anthropic API call you trigger.
- **Static by construction.** The app ships as a static export with no backend, so there's nowhere for your data to go even if it wanted to.

## Stack

- **Next.js 15** (App Router, `output: export` static build)
- **React 19**
- **Tailwind CSS**
- **Vitest** for the test suite

## Run it locally

```bash
npm install && npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

Other useful scripts: `npm run build` (static export to `out/`), `npm test` (Vitest), `npm run typecheck`, and `npm run lint`.

---

Built by Skyler Halisky — [GitHub](https://github.com/skypie99) · [LinkedIn](https://www.linkedin.com/in/skyler-halisky)
