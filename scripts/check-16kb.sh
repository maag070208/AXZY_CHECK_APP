#!/usr/bin/env bash
# Verifica que las librerías arm64 del APK estén alineadas a 16 KB.
set -euo pipefail
APK="${1:-android/app/build/outputs/apk/debug/app-debug.apk}"
READELF="${ANDROID_NDK_HOME:-$HOME/Library/Android/sdk/ndk/27.1.12297006}/toolchains/llvm/prebuilt/darwin-x86_64/bin/llvm-readelf"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
unzip -o -q "$APK" 'lib/arm64-v8a/*.so' -d "$TMP"
fail=0
for f in "$TMP"/lib/arm64-v8a/*.so; do
  aligns="$("$READELF" -l "$f" | awk '/LOAD/{print $NF}' | sort -u | tr '\n' ' ')"
  if echo "$aligns" | grep -qv '0x4000'; then
    echo "❌ $(basename "$f"): $aligns"
    fail=1
  else
    echo "✅ $(basename "$f"): $aligns"
  fi
done
exit "$fail"
