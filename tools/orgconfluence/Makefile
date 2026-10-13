# Every target runs inside the root Dockerfile's image by default (RUN_IN_DOCKER=1) -- build it
# with the root `make docker-image`. Set RUN_IN_DOCKER=0 to run natively (needs Node/pnpm on
# PATH). Deploying to Atlassian is not a
# target here -- see README.md's "Deploying".

SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c

ROOT := $(CURDIR)/../..

.PHONY: install lint typecheck test check _install _lint _typecheck _test _check

RUN_IN_DOCKER ?= 1

DOCKER_RUN = docker run --rm --init -e TINI_KILL_PROCESS_GROUP=true -v $(ROOT):/app -w /app/tools/orgconfluence \
	-v orgcanon-orgconfluence-node-modules:/app/tools/orgconfluence/node_modules

ifeq ($(RUN_IN_DOCKER),1)

install:
	$(DOCKER_RUN) orgcanon make _install
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
lint: _lint
typecheck: _typecheck
test: _test
check: _check

endif

_install:
	pnpm install

_lint: _install
	pnpm lint

_typecheck: _install
	pnpm typecheck

_test: _install
	pnpm test

_check: _lint _typecheck _test
