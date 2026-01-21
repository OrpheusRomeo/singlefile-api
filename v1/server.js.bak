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
 */
app.post('/download', (req, res) => {
  try {
    const { url, filename, saveDir = DEFAULT_SAVE_DIR } = req.body;

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

    // 核心修复：
    // 1. 移除错误的 --browser-no-sandbox 参数
    // 2. 通过 --browser-arg 传递 Chromium 本身的 --no-sandbox 参数
    // 3. 保留必要的无头模式参数
    const cmd = `single-file \
      --browser-executable-path "${CHROMIUM_PATH}" \
      --browser-headless true \
      --browser-arg "--no-sandbox" \
      --browser-arg "--disable-setuid-sandbox" \
      "${url}" "${savePath}"`;

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
        fileSize: fs.statSync(savePath).size + ' bytes', // 新增：返回文件大小，确认文件有效
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
