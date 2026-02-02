const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
app.use(express.json());

// 检测平台
const platform = os.platform();
const isMac = platform === 'darwin';
const isLinux = platform === 'linux';

console.log(`运行平台: ${platform}`);
console.log(`是否为 macOS: ${isMac}`);
console.log(`是否为 Linux: ${isLinux}`);

// 根据平台调整配置
const DEFAULT_SAVE_DIR = process.env.SAVE_DIR || '/downloads';
let CHROMIUM_PATH = process.env.CHROMIUM_PATH || '/usr/bin/chromium';

// 确保保存目录存在
fs.mkdirSync(DEFAULT_SAVE_DIR, { recursive: true });

// 针对不同平台的特殊处理
function getPlatformSpecificArgs() {
  const args = [];
  
  if (isMac) {
    // macOS 特定的 Chromium 参数
    args.push(
      '--browser-arg=--disable-gpu',
      '--browser-arg=--disable-software-rasterizer',
      '--browser-arg=--disable-dev-shm-usage',
      '--browser-arg=--no-sandbox',
      '--browser-arg=--disable-setuid-sandbox'
    );
  } else if (isLinux) {
    // Linux 特定的 Chromium 参数
    args.push(
      '--browser-arg=--no-sandbox',
      '--browser-arg=--disable-dev-shm-usage',
      '--browser-arg=--disable-gpu',
      '--browser-arg=--disable-setuid-sandbox'
    );
  }
  
  return args;
}

// 执行 single-file 命令的 Promise 封装
function executeSingleFile(args) {
  return new Promise((resolve, reject) => {
    console.log('执行命令: single-file', args.join(' '));
    
    const child = spawn('single-file', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { 
        ...process.env,
        NODE_OPTIONS: '--max-old-space-size=4096',
        // 根据平台设置不同的环境变量
        ...(isMac ? { 
          DISPLAY: ':99',
          ELECTRON_DISABLE_SANDBOX: '1'
        } : {})
      }
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
      if (process.env.DEBUG) {
        console.log(`stdout: ${data.toString()}`);
      }
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error(`stderr: ${data.toString()}`);
    });

    child.on('close', (code) => {
      console.log(`命令执行完成，退出码: ${code}`);
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const error = new ErrP1+r6B32=1B4F51\P1+r6B33=1B4F52\P1+r6B34=1B4F53\or(`命令执行失败，退出码: ${code}`);
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
      }
    });

    child.on('error', (error) => {
      console.error(`命令执行错误: ${error.message}`);
      reject(error);
    });
  });
}

/**
 * 通用的下载函数
 */
async function downloadHtml(options) {
  const { 
    url, 
    filename,
    waitTime = isMac ? 15000 : 10000, // macOS 需要更长等待时间
    removeElements,
    isWechat = false
  } = options;

  if (!url) {
    throw new Error('URL 参数不能为空');
  }

  console.log(`开始下载: ${url}`);
  console.log(`平台: ${platform}, 是否为微信文章: ${isWechat}`);

  // 构建保存路径
  const timestamp = Date.now();
  const urlHash = Buffer.from(url).toString('base64').substring(0, 20).replace(/[^a-zA-Z0-9]/g, '');
  const savePath = filenP1+r6B35=1B5B31357E\P1+r6B36=1B5B31377E\P1+r6B37=1B5B31387E\P1+r6B38=1B5B31397E\P1+r6B39=1B5B32307E\P1+r6B3B=1B5B32317E\P1+r4631=1B5B32337E\ame
    ? path.join(DEFAULT_SAVE_DIR, filename)
    : path.join(DEFAULT_SAVE_DIR, `singlefile-${timestamp}-${urlHash}.html`);

  // 根据是否为微信文章选择 User-Agent
  const userAgent = isWechat 
    ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  // 构建 single-file 命令参数
  const args = [
    `--browser-executable-path=${CHROMIUM_PATH}`,
    '--browser-headless=true',
    `--browser-wait=${waitTime}`,
    '--browser-load-max-time=60000',
    `--user-agent=${userAgent}`,
    '--header=Accept-Language: zh-CN,zh;q=0.9,en;q=0.8',
  ];

  // 添加平台特定的参数
  args.push(...getPlatformSpecificArgs());

  // 如果是微信文章，添加特定的请求头
  if (isWechat) {
    args.push('--header=Referer: https://mp.weixin.qq.com/');
    args.push('--header=Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8');
    args.push('--browser-window-size=375,812'); // iPhone 尺寸
  }

  // 添加移除元素的参数（如果提供）
  if (removeElements) {
    args.push(`--remove-elements=${removeElements}`);
  }

  // 添加 URL 和输出路径
  args.push(url);
  args.push(savePath);

  console.log('执行命令参数:', args.slice(0, 10).join(' '), '...'); // 只显示前10个参数

  try {
    // 执行 single-file 命令
    await executeSingleFile(args);

    // 验证文件是否生成
    if (!fs.existsSync(savePath)) {
      throw new Error('命令执行成功，但未生成文件');
    }

    const stats = fs.statSync(savePath);
    
    if (stats.size === 0) {
      throw new Error('文件已生成但大小为0字节');
    }
    
    // 如果是微信公众号文章，添加一些美化
    if (isWechat) {
      try {
        const content = fs.readFileSync(savePath, 'utf8');
        // 添加一些样式优化
        const optimizedContent = content.replace(
          '</head>',
          `<style>
            /* 微信公众号文章优化 */
            .rich_media_content { max-width: 100% !important; }
            img { max-width: 100% !important; height: auto !important; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif; }
            .weui_loading, .weui_btn_primary, button, .qr_code_pc, .footer, .ad { display: none !important; }
          </style>
          </head>`
        );
        fs.writeFileSync(savePath, optimizedContent);
      } catch (error) {
        console.warn('微信文章样式优化失败:', error.message);
      }
    }

    return {
      url,
      savePath,
      filename: path.basename(savePath),
      fileSize: stats.size,
      fileSizeFormatted: `${(stats.size / 1024).toFixed(2)} KB`,
      downloadTime: new Date().toISOString(),
      platform: platform
    };
  } catch (error) {
    console.error('下载失败:', error.message);
    if (error.stderr) {
      console.error('错误详情:', error.stderr.substring(0, 500));
    }
    
    // 尝试备用方案
    return await downloadWithSimplifiedCommand(url, savePath, isWechat);
  }
}

// ... 其余代码保持不变 ...
