# 明确指定平台
#FROM node:22.10.0-bookworm-slim
# 改为多平台兼容的标签
FROM --platform=linux/amd64 node:22.10.0-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# 安装 Chromium 和必要的依赖
RUN apt-get update && apt-get install -y \
    chromium \
    # Chromium 运行所需的依赖
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libxshmfence1 \
    fonts-liberation \
    libfontconfig1 \
    fonts-wqy-zenhei \
    fonts-wqy-microhei \
    fonts-droid-fallback \
    && rm -rf /var/lib/apt/lists/*

# 建立软链接兼容路径
RUN ln -s /usr/bin/chromium /usr/bin/chromium-browser || true

# 创建非root用户
RUN groupadd -r appuser && useradd -r -g appuser -G audio,video appuser \
    && mkdir -p /downloads \
    && chown -R appuser:appuser /app /downloads

# 复制文件
COPY package.json ./
COPY server.js ./

# 安装依赖
RUN npm install -g npm@11.8.0
RUN npm install -g single-file-cli@1.1.54
RUN npm install --production

# 暴露端口
EXPOSE 3000

# 切换到非root用户
USER appuser

# 启动服务
CMD ["node", "server.js"]
