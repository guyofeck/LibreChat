See CLAUDE.md.

## Base44 Dev Environment

- **Stack**: Node.js 22 monorepo (npm workspaces) — Express API + Vite React frontend + MongoDB
- **Dev compose**: `docker-compose.base44.yml` — runs all services in dev mode with live reload
- **Setup service**: installs deps and builds internal workspace packages (`data-provider`, `data-schemas`, `api`, `client` packages) before starting app services. Also creates a placeholder `client/dist/index.html` needed by the API server at startup.
- **Client**: Vite dev server on port 3090 (mapped to host 3000), proxies `/api` and `/oauth` to backend
- **API**: nodemon on port 3080, auto-restarts on file changes
- **Vite config change**: `VITE_ALLOWED_HOSTS=true` enables all hosts; `BACKEND_HOST` env var separates proxy target from server bind address
- **No external secrets required to boot** — AI provider keys default to `user_provided` (users enter them in the UI)
- **Verify**: `curl http://localhost:3000/api/config` should return JSON config

## Frontend theming and styling

For frontend work, compose existing `@librechat/client` primitives and variants before adding
feature-local styles. Use semantic theme/Tailwind roles for color and shared appearance; do not
introduce raw palette utilities, hard-coded colors, or arbitrary theme CSS. If the system cannot
express a reusable design need, deepen the shared primitive or versioned theme-token registry
instead of copying classes into a feature. Keep genuine layout and behavior local, and document
why any new custom CSS cannot be expressed by the shared system. See the detailed policy in
`CLAUDE.md` under "Theming and styling."

When adding or changing code that mutates user documents, invalidate the auth user document cache for affected users. This includes single-user updates and bulk role/user mutations; otherwise OpenID JWT request burst caching can serve a stale `req.user` until its TTL expires.
