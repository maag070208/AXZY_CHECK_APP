#!/usr/bin/env bash
# Requiere una ronda E2E activa y el teléfono por USB.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DEVICE="${DEVICE:-R58YA0MM1TZ}"
MAESTRO="${MAESTRO_BIN:-$HOME/.maestro/bin/maestro}"
export JAVA_OPTS="-Duser.home=$ROOT/.maestro-home"
cd "$ROOT"

cleanup() {
  adb -s "$DEVICE" shell cmd connectivity airplane-mode disable >/dev/null 2>&1 || true
  adb -s "$DEVICE" shell svc wifi enable >/dev/null 2>&1 || true
  adb -s "$DEVICE" shell svc data enable >/dev/null 2>&1 || true
}
trap cleanup EXIT

adb disconnect 192.168.10.103:5555 >/dev/null 2>&1 || true
adb -s "$DEVICE" reverse tcp:8081 tcp:8081 >/dev/null
adb -s "$DEVICE" shell cmd connectivity airplane-mode enable >/dev/null
adb -s "$DEVICE" shell svc wifi disable >/dev/null 2>&1 || true
adb -s "$DEVICE" shell svc data disable >/dev/null 2>&1 || true
sleep 5

"$MAESTRO" --device "$DEVICE" test e2e/maestro/offline-scan-draft.yaml
"$MAESTRO" --device "$DEVICE" test e2e/maestro/offline-scan-save.yaml

adb -s "$DEVICE" shell cmd connectivity airplane-mode disable >/dev/null
adb -s "$DEVICE" shell svc wifi enable >/dev/null
adb -s "$DEVICE" shell svc data enable >/dev/null
sleep 10
"$MAESTRO" --device "$DEVICE" test e2e/maestro/guard-offline-sync.yaml

echo "OK: escaneo offline, borrador tras cerrar APP, check guardado y sincronizado"
