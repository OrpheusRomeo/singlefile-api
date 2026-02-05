# singlefile-api
api mode using singlefile-cli to save html

# 一 构建与部署
    1 构建本地镜像
        sh build.sh
    2 部署
        sh prepare.sh
 
## 说明: 
    首次启动需要先构建镜像：运行 ./build.sh 构建本地镜像,如果镜像已存在,则直接使用 sh prepare.sh
    确保宿主机有足够的磁盘空间存储下载的文件, 以及下载目录的权限管理
    下载大网页可能需要较长时间，建议设置合理的超时时间

# 二 使用
    服务基本信息
    服务地址：http://localhost:3009（或宿主机IP:3009）
    容器内端口：3000
    宿主机映射端口：3009
    
##  可用接口
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
##    使用示例
        curl 命令示例：
        bash
        # 1. 健康检查
        i   curl http://localhost:3009/health
        
        # 2. 下载网页（最简单）
            curl -X POST http://localhost:3009/download \
              -H "Content-Type: application/json" \
              -d '{"url": "https://www.nju.edu.cn/ndgk/ndjj.htm"}'
        
        # 3. 下载网页并指定文件名
            curl -X POST http://localhost:3009/download \
              -H "Content-Type: application/json" \
              -d '{"url": "https://www.nju.edu.cn/ndgk/ndjj.htm", "filename": "my-page.html"}'




update for v2:

先准备好 本地目录,以便挂载
sh prepare.sh 

可以单独build镜像
sh build.sh

也可以直接 docker compose 构建
docker compose up -d --build

或者构建完直接启动容器
docker compose up -d

启动后可以试试接口

1. GET / - 服务首页
描述: 显示 API 服务信息及所有可用接口
方法: GET
参数: 无
响应: JSON 格式的服务信息
示例:

bash
curl http://localhost:3000/
2. POST /download - 通用网页下载
描述: 下载任意网页为 HTML 文件
方法: POST
请求体:

json
{
  "url": "https://example.com",
  "filename": "optional-custom-name.html",
  "waitTime": 10000,
  "removeElements": ".ads, .popup"
}
参数说明:

url: 必需，要下载的网页 URL

filename: 可选，自定义文件名

waitTime: 可选，页面等待时间（毫秒，默认10000）

removeElements: 可选，要移除的CSS选择器（逗号分隔）

示例:

bash
curl -X POST http://localhost:3000/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
3. POST /download/wechat - 微信公众号文章下载
描述: 专门下载微信公众号文章（带优化）
方法: POST
请求体:

json
{
  "url": "https://mp.weixin.qq.com/s/xxxxx",
  "filename": "optional-custom-name.html"
}
限制: URL 必须包含 mp.weixin.qq.com
特性: 自动应用微信文章优化设置（更长等待时间、移除广告等）

示例:

bash
curl -X POST http://localhost:3000/download/wechat \
  -H "Content-Type: application/json" \
  -d '{"url": "https://mp.weixin.qq.com/s/xxxxx"}'
4. GET /files - 获取文件列表
描述: 查看已下载的文件列表
方法: GET
查询参数:

limit: 返回数量（默认50）

offset: 偏移量（默认0）

示例:

bash
# 获取前50个文件
curl http://localhost:3000/files

# 分页获取
curl http://localhost:3000/files?limit=10&offset=20
5. GET /files/:filename - 查看/下载文件
描述: 查看或下载指定文件
方法: GET
路径参数:

:filename: 文件名

响应:

HTML文件: 直接渲染显示

其他文件: 触发下载

示例:

bash
# 查看HTML文件
curl http://localhost:3000/files/example.html

# 下载文件
curl -O http://localhost:3000/files/example.html
6. DELETE /files/:filename - 删除文件
描述: 删除指定的文件
方法: DELETE
路径参数:

:filename: 文件名

示例:

bash
curl -X DELETE http://localhost:3000/files/example.html
7. GET /health - 健康检查
描述: 检查服务状态和依赖
方法: GET
响应: 包含服务状态、Chromium状态、磁盘状态等信息

示例:

bash
curl http://localhost:3000/health

# 下载普通网页
curl -X POST http://localhost:3000/download \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.baidu.com",
    "filename": "baidu.html",
    "waitTime": 5000
  }'

# 下载微信公众号文章
curl -X POST http://localhost:3000/download/wechat \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://mp.weixin.qq.com/s/abc123",
    "filename": "wechat-article.html"
  }'

普通下载就可以完成对微信公众号的文章进行下载了

