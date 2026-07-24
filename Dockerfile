# Single Dockerfile for all dev/CI tooling; see docs/architecture.md's "Key design decisions"
# ("The orgapi/orgviewer stack") for why containers run as root. Every Makefile here runs its
# targets inside one of these stages by default (RUN_IN_DOCKER=1).
#
# Stages (`docker build --target <stage>`):
#   terraform -- org-model/ validation only
#   python    -- terraform + orgapi (uv-managed)
#   node      -- terraform + orgviewer (pnpm-managed)
# No combined "full" stage -- nothing needs all three toolchains at once.

### base ###
FROM python:3.12-slim AS base

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update -qq \
    && apt-get install -y -qq --no-install-recommends \
        make curl git ca-certificates gnupg \
    && rm -rf /var/lib/apt/lists/*

# /app is a host-owned bind mount; git refuses to operate on a repo it doesn't own
# (CVE-2022-24765) unless told this mismatch is expected. Only `diff-summary`'s git worktree
# calls need this.
RUN git config --global --add safe.directory /app

WORKDIR /app

### terraform-deps ###
FROM base AS terraform-deps

# Terraform's version pin lives here only -- the Makefile never installs Terraform (native dev
# is expected to have it on PATH). $VERSION_CODENAME comes from the base image's own
# /etc/os-release, so this tracks whatever Debian release python:3.12-slim is on.
ARG TF_VERSION=1.9.8
RUN curl -fsSL https://apt.releases.hashicorp.com/gpg | gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg \
    && . /etc/os-release \
    && echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $VERSION_CODENAME main" > /etc/apt/sources.list.d/hashicorp.list \
    && apt-get update -qq \
    && apt-get install -y -qq --no-install-recommends terraform=${TF_VERSION}-* \
    && rm -rf /var/lib/apt/lists/*

### terraform ###
FROM terraform-deps AS terraform

# gh CLI: only this stage needs it, for post-review-comment's GitHub path -- GitLab's posting
# uses stdlib urllib directly, already present in the base image.
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | gpg --dearmor -o /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" > /etc/apt/sources.list.d/github-cli.list \
    && apt-get update -qq \
    && apt-get install -y -qq --no-install-recommends gh \
    && rm -rf /var/lib/apt/lists/*

COPY . /app

### python -- orgapi (terraform + uv) ###
FROM terraform-deps AS python

RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:${PATH}"

# Manifests only (not the rest of tools/orgapi) keeps this layer cached across source edits.
# --no-install-project: only deps install now; `docker run` re-runs `uv sync` to install the
# project itself, fast since deps are already cached.
COPY tools/orgapi/pyproject.toml tools/orgapi/uv.lock /app/tools/orgapi/
RUN cd /app/tools/orgapi && uv sync --frozen --no-install-project

COPY . /app

### node -- orgviewer (terraform + pnpm) ###
FROM terraform-deps AS node

RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y -qq --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable

# No pnpm version literal here -- corepack reads it from package.json's `packageManager` field,
# the same source of truth `pnpm install` uses.
COPY tools/orgviewer/package.json tools/orgviewer/pnpm-lock.yaml /app/tools/orgviewer/
RUN cd /app/tools/orgviewer \
    && corepack prepare --activate \
    && pnpm install --frozen-lockfile

COPY . /app
