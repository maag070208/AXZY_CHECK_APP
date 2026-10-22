#!/usr/bin/env bash
# Escenario 11: foto online + foto offline + sync. Requiere USB.
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
adb -s "$DEVICE" shell cmd connectivity airplane-mode disable >/dev/null 2>&1 || true
adb -s "$DEVICE" shell svc wifi enable >/dev/null
sleep 3

"$MAESTRO" --device "$DEVICE" test e2e/maestro/guard-offline-setup.yaml
"$MAESTRO" --device "$DEVICE" test e2e/maestro/mixed-incident-photo-online.yaml

echo "Apagando red para la segunda foto"
adb -s "$DEVICE" shell cmd connectivity airplane-mode enable >/dev/null
adb -s "$DEVICE" shell svc wifi disable >/dev/null 2>&1 || true
adb -s "$DEVICE" shell svc data disable >/dev/null 2>&1 || true
sleep 5

"$MAESTRO" --device "$DEVICE" test e2e/maestro/mixed-incident-photo-offline.yaml

echo "Reconectando y sincronizando"
adb -s "$DEVICE" shell cmd connectivity airplane-mode disable >/dev/null
adb -s "$DEVICE" shell svc wifi enable >/dev/null
adb -s "$DEVICE" shell svc data enable >/dev/null
sleep 10
"$MAESTRO" --device "$DEVICE" test e2e/maestro/guard-offline-sync.yaml

echo "Verificando la incidencia en API"
API_BASE="${API_BASE:-http://192.168.10.101:4444/api/v1}"
TOKEN="$(curl -fsS -X POST "$API_BASE/users/login" -H 'Content-Type: application/json' -d '{"username":"marcoh","password":"123456"}' | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).data))")"
LATEST="$(curl -fsS "$API_BASE/incidents?guardId=33" -H "Authorization: Bearer $TOKEN")"
MEDIA_COUNT="$(node -e "const j=JSON.parse(process.argv[1]); console.log(j.data[0].media?.length ?? 0)" "$LATEST")"
OFFLINE="$(node -e "const j=JSON.parse(process.argv[1]); console.log(j.data[0].createdOffline)" "$LATEST")"
[ "$MEDIA_COUNT" = "2" ] || { echo "Esperaba 2 fotos, llegaron $MEDIA_COUNT"; exit 1; }
[ "$OFFLINE" = "true" ] || { echo "La incidencia no quedó marcada offline"; exit 1; }

echo "OK: incidencia con 1 foto online + 1 foto offline (2 fotos, createdOffline=true)"
