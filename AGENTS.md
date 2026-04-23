# AGENTS.md — Velvet Willow Mood Board

Single-page Vite + React 19 + TypeScript app. NOT a monorepo.

## Dev commands

- `npm install`
- `npm run dev` — Vite dev server on **port 3000**
- `npm run build` — production build
- `npm run preview` — preview production build

No test, lint, or typecheck scripts are defined in `package.json`.

## Toolchain quirks

- **Tailwind CSS** is loaded via CDN in `index.html` (`https://cdn.tailwindcss.com`), not via npm or PostCSS.
- **React and `@google/genai`** are also loaded via an ESM importmap in `index.html` (from `esm.sh`). The local Vite bundle coexists with these browser imports.
- Custom CSS lives in `index.css` and uses `@tailwind` directives, but it is served as a plain stylesheet linked from `index.html`.
- Path alias `@/` maps to the repo root in both `tsconfig.json` and `vite.config.ts`.
- **Fonts**: Inter (sans-serif) and Playfair Display (serif) are loaded from Google Fonts in `index.html`.

## API keys and environment

- The app requires a **FAL API key**. Set `FAL_API_KEY` in `.env.local`.
- `vite.config.ts` injects the key into the bundle as `process.env.FAL_API_KEY`.
- The app calls `fal-ai/nano-banana-2/edit` for image compositing, background removal, and scene editing.

## Architecture notes

- **Entry**: `index.tsx` mounts `<App />` into `#root`.
- **State**: All state lives in `App.tsx` (no external state library).
- **AI logic**: `services/falService.ts` handles all FAL API calls, image resizing, marking, cropping, and retry logic.
- **Types**: `types.ts` exports `Product` and `DepthLayer`.
- **Components**: All UI components are in `components/` and are default exports.

## Style conventions

- Apache-2.0 license header on source files.
- Components use functional style with `React.FC` and explicit interface props.
- Tailwind utility classes for all styling; custom animations and dot-pattern background live in `index.css`.
