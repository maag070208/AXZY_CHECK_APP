#!/usr/bin/env bash
# Jornada offline completa del guardia por USB: reportes, asignación y ronda sin red, sincroniza y
# verifica en la API. Requiere Metro, API, E2E_MODE=true y el teléfono conectado.
# Uso: DEVICE=R58YA0MM1TZ API_BASE=http://IP:4444/api/v1 bash e2e/maestro/guard-offline-full.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DEVICE="${DEVICE:-R58YA0MM1TZ}"
MAESTRO="${MAESTRO_BIN:-$HOME/.maestro/bin/maestro}"
export JAVA_OPTS="-Duser.home=$ROOT/.maestro-home"
export API_BASE="${API_BASE:-http://192.168.10.100:4444/api/v1}"
cd "$ROOT"

network() {
  adb -s "$DEVICE" shell cmd connectivity airplane-mode "$1" >/dev/null
  local state; [ "$1" = enable ] && state=disable || state=enable
  adb -s "$DEVICE" shell svc wifi "$state" >/dev/null 2>&1 || true
  adb -s "$DEVICE" shell svc data "$state" >/dev/null 2>&1 || true
}
trap 'network disable' EXIT

adb -s "$DEVICE" reverse tcp:8081 tcp:8081 >/dev/null
curl -fsS -m 5 http://127.0.0.1:8081/status >/dev/null || { echo "Metro no está corriendo en :8081"; exit 1; }

network disable
sleep 3
ASSIGNMENT="$(node e2e/maestro/offline-fixture.mjs prepare)"
echo "Asignación E2E: $ASSIGNMENT"

echo "1/5 Sesión y datos en línea"
"$MAESTRO" --device "$DEVICE" test e2e/maestro/guard-offline-setup.yaml

SINCE="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "2/5 Sin red"
network enable
sleep 5
"$MAESTRO" --device "$DEVICE" test e2e/maestro/offline-reports.yaml
"$MAESTRO" --device "$DEVICE" test e2e/maestro/offline-assignment.yaml
"$MAESTRO" --device "$DEVICE" test e2e/maestro/offline-round.yaml

echo "3/5 La cola sobrevive al cierre de la APP"
adb -s "$DEVICE" shell am force-stop com.axzy.checkapp.barcelona

echo "4/5 Vuelve la red y sincroniza"
network disable
sleep 8
"$MAESTRO" --device "$DEVICE" test e2e/maestro/guard-offline-sync.yaml

echo "5/5 Verificación en la API"
node e2e/maestro/offline-fixture.mjs verify "$SINCE" "$ASSIGNMENT"
echo "OK: jornada offline completa"
