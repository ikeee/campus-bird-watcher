# ─────────────────────────────────────────────────────────────────────────────
# 校园鸟屋智能监控系统 Dockerfile
# 多阶段构建：build → production
# ─────────────────────────────────────────────────────────────────────────────

# ── 阶段 1：构建 ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm@10

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# 安装依赖（包含 devDependencies，用于构建）
RUN pnpm install --frozen-lockfile

# 复制源码
COPY . .

# 构建前端 + 后端
RUN pnpm build

# ── 阶段 2：生产运行 ──────────────────────────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

# 安装运行时依赖（curl 用于 healthcheck）
RUN apk add --no-cache curl

# 安装 pnpm（生产依赖安装）
RUN npm install -g pnpm@10

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# 仅安装生产依赖
RUN pnpm install --frozen-lockfile --prod

# 从 builder 阶段复制构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist

# 创建图片上传目录
RUN mkdir -p /app/uploads

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# 启动命令
CMD ["node", "dist/index.js"]
