---
name: infra-conventions
description: Container/nginx conventions for the Rest Assured frontend (port, base image, upstream, build caveat)
metadata:
  type: project
---

Infra conventions established for the Rest Assured frontend repo.

**Container serves on port 8080, not 80.**
Why: the serve stage uses `nginxinc/nginx-unprivileged:1.27-alpine`, which runs as
non-root user `nginx` (UID 101). Non-root cannot bind privileged ports (<1024), so
nginx listens on 8080. Dockerfile `EXPOSE 8080` and the healthcheck both target 8080.
How to apply: docker-compose (T25) must map a host port to container **8080**. Keep
EXPOSE / nginx `listen` / healthcheck / compose port mapping all consistent on 8080.

**nginx config lives at `nginx/default.conf`** and is COPYed into
`/etc/nginx/conf.d/default.conf` by the Dockerfile serve stage (no more inline
heredoc/printf placeholder). Vite emits hashed assets under `/assets/` — these get
`Cache-Control: immutable`; `index.html` gets `no-cache`. SPA fallback is
`try_files $uri $uri/ /index.html`. `server_tokens off`.

**Backend upstream = `backend:8000`** (docker-compose service host). Backend image is
`ghcr.io/mipt-pp-hackaton/rest_assured:latest`. Backend listen port 8000 is an ASSUMED
default (not confirmed against a running backend) — parameterised in the nginx
`upstream` block; change there + in compose if the backend listens elsewhere. All
backend API routes are under `/api/`; there is also a top-level `/health` probe. nginx
proxies `/api/` and `/health`, forwarding Host/X-Real-IP/X-Forwarded-For/
X-Forwarded-Proto and passing through the `Authorization` header for bearer auth.

**Docker build is currently BROKEN by application code, not infra.**
Why: the serve image's build stage runs `npm run build`, which runs `tsc`. As of
2026-05-27 several `src/**/*.test.ts(x)` files reference modules/types that don't exist
yet (other in-progress tasks), so `tsc` fails and `docker build` cannot complete.
How to apply: a full container smoke (build image -> run -> curl) is blocked until those
src tests/modules land. Validate nginx changes instead by mounting `nginx/default.conf`
into the `nginxinc/nginx-unprivileged:1.27-alpine` image with `--add-host backend:127.0.0.1`
(so the upstream name resolves at config load) and running `nginx -t` plus curl against a
synthetic html root. Do NOT try to "fix" the src test files — that is application scope.
