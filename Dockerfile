FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production

# 安装 Chromium 及完整依赖
RUN apt-get update && apt-get install -y \
    chromium \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm-dev \
    libxkbcommon-dev \
    libgbm-dev \
    libasound-dev \
    libatspi2.0-0 \
    libxshmfence-dev \
    && rm -rf /var/lib/apt/lists/*

# 建立软链接兼容路径
RUN ln -s /usr/bin/chromium /usr/bin/chromium-browser || true

# 安装 singlefile-cli 和 Express
RUN npm install -g single-file-cli
COPY package.json ./
RUN npm install --production
COPY server.js .

EXPOSE 3000
CMD ["node", "server.js"]
