# Dev server port. Override for a one-off: `make dev WEB_PORT=5174`.
WEB_PORT ?= 5173

# Port the container exposes, and the one `make start` publishes.
APP_PORT ?= 8080

# Path prefix the SPA is served under. It is a build input for the bundle (Vite
# bakes it into the asset URLs) and a runtime one for nginx, so the targets
# below read it once here, from the committed default, and pass it to both.
# Override for a one-off: `make preview BASE_PATH=`.
BASE_PATH ?= $(shell sed -n 's/^VITE_BASE_PATH=//p' .env.production)

.PHONY: install
install:
	@echo "Install the dependencies."
	npm ci

.PHONY: dev
dev:
	@echo "Run the Vite dev server (proxies /mtgtop8, see vite.config.ts)."
	@# --strictPort: Vite fails loudly rather than sliding to 5174, where the
	@# app would answer on a port nobody is watching.
	npm run dev -- --port $(WEB_PORT) --strictPort

.PHONY: build
build:
	@echo "Build the SPA into dist/ (base path: $(BASE_PATH)/)."
	VITE_BASE_PATH=$(BASE_PATH) npm run build

.PHONY: preview
preview: build
	@echo "Serve the built SPA with Vite's own preview server."
	@echo "  -> http://localhost:4173$(BASE_PATH)/"
	npm run preview

.PHONY: lint
lint:
	@echo "Run linting and type checks."
	npm run lint
	npm run typecheck

.PHONY: test
test:
	@echo "Run the unit tests (the mtgtop8 parsers, against saved pages)."
	npm test

.PHONY: test-e2e
test-e2e:
	@echo "Run the end-to-end tests (starts the dev server itself)."
	@# Local only: there is no CI job for these, see playwright.config.ts.
	@# Run `make test-e2e-install` once per clone first.
	npm run test:e2e

.PHONY: test-e2e-ui
test-e2e-ui:
	@echo "Run the end-to-end tests in watch mode, for writing them."
	npm run test:e2e:ui

.PHONY: test-e2e-install
test-e2e-install:
	@echo "Install the browser Playwright drives. Once per clone."
	@# Not in node_modules: Playwright keeps browsers in a shared cache, so
	@# `npm ci` alone leaves the suite unable to start.
	npx playwright install chromium

.PHONY: mcp-install
mcp-install:
	@echo "Install the browser the Playwright MCP server drives. Once per clone."
	@# Not the same build as the target above, for two reasons. Playwright
	@# ships Chromium as a full `Google Chrome for Testing` and as a smaller
	@# `chrome-headless-shell` it prefers when headless, which cannot run
	@# headed; the MCP server is headed by default and wants the full one. And
	@# it pins its own Playwright version, usually ahead of this project's, so
	@# it wants that version's build. Only needed to drive the app from an
	@# agent, see .mcp.json.
	npx -y @playwright/mcp@latest install-browser chrome-for-testing

.PHONY: image
image:
	@echo "Build the Docker image (base path: $(BASE_PATH))."
	docker build --build-arg BASE_PATH=$(BASE_PATH) -t frontend:latest .

.PHONY: start
start:
	@echo "Start the app using Docker, as it runs in production."
	@echo "  -> http://localhost:$(APP_PORT)$(BASE_PATH)/"
	@# BASE_PATH is passed at RUN time here, for nginx, and was passed at BUILD
	@# time above, for Vite. `make image start` keeps the two equal; changing
	@# one alone is exactly the drift the README warns about.
	docker run --rm -p $(APP_PORT):8080 -e BASE_PATH=$(BASE_PATH) frontend:latest
