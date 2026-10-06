See CLAUDE.md.

## Frontend theming and styling

For frontend work, compose existing `@librechat/client` primitives and variants before adding
feature-local styles. Use semantic theme/Tailwind roles for color and shared appearance; do not
introduce raw palette utilities, hard-coded colors, or arbitrary theme CSS. If the system cannot
express a reusable design need, deepen the shared primitive or versioned theme-token registry
instead of copying classes into a feature. Keep genuine layout and behavior local, and document
why any new custom CSS cannot be expressed by the shared system. See the detailed policy in
`CLAUDE.md` under “Theming and styling.”

## Base44 dev environment

- Run: `docker compose -f docker-compose.base44.yml up -d`. Port 3000 is the Vite dev server (`client`); it proxies `/api` and `/oauth` to the Express API (`api`, nodemon, port 3080 internal). MongoDB is the only infra; Meilisearch/RAG/Redis are off (`SEARCH=false`).
- The one-shot `setup` service runs `npm ci` only when `package-lock.json` changes (stamp in `node_modules/.base44-lock.sha`), then always runs `npm run build:packages`. The API and client consume `packages/*` through their built `dist/`, so after editing `packages/*` run `docker compose -f docker-compose.base44.yml up -d --force-recreate setup` and restart `api`. `up -d` alone does not re-run a completed `setup`.
- The API reads `client/dist/index.html` at boot (SPA fallback). `setup` copies `client/index.html` there when no build exists. If that file is missing, nodemon crashes and sits at "waiting for file changes". Restart `api` after fixing it.
- In the client container, `HOST=api` only points the Vite proxy at the backend. Vite itself binds 0.0.0.0 through `--host`.
- `CREDS_KEY`, `CREDS_IV`, `JWT_SECRET` and `JWT_REFRESH_SECRET` are generated automatically and kept in the `librechat_data` volume (`/base44-data/.env.temp`). Do not delete that volume, or stored encrypted user keys stop working.
- With no `librechat.yaml`, the API logs a "Config file YAML format is invalid" error. It is harmless. AI provider keys default to user-provided (entered in the UI).
- Verify with `curl localhost:3000/` (Vite source modules) and `curl localhost:3000/api/config` (JSON from the API).

When adding or changing code that mutates user documents, invalidate the auth user document cache for affected users. This includes single-user updates and bulk role/user mutations; otherwise OpenID JWT request burst caching can serve a stale `req.user` until its TTL expires.
