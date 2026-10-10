const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 8091;
const CHROME_PORT = 9225;
const ROOT_DIR = path.resolve(__dirname, '..');

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
    res.writeHead(200, {
      'Content-Type': types[ext] || 'application/octet-stream',
      'Content-Length': fs.statSync(filePath).size
    });
    fs.createReadStream(filePath).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(PORT, () => resolve(server));
  });
}

async function testInteractions() {
  const server = await startServer();
  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const chromeProcess = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${CHROME_PORT}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=/tmp/chrome-test-profile-' + Date.now(),
    'about:blank'
  ]);

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

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve } = pending.get(msg.id);
      pending.delete(msg.id);
      resolve(msg.result);
    }
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url: `http://localhost:${PORT}/index.html` });
  await new Promise(r => setTimeout(r, 1500));

  // Test 1: Verify images loaded without broken images
  const imgCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const pics = document.querySelectorAll('.brow-pic, picture');
      const firstImg = document.querySelector('.brow img');
      return {
        totalPictures: pics.length,
        firstImgSrc: firstImg ? firstImg.currentSrc || firstImg.src : null,
        naturalWidth: firstImg ? firstImg.naturalWidth : 0
      };
    })()`,
    returnByValue: true
  });
  console.log('✓ Image check:', imgCheck.result.value);

  // Test 2: Search for "马蒂·卡根"
  const searchTest1 = await send('Runtime.evaluate', {
    expression: `(() => {
      const input = document.getElementById('bookSearch');
      input.value = '马蒂·卡根';
      input.dispatchEvent(new Event('input'));
      return new Promise(r => setTimeout(() => {
        const visible = Array.from(document.querySelectorAll('.brow')).filter(b => b.style.display !== 'none');
        r({ visibleCount: visible.length, firstTitle: visible[0] ? visible[0].querySelector('h3').textContent : null });
      }, 100));
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('✓ Search "马蒂·卡根" check:', searchTest1.result.value);

  // Test 3: Search for domain "建筑学"
  const searchTest2 = await send('Runtime.evaluate', {
    expression: `(() => {
      const input = document.getElementById('bookSearch');
      input.value = '建筑学';
      input.dispatchEvent(new Event('input'));
      return new Promise(r => setTimeout(() => {
        const visible = Array.from(document.querySelectorAll('.brow')).filter(b => b.style.display !== 'none');
        r({ visibleCount: visible.length });
      }, 100));
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('✓ Search "建筑学" check:', searchTest2.result.value);

  // Clear search
  await send('Runtime.evaluate', {
    expression: `(() => {
      const clearBtn = document.getElementById('searchClear');
      clearBtn.click();
    })()`
  });

  // Test 4: Sticky Nav Click Scroll to dom-8 (Curator 5-star picks)
  const navScrollTest = await send('Runtime.evaluate', {
    expression: `(() => {
      const link8 = document.querySelector('.dnav a[data-target="dom-8"]');
      link8.click();
      return new Promise(r => {
        setTimeout(() => {
          const dom8 = document.getElementById('dom-8');
          const rect = dom8.getBoundingClientRect();
          const activeNav = document.querySelector('.dnav a.active');
          r({
            scrollY: Math.round(window.scrollY),
            dom8Top: Math.round(rect.top),
            activeNavTarget: activeNav ? activeNav.getAttribute('data-target') : null
          });
        }, 2500);
      });
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('✓ Sticky Nav Click Scroll to dom-8:', navScrollTest.result.value);

  // Test 5: Sidebar Toggle
  const sidebarTest = await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.getElementById('sidebarToggleBtn');
      btn.click();
      const isOpen = document.body.classList.contains('sidebar-open');
      const closeBtn = document.getElementById('sidebarCloseBtn');
      closeBtn.click();
      const isClosed = !document.body.classList.contains('sidebar-open');
      return { opened: isOpen, closed: isClosed };
    })()`,
    returnByValue: true
  });
  console.log('✓ Sidebar Toggle check:', sidebarTest.result.value);

  ws.close();
  chromeProcess.kill();
  server.close();
}

testInteractions().catch(err => {
  console.error(err);
  process.exit(1);
});
