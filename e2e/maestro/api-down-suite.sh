#!/usr/bin/env bash
# Hay red pero la API no contesta: apunta la APP a un puerto cerrado mientras corre el flujo.
# Requiere Metro, API, E2E_MODE=true y el teléfono por USB.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DEVICE="${DEVICE:-R58YA0MM1TZ}"
MAESTRO="${MAESTRO_BIN:-$HOME/.maestro/bin/maestro}"
CONSTANTS="$ROOT/src/core/constants/API_CONSTANTS.ts"
export JAVA_OPTS="-Duser.home=$ROOT/.maestro-home"
export API_BASE="${API_BASE:-http://192.168.10.100:4444/api/v1}"
cd "$ROOT"

restore() { sed -i '' 's/:4445\/api\/v1/:4444\/api\/v1/' "$CONSTANTS"; }
trap restore EXIT

adb -s "$DEVICE" reverse tcp:8081 tcp:8081 >/dev/null
node e2e/maestro/offline-fixture.mjs prepare >/dev/null
"$MAESTRO" --device "$DEVICE" test e2e/maestro/guard-offline-setup.yaml

sed -i '' 's/:4444\/api\/v1/:4445\/api\/v1/' "$CONSTANTS"
sleep 4
"$MAESTRO" --device "$DEVICE" test e2e/maestro/offline-api-down.yaml

restore
sleep 4
"$MAESTRO" --device "$DEVICE" test e2e/maestro/guard-offline-sync.yaml
echo "OK: API caída sin perder trabajo"
