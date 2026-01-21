const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());

// 定义默认保存目录（容器内）
const DEFAULT_SAVE_DIR = '/downloads';

// 自动检测容器内 Chromium 路径
let CHROMIUM_PATH = '/usr/bin/chromium';
if (!fs.existsSync(CHROMIUM_PATH)) {
  CHROMIUM_PATH = '/usr/bin/chromium-browser';
}
if (!fs.existsSync(CHROMIUM_PATH)) {
  console.error(`警告：未找到 Chromium 可执行文件，路径 ${CHROMIUM_PATH} 不存在`);
}

// 确保保存目录存在
fs.mkdirSync(DEFAULT_SAVE_DIR, { recursive: true });

/**
 * 接口：POST /download
 * 参数：
 * - url: 要下载的网页URL（必填）
 * - filename: 保存的文件名（可选）
 * - saveDir: 保存目录（可选）
 * - userAgent: User-Agent字符串（可选）
 */
app.post('/download', (req, res) => {
  try {
    // 1. 从请求体中获取更多参数
    const { url, filename, saveDir = DEFAULT_SAVE_DIR, userAgent, waitTime } = req.body;

    // 2. 建议使用移动端 User-Agent，通过率更高
    const effectiveUserAgent = userAgent || 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';


    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL 参数不能为空'
      });
    }

    fs.mkdirSync(saveDir, { recursive: true });

    // 构建保存路径
    const savePath = filename
      ? path.join(saveDir, filename)
      : path.join(saveDir, `singlefile-${Date.now()}.html`);

    // 构建命令，支持自定义 user-agent
    let cmd = `single-file \
      --browser-executable-path "${CHROMIUM_PATH}" \
      --browser-headless true \
      --browser-arg "--no-sandbox" \
      --browser-arg "--disable-setuid-sandbox" \
      --browser-arg "--user-agent=${effectiveUserAgent}" \
      --browser-arg "--lang=zh-CN,zh;q=0.9" \
      --header "Referer: https://mp.weixin.qq.com/" \
      --header "Accept-Language: zh-CN,zh;q=0.9" \
      --browser-wait ${waitTime || 5000} \
      --browser-load-max-time 60000 \
      "${url}" "${savePath}"`;

    // 如果提供了 user-agent，则添加到命令中
    if (userAgent) {
      cmd += ` --user-agent "${userAgent}"`;
    }

    cmd += ` "${url}" "${savePath}"`;

    console.log(`执行命令：${cmd}`);

    // 执行命令（优化：严格判断退出码）
    exec(cmd, (error, stdout, stderr) => {
      // 即使 error 为 null，也要检查 stderr 是否包含错误信息
      const hasError = error || (stderr && !stderr.includes('single-file [url] [output]'));

      if (hasError) {
        const errorMsg = error ? error.message : `命令执行异常: ${stderr}`;
        console.error(`执行错误: ${errorMsg}`);
        return res.status(500).json({
          success: false,
          message: `下载失败: ${errorMsg}`,
          stderr: stderr,
          chromiumPath: CHROMIUM_PATH,
          cmd: cmd
        });
      }

      // 验证文件是否真的生成
      if (!fs.existsSync(savePath)) {
        return res.status(500).json({
          success: false,
          message: '命令执行成功，但未生成文件',
          savePath: savePath,
          stdout: stdout,
          stderr: stderr
        });
      }

      res.status(200).json({
        success: true,
        message: '网页下载成功',
        url: url,
        savePath: savePath,
        fileSize: fs.statSync(savePath).size + ' bytes',
        userAgentUsed: userAgent || '默认',
        chromiumPath: CHROMIUM_PATH,
        stdout: stdout
      });
    });
  } catch (err) {
    console.error(`服务器错误: ${err.message}`);
    res.status(500).json({
      success: false,
      message: `服务器错误: ${err.message}`,
      chromiumPath: CHROMIUM_PATH
    });
  }
});

// User-Agent 列表接口
app.get('/user-agents', (req, res) => {
  res.status(200).json({
    success: true,
    message: '常用的 User-Agent 列表',
    userAgents: {
      chromeWindows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      chromeMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
      firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      safari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      mobileAndroid: 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      mobileIOS: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    }
  });
});

// 健康检查接口
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'singlefile-api',
    chromiumPath: CHROMIUM_PATH,
    chromiumExists: fs.existsSync(CHROMIUM_PATH),
    timestamp: new Date().toISOString()
  });
});

// 启动服务
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SingleFile API 服务已启动，端口：${PORT}`);
  console.log(`默认保存目录：${DEFAULT_SAVE_DIR}`);
  console.log(`Chromium 路径：${CHROMIUM_PATH} (存在: ${fs.existsSync(CHROMIUM_PATH)})`);
});



//// 扩展参数示例
//const {
//  url,
//  filename,
//  saveDir = DEFAULT_SAVE_DIR,
//  userAgent,
//  delay, // 延迟秒数
//  isMobile // 是否模拟移动端
//} = req.body;
//
//// 在构建命令时添加
//if (delay) {
//  cmd += ` --wait ${delay}`;
//}
//
//// 如果模拟移动端，可以设置视口
//if (isMobile) {
//  cmd += ` --browser-width 375 --browser-height 667`;
//}
