# Convenience targets for running orgapi locally. See README.md for DATA_DIR/TERRAFORM_BIN.
#
# Every target runs inside the root Dockerfile's `core` image by default (RUN_IN_DOCKER=1).
# Set RUN_IN_DOCKER=0 to run natively (needs uv on PATH).

SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c

ROOT := $(CURDIR)/../..

# Terraform root module to serve; override on the command line, e.g.:
#   make dev DATA_DIR=../../examples/three-level-hierarchy
DATA_DIR ?= ../../org-model
PORT ?= 8387

# Resolved via PATH, same as the root Makefile's TERRAFORM variable.
TERRAFORM_BIN ?= terraform

EXAMPLES_DIR := ../../examples

# Native default; under Docker, DOCKER_RUN overrides via -e DIST_DIR=/dist (a named volume) so
# nothing lands in the bind-mounted working tree.
DIST_DIR ?= $(CURDIR)/.dist

# Redirects Terraform's provider/module cache off `<data-dir>/.terraform`; load_org_data()'s
# `-chdir=X init` picks this up from the environment, same as the root Makefile's TF_DATA_DIR.
TF_DATA_DIR := $(DIST_DIR)/terraform-data
PYTHONPYCACHEPREFIX := $(DIST_DIR)/pycache
export TF_DATA_DIR PYTHONPYCACHEPREFIX

# dev-% isn't in .PHONY: doing so would register an empty explicit rule that shadows the
# pattern rule below. It never matches a real file, so make runs it anyway.
.PHONY: install dev test docker-image _install _dev _test

RUN_IN_DOCKER ?= 1

# Containers run as root -- pnpm's bin-linking step chmods files unconditionally, which only
# root (baked in at image-build time) can do. Named volumes (not a bind-mounted .venv/DIST_DIR)
# make that harmless: nothing lands on the host -- extract a file with `docker run --rm -v
# orgcanon-orgapi-dist:/dist -v $$PWD:/out alpine cp -r /dist/. /out/`, or `docker cp` from a running
# container. No image name in DOCKER_RUN itself -- each call site supplies it (and extra flags,
# e.g. dev's -p), which must land before it in docker run's argument order.
#
# --init/TINI_KILL_PROCESS_GROUP: without them, the container's PID 1 is `make` itself, and
# Docker's Ctrl+C handling signals only that one PID -- not the whole process tree the way a
# local terminal's foreground process group would. Nothing in the make -> uv -> uvicorn ->
# `--reload` worker chain relays it onward, so it's silently swallowed and `dev` never stops.
# `--init` runs tini as PID 1, and this env var tells it to signal the whole process group
# instead of just its direct child, reaching everything below `make` too.
DOCKER_RUN = docker run --rm --init -e TINI_KILL_PROCESS_GROUP=true -v $(ROOT):/app -w /app/tools/orgapi \
	-v orgcanon-orgapi-venv:/app/tools/orgapi/.venv \
	-v orgcanon-orgapi-dist:/dist -e DIST_DIR=/dist

ifeq ($(RUN_IN_DOCKER),1)

install: docker-image
	$(DOCKER_RUN) orgcanon:core make _install
dev: docker-image
	$(DOCKER_RUN) -p $(PORT):$(PORT) orgcanon:core make _dev DATA_DIR=$(DATA_DIR) TERRAFORM_BIN=$(TERRAFORM_BIN) PORT=$(PORT)
dev-%: docker-image
	$(DOCKER_RUN) -p $(PORT):$(PORT) orgcanon:core make _dev DATA_DIR=$(EXAMPLES_DIR)/$* TERRAFORM_BIN=$(TERRAFORM_BIN) PORT=$(PORT)
test: docker-image
	$(DOCKER_RUN) orgcanon:core make _test

else

install: _install
dev: _dev
dev-%:
	$(MAKE) _dev DATA_DIR=$(EXAMPLES_DIR)/$*
test: _test

endif

# Owned by the root Makefile (the Dockerfile lives there) -- this just triggers it, so the
# `docker build` command itself exists in exactly one place.
docker-image:
	$(MAKE) -C $(ROOT) docker-image-core

_install:
	uv sync

# --host=0.0.0.0: uvicorn's default (127.0.0.1) is the *container's* loopback, unreachable
# through dev's -p mapping -- harmless natively too (see README's "CORS is enabled for any
# origin").
_dev: _install
	DATA_DIR=$(DATA_DIR) TERRAFORM_BIN=$(TERRAFORM_BIN) uv run uvicorn orgapi.app:app --host=0.0.0.0 --port=$(PORT) --reload

# -o cache_dir=... overrides pyproject.toml's own cache_dir -- that default only serves a bare
# `pytest` run outside Make; DIST_DIR must be honored here since it points outside the working
# tree under Docker.
_test: _install
	uv run pytest -o cache_dir=$(DIST_DIR)/pytest_cache
