#!/bin/sh
# 1. 创建下载目录（确保权限正确）
mkdir -p ./data/singlefile-downloads
chmod 777 ./data/singlefile-downloads  # 简化权限配置，生产环境可按需调整

# 2. 构建本地镜像
#docker build --no-cache -t singlefile-api:latest .

# 3. 启动服务（后台运行）
docker compose up -d

# 4. 查看服务状态
docker compose ps

# 5. 查看服务日志
docker compose logs -f singlefile-api

# 6. 停止服务
#docker compose down

# 7. 停止并删除数据卷（谨慎使用，会删除下载的文件）
#docker compose down -v
