# Convenience targets for running orgapi locally. See README.md for DATA_DIR/TERRAFORM_BIN.
#
# Every target runs inside the root Dockerfile's image by default (RUN_IN_DOCKER=1) -- build
# it with the root `make docker-image`.
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
.PHONY: install dev test check _install _dev _test _check

RUN_IN_DOCKER ?= 1

# No image name in DOCKER_RUN itself -- each call site supplies it (and extra flags, e.g. dev's
# -p), which must land before it in docker run's argument order.
DOCKER_RUN = docker run --rm --init -e TINI_KILL_PROCESS_GROUP=true -v $(ROOT):/app -w /app/tools/orgapi \
	-v orgcanon-orgapi-venv:/app/tools/orgapi/.venv \
	-v orgcanon-orgapi-dist:/dist -e DIST_DIR=/dist

ifeq ($(RUN_IN_DOCKER),1)

install:
	$(DOCKER_RUN) orgcanon make _install
dev:
	$(DOCKER_RUN) -p $(PORT):$(PORT) orgcanon make _dev DATA_DIR=$(DATA_DIR) TERRAFORM_BIN=$(TERRAFORM_BIN) PORT=$(PORT)
dev-%:
	$(DOCKER_RUN) -p $(PORT):$(PORT) orgcanon make _dev DATA_DIR=$(EXAMPLES_DIR)/$* TERRAFORM_BIN=$(TERRAFORM_BIN) PORT=$(PORT)
test:
	$(DOCKER_RUN) orgcanon make _test
check:
	$(DOCKER_RUN) orgcanon make _check

else

install: _install
dev: _dev
dev-%:
	$(MAKE) _dev DATA_DIR=$(EXAMPLES_DIR)/$*
test: _test
check: _check

endif

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

_check: _test
