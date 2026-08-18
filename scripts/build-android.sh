#!/usr/bin/env bash
set -eo pipefail

ENV="${1:-}"
if [[ "$ENV" != "dev" && "$ENV" != "prod" ]]; then
  echo "Uso: yarn android:build:dev | yarn android:build:prod"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GRADLE_FILE="$ROOT_DIR/android/app/build.gradle"
API_FILE="$ROOT_DIR/src/core/constants/API_CONSTANTS.ts"

if [[ ! -f "$GRADLE_FILE" ]]; then
  echo "No se encontró $GRADLE_FILE"
  exit 1
fi
if [[ ! -f "$API_FILE" ]]; then
  echo "No se encontró $API_FILE"
  exit 1
fi

CURRENT_VC="$(grep -E '^[[:space:]]*versionCode[[:space:]]+' "$GRADLE_FILE" | sed -E 's/.*versionCode[[:space:]]+([0-9]+).*/\1/' | head -n1)"
CURRENT_VN="$(grep -E '^[[:space:]]*versionName[[:space:]]+' "$GRADLE_FILE" | sed -E 's/.*versionName[[:space:]]+"([^"]+)".*/\1/' | head -n1)"

if [[ -z "$CURRENT_VC" || -z "$CURRENT_VN" ]]; then
  echo "No se pudo leer versionCode/versionName de build.gradle"
  exit 1
fi

NEW_VC=$((CURRENT_VC + 1))
IFS='.' read -r -a VN_PARTS <<< "$CURRENT_VN"
LAST_IDX=$((${#VN_PARTS[@]} - 1))
PREFIX=""
for ((i = 0; i < LAST_IDX; i++)); do
  if [[ -z "$PREFIX" ]]; then
    PREFIX="${VN_PARTS[$i]}"
  else
    PREFIX="${PREFIX}.${VN_PARTS[$i]}"
  fi
done
LAST_SEG="${VN_PARTS[$LAST_IDX]}"
if [[ -z "$PREFIX" ]]; then
  NEW_VN="$((LAST_SEG + 1))"
else
  NEW_VN="${PREFIX}.$((LAST_SEG + 1))"
fi

echo "Bump version: $CURRENT_VN ($CURRENT_VC) -> $NEW_VN ($NEW_VC) [$ENV]"

sed -i.bak -E "s/^([[:space:]]*)versionCode[[:space:]]+[0-9]+/\1versionCode ${NEW_VC}/" "$GRADLE_FILE"
sed -i.bak -E "s/^([[:space:]]*)versionName[[:space:]]+\"[^\"]+\"/\1versionName \"${NEW_VN}\"/" "$GRADLE_FILE"
rm -f "$GRADLE_FILE.bak"

if [[ "$ENV" == "prod" ]]; then
  API_URL="https://axzy-checkapp-bonaterra-prod-api.up.railway.app/api/v1"
else
  API_URL="https://axzy-checkapp-bonaterra-dev-api.up.railway.app/api/v1"
fi

echo "Set BASE_URL -> $API_URL"

sed -i.bak -E "s|^[[:space:]]*BASE_URL:[[:space:]]*'[^']*',|  BASE_URL: '$API_URL',|" "$API_FILE"
rm -f "$API_FILE.bak"

cd "$ROOT_DIR/android"

if [[ "$ENV" == "prod" ]]; then
  ./gradlew assembleRelease
else
  ./gradlew assembleRelease -Penv=dev
fi

echo "Build OK: v$NEW_VN ($NEW_VC) [$ENV]"
