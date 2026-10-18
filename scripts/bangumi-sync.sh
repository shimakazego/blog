#!/bin/bash
# Bangumi 百合数据同步（NAS 侧定时脚本）
# 链路：GitHub Actions 抓取 -> 发布到 bangumi-data 分支 -> 本脚本下载 tarball -> 在 blog-express 容器内导入
# 说明：NAS 网络无法直连 bgm.tv（DNS 污染 + SNI 阻断），因此抓取放在 GitHub Actions；
#       本脚本只需访问 codeload.github.com（已验证可达）。
# 部署位置: /volume1/docker/blog/bangumi-sync.sh（由 /etc/crontab 每日调用）
set -uo pipefail

DOCKER=/usr/local/bin/docker
LOG=/volume1/docker/blog/bangumi-sync.log
WORK=/tmp/bangumi-sync-work
LOCK=/tmp/bangumi-sync.lock
TARBALL_URL="https://codeload.github.com/shimakazego/blog/tar.gz/refs/heads/bangumi-data"

if [ -f "$LOCK" ]; then
  echo "===== $(date '+%F %T') 已有同步进行中，跳过 =====" >> "$LOG"
  exit 0
fi
touch "$LOCK"
trap 'rm -f "$LOCK"' EXIT

{
  echo "===== $(date '+%F %T') bangumi-sync start ====="

  rm -rf "$WORK"
  mkdir -p "$WORK"

  if ! curl -sfL --max-time 240 -o "$WORK/data.tar.gz" "$TARBALL_URL"; then
    echo "[skip] 数据分支下载失败（可能尚未生成或网络波动），本次跳过"
    exit 0
  fi

  tar -xzf "$WORK/data.tar.gz" -C "$WORK"
  ROOT_DIR=$(find "$WORK" -maxdepth 1 -mindepth 1 -type d | head -n 1)

  if [ -z "$ROOT_DIR" ] || [ ! -f "$ROOT_DIR/topics.json" ]; then
    echo "[error] 数据包结构异常"
    exit 1
  fi

  # 可选：LLM 翻译纯日文简介（存在配置文件后生效；失败不阻塞导入）
  ENV_FILE=/volume1/docker/blog/bangumi-translate.env
  TRANSLATE_SCRIPT=/volume1/docker/blog/translate-bangumi-summaries.mjs
  if [ -f "$ENV_FILE" ] && [ -f "$TRANSLATE_SCRIPT" ]; then
    [ -f /volume1/docker/blog/bangumi-translate-cache.json ] || echo '{}' > /volume1/docker/blog/bangumi-translate-cache.json
    echo "[translate] LLM 翻译日文简介..."
    "$DOCKER" run --rm --network host --env-file "$ENV_FILE" \
      -v "$TRANSLATE_SCRIPT":/translate.mjs \
      -v /volume1/docker/blog/bangumi-translate-cache.json:/cache.json \
      -v "$ROOT_DIR":/data \
      server-app:latest node /translate.mjs --data-dir /data --cache /cache.json || echo "[translate] 失败，跳过（不影响导入）"
  else
    echo "[translate] 未配置 translate env/script，跳过"
  fi

  "$DOCKER" exec blog-express rm -rf /tmp/bangumi-sync
  "$DOCKER" exec blog-express mkdir -p /tmp/bangumi-sync
  "$DOCKER" cp "$ROOT_DIR/." blog-express:/tmp/bangumi-sync/
  "$DOCKER" exec blog-express node scripts/sync-bangumi-yuri.mjs --data-dir /tmp/bangumi-sync
  rc=$?
  "$DOCKER" exec blog-express rm -rf /tmp/bangumi-sync
  rm -rf "$WORK"

  echo "===== $(date '+%F %T') done rc=$rc ====="
  exit $rc
} >> "$LOG" 2>&1
