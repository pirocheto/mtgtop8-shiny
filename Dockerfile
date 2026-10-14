# One image, two stages: Node builds the SPA, nginx serves it. The runtime
# carries neither Node nor the sources -- only the static files.

# Global build args: usable in every FROM below.
ARG NODE_VERSION=24
ARG NGINX_VERSION=1.29

# --------------------
# Builder stage
# --------------------
FROM node:${NODE_VERSION}-slim AS builder

WORKDIR /app

# Dependencies first: they only change when the lockfile does.
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY . ./

# Path prefix the SPA will be served under. Vite bakes it into every asset URL,
# so it has to be known HERE, at build time -- unlike nginx, which takes it at
# run time. Empty = whatever .env.production says; pass
# `--build-arg BASE_PATH=/other` to build for another prefix.
#
# It must equal the BASE_PATH the container runs with, and both must equal the
# path the reverse proxy in front of it routes here.
ARG BASE_PATH=""

# Exported only when non-empty, deliberately. `ENV VITE_BASE_PATH=${BASE_PATH}`
# would DEFINE the variable as an empty string when no build arg is passed, and
# an empty value wins over .env.production -- a plain `docker build` would then
# silently produce a bundle built for the root of the domain.
# The build, and then the prefix it used, written where the runtime stage can
# pick it up. Resolved once, here, because this is the only place that knows
# both the build arg and .env.production -- the runtime stage defaults nginx to
# this value so the two halves cannot disagree, see there.
RUN if [ -n "${BASE_PATH}" ]; then \
      VITE_BASE_PATH="${BASE_PATH}" npm run build; \
      printf '%s' "${BASE_PATH}" > /base-path; \
    else \
      npm run build; \
      sed -n 's/^VITE_BASE_PATH=//p' .env.production | tr -d '\n' > /base-path; \
    fi


# --------------------
# Runtime stage
# --------------------
# -unprivileged: runs as uid 101 with no setuid binaries, and listens on 8080.
# The stock nginx image runs its master process as root, which a static site
# has no reason to need.
FROM nginxinc/nginx-unprivileged:${NGINX_VERSION}-alpine

# For a container health check that calls /health (see nginx/default.conf.template).
USER root
RUN apk add --no-cache curl
USER 101

# Rendered by the image's own entrypoint at start, see nginx/default.conf.template.
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template

COPY --from=builder /app/dist /usr/share/nginx/html

# The prefix the bundle was built for, and the entrypoint hook that makes it
# nginx's default when the container is started without one.
#
# Without it, a `docker run` with no BASE_PATH would serve at the root while
# the bundle asks for /<prefix>/assets/..., and nginx would answer those with
# index.html: a 200, a text/html content type, and a blank page. The task
# definition sets BASE_PATH explicitly anyway, to this same value.
#
# The hook is numbered 10- so it runs BEFORE the image's own envsubst step
# (20-), which is what reads BASE_PATH, and is an `.envsh` because that is the
# extension the entrypoint SOURCES -- a `.sh` runs in a subshell and its export
# would reach nothing.
COPY --from=builder /base-path /etc/nginx/base-path
COPY --chmod=755 docker-entrypoint.d/10-default-base-path.envsh /docker-entrypoint.d/10-default-base-path.envsh

# NGINX_ENVSUBST_FILTER restricts the substitution to this one variable:
# without it envsubst would also expand nginx's own $uri and $host, and the
# config would silently lose them.
ENV NGINX_ENVSUBST_FILTER="BASE_PATH"

EXPOSE 8080
