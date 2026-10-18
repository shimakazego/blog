#!/bin/bash
# 由 sync-missing-images.ps1 上传后以 sudo 执行
# 用法: sudo bash sync-missing-images-remote.sh <BACKEND_DIR> <HTML_DIR> <UPLOAD_PATH>
set -e

BACKEND_DIR="$1"
HTML_DIR="$2"
UPLOAD_PATH="$3"

cd "$BACKEND_DIR"
tar -xzf "$UPLOAD_PATH"
rm -f "$UPLOAD_PATH"
rsync -a "${BACKEND_DIR}/buff_image/" "${HTML_DIR}/buff_image/"
rsync -a "${BACKEND_DIR}/boss_image/" "${HTML_DIR}/boss_image/"
chown -R root:root "${HTML_DIR}/buff_image" "${HTML_DIR}/boss_image" 2>/dev/null || true

echo "== 验证 =="
for f in buff_image/3111.webp buff_image/31201.webp buff_image/31301.webp boss_image/1785940605959-mbeumh.webp; do
  code=$(curl -s -m 6 -o /dev/null -w '%{http_code}' "http://127.0.0.1:15001/$f")
  ct=$(curl -s -m 6 -I "http://127.0.0.1:15001/$f" | grep -i content-type | tr -d '\r')
  echo "$code  $f  ($ct)"
done
rm -f /var/services/homes/ljx/sync-missing-images-remote.sh