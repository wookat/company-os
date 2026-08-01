#!/usr/bin/env bash
# 部署脚本：把当前 git 短哈希+时间戳写入 app.html 的 app-build meta，便于线上核对版本
set -euo pipefail
cd "$(dirname "$0")"
BUILD="$(git rev-parse --short HEAD)-$(date -u +%Y%m%d%H%M)"
sed -i "s/<meta name=\"app-build\" content=\"[^\"]*\">/<meta name=\"app-build\" content=\"${BUILD}\">/" public/app.html
export CLOUDFLARE_API_TOKEN="$CLOUDFLARE_WORKERS_API_TOKEN"
wrangler deploy
echo "app-build: ${BUILD}"
