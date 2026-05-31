# syntax=docker/dockerfile:1

# ---- Stage 1: build the Vite SPA ----
FROM node:22-alpine AS build

WORKDIR /app

# Install dependencies first to leverage layer caching.
COPY package.json package-lock.json ./
RUN npm ci

# Build-time API base URL for the SPA. Vite inlines VITE_* env vars at build
# time, so this must be provided as a build ARG (not a runtime env var).
# Default is empty, meaning the browser uses same-origin relative URLs (e.g.
# "/api/..."), which nginx then reverse-proxies to the backend. docker-compose
# injects this via the `frontend` service `build.args` (see docker-compose.yml).
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Copy the rest of the source and build.
COPY . .
RUN npm run build

# ---- Stage 2: serve with unprivileged nginx ----
# nginxinc/nginx-unprivileged runs as a non-root user (UID 101) by default
# and listens on port 8080. A non-root process cannot bind privileged ports
# (<1024), so the container serves on 8080. docker-compose maps a host port
# to container 8080 (see docker-compose.yml / T25).
FROM nginxinc/nginx-unprivileged:1.27-alpine AS serve

# The base image's default user is "nginx" (UID 101). Switch to root only
# to write files, then drop back to the non-root user for runtime.
USER root

# Install the project's own nginx server config (SPA history fallback +
# API reverse proxy, listening on 8080) at the conf.d default path.
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
RUN rm -rf /usr/share/nginx/html/* \
    && chown -R nginx:nginx /usr/share/nginx/html

# Copy the built assets from the build stage.
COPY --from=build --chown=nginx:nginx /app/dist /usr/share/nginx/html

# Drop privileges: run as the non-root nginx user.
USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --spider http://127.0.0.1:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
