#!/usr/bin/env bash
# .env.local を読み込んでから next dev を起動する
# Next.js 16 の env 読み込み不具合対策（変数を明示的に渡す）
set -a
# shellcheck disable=SC1091
[ -f .env.local ] && . .env.local
set +a
exec npx next dev
