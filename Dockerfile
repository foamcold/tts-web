# ---- 依赖安装与构建阶段 ----
FROM node:20-slim AS builder

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
# 复制 package.json 和 pnpm-lock.yaml
COPY package.json pnpm-lock.yaml* ./

# 安装 pnpm 并安装依赖
RUN npm install -g pnpm && pnpm install

# 复制项目源代码
COPY . .

# 复制 entrypoint 脚本
COPY entrypoint.sh .
RUN sed -i 's/\r$//' ./entrypoint.sh

# 生成 Prisma Client
RUN npx prisma generate

# 构建 Next.js 应用
RUN pnpm run build

# 编译 worker 并复制到 .next/server
RUN npx tsc -p tsconfig.worker.json
RUN cp lib/tts-engine/worker-entry.mjs .next/server/lib/tts-engine/worker-entry.mjs

# ---- 生产镜像阶段 ----
FROM node:20-slim AS runner

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 从构建阶段复制必要的文件
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

# 安装 openssl
RUN apt-get update && apt-get install -y openssl

# 复制 entrypoint 脚本
COPY --from=builder /app/entrypoint.sh .
RUN sed -i 's/\r$//' ./entrypoint.sh

# 赋予执行权限
RUN chmod +x ./entrypoint.sh

# 暴露端口
EXPOSE 3000

# 设置 entrypoint
ENTRYPOINT ["./entrypoint.sh"]

# 启动应用的命令
CMD ["pnpm", "start"]