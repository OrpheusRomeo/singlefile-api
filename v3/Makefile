.PHONY: build run stop clean test logs

# 检测平台
UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Darwin)
	PLATFORM := mac
else
	PLATFORM := linux
endif

build:
	@echo "构建镜像 (平台: $(PLATFORM))..."
ifeq ($(PLATFORM),mac)
	docker build --platform linux/amd64 -t singlefile-api:v4 .
else
	docker build -t singlefile-api:v4 .
endif

run:
	@echo "启动容器 (平台: $(PLATFORM))..."
ifeq ($(PLATFORM),mac)
	@docker run -d \
		--name singlefile-api \
		--platform linux/amd64 \
		-p 3000:3000 \
		-v "$(PWD)/data/downloads:/downloads" \
		-e NODE_ENV=production \
		-e PORT=3000 \
		-e CHROMIUM_PATH=/usr/bin/chromium \
		--memory=4g \
		--cpus=2 \
		--security-opt seccomp=unconfined \
		singlefile-api:v4
else
	@docker run -d \
		--name singlefile-api \
		-p 3000:3000 \
		-v "$(PWD)/data/downloads:/downloads" \
		-e NODE_ENV=production \
		-e PORT=3000 \
		-e CHROMIUM_PATH=/usr/bin/chromium \
		--memory=2g \
		--cpus=1 \
		--cap-add=SYS_ADMIN \
		--security-opt seccomp=unconfined \
		singlefile-api:v4
endif
	@echo "容器已启动，访问 http://localhost:3000"

stop:
	@echo "停止容器..."
	@docker stop singlefile-api || true
	@docker rm singlefile-api || true

clean:
	@echo "清理容器和镜像..."
	@docker stop singlefile-api || true
	@docker rm singlefile-api || true
	@docker rmi singlefile-api:v4 || true

logs:
	@docker logs -f singlefile-api

test:
	@echo "测试 API 服务..."
	@curl -s http://localhost:3000/health | python3 -m json.tool

test-wechat:
	@echo "测试微信公众号文章下载..."
	@curl -X POST http://localhost:3000/download/wechat \
		-H "Content-Type: application/json" \
		-d '{"url": "https://mp.weixin.qq.com/s/-MQaHyIdlcHRneEfzDURfA"}' | python3 -m json.tool

# 简化命令
up: build run
down: stop
restart: stop up
