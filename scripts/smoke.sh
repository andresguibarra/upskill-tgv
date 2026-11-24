#!/usr/bin/env bash
# Smoke test de punta a punta contra la API real: levanta backend/Upskill.Api, recorre el CRUD y apaga.
# Uso: scripts/smoke.sh [url]   (default http://localhost:5101; si se pasa una URL, no levanta nada)
set -euo pipefail
cd "$(dirname "$0")/.."
api="${1:-http://localhost:5101}"

if [[ $# -eq 0 ]]; then
  dotnet run --project backend/Upskill.Api --launch-profile http >/tmp/upskill-smoke.log 2>&1 &
  pid=$!
  trap 'kill $pid 2>/dev/null || true' EXIT
  for _ in $(seq 60); do curl -fs "$api/health" >/dev/null && break; sleep 1; done
fi

req() { curl -fsS -X "$1" "$api$2" -H 'Content-Type: application/json' ${3:+-d "$3"}; }
expect() { [[ "$2" == *"$3"* ]] || { echo "FALLÓ $1: esperaba $3, vino $2" >&2; exit 1; }; echo "ok  $1"; }

id=$(req POST /api/todos '{"title":"smoke"}' | sed -E 's/.*"id":([0-9]+).*/\1/')
expect "POST crea"            "$(req GET "/api/todos/$id")"                         '"title":"smoke"'
expect "PATCH marca hecha"    "$(req PATCH "/api/todos/$id" '{"done":true}')"      '"done":true'
expect "GET filtra por done"  "$(req GET '/api/todos?done=true')"                   "\"id\":$id"
expect "GET /stats cuenta"    "$(req GET /api/todos/stats)"                         '"done":'
expect "DELETE borra"         "$(curl -s -o /dev/null -w '%{http_code}' -X DELETE "$api/api/todos/$id")" 204
expect "GET después da 404"   "$(curl -s -o /dev/null -w '%{http_code}' "$api/api/todos/$id")" 404
