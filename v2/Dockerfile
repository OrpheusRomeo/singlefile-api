FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production

# 安装 Chromium 和必要的依赖
RUN apt-get update && apt-get install -y \
    chromium \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgbm1 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    wget \
    curl \
    --no-install-recommends

# 清理缓存
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# 安装 single-file-cli 全局工具
RUN npm install -g single-file-cli
RUN npm install --production
COPY server.js .



# 创建应用目录
WORKDIR /app

# 复制 package.json 并安装依赖
COPY package*.json ./
RUN npm ci --only=production

# 创建下载目录
RUN mkdir -p /downloads

# 创建非 root 用户
RUN groupadd -r appuser && useradd -r -g appuser -G audio,video appuser \
    && chown -R appuser:appuser /app /downloads

# 切换用户
USER appuser

# 暴露端口
EXPOSE 3000

# 启动服务
CMD ["node", "server.js"]
