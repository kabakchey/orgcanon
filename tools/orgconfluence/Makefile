# Every target runs inside the root Dockerfile's `node` image by default (RUN_IN_DOCKER=1). Set
# RUN_IN_DOCKER=0 to run natively (needs Node/pnpm on PATH). Deploying to Atlassian is not a
# target here -- see README.md's "Deploying".

SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c

ROOT := $(CURDIR)/../..

.PHONY: install test docker-image _install _test

RUN_IN_DOCKER ?= 1

# node_modules is a named volume for the same reason as tools/orgviewer/Makefile's: containers
# run as root, so a bind-mounted one would leave root-owned files on the host.
DOCKER_RUN = docker run --rm --init -e TINI_KILL_PROCESS_GROUP=true -v $(ROOT):/app -w /app/tools/orgconfluence \
	-v orgcanon-orgconfluence-node-modules:/app/tools/orgconfluence/node_modules

ifeq ($(RUN_IN_DOCKER),1)

install: docker-image
	$(DOCKER_RUN) orgcanon:node make _install
test: docker-image
	$(DOCKER_RUN) orgcanon:node make _test

else

install: _install
test: _test

endif

# Owned by the root Makefile (the Dockerfile lives there) -- this just triggers it, so the
# `docker build` command itself exists in exactly one place.
docker-image:
	$(MAKE) -C $(ROOT) docker-image-node

_install:
	pnpm install

_test: _install
	pnpm lint
	pnpm typecheck
	pnpm test
