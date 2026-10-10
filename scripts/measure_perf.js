const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 8089;
const CHROME_PORT = 9223;
const ROOT_DIR = path.resolve(__dirname, '..');

// 1. Static file server
function startServer() {
  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
    const filePath = path.join(ROOT_DIR, reqPath);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    const types = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.jpg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.json': 'application/json'
    };
    const size = fs.statSync(filePath).size;
    res.writeHead(200, {
      'Content-Type': types[ext] || 'application/octet-stream',
      'Content-Length': size
    });
    fs.createReadStream(filePath).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(PORT, () => resolve(server));
  });
}

// 2. Launch headless Chrome and run measurements via CDP
async function runPerf() {
  const server = await startServer();
  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const chromeProcess = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${CHROME_PORT}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=/tmp/chrome-perf-profile-' + Date.now(),
    'about:blank'
  ]);

  // Wait for Chrome CDP port to be ready
  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 100));
    try {
      const res = await fetch(`http://127.0.0.1:${CHROME_PORT}/json/new?http://localhost:${PORT}/index.html`, { method: 'PUT' });
      const data = await res.json();
      if (data && data.webSocketDebuggerUrl) {
        wsUrl = data.webSocketDebuggerUrl;
        break;
      }
    } catch (e) {}
  }

  if (!wsUrl) {
    console.error('Failed to connect to Chrome CDP');
    chromeProcess.kill();
    server.close();
    process.exit(1);
  }

  const ws = new WebSocket(wsUrl);
  let id = 1;
  const pending = new Map();

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  await new Promise(resolve => ws.onopen = resolve);

  let networkRequests = 0;
  let totalTransferBytes = 0;
  const requestsByType = {};

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve } = pending.get(msg.id);
      pending.delete(msg.id);
      resolve(msg.result);
    } else if (msg.method === 'Network.responseReceived') {
      networkRequests++;
      const type = msg.params.type || 'Other';
      requestsByType[type] = (requestsByType[type] || 0) + 1;
    } else if (msg.method === 'Network.loadingFinished') {
      totalTransferBytes += (msg.params.encodedDataLength || 0);
    }
  };

  await send('Page.enable');
  await send('Network.enable');
  await send('Performance.enable');

  // Navigate to index
  await send('Page.navigate', { url: `http://localhost:${PORT}/index.html` });

  // Wait for loadEventFired
  await new Promise(r => setTimeout(r, 2000));

  // Get Performance metrics
  const perfMetrics = await send('Performance.getMetrics');
  const metricsMap = {};
  perfMetrics.metrics.forEach(m => {
    metricsMap[m.name] = m.value;
  });

  // Evaluate in-page Core Web Vitals and DOM metrics
  const evalResult = await send('Runtime.evaluate', {
    expression: `(() => {
      const nav = performance.getEntriesByType('navigation')[0] || {};
      const paints = performance.getEntriesByType('paint');
      let fcp = 0;
      paints.forEach(p => { if (p.name === 'first-contentful-paint') fcp = p.startTime; });
      
      const domNodes = document.querySelectorAll('*').length;
      const imagesCount = document.images.length;
      const bookRows = document.querySelectorAll('.brow').length;
      
      return {
        domNodes,
        imagesCount,
        bookRows,
        fcp: Math.round(fcp),
        domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
        loadTime: Math.round(nav.loadEventEnd - nav.startTime),
        transferSize: nav.transferSize || 0
      };
    })()`,
    returnByValue: true
  });

  const pageMetrics = evalResult.result.value;

  console.log('\n=========================================');
  console.log('       PERFORMANCE BENCHMARK REPORT       ');
  console.log('=========================================');
  console.log(`DOM Nodes Total:         ${pageMetrics.domNodes}`);
  console.log(`Book Rows:               ${pageMetrics.bookRows}`);
  console.log(`Images on Page:          ${pageMetrics.imagesCount}`);
  console.log(`Network Requests:        ${networkRequests}`);
  console.log(`Requests by Type:        ${JSON.stringify(requestsByType)}`);
  console.log(`Total Bytes Transferred: ${(totalTransferBytes / 1024).toFixed(1)} KB`);
  console.log(`FCP (First Contentful):  ${pageMetrics.fcp} ms`);
  console.log(`DOMContentLoaded:        ${pageMetrics.domContentLoaded} ms`);
  console.log(`Page Load:               ${pageMetrics.loadTime} ms`);
  console.log(`JS Heap Used:            ${((metricsMap.JSHeapUsedSize || 0) / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Layout Count:            ${metricsMap.LayoutCount || 0}`);
  console.log(`Recalc Style Count:      ${metricsMap.RecalcStyleCount || 0}`);
  console.log('=========================================\n');

  ws.close();
  chromeProcess.kill();
  server.close();
}

runPerf().catch(err => {
  console.error(err);
  process.exit(1);
});
