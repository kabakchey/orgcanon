# Convenience targets for running orgviewer locally. It no longer reads data-source env vars --
# it's a static SPA that fetches from orgapi at runtime, configured via the UI itself.
#
# Every target runs inside the root Dockerfile's image by default (RUN_IN_DOCKER=1) -- build it
# with the root `make docker-image`. Set RUN_IN_DOCKER=0 to run natively (needs Node/pnpm on
# PATH).

SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c

ROOT := $(CURDIR)/../..
PORT ?= 5173

# Native default; under Docker, DOCKER_RUN overrides via -e DIST_DIR=/dist (a named volume) so
# `build`'s output never lands in the bind-mounted working tree. Only `build` uses this, as
# vite's --outDir.
DIST_DIR ?= $(CURDIR)/.dist

.PHONY: install dev build lint typecheck test check \
	_install _dev _build _lint _typecheck _test _check

RUN_IN_DOCKER ?= 1

# No image name in DOCKER_RUN itself -- each call site supplies it (and extra flags, e.g. dev's
# -p), which must land before it in docker run's argument order.
DOCKER_RUN = docker run --rm --init -e TINI_KILL_PROCESS_GROUP=true -v $(ROOT):/app -w /app/tools/orgviewer \
	-v orgcanon-orgviewer-node-modules:/app/tools/orgviewer/node_modules \
	-v orgcanon-orgviewer-dist:/dist -e DIST_DIR=/dist

ifeq ($(RUN_IN_DOCKER),1)

install:
	$(DOCKER_RUN) orgcanon make _install
dev:
	$(DOCKER_RUN) -p $(PORT):$(PORT) orgcanon make _dev
build:
	$(DOCKER_RUN) orgcanon make _build
lint:
	$(DOCKER_RUN) orgcanon make _lint
typecheck:
	$(DOCKER_RUN) orgcanon make _typecheck
test:
	$(DOCKER_RUN) orgcanon make _test
check:
	$(DOCKER_RUN) orgcanon make _check

else

install: _install
dev: _dev
build: _build
lint: _lint
typecheck: _typecheck
test: _test
check: _check

endif

_install:
	pnpm install

# --host 0.0.0.0: Vite's default (localhost) is the *container's* loopback, unreachable through
# dev's -p mapping -- harmless natively too, just also LAN-reachable during that dev session.
_dev: _install
	pnpm exec vite --host 0.0.0.0 --port $(PORT)

# vite invoked directly (pnpm exec), not `pnpm build`: `pnpm run <script> -- <args>`
# forwards a literal "--" into the script's command line rather than stripping it, breaking
# vite's flag parsing. --outDir overrides vite.config.ts's default, which only serves a bare
# `vite build` run outside Make; DIST_DIR must be honored here since it's outside the tree.
_build: _typecheck
	pnpm exec vite build --outDir $(DIST_DIR) --emptyOutDir

_lint: _install
	pnpm lint

_typecheck: _install
	pnpm typecheck

_test: _install
	pnpm test

_check: _lint _typecheck _test
