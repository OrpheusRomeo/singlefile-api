# singlefile-api
api mode using singlefile-cli to save html

一 构建与部署
 1 构建本地镜像
    sh build.sh
 2 部署
    sh prepare.sh
 
 说明: 
    首次启动需要先构建镜像：运行 ./build.sh 构建本地镜像,如果镜像已存在,则直接使用 sh prepare.sh
    确保宿主机有足够的磁盘空间存储下载的文件, 以及下载目录的权限管理
    下载大网页可能需要较长时间，建议设置合理的超时时间

二 使用
 服务基本信息
 服务地址：http://localhost:3009（或宿主机IP:3009）

 容器内端口：3000
 宿主机映射端口：3009
 
 可用接口
  1. 健康检查接口
  http
  GET /health
  用途：检查服务是否正常运行
  
  响应示例：
  
  json
  {
    "status": "ok",
    "service": "singlefile-api",
    "chromiumPath": "/usr/bin/chromium",
    "chromiumExists": true,
    "timestamp": "2026-01-13T01:56:21.677Z"
  }
  2. 网页下载接口（主要功能）
  http
  POST /download
  Content-Type：application/json
  请求参数：
  json
  {
    "url": "https://www.nju.edu.cn/ndgk/ndjj.htm",      // 必填：要保存的网页URL
    "filename": "my-page.html",        // 可选：自定义文件名
    "saveDir": "/downloads"           // 可选：保存目录（默认：/downloads）
  }
  成功响应示例：
  
  json
  {
    "success": true,
    "message": "网页下载成功",
    "url": "https://www.nju.edu.cn/ndgk/ndjj.htm",
    "savePath": "/downloads/my-page.html",
    "fileSize": "8704911 bytes",
    "chromiumPath": "/usr/bin/chromium",
    "stdout": ""
  }
  错误响应示例：
  
  json
  {
    "success": false,
    "message": "下载失败: 错误信息...",
    "stderr": "命令错误输出...",
    "chromiumPath": "/usr/bin/chromium",
    "cmd": "执行的命令..."
  }
  使用示例
  curl 命令示例：
  bash
  # 1. 健康检查
  curl http://localhost:3009/health
  
  # 2. 下载网页（最简单）
  curl -X POST http://localhost:3009/download \
    -H "Content-Type: application/json" \
    -d '{"url": "https://www.nju.edu.cn/ndgk/ndjj.htm"}'
  
  # 3. 下载网页并指定文件名
  curl -X POST http://localhost:3009/download \
    -H "Content-Type: application/json" \
    -d '{"url": "https://www.nju.edu.cn/ndgk/ndjj.htm", "filename": "my-page.html"}'

