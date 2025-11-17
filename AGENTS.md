# Repository Guidelines

## Project Structure & Module Organization
- `app/` contains the Next.js App Router. Feature routes live under `app/zadanie*`, while shared shells sit in `app/layout.tsx` and providers in `app/providers.tsx`.
- API route handlers are grouped under `app/api/` (e.g. `app/api/vigenere/route.tsx`) and return crypto utilities as endpoints.
- Shared React and crypto helpers live in `app/components/` and `lib/crypto/` respectively; keep reusable logic outside page files.
- Static assets are under `public/`. Tooling sits at the repo root (`next.config.ts`, `eslint.config.mjs`, `tsconfig.json`).

## Build, Test, and Development Commands
- `npm install` – install dependencies; rerun after updating `package.json`.
- `npm run dev` – launch the local dev server at `http://localhost:3000` with hot reload.
- `npm run build` – create a production bundle and run type checks.
- `npm run start` – serve the optimized build (use after `npm run build`).
- `npm run lint` – run ESLint via the Next.js config; do this before opening a PR.

## Coding Style & Naming Conventions
- Code in TypeScript with strict mode enabled; annotate exports and function params explicitly when inference is unclear.
- Follow 2-space indentation and prefer named exports for shared utilities.
- Organize UI as functional React components backed by hooks; use MUI components for layout and styling consistency.
- Use the `@/` path alias for absolute imports from the repository root; keep route folder names lower-case (`app/zadanie1`, `app/api/hill`).

## Testing Guidelines
- No formal test runner ships yet; add focused unit or integration scripts alongside new logic (e.g. `lib/crypto/__tests__`) and note execution steps.
- Validate crypto helpers with fixtures and include sample inputs/outputs in the PR description.
- Always run `npm run lint` before committing to catch regressions.

## Commit & Pull Request Guidelines
- Write short, imperative commit titles (e.g. `Add RC4 bruteforce helper`) and include context in the body when behavior changes.
- Keep commits scoped to a single task or feature; avoid combining unrelated refactors with feature work.
- Pull requests should link the relevant assignment or issue, list executed checks (`npm run lint`, custom scripts), and attach UI screenshots for visible changes.
- Mention any new environment variables or config toggles so reviewers can reproduce your setup.

## Environment & Security Notes
- Store secrets in `.env.local` and never commit them; limit `NEXT_PUBLIC_*` to values safe for the browser.
- Review crypto helpers for timing/randomness issues and document third-party data or key material needed for reproduction.
