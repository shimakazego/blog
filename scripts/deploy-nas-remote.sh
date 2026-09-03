#!/bin/bash
# NAS 远端部署脚本（由 deploy-nas.ps1 通过 scp 上传后以 sudo 执行）
# 用法: sudo bash deploy-nas-remote.sh <HTML_DIR> <BACKEND_DIR> <STAMP> <UPLOAD_PATH>
set -e

HTML_DIR="$1"
BACKEND_DIR="$2"
STAMP="$3"
UPLOAD_PATH="$4"

BACKUP="${HTML_DIR}.bak-${STAMP}"

rm -rf /tmp/blog-dist-new
mkdir -p /tmp/blog-dist-new
tar -xzf "$UPLOAD_PATH" -C /tmp/blog-dist-new

if [ -d "$HTML_DIR" ]; then
  cp -a "$HTML_DIR" "$BACKUP"
fi
mkdir -p "$HTML_DIR"
rsync -a --delete /tmp/blog-dist-new/ "$HTML_DIR/"
rm -rf /tmp/blog-dist-new "$UPLOAD_PATH"

# 同步后端图片目录，保证新角色/Boss 图片可用
for d in character wengine drive_disc bangboo boss_image buff_image calculator_image guestbook_image; do
  if [ -d "${BACKEND_DIR}/$d" ]; then
    rsync -a "${BACKEND_DIR}/$d/" "${HTML_DIR}/$d/" 2>/dev/null || true
  fi
done

chown -R root:root "$HTML_DIR" 2>/dev/null || true
echo "BACKUP_DIR=$BACKUP"
echo "html_top_files=$(find "$HTML_DIR" -maxdepth 1 -type f | wc -l)"
echo "character_files=$(find "$HTML_DIR/character" -type f 2>/dev/null | wc -l)" || true
rm -f /var/services/homes/ljx/deploy-nas-remote.sh