#!/usr/bin/env bash
# Corre los checks del repo, los mismos que el CI.
# Uso: scripts/check.sh [changed|all|frontend|backend|pipelines|hooks]   (default: changed)
# "changed" corre solo las áreas que tocaste respecto de origin/main (commits + working tree).
set -euo pipefail
cd "$(dirname "$0")/.."

frontend()  { (cd frontend && npm run type-check && npx vitest run && npx eslint . && npx oxlint .); }
backend()   { (cd backend && dotnet build -warnaserror && dotnet test --no-build); }
pipelines() { python3 tools/validate_azure_pipelines.py; }
hooks()     { node --test .github/hooks/hooks.test.cjs; }

changed_areas() {
  { git diff --name-only origin/main...HEAD 2>/dev/null; git status --porcelain | cut -c4-; } | sort -u |
  while read -r f; do
    case "$f" in
      frontend/*) echo frontend ;;
      backend/*) echo backend ;;
      azure-pipelines.yml|pipelines/*|tools/validate_azure_pipelines.py) echo pipelines ;;
      .github/hooks/*|scripts/*) echo hooks ;;
    esac
  done | sort -u
}

case "${1:-changed}" in
  all) areas="frontend backend pipelines hooks" ;;
  changed) areas="$(changed_areas)" ;;
  frontend|backend|pipelines|hooks) areas="$1" ;;
  *) echo "Uso: $0 [changed|all|frontend|backend|pipelines|hooks]" >&2; exit 64 ;;
esac

[ -z "$areas" ] && { echo "Sin cambios en código: nada que verificar."; exit 0; }
for area in $areas; do
  echo "== $area"
  "$area"
done
echo "OK: $(echo $areas)"
