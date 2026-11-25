#!/usr/bin/env bash
# Resmi Open Design Alliance (ODA) File Converter ile DXF -> AutoCAD 2013 (AC1027) ikili DWG donusturucu.
# ZWCAD (Android & Masaustu), AutoCAD, BricsCAD, DraftSight ve LibreCAD ile %100 tam uyumludur.
set -euo pipefail

ODA_BIN="${ODA_BIN:-/tmp/oda-extract/squashfs-root/usr/bin/ODAFileConverter}"
SRC_DXF="${1:-/home/yakup/Projeler/Elektrik-Pano-Tasarim/ciktilar/Bemis-BH6-6000-0000-Pano-Projesi.dxf}"
OUT_DWG="${2:-/home/yakup/Projeler/Elektrik-Pano-Tasarim/ciktilar/Bemis-BH6-6000-0000-Pano-Projesi.dwg}"
VER="${3:-ACAD2013}"

TMP_IN="$(mktemp -d)"
TMP_OUT="$(mktemp -d)"
trap 'rm -rf "$TMP_IN" "$TMP_OUT"' EXIT

cp "$SRC_DXF" "$TMP_IN/"
BASENAME="$(basename "$SRC_DXF" .dxf)"

export QT_QPA_PLATFORM=offscreen
export QT_QPA_PLATFORM_PLUGIN_PATH=/usr/lib64/qt6/plugins/platforms
ODA_ROOT="$(dirname "$(dirname "$ODA_BIN")")"
export LD_LIBRARY_PATH="$(dirname "$ODA_BIN"):/usr/lib64:${ODA_ROOT}/lib:${LD_LIBRARY_PATH:-}"

"$ODA_BIN" "$TMP_IN" "$TMP_OUT" "$VER" DWG 0 1

if ls "$TMP_OUT"/*.err >/dev/null 2>&1; then
  cat "$TMP_OUT"/*.err >&2
  exit 1
fi

cp "$TMP_OUT/${BASENAME}.dwg" "$OUT_DWG"
echo "ODA DWG generated ($VER, Audit=1): $OUT_DWG ($(stat -c%s "$OUT_DWG") bytes)"
