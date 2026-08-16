See CLAUDE.md.

## Frontend theming and styling

For frontend work, compose existing `@librechat/client` primitives and variants before adding
feature-local styles. Use semantic theme/Tailwind roles for color and shared appearance; do not
introduce raw palette utilities, hard-coded colors, or arbitrary theme CSS. If the system cannot
express a reusable design need, deepen the shared primitive or versioned theme-token registry
instead of copying classes into a feature. Keep genuine layout and behavior local, and document
why any new custom CSS cannot be expressed by the shared system. See the detailed policy in
`CLAUDE.md` under "Theming and styling."

When adding or changing code that mutates user documents, invalidate the auth user document cache for affected users. This includes single-user updates and bulk role/user mutations; otherwise OpenID JWT request burst caching can serve a stale `req.user` until its TTL expires.

## Base44 Development Setup

- **Stack**: Node.js 24 monorepo (npm workspaces) with Vite 8 frontend and Express 5 backend.
- **Compose file**: `docker-compose.base44.yml` — runs MongoDB, API (nodemon), and Vite dev server.
- **Preview port**: 3000 (Vite dev server) proxies /api and /oauth to the API on port 3080.
- **Packages**: Four workspace packages (`data-provider`, `data-schemas`, `api`, `client`) must be built before the app starts — handled by the `setup` service.
- **Config warnings**: The "librechat.yaml not found" and "RAG API not reachable" warnings are benign — the app works without them.
- **External secrets**: AI provider keys (OpenAI, Anthropic, Google) default to `user_provided` meaning users enter them through the UI. No external secrets are required to boot.
- **Vite proxy**: `BACKEND_HOST=api` env var tells the Vite dev server to proxy API requests to the `api` container (not localhost).
- **Allowed hosts**: `VITE_ALLOWED_HOSTS` is set to the Base44 preview hostname to pass Vite's host check.
