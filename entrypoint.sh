#!/bin/sh
# 脚本在遇到错误时退出
set -e

# 运行数据库迁移
echo "Running database migrations..."
npx prisma migrate deploy

# 执行 Dockerfile 中定义的 CMD
exec "$@"