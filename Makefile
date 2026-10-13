# Single source of truth for prerequisite install + validation commands, called identically
# from .pre-commit-config.yaml, .github/workflows/validate.yml, and .gitlab-ci.yml -- see
# docs/architecture.md's "Key design decisions" ("The orgapi/orgviewer stack").
#
# Every target here (and in each tools/*/Makefile) runs inside the
# image built from the root Dockerfile by default (RUN_IN_DOCKER=1) -- Docker plus `make` are
# the only local prerequisites. Only `make docker-image` (or its alias `install`) builds that image: run it first, and
# again whenever the Dockerfile, a dependency manifest, or the orgviewer bundle baked into it
# should be refreshed. RUN_IN_DOCKER=0 runs natively instead, expecting the real
# prerequisites already on PATH (terraform, python3, plus uv/Node+pnpm if you touch
# anything under tools/ natively).
#
# "Outer" targets below (fmt, validate, check, ...) are what CI/pre-commit/humans call; under
# RUN_IN_DOCKER=1 each wraps one `docker run` of the matching "_"-prefixed inner target, which
# holds the real recipe.

SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c

TERRAFORM_DIR := org-model

# Native default; under Docker, DOCKER_RUN overrides via -e DIST_DIR=/dist (a named volume) so
# nothing lands in the bind-mounted working tree.
DIST_DIR      ?= $(CURDIR)/.dist
PLAN_DIR      := $(DIST_DIR)/terraform-plan
PLAN_FILE     := $(PLAN_DIR)/tfplan
STATE_FILE    := $(PLAN_DIR)/tfstate
DIFF_SUMMARY_FILE  := $(PLAN_DIR)/diff-summary.md
DIFF_BASE_CHECKOUT := $(PLAN_DIR)/diff-base-checkout
DIFF_BEFORE_JSON    := $(PLAN_DIR)/diff-before.json
DIFF_AFTER_JSON     := $(PLAN_DIR)/diff-after.json

# "Before" state for diff-based checks (diff-summary, check-retirement-confirmations): CI
# overrides this with the actual PR/MR base SHA; locally (including pre-commit, which has no
# concept of a PR base) it falls back to the default branch, which must already be a resolvable
# local ref (e.g. fetched) for `git worktree add` below to succeed.
BASE_SHA ?= origin/main

# Resolved via PATH -- this Makefile never installs Terraform itself, in Docker or natively.
# Override for a specific binary.
TERRAFORM ?= terraform

# Redirects Terraform's provider/module cache off the default `<module>/.terraform`; every
# `-chdir=X init` below picks this up from the environment. Safe to share across -chdir targets
# since each re-`init`s immediately before use.
TF_DATA_DIR := $(DIST_DIR)/terraform-data
# Python bytecode cache for scripts/*.py, kept out of the working tree the same way.
PYTHONPYCACHEPREFIX := $(DIST_DIR)/pycache
export TF_DATA_DIR PYTHONPYCACHEPREFIX

.PHONY: install fmt init validate plan apply check-team-hierarchy check-retirement-confirmations \
	check-reviewable-expiration check-scripts check check-examples clean \
	check-friendly report-data-quality diff-summary post-review-comment \
	check-orgapi check-orgviewer check-orgconfluence \
	docker-image \
	_fmt _init _validate _plan _apply _check-team-hierarchy _check-retirement-confirmations \
	_check-reviewable-expiration _check-scripts _check _check-examples _diff-plans \
	_check-friendly _report-data-quality _diff-summary _post-review-comment

RUN_IN_DOCKER ?= 1

# GH_TOKEN/GITLAB_MR_TOKEN/CI_API_V4_URL/CI_PROJECT_ID/CI_MERGE_REQUEST_IID are passed bare so
# Docker forwards whatever's in the calling shell's environment -- harmless when absent locally,
# since only post-review-comment reads them.
DOCKER_RUN = docker run --rm --init -e TINI_KILL_PROCESS_GROUP=true -v $(CURDIR):/app -w /app \
	-v orgcanon-terraform-dist:/dist -e DIST_DIR=/dist \
	-e GH_TOKEN -e GITLAB_MR_TOKEN -e CI_API_V4_URL -e CI_PROJECT_ID -e CI_MERGE_REQUEST_IID

docker-image:
	docker build -t orgcanon .

ifeq ($(RUN_IN_DOCKER),1)

install: docker-image
fmt:
	$(DOCKER_RUN) orgcanon make _fmt
init:
	$(DOCKER_RUN) orgcanon make _init
validate:
	$(DOCKER_RUN) orgcanon make _validate
plan:
	$(DOCKER_RUN) orgcanon make _plan
apply:
	$(DOCKER_RUN) orgcanon make _apply
check-team-hierarchy:
	$(DOCKER_RUN) orgcanon make _check-team-hierarchy
check-retirement-confirmations:
	$(DOCKER_RUN) orgcanon make _check-retirement-confirmations BASE_SHA=$(BASE_SHA)
check-reviewable-expiration:
	$(DOCKER_RUN) orgcanon make _check-reviewable-expiration
check-scripts:
	$(DOCKER_RUN) orgcanon make _check-scripts
check:
	$(DOCKER_RUN) orgcanon make _check BASE_SHA=$(BASE_SHA)
check-examples:
	$(DOCKER_RUN) orgcanon make _check-examples
check-friendly:
	$(DOCKER_RUN) orgcanon make _check-friendly
report-data-quality:
	$(DOCKER_RUN) orgcanon make _report-data-quality
diff-summary:
	$(DOCKER_RUN) orgcanon make _diff-summary BASE_SHA=$(BASE_SHA)
post-review-comment:
	$(DOCKER_RUN) orgcanon make _post-review-comment PLATFORM=$(PLATFORM) REPO=$(REPO) PR_NUMBER=$(PR_NUMBER)

else

install:
fmt: _fmt
init: _init
validate: _validate
plan: _plan
apply: _apply
check-team-hierarchy: _check-team-hierarchy
check-retirement-confirmations: _check-retirement-confirmations
check-reviewable-expiration: _check-reviewable-expiration
check-scripts: _check-scripts
check: _check
check-examples: _check-examples
check-friendly: _check-friendly
report-data-quality: _report-data-quality
diff-summary: _diff-summary
post-review-comment: _post-review-comment

endif

_fmt:
	$(TERRAFORM) -chdir=$(TERRAFORM_DIR) fmt -check -recursive -diff

_init:
	$(TERRAFORM) -chdir=$(TERRAFORM_DIR) init -backend=false -input=false

_validate: _init
	$(TERRAFORM) -chdir=$(TERRAFORM_DIR) validate

# -state points at a git-ignored file inside $(PLAN_DIR), never terraform.tfstate -- no
# backend/provider block exists in this schema so nothing real is ever touched regardless, but
# this keeps even the harmless local state out of the working tree. Deleted first so `apply`
# below sees the exact same fresh state `plan` saw, or Terraform rejects the plan as stale.
_plan: _init
	@mkdir -p $(PLAN_DIR)
	@rm -f $(STATE_FILE) $(STATE_FILE).backup
	$(TERRAFORM) -chdir=$(TERRAFORM_DIR) plan -input=false -state=$(STATE_FILE) -out=$(PLAN_FILE)

# `plan` alone does NOT evaluate a `validation` condition depending on `timestamp()` (observed
# behavior, undocumented) -- Terraform defers those to `apply`. The departed-person checks (see
# docs/invariants.md's "Currently-active person required") are the only such conditions here.
_apply: _plan
	$(TERRAFORM) -chdir=$(TERRAFORM_DIR) apply -input=false -auto-approve -state=$(STATE_FILE) $(PLAN_FILE)

# The one invariant HCL can't check itself (unbounded recursion) -- reads Terraform's evaluated
# plan output instead of re-parsing .tf files. See scripts/check_team_hierarchy.py.
_check-team-hierarchy: _plan
	$(TERRAFORM) -chdir=$(TERRAFORM_DIR) show -json $(PLAN_FILE) | python3 scripts/check_team_hierarchy.py

# Produces $(DIFF_BEFORE_JSON)/$(DIFF_AFTER_JSON) -- the only two files a diff-based check
# (diff-summary, check-retirement-confirmations) needs, so both share this instead of each
# re-running its own git-worktree dance. A BASE_SHA that doesn't plan cleanly (e.g. it predates
# org-model/ existing) is treated as "no prior data" -- an empty-outputs JSON, not a build
# failure -- so every diff-based check degrades to "nothing to compare against" instead of
# blocking on an unrelated, unplannable base.
_diff-plans:
	@if [ -z "$(BASE_SHA)" ]; then \
		echo "BASE_SHA is required, e.g. make diff-summary BASE_SHA=<sha>" >&2; \
		exit 1; \
	fi
	@mkdir -p $(PLAN_DIR)
	$(TERRAFORM) -chdir=$(TERRAFORM_DIR) init -backend=false -input=false
	@rm -f $(PLAN_DIR)/diff-after.tfstate $(PLAN_DIR)/diff-after.tfstate.backup
	$(TERRAFORM) -chdir=$(TERRAFORM_DIR) plan -input=false -state=$(PLAN_DIR)/diff-after.tfstate -out=$(PLAN_DIR)/diff-after.tfplan
	$(TERRAFORM) -chdir=$(TERRAFORM_DIR) show -json $(PLAN_DIR)/diff-after.tfplan > $(DIFF_AFTER_JSON)
	@git worktree prune
	@rm -rf $(DIFF_BASE_CHECKOUT)
	git worktree add -f $(DIFF_BASE_CHECKOUT) $(BASE_SHA)
	@rm -f $(PLAN_DIR)/diff-before.tfstate $(PLAN_DIR)/diff-before.tfstate.backup
	if $(TERRAFORM) -chdir=$(DIFF_BASE_CHECKOUT)/$(TERRAFORM_DIR) init -backend=false -input=false && \
	   $(TERRAFORM) -chdir=$(DIFF_BASE_CHECKOUT)/$(TERRAFORM_DIR) plan -input=false -state=$(PLAN_DIR)/diff-before.tfstate -out=$(PLAN_DIR)/diff-before.tfplan; then \
		$(TERRAFORM) -chdir=$(DIFF_BASE_CHECKOUT)/$(TERRAFORM_DIR) show -json $(PLAN_DIR)/diff-before.tfplan > $(DIFF_BEFORE_JSON); \
	else \
		echo '{"planned_values":{"outputs":{}}}' > $(DIFF_BEFORE_JSON); \
	fi
	git worktree remove --force $(DIFF_BASE_CHECKOUT)

# A Role/AuthorityLine/team.head_deputy going inactive between BASE_SHA and now with no matching
# retirement_confirmations entry fails the build. See docs/invariants.md's "Retirement
# confirmation".
_check-retirement-confirmations: _diff-plans
	python3 scripts/check_retirement_confirmations.py $(DIFF_BEFORE_JSON) $(DIFF_AFTER_JSON)

# A Reviewable (any entity type, or a person's position) whose expiration_date has already
# passed, or is set more than a year out, fails the build. See docs/invariants.md's "Reviewable
# expiration must not be lapsed" and "Reviewable expiration must not be set too far out".
_check-reviewable-expiration: _plan
	$(TERRAFORM) -chdir=$(TERRAFORM_DIR) show -json $(PLAN_FILE) | python3 scripts/check_reviewable_expiration.py

_check-scripts:
	python3 -m unittest discover -s scripts/tests

_check: _fmt _validate _apply _check-team-hierarchy _check-retirement-confirmations _check-reviewable-expiration _check-scripts
	@echo "All checks passed."

_check-friendly:
	python3 scripts/friendly_check.py

_report-data-quality: _plan
	$(TERRAFORM) -chdir=$(TERRAFORM_DIR) show -json $(PLAN_FILE) | python3 scripts/report_data_quality.py

# Shared by pr-diff-summary.yml and .gitlab-ci.yml's mr-diff-summary job, each supplying its own
# base SHA:
#   GitHub:  make diff-summary BASE_SHA="$$BASE_SHA"   (github.event.pull_request.base.sha)
#   GitLab:  make diff-summary BASE_SHA="$$CI_MERGE_REQUEST_DIFF_BASE_SHA"
_diff-summary: _diff-plans
	python3 scripts/summarize_org_diff.py $(DIFF_BEFORE_JSON) $(DIFF_AFTER_JSON) > $(DIFF_SUMMARY_FILE)
	@echo "Diff summary written to $(DIFF_SUMMARY_FILE)"

# Posts/updates $(DIFF_SUMMARY_FILE) (from a prior `diff-summary` run -- same named volume, so a
# separate `docker run` still sees it) as a PR/MR comment.
#   GitHub:  make post-review-comment PLATFORM=github REPO="$$REPO" PR_NUMBER="$$PR_NUMBER"
#   GitLab:  make post-review-comment PLATFORM=gitlab
_post-review-comment:
	@if [ -z "$(PLATFORM)" ]; then \
		echo "PLATFORM is required, e.g. make post-review-comment PLATFORM=github REPO=... PR_NUMBER=..." >&2; \
		exit 1; \
	fi
	python3 scripts/post_review_comment.py --platform $(PLATFORM) \
		$(if $(REPO),--repo $(REPO)) $(if $(PR_NUMBER),--pr-number $(PR_NUMBER)) \
		$(DIFF_SUMMARY_FILE)

EXAMPLES := $(patsubst %/main.tf,%,$(wildcard examples/*/main.tf))

# Deliberately NOT a dependency of `check` (not part of the default gate) -- a fork that deletes
# examples/ can drop this target plus its CI job/hook entry without touching the main path.
_check-examples:
	@for dir in $(EXAMPLES); do \
		echo "== $$dir =="; \
		$(MAKE) _fmt _validate _apply _check-team-hierarchy TERRAFORM_DIR=$$dir || exit 1; \
	done

# Each tool owns its own RUN_IN_DOCKER wrapping; these just delegate to `check`, same per-tool
# target/job/hook pattern as check-examples above, so deleting a tool drops just its own entry.
check-orgapi:
	$(MAKE) -C tools/orgapi check

check-orgviewer:
	$(MAKE) -C tools/orgviewer check

check-orgconfluence:
	$(MAKE) -C tools/orgconfluence check

# Cleans native DIST_DIR plus the Docker-side named volume -- the latter is otherwise never
# touched, so it only grows across runs.
clean:
	rm -rf $(DIST_DIR)
	docker volume rm -f orgcanon-terraform-dist >/dev/null 2>&1 || true
