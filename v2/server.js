const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');

const app = express();
app.use(express.json());

// 定义默认保存目录
const DEFAULT_SAVE_DIR = process.env.SAVE_DIR || '/downloads';
const CHROMIUM_PATH = process.env.CHROMIUM_PATH || '/usr/bin/chromium';

// 确保保存目录存在
fs.mkdirSync(DEFAULT_SAVE_DIR, { recursive: true });

console.log(`SingleFile API 服务启动中...`);
console.log(`Chromium 路径: ${CHROMIUM_PATH}`);
console.log(`保存目录: ${DEFAULT_SAVE_DIR}`);

/**
 * 执行 single-file 命令的 Promise 封装
 */
function executeSingleFile(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('single-file', args, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`命令执行失败，退出码: ${code}\n${stderr}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * 接口：POST /download
 */
app.post('/download', async (req, res) => {
  try {
    const { 
      url, 
      filename,
      waitTime = 10000,
      removeElements
    } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL 参数不能为空'
      });
    }

    console.log(`开始下载: ${url}`);

    // 构建保存路径
    const timestamp = Date.now();
    const urlHash = Buffer.from(url).toString('base64').substring(0, 20).replace(/[^a-zA-Z0-9]/g, '');
    const savePath = filename
      ? path.join(DEFAULT_SAVE_DIR, filename)
      : path.join(DEFAULT_SAVE_DIR, `singlefile-${timestamp}-${urlHash}.html`);

    // 微信文章特定的 User-Agent
    const userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

    // 构建 single-file 命令参数
    const args = [
      '--browser-executable-path', CHROMIUM_PATH,
      '--browser-headless',
      'true',
      '--browser-wait',
      waitTime.toString(),
      '--browser-load-max-time',
      '60000',
      '--browser-arg',
      '--no-sandbox',
      '--browser-arg',
      '--disable-dev-shm-usage',
      '--browser-arg',
      '--disable-gpu',
      '--browser-arg',
      '--disable-setuid-sandbox',
      '--browser-arg',
      '--disable-web-security',
      '--browser-arg',
      '--disable-features=site-per-process',
      '--browser-arg',
      '--disable-blink-features=AutomationControlled',
      '--user-agent',
      userAgent,
      '--header',
      'Referer: https://mp.weixin.qq.com/',
      '--header',
      'Accept-Language: zh-CN,zh;q=0.9,en;q=0.8',
      '--header',
      'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      '--browser-window-size',
      '375,812', // iPhone 12 尺寸，模拟移动端
      //'--dump-content',
      '--browser-inject-css',
      // ========== 新增懒加载处理 ==========
      '--browser-scroll', 'true',
      '--browser-scroll-wait', '500',
      '--browser-delay', '3000',
      'body { background-color: white !important; }',
    ];

    // 添加移除元素的参数（如果提供）
    if (removeElements) {
      args.push('--remove-elements');
      args.push(removeElements);
    }

    // 添加 URL 和输出路径
    args.push(url);
    args.push(savePath);

    console.log('执行命令参数:', args.join(' '));

    // 执行 single-file 命令
    await executeSingleFile(args);

    // 验证文件是否生成
    if (!fs.existsSync(savePath)) {
      throw new Error('命令执行成功，但未生成文件');
    }

    const stats = fs.statSync(savePath);
    
    // 如果是微信公众号文章，添加一些美化
    if (url.includes('mp.weixin.qq.com')) {
      const content = fs.readFileSync(savePath, 'utf8');
      // 添加一些样式优化
      const optimizedContent = content.replace(
        '</head>',
        `<style>
          /* 微信公众号文章优化 */
          .rich_media_content { max-width: 100% !important; }
          img { max-width: 100% !important; height: auto !important; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif; }
        </style>
        </head>`
      );
      fs.writeFileSync(savePath, optimizedContent);
    }

    res.status(200).json({
      success: true,
      message: '网页下载成功',
      data: {
        url,
        savePath,
        filename: path.basename(savePath),
        fileSize: stats.size,
        fileSizeFormatted: `${(stats.size / 1024).toFixed(2)} KB`,
        downloadTime: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error(`下载失败: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: `下载失败: ${error.message}`,
      error: error.message
    });
  }
});

/**
 * 下载微信公众号文章专用接口
 */
app.post('/download/wechat', async (req, res) => {
  try {
    const { url, filename } = req.body;
    
    if (!url || !url.includes('mp.weixin.qq.com')) {
      return res.status(400).json({
        success: false,
        message: '必须是微信公众号文章链接'
      });
    }

    // 设置微信特定的参数
    req.body.waitTime = 15000; // 微信文章需要更长的等待时间
    req.body.removeElements = '.weui_loading, .weui_btn_primary, button, .qr_code_pc, .footer, .ad'; // 移除不必要的元素
    
    // 调用通用下载接口
    return app._router.handle(req, res, () => {});
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `微信文章下载失败: ${error.message}`
    });
  }
});

/**
 * 文件列表接口
 */
app.get('/files', (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    if (!fs.existsSync(DEFAULT_SAVE_DIR)) {
      return res.status(200).json({
        success: true,
        files: [],
        count: 0
      });
    }

    const files = fs.readdirSync(DEFAULT_SAVE_DIR)
      .filter(file => file.endsWith('.html'))
      .map(file => {
        const filePath = path.join(DEFAULT_SAVE_DIR, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: filePath,
          size: stats.size,
          sizeFormatted: `${(stats.size / 1024).toFixed(2)} KB`,
          created: stats.birthtime,
          modified: stats.mtime,
          url: `http://${req.headers.host}/files/${file}`
        };
      })
      .sort((a, b) => b.created - a.created)
      .slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.status(200).json({
      success: true,
      files,
      count: files.length,
      total: fs.readdirSync(DEFAULT_SAVE_DIR).filter(file => file.endsWith('.html')).length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `获取文件列表失败: ${error.message}`
    });
  }
});

/**
 * 查看文件内容接口
 */
app.get('/files/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(DEFAULT_SAVE_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: '文件不存在'
      });
    }

    // 如果是 HTML 文件，直接返回内容
    if (filename.endsWith('.html')) {
      const content = fs.readFileSync(filePath, 'utf8');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(content);
    }

    // 其他文件类型
    res.download(filePath);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `读取文件失败: ${error.message}`
    });
  }
});

/**
 * 删除文件接口
 */
app.delete('/files/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(DEFAULT_SAVE_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: '文件不存在'
      });
    }

    fs.unlinkSync(filePath);
    
    res.status(200).json({
      success: true,
      message: '文件删除成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `删除文件失败: ${error.message}`
    });
  }
});

/**
 * 健康检查接口
 */
app.get('/health', (req, res) => {
  const chromiumExists = fs.existsSync(CHROMIUM_PATH);
  
  res.status(200).json({
    status: 'ok',
    service: 'singlefile-api',
    version: '1.1.54',
    nodeVersion: process.version,
    chromium: {
      path: CHROMIUM_PATH,
      exists: chromiumExists,
      executable: chromiumExists
    },
    disk: {
      downloadsDir: DEFAULT_SAVE_DIR,
      exists: fs.existsSync(DEFAULT_SAVE_DIR),
      writable: true
    },
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * 首页
 */
app.get('/', (req, res) => {
  res.json({
    service: 'SingleFile API',
    version: '1.1.54',
    description: '用于下载网页为HTML文件的API服务，特别优化微信公众号文章下载',
    endpoints: {
      'POST /download': '通用网页下载',
      'POST /download/wechat': '微信公众号文章下载',
      'GET /files': '查看已下载文件列表',
      'GET /files/:filename': '查看或下载文件',
      'DELETE /files/:filename': '删除文件',
      'GET /health': '健康检查'
    },
    usage: {
      download: 'POST /download { "url": "https://example.com" }',
      wechat: 'POST /download/wechat { "url": "https://mp.weixin.qq.com/s/..." }'
    }
  });
});

// 启动服务
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SingleFile API 服务已启动，端口：${PORT}`);
  console.log(`服务地址：http://localhost:${PORT}`);
  console.log(`下载目录：${DEFAULT_SAVE_DIR}`);
});
