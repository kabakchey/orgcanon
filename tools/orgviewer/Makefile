# Convenience targets for running orgviewer locally. It no longer reads data-source env vars --
# it's a static SPA that fetches from orgapi at runtime, configured via the UI itself.
#
# Every target runs inside the root Dockerfile's `node` image by default (RUN_IN_DOCKER=1). Set
# RUN_IN_DOCKER=0 to run natively (needs Node/pnpm on PATH).

SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c

ROOT := $(CURDIR)/../..
PORT ?= 5173

# Native default; under Docker, DOCKER_RUN overrides via -e DIST_DIR=/dist (a named volume) so
# `build`'s output never lands in the bind-mounted working tree. Only `build` uses this, as
# vite's --outDir.
DIST_DIR ?= $(CURDIR)/.dist

.PHONY: install dev build test docker-image _install _dev _build _test

RUN_IN_DOCKER ?= 1

# Containers run as root -- pnpm's bin-linking step chmods files unconditionally, which only
# root (baked in at image-build time) can do. Named volumes (not a bind-mounted
# node_modules/DIST_DIR) make that harmless: nothing lands on the host -- extract a file with
# `docker run --rm -v orgcanon-orgviewer-dist:/dist -v $$PWD:/out alpine cp -r /dist/. /out/`, or
# `docker cp` from a running container. No image name in DOCKER_RUN itself -- each call site
# supplies it (and extra flags, e.g. dev's -p), which must land before it in docker run's
# argument order.
#
# --init/TINI_KILL_PROCESS_GROUP: without them, the container's PID 1 is `make` itself, and
# Docker's Ctrl+C handling signals only that one PID -- not the whole process tree the way a
# local terminal's foreground process group would. Nothing in the make -> pnpm -> vite chain
# relays it onward, so it's silently swallowed and `dev` never stops. `--init` runs tini as
# PID 1, and this env var tells it to signal the whole process group instead of just its
# direct child, reaching everything below `make` too.
DOCKER_RUN = docker run --rm --init -e TINI_KILL_PROCESS_GROUP=true -v $(ROOT):/app -w /app/tools/orgviewer \
	-v orgcanon-orgviewer-node-modules:/app/tools/orgviewer/node_modules \
	-v orgcanon-orgviewer-dist:/dist -e DIST_DIR=/dist

ifeq ($(RUN_IN_DOCKER),1)

install: docker-image
	$(DOCKER_RUN) orgcanon:node make _install
dev: docker-image
	$(DOCKER_RUN) -p $(PORT):$(PORT) orgcanon:node make _dev
build: docker-image
	$(DOCKER_RUN) orgcanon:node make _build
test: docker-image
	$(DOCKER_RUN) orgcanon:node make _test

else

install: _install
dev: _dev
build: _build
test: _test

endif

# Owned by the root Makefile (the Dockerfile lives there) -- this just triggers it, so the
# `docker build` command itself exists in exactly one place.
docker-image:
	$(MAKE) -C $(ROOT) docker-image-node

_install:
	pnpm install

# --host 0.0.0.0: Vite's default (localhost) is the *container's* loopback, unreachable through
# dev's -p mapping -- harmless natively too, just also LAN-reachable during that dev session.
_dev: _install
	pnpm exec vite --host 0.0.0.0 --port $(PORT)

# tsc + vite invoked directly (pnpm exec), not `pnpm build`: `pnpm run <script> -- <args>`
# forwards a literal "--" into the script's command line rather than stripping it, breaking
# vite's flag parsing. --outDir overrides vite.config.ts's default, which only serves a bare
# `vite build` run outside Make; DIST_DIR must be honored here since it's outside the tree.
_build: _install
	pnpm exec tsc --noEmit
	pnpm exec vite build --outDir $(DIST_DIR) --emptyOutDir

_test: _install
	pnpm test
