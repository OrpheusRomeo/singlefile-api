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

// 微信公众号特定的 User-Agent 列表
const WECHAT_USER_AGENTS = [
  // iOS 微信浏览器
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.40(0x1800282f) NetType/WIFI Language/zh_CN',
  
  // Android 微信浏览器
  'Mozilla/5.0 (Linux; Android 12; SM-G9980) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/108.0.5359.128 Mobile Safari/537.36 XWEB/5317 MMWEBSDK/20230405 MMWEBID/9457 MicroMessenger/8.0.35.2360(0x2800235D) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64',
  
  // Windows 微信内置浏览器
  'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.5359.128 Safari/537.36 MicroMessenger/7.0.20.1781(0x6700143B) NetType/WIFI MiniProgramEnv/Windows WindowsWechat/WMPF WindowsWechat(0x63090a13)',
  
  // Mac 微信内置浏览器
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.5359.128 Safari/537.36 MicroMessenger/7.0.20.1781(0x6700143B) NetType/WIFI MiniProgramEnv/Mac',
];

// 随机选择一个 User-Agent
function getRandomUserAgent() {
  return WECHAT_USER_AGENTS[Math.floor(Math.random() * WECHAT_USER_AGENTS.length)];
}

/**
 * 生成浏览器指纹参数
 */
function generateBrowserFingerprint() {
  const fingerprints = [
    // WebGL 指纹
    '--browser-arg "--enable-webgl"',
    '--browser-arg "--ignore-gpu-blocklist"',
    
    // Canvas 指纹
    '--browser-arg "--disable-canvas-aa"',
    
    // 音频指纹
    '--browser-arg "--disable-audio-output"',
    
    // 硬件信息
    '--browser-arg "--use-gl=egl"',
    '--browser-arg "--disable-gpu"',
    
    // 时区设置
    '--browser-arg "--timezone=Asia/Shanghai"',
    
    // 语言设置
    '--browser-arg "--lang=zh-CN"',
  ];
  
  // 添加随机视口大小
  const viewports = [
    '--browser-width 375 --browser-height 667',  // iPhone 6/7/8
    '--browser-width 414 --browser-height 736',  // iPhone 6/7/8 Plus
    '--browser-width 360 --browser-height 640',  // 常见 Android
    '--browser-width 412 --browser-height 732',  // Pixel 2
  ];
  
  return [
    ...fingerprints,
    viewports[Math.floor(Math.random() * viewports.length)]
  ].join(' ');
}

/**
 * 生成微信公众号特定的请求头
 */
function generateWechatHeaders() {
  return [
    // 基础头
    '--header "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7"',
    '--header "Accept-Encoding: gzip, deflate, br"',
    '--header "Accept-Language: zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6"',
    '--header "Cache-Control: no-cache"',
    '--header "Pragma: no-cache"',
    
    // 微信特定头
    '--header "Referer: https://mp.weixin.qq.com/"',
    '--header "Sec-Fetch-Dest: document"',
    '--header "Sec-Fetch-Mode: navigate"',
    '--header "Sec-Fetch-Site: same-origin"',
    '--header "Upgrade-Insecure-Requests: 1"',
    
    // 添加 Cookie（如果需要，可以动态设置）
    // '--header "Cookie: 你的cookie"',
  ].join(' ');
}

/**
 * 接口：POST /download
 * 参数：
 * - url: 要下载的网页URL（必填）
 * - filename: 保存的文件名（可选）
 * - saveDir: 保存目录（可选）
 * - userAgent: User-Agent字符串（可选）
 * - waitTime: 等待时间（可选，默认5000ms）
 * - enableJs: 是否启用JavaScript（可选，默认true）
 * - maxResourceSize: 最大资源大小（可选）
 * - removeHiddenElements: 是否移除隐藏元素（可选）
 */
app.post('/download', (req, res) => {
  try {
    // 1. 从请求体中获取参数
    const {
      url,
      filename,
      saveDir = DEFAULT_SAVE_DIR,
      userAgent,
      waitTime = 8000,
      enableJs = true,
      maxResourceSize,
      removeHiddenElements = false,
      useRandomFingerprint = true,
      retryCount = 2
    } = req.body;

    // 2. 获取 User-Agent
    let effectiveUserAgent;
    if (userAgent === 'random') {
      effectiveUserAgent = getRandomUserAgent();
    } else if (userAgent) {
      effectiveUserAgent = userAgent;
    } else {
      effectiveUserAgent = WECHAT_USER_AGENTS[0]; // 默认使用第一个
    }

    if (!url) {
      return res.status(400).json({
        success: * - waitTime: 等待时间（可选，默认5000ms）
 * - en  }

    // 验证URL是否是微信公众号链接
    if (!url.includes('mp.weixin.qq.com')) {
      console.warn(`警告：URL 可能不是微信公众号链接: ${url}`);
    }

    fs.mkdirSync(saveDir, { recursive: true });

    // 构建保存路径
    const savePath = filename
      ? path.join(saveDir, filename)
      : path.join(saveDir, `wechat-${Date.now()}.html`);

    // 基础命令参数
    let cmdArgs = [
      `--browser-executable-path "${CHROMIUM_PATH}"`,
      '--browser-headless new',  // 使用新的 Headless 模式
      '--browser-arg "--no-sandbox"',
      '--browser-arg "--disable-setuid-sandbox"',
      '--browser-arg "--disable-dev-shm-usage"',
      '--browser-arg "--disable-blink-features=AutomationControlled"',
      `--browser-arg "--user-agent=${effectiveUserAgent}"`,
      `--browser-wait ${waitTime}`,
      '--browser-load-max-time 120000',  // 延长加载时间
      '--browser-load-resources-max-time 60000',
      '--max-resource-size 10485760',  // 10MB 资源限制
    ];

    // 添加 JavaScript 控制
    if (enableJs) {
      cmdArgs.push('--browser-wait-until networkidle0');
      cmdArgs.push('--browser-load-images true');
    } else {
      cmdArgs.push('--browser-load-images false');
      cmdArgs.push('--browser-load-stylesheets false');
      cmdArgs.push('--browser-load-fonts false');
    }

    // 添加浏览器指纹
    if (useRandomFingerprint) {
      cmdArgs = [...cmdArgs, ...generateBrowserFingerprint().split(' ')];
    }

    // 添加请求头
    cmdArgs.push(generateWechatHeaders());

    // 添加其他可选参数
    if (maxResourceSize) {
      cmdArgs.push(`--max-resource-size ${maxResourceSize}`);
    }

    if (removeHiddenElements) {
      cmdArgs.push('--remove-hidden-elements');
    }

    // 构建完整命令
    const cmd = `single-file ${cmdArgs.join(' ')} "${url}" "${savePath}"`;

    console.log(`执行命令（精简版）：single-file [参数] "${url}" "${savePath}"`);
    console.log(`使用的 User-Agent：${effectiveUserAgent.substring(0, 100)}...`);

    // 重试机制
    const attemptDownload = (attempt = 0) => {
      exec(cmd, (error, stdout, stderr) => {
        // 检查是否有错误
        const hasError = error || (stderr && stderr.includes('Error') && !stderr.includes('single-file [url] [output]'));

        if (hasError && attempt < retryCount) {
          console.log(`第 ${attempt + 1} 次尝试失败，正在重试...`);
          setTimeout(() => attemptDownload(attempt + 1), 2000);
          return;
        }

        if (hasError) {
          const errorMsg = error ? error.message : `命令执行异常: ${stderr.substring(0, 200)}`;
          console.error(`执行错误: ${errorMsg}`);
          
          // 分析错误类型
          let errorType = 'unknown';
          if (errorMsg.includes('timeout')) errorType = 'timeout';
          else if (errorMsg.includes('network')) errorType = 'network';
          else if (errorMsg.includes('chromium')) errorType = 'browser';
          
          return res.status(500).json({
            success: false,
            message: `下载失败: ${errorMsg}`,
            errorType: errorType,
            url: url,
            attempt: attempt + 1,
            chromiumPath: CHROMIUM_PATH
          });
        }

        // 验证文件是否真的生成
        if (!fs.existsSync(savePath)) {
          return res.status(500).json({
            success: false,
            message: '命令执行成功，但未生成文件',
            savePath: savePath,
            url: url
          });
        }

        // 检查文件内容是否有效
        const stats = fs.statSync(savePath);
        if (stats.size < 1000) {
          console.warn(`警告：生成的文件过小 (${stats.size} bytes)，可能是空页面`);
        }

        // 检查文件内容
        const content = fs.readFileSync(savePath, 'utf8');
        const isBlocked = content.includes('微信安全中心') || 
                         content.includes('已停止访问该网页') ||
                         content.includes('此公众号已停止服务');

        if (isBlocked) {
          return res.status(403).json({
            success: false,
            message: '页面被微信安全中心拦截',
            url: url,
            savePath: savePath,
            fileSize: stats.size + ' bytes',
            blocked: true
          });
        }

        res.status(200).json({
          success: true,
          message: '网页下载成功',
          url: url,
          savePath: savePath,
          fileSize: stats.size + ' bytes',
          userAgentUsed: effectiveUserAgent.substring(0, 100),
          chromiumPath: CHROMIUM_PATH,
          attempt: attempt + 1,
          timestamp: new Date().toISOString()
        });
      });
    };

    // 开始下载
    attemptDownload();

  } catch (err) {
    console.error(`服务器错误: ${err.message}`);
    res.status(500).json({
      success: false,
      message: `服务器错误: ${err.message}`,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

/**
 * 专用微信公众号下载接口
 */
app.post('/download/wechat', (req, res) => {
  try {
    const { url, filename, saveDir = DEFAULT_SAVE_DIR } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL 参数不能为空'
      });
    }
    
    // 为微信公众号特别优化参数
    req.body.userAgent = 'random';
    req.body.waitTime = 10000;  // 微信公众号需要更长等待时间
    req.body.enableJs = true;
    req.body.useRandomFingerprint = true;
    req.body.removeHiddenElements = true;
    req.body.retryCount = 3;
    
    // 调用通用下载接口
    req.url = '/download';
    req.method = 'POST';
    app.handle(req, res);
    
  } catch (err) {
    console.error(`微信公众号下载错误: ${err.message}`);
    res.status(500).json({
      success: false,
      message: `微信公众号下载失败: ${err.message}`
    });
  }
});

// User-Agent 列表接口
app.get('/user-agents', (req, res) => {
  res.status(200).json({
    success: true,
    message: '常用的 User-Agent 列表',
    count: WECHAT_USER_AGENTS.length,
    userAgents: WECHAT_USER_AGENTS.map((ua, index) => ({
      id: index + 1,
      name: `微信浏览器 ${index + 1}`,
      value: ua,
      preview: ua.substring(0, 80) + '...'
    }))
  });
});

// 测试环境接口
app.get('/test/env', (req, res) => {
  const testUrl = 'https://mp.weixin.qq.com/s/example';  // 示例URL
  
  res.status(200).json({
    success: true,
    message: '环境测试信息',
    chromium: {
      path: CHROMIUM_PATH,
      exists: fs.existsSync(CHROMIUM_PATH),
      version: '检测中...'
    },
    singleFile: {
      available: true,
      version: '检测中...'
    },
    system: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version
    },
    wechatDetection: {
      note: '微信公众号会检测以下指纹：',
      fingerprints: [
        'WebGL 支持',
        'Canvas 指纹',
        'User-Agent',
        '屏幕分辨率',
        '时区',
        '语言',
        '插件列表',
        '字体列表'
      ]
    },
    recommendations: [
      '使用随机 User-Agent',
      '启用 JavaScript',
      '设置合理的等待时间 (8000-15000ms)',
      '启用浏览器指纹随机化',
      '使用重试机制'
    ]
  });
});

// 健康检查接口
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'singlefile-wechat-api',
    chromium: {
      path: CHROMIUM_PATH,
      exists: fs.existsSync(CHROMIUM_PATH)
    },
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// 批量下载接口
app.post('/download/batch', (req, res) => {
  const { urls, saveDir = DEFAULT_SAVE_DIR } = req.body;
  
  if (!urls || !Array.isArray(urls)) {
    return res.status(400).json({
      success: false,
      message: 'urls 参数必须是数组'
    });
  }
  
  const results = [];
  let completed = 0;
  
  urls.forEach((urlObj, index) => {
    const url = typeof urlObj === 'string' ? urlObj : urlObj.url;
    const filename = urlObj.filename || `wechat-batch-${Date.now()}-${index}.html`;
    
    setTimeout(() => {
      const reqObj = {
        body: {
          url,
          filename,
          saveDir,
          userAgent: 'random',
          waitTime: 8000 + Math.random() * 7000  // 随机等待时间
        }
      };
      
      const resObj = {
        status: (code) => ({ json: (data) => {
          results.push({
            index,
            url,
            filename,
            success: data.success,
            message: data.message,
            fileSize: data.fileSize
          });
          completed++;
          
          if (completed === urls.length) {
            res.status(200).json({
              success: true,
              message: `批量下载完成，成功 ${results.filter(r => r.success).length} 个，失败 ${results.filter(r => !r.success).length} 个`,
              total: urls.length,
              results: results.sort((a, b) => a.index - b.index)
            });
          }
        }})
      };
      
      // 调用下载接口
      app.post('/download', reqObj, resObj);
    }, index * 3000);  // 间隔3秒，避免请求过快
  });
});

// 启动服务
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`SingleFile WeChat API 服务已启动`);
  console.log(`端口：${PORT}`);
  console.log(`默认保存目录：${DEFAULT_SAVE_DIR}`);
  console.log(`Chromium 路径：${CHROMIUM_PATH}`);
  console.log(`User-Agent 数量：${WECHAT_USER_AGENTS.length}`);
  console.log(`=========================================`);
  console.log(`重要提示：`);
  console.log(`1. 微信公众号有反爬虫机制，建议使用 /download/wechat 专用接口`);
  console.log(`2. 如遇拦截，可尝试增加 waitTime 参数`);
  console.log(`3. 批量下载请使用 /download/batch 接口`);
  console.log(`=========================================`);
});
