#!/usr/bin/env bash
set -euo pipefail
# Uses your local GitHub CLI login. No token is included in the project.
cd "$(dirname "$0")/.."
command -v gh >/dev/null || { echo 'Install GitHub CLI, then run gh auth login.' >&2; exit 1; }
gh auth status >/dev/null
owner="$(gh api user --jq .login)"
repo_name="${1:-fitspace-gym-os}"
[[ "$repo_name" =~ ^[A-Za-z0-9._-]+$ ]] || { echo 'Invalid repository name' >&2; exit 1; }
if [[ ! -d .git ]]; then
  git init -b main
  git add .
  git -c user.name="${owner}" -c user.email="${owner}@users.noreply.github.com" commit -m 'FitSpace 0.2.0 full source'
fi
if [[ -n "$(git status --porcelain)" ]]; then
  echo 'Commit your local changes before publishing.' >&2; exit 1
fi
# Creation fails if the name already exists; existing repositories are never overwritten.
gh repo create "${owner}/${repo_name}" --private --description 'FitSpace: Persian gym management with standalone hosting' --source=. --remote=github --push
