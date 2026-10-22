#!/usr/bin/env bash
# E2E offline por USB: apaga WiFi/datos, corre flujos y vuelve a encender.
# Uso: DEVICE=R58YA0MM1TZ bash e2e/maestro/offline-suite.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DEVICE="${DEVICE:-R58YA0MM1TZ}"
MAESTRO="${MAESTRO_BIN:-$HOME/.maestro/bin/maestro}"
API="${API_URL:-http://192.168.10.101:4444/api/v1/meta}"
export JAVA_OPTS="-Duser.home=$ROOT/.maestro-home"

cd "$ROOT"
adb disconnect 192.168.10.103:5555 >/dev/null 2>&1 || true
adb -s "$DEVICE" get-state >/dev/null
adb -s "$DEVICE" reverse tcp:8081 tcp:8081 >/dev/null

if ! curl -fsS -m 5 http://127.0.0.1:8081/status >/dev/null; then
  echo "Metro no está corriendo en :8081"; exit 1
fi
if ! curl -fsS -m 5 "$API" >/dev/null; then
  echo "API no responde en $API"; exit 1
fi

cleanup() {
  adb -s "$DEVICE" shell cmd connectivity airplane-mode disable >/dev/null 2>&1 || true
  adb -s "$DEVICE" shell svc wifi enable >/dev/null 2>&1 || true
  adb -s "$DEVICE" shell svc data enable >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "1/4 Setup online"
adb -s "$DEVICE" shell cmd connectivity airplane-mode disable >/dev/null 2>&1 || true
adb -s "$DEVICE" shell svc wifi enable >/dev/null
adb -s "$DEVICE" shell svc data enable >/dev/null
sleep 2
"$MAESTRO" --device "$DEVICE" test e2e/maestro/guard-offline-setup.yaml

echo "2/4 Apagando WiFi y datos (modo avión)"
adb -s "$DEVICE" shell cmd connectivity airplane-mode enable >/dev/null
adb -s "$DEVICE" shell svc wifi disable >/dev/null 2>&1 || true
adb -s "$DEVICE" shell svc data disable >/dev/null 2>&1 || true
adb -s "$DEVICE" shell cmd wifi set-wifi-enabled disabled >/dev/null 2>&1 || true
sleep 5
"$MAESTRO" --device "$DEVICE" test e2e/maestro/guard-offline.yaml

echo "3/4 Encendiendo WiFi"
adb -s "$DEVICE" shell cmd connectivity airplane-mode disable >/dev/null
adb -s "$DEVICE" shell svc wifi enable >/dev/null
adb -s "$DEVICE" shell svc data enable >/dev/null
sleep 8
"$MAESTRO" --device "$DEVICE" test e2e/maestro/guard-offline-sync.yaml

echo "4/4 OK"
