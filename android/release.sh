#!/usr/bin/env bash
set -euo pipefail

# Build release de CheckApp con bump automático de versión, ambiente seleccionable
# y publicación en Drive.
#
# Uso:
#   ./release.sh --dev           # DEFAULT_ENVIRONMENT=DEV, build y sube
#   ./release.sh --prod          # DEFAULT_ENVIRONMENT=PROD, build y sube
#   ./release.sh --local         # DEFAULT_ENVIRONMENT=LOCAL, build y sube
#   ./release.sh --dev --no-upload
#
# La versión SIEMPRE se incrementa sola:
#   versionCode 24 -> 25
#   versionName "1.0.24" -> "1.0.25"
#
# Salida local: app/build/outputs/apk/release/CHECKAPP_<versión>.apk
# Destino Drive: gdrive:APP BARCELONA/PRUEBAS/CHECKAPP_<versión>.apk
#
# Requisitos: Java 17, Android SDK y rclone con el remote "gdrive" configurado.
# Nota: el APK release se firma con debug.keystore (instalable directo, no para Play Store).

cd "$(dirname "$0")"

REMOTE="${DRIVE_REMOTE:-gdrive}"
DEST="${DRIVE_DEST:-APP BARCELONA/PRUEBAS}"
UPLOAD=1
TARGET_ENV=""

for arg in "$@"; do
  case "$arg" in
    --dev) TARGET_ENV="DEV" ;;
    --prod) TARGET_ENV="PROD" ;;
    --local) TARGET_ENV="LOCAL" ;;
    --no-upload) UPLOAD=0 ;;
    -h|--help) awk 'NR>1 && /^#/ {print} /^cd / {exit}' "$0"; exit 0 ;;
    *)
      echo "Argumento no válido: $arg" >&2
      echo "La versión es automática. Usa --dev, --prod o --local." >&2
      exit 1
      ;;
  esac
done

if [[ -z "$TARGET_ENV" ]]; then
  echo "Indica el ambiente: --dev, --prod o --local." >&2
  exit 1
fi

GRADLE="app/build.gradle"
API_FILE="../src/core/constants/API_CONSTANTS.ts"
APK="app/build/outputs/apk/release/app-release.apk"
OUT_DIR="app/build/outputs/apk/release"

current_name() { grep -oE 'versionName "[^"]+"' "$GRADLE" | head -1 | sed -E 's/versionName "([^"]+)"/\1/'; }
current_code() { grep -oE 'versionCode [0-9]+' "$GRADLE" | head -1 | awk '{print $2}'; }

CURRENT_VERSION="$(current_name)"
CURRENT_CODE="$(current_code)"

if [[ ! "$CURRENT_VERSION" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
  echo "versionName '$CURRENT_VERSION' no tiene formato X.Y.Z; no puedo incrementarla." >&2
  exit 1
fi

VERSION="${BASH_REMATCH[1]}.${BASH_REMATCH[2]}.$((BASH_REMATCH[3] + 1))"
NEW_CODE=$((CURRENT_CODE + 1))

# Cambia el ambiente por defecto solo durante el build y restaura solo esa línea al salir.
# (Así no se pierden cambios de URLs que hagas mientras compila.)
ORIGINAL_ENV=$(grep -oE "DEFAULT_ENVIRONMENT: Environment = '[^']+'" "$API_FILE" | head -1 | sed -E "s/.*'([^']+)'/\1/")
restore_environment() {
  perl -0pi -e "s/export const DEFAULT_ENVIRONMENT: Environment = '[^']+';/export const DEFAULT_ENVIRONMENT: Environment = '$ORIGINAL_ENV';/" "$API_FILE"
}
trap restore_environment EXIT

perl -0pi -e "s/export const DEFAULT_ENVIRONMENT: Environment = '[^']+';/export const DEFAULT_ENVIRONMENT: Environment = '$TARGET_ENV';/" "$API_FILE"

if ! grep -q "DEFAULT_ENVIRONMENT: Environment = '$TARGET_ENV'" "$API_FILE"; then
  echo "No se pudo cambiar DEFAULT_ENVIRONMENT a $TARGET_ENV en $API_FILE" >&2
  exit 1
fi

TARGET_URL=$(grep -oE "$TARGET_ENV: '[^']+'" "$API_FILE" | head -1 | sed -E "s/$TARGET_ENV: '([^']+)'/\1/")
if [[ "$TARGET_URL" == *".invalid"* ]]; then
  echo "ADVERTENCIA: $TARGET_ENV apunta a una URL placeholder ($TARGET_URL)." >&2
  echo "El APK compilará, pero no podrá conectar al API hasta que pongas la URL real." >&2
fi

perl -0pi -e "s/versionCode \\d+/versionCode $NEW_CODE/" "$GRADLE"
perl -0pi -e "s/versionName \"[^\"]+\"/versionName \"$VERSION\"/" "$GRADLE"

echo "Ambiente: $TARGET_ENV ($TARGET_URL)"
echo "Versión:  $CURRENT_VERSION ($CURRENT_CODE) -> $VERSION ($NEW_CODE)"
echo "Compilando release..."
./gradlew assembleRelease --console=plain

if [[ ! -f "$APK" ]]; then
  echo "No se generó $APK" >&2
  exit 1
fi

NAME="CHECKAPP_${VERSION}.apk"
DEST_FILE="$OUT_DIR/$NAME"
mv -f "$APK" "$DEST_FILE"
echo "APK: $DEST_FILE"

if [[ "$UPLOAD" == "1" ]]; then
  echo "Subiendo $NAME a ${REMOTE}:${DEST} ..."
  rclone copyto "$DEST_FILE" "${REMOTE}:${DEST}/${NAME}" \
    --drive-chunk-size 128M \
    --drive-upload-cutoff 128M \
    --retries 2 \
    --low-level-retries 10 \
    -v

  LOCAL_SIZE=$(stat -f%z "$DEST_FILE" 2>/dev/null || stat -c%s "$DEST_FILE")
  REMOTE_SIZE=$(rclone lsf "${REMOTE}:${DEST}/${NAME}" --format "s" --files-only 2>/dev/null | head -1 | cut -d';' -f1)
  LOCAL_MD5=$(md5 -q "$DEST_FILE" 2>/dev/null || md5sum "$DEST_FILE" | awk '{print $1}')
  REMOTE_MD5=$(rclone hashsum md5 "${REMOTE}:${DEST}/${NAME}" 2>/dev/null | awk '{print $1}')

  if [[ "$LOCAL_SIZE" != "$REMOTE_SIZE" || "$LOCAL_MD5" != "$REMOTE_MD5" ]]; then
    echo "Verificación falló: local=$LOCAL_SIZE/$LOCAL_MD5 remoto=$REMOTE_SIZE/$REMOTE_MD5" >&2
    exit 1
  fi

  echo "OK: ${REMOTE}:${DEST}/${NAME} (${LOCAL_SIZE} bytes, md5 ${LOCAL_MD5})"
fi
