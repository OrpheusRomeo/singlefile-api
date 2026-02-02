#!/bin/bash

# 检测操作系统
detect_os() {
    case "$(uname -s)" in
        Darwin)
            echo "mac"
            ;;
        Linux)
            echo "linux"
            ;;
        *)
            echo "unknown"
            ;;
    esac
}

OS_TYPE=$(detect_os)

echo "检测到操作系统: $OS_TYPE"

# 根据不同操作系统调整配置
case $OS_TYPE in
    mac)
        echo "在 macOS 上运行 Docker..."
        
        # 检查 Docker Desktop 是否运行
        if ! docker info > /dev/null 2>&1; then
            echo "错误: Docker Desktop 未运行"
            echo "请启动 Docker Desktop 并重试"
            exit 1
        fi
        
        # 为 macOS 调整配置
        export DOCKER_BUILD_PLATFORM="linux/amd64"
        export DOCKER_RAM_LIMIT="4g"
        export DOCKER_CPU_LIMIT="2"
        
        # 构建镜像（指定平台）
        docker build --platform linux/amd64 -t singlefile-api:v4 .
        
        # 运行容器（macOS 特定配置）
        docker run -d \
            --name singlefile-api \
            --platform linux/amd64 \
            -p 3014:3000 \
            -v "$(pwd)/data/downloads:/downloads" \
            -e NODE_ENV=production \
            -e PORT=3000 \
            -e CHROMIUM_PATH=/usr/bin/chromium \
            --memory=4g \
            --cpus=2 \
            --security-opt seccomp=unconfined \
            singlefile-api:v4
        ;;
    
    linux)
        echo "在 Linux 上运行 Docker..."
        
        # 为 Linux 调整配置
        export DOCKER_BUILD_PLATFORM="linux/amd64"
        export DOCKER_RAM_LIMIT="2g"
        export DOCKER_CPU_LIMIT="1"
        
        # 构建镜像
        docker build -t singlefile-api:v4 .
        
        # 运行容器（Linux 特定配置）
        docker run -d \
            --name singlefile-api \
            -p 3014:3000 \
            -v "$(pwd)/data/downloads:/downloads" \
            -e NODE_ENV=production \
            -e PORT=3000 \
            -e CHROMIUM_PATH=/usr/bin/chromium \
            --memory=2g \
            --cpus=1 \
            --cap-add=SYS_ADMIN \
            --security-opt seccomp=unconfined \
            singlefile-api:v4
        ;;
    
    *)
        echo "不支持的操作系统"
        exit 1
        ;;
esac

echo "容器启动完成！"
echo "访问 http://localhost:3000"
