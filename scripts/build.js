const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');

const site = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'site.json'), 'utf-8'));
const books = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'books.json'), 'utf-8'));
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf-8'));
const mindmapsPath = path.join(DATA_DIR, 'mindmaps.json');
const mindmaps = fs.existsSync(mindmapsPath) ? JSON.parse(fs.readFileSync(mindmapsPath, 'utf-8')) : {};
const { Transformer } = require('markmap-lib');
const transformer = new Transformer();
const crypto = require('crypto');
const cssContent = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf-8');
const cssHash = crypto.createHash('md5').update(cssContent).digest('hex').slice(0, 8);
const cssHref = `style.css?v=${cssHash}`;

function getStars(ratingStr) {
  const r = parseFloat(ratingStr) || 0;
  const stars5 = r / 2; // out of 5
  const full = Math.floor(stars5);
  const half = (stars5 - full) >= 0.3 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '★' : '') + '☆'.repeat(empty);
}

function formatRatingCount(count) {
  if (!count) return '';
  const num = String(count).replace(/[^0-9]/g, '');
  if (!num) return String(count);
  return Number(num).toLocaleString() + ' 人评价';
}

function formatRatingCountShort(count) {
  if (!count) return '';
  const num = String(count).replace(/[^0-9]/g, '');
  if (!num) return String(count);
  return Number(num).toLocaleString() + '人评价';
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getCoverPicture(coverPath, title, isAboveFold, isDetail = false) {
  const baseName = path.basename(coverPath, path.extname(coverPath));
  const subDir = isDetail ? 'detail' : 'thumbs';
  const width = isDetail ? 138 : 68;
  const height = isDetail ? 200 : 98;
  const webpPath = `covers/${subDir}/${baseName}.webp`;
  const imgAttrs = isAboveFold
    ? 'fetchpriority="high" decoding="async"'
    : 'loading="lazy" decoding="async"';
  const classAttr = isDetail ? ' class="detail-cover"' : '';

  return `<picture><source srcset="${webpPath}" type="image/webp"><img${classAttr} src="${coverPath}" alt="${escapeHtml(title)}封面" ${imgAttrs} width="${width}" height="${height}"></picture>`;
}

// Sidebar HTML generator
function generateSidebarGroupsHtml() {
  return site.domains.map(dom => {
    const domainBooks = books.filter(b => b.domain === dom.name);
    const listHtml = domainBooks.map(b => {
      const padId = String(b.id).padStart(2, '0');
      return `
        <li>
          <a href="${b.slug}.html" class="sidebar-link" data-id="${b.id}" data-title="${escapeHtml(b.title)}" data-author="${escapeHtml(b.author)}">
            <span class="sb-num tabular">${padId}</span>
            <span class="sb-title">${escapeHtml(b.title)}</span>
            <span class="sb-score tabular">${b.rating}</span>
          </a>
        </li>
      `.trim();
    }).join('\n');

    return `
      <div class="sidebar-group" data-domain="${escapeHtml(dom.name)}">
        <div class="sidebar-group-title">
          <span>${escapeHtml(dom.name)}</span>
          <span class="sidebar-badge">${domainBooks.length}</span>
        </div>
        <ul class="sidebar-list">
          ${listHtml}
        </ul>
      </div>
    `.trim();
  }).join('\n');
}

// Global Sidebar Component
function renderSidebar(currentBookId = null, isDetail = false) {
  // Detail pages lazy load the 232-book list from sidebar-nav.html
  // This reduces each detail page HTML from ~104KB to ~14KB (86% reduction)
  const navContent = isDetail ? '' : generateSidebarGroupsHtml();
  const dataAttr = currentBookId ? ` data-current-id="${currentBookId}"` : '';

  return `
  <div class="sidebar-backdrop" id="sidebarBackdrop"></div>
  <aside class="global-sidebar" id="globalSidebar" aria-label="全书目录导航">
    <div class="sidebar-header">
      <a class="sidebar-brand" href="index.html">
        <span class="sidebar-brand-title">${escapeHtml(site.brand)}</span>
        <span class="sidebar-brand-sub">${site.domains.length} 大领域 · ${books.length} 本精选 · 经典书导读</span>
      </a>
      <button type="button" class="sidebar-close-btn" id="sidebarCloseBtn" aria-label="关闭目录">×</button>
    </div>

    <div class="sidebar-search">
      <div class="sidebar-search-wrap">
        <svg viewBox="0 0 24 24" class="sb-search-icon"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="search" id="sidebarSearchInput" placeholder="快速检索 ${books.length} 本书..." autocomplete="off">
        <button type="button" id="sidebarSearchClear" class="sb-search-clear" aria-label="清除">×</button>
      </div>
      <div class="sidebar-search-empty" id="sidebarSearchEmpty">无匹配图书</div>
    </div>

    <nav class="sidebar-nav" id="sidebarNav"${dataAttr}>
      ${navContent}
    </nav>

    <div class="sidebar-footer">
      <a href="index.html" class="sidebar-catalog-link">
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        <span>全部书单首页</span>
      </a>
      <span class="sidebar-kbd-hint"><kbd>M</kbd> 切换</span>
    </div>
  </aside>
  `.trim();
}

// Client-side JS snippet for Sidebar logic
const sidebarScript = `
  <script>
    (function() {
      // Sidebar drawer & lazy hydration controls
      var sidebar = document.getElementById('globalSidebar');
      var backdrop = document.getElementById('sidebarBackdrop');
      var toggleBtn = document.getElementById('sidebarToggleBtn');
      var floatBtn = document.getElementById('floatingMenuBtn');
      var closeBtn = document.getElementById('sidebarCloseBtn');
      var searchInput = document.getElementById('sidebarSearchInput');
      var searchClear = document.getElementById('sidebarSearchClear');
      var searchEmpty = document.getElementById('sidebarSearchEmpty');
      var sidebarNav = document.getElementById('sidebarNav');

      var isHydrated = sidebarNav && sidebarNav.children.length > 0;
      var isHydrating = false;
      var currentBookId = sidebarNav ? sidebarNav.getAttribute('data-current-id') : null;

      function highlightActive() {
        if (!sidebarNav || !currentBookId) return;
        var active = sidebarNav.querySelector('.sidebar-link[data-id="' + currentBookId + '"]');
        if (active) {
          active.classList.add('active');
          active.setAttribute('aria-current', 'page');
        }
      }

      function hydrateSidebar(cb) {
        if (isHydrated) {
          if (cb) cb();
          return;
        }
        if (sidebarNav && sidebarNav.children.length > 0) {
          isHydrated = true;
          highlightActive();
          if (cb) cb();
          return;
        }
        if (isHydrating) return;
        isHydrating = true;

        fetch('sidebar-nav.html')
          .then(function(res) { return res.text(); })
          .then(function(html) {
            if (sidebarNav) {
              sidebarNav.innerHTML = html;
              isHydrated = true;
              isHydrating = false;
              highlightActive();
            }
            if (cb) cb();
          })
          .catch(function(err) {
            isHydrating = false;
          });
      }

      // Preload sidebar during idle time
      if (!isHydrated) {
        if ('requestIdleCallback' in window) {
          requestIdleCallback(function() { hydrateSidebar(); }, { timeout: 2000 });
        } else {
          setTimeout(function() { hydrateSidebar(); }, 1200);
        }
      }

      function openSidebar() {
        document.body.classList.add('sidebar-open');
        hydrateSidebar(function() {
          var activeLink = document.querySelector('.sidebar-link.active');
          if (activeLink) {
            activeLink.scrollIntoView({ block: 'center', behavior: 'smooth' });
          }
        });
      }

      function closeSidebar() {
        document.body.classList.remove('sidebar-open');
      }

      function toggleSidebar() {
        if (document.body.classList.contains('sidebar-open')) {
          closeSidebar();
        } else {
          openSidebar();
        }
      }

      if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleSidebar);
        toggleBtn.addEventListener('mouseenter', function() { hydrateSidebar(); }, { passive: true });
      }
      if (floatBtn) {
        floatBtn.addEventListener('click', toggleSidebar);
        floatBtn.addEventListener('mouseenter', function() { hydrateSidebar(); }, { passive: true });
      }
      if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
      if (backdrop) backdrop.addEventListener('click', closeSidebar);

      // Keyboard shortcuts
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          closeSidebar();
        }
        if ((e.key === 'm' || e.key === 'M') && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
          toggleSidebar();
        }
      });

      // Quick search within sidebar
      if (searchInput) {
        searchInput.addEventListener('input', function() {
          var q = (this.value || '').trim().toLowerCase();
          if (searchClear) searchClear.style.display = q ? 'block' : 'none';
          var matchCount = 0;
          var groups = Array.from(sidebarNav ? sidebarNav.querySelectorAll('.sidebar-group') : []);

          groups.forEach(function(group) {
            var groupMatches = 0;
            var items = Array.from(group.querySelectorAll('.sidebar-link'));
            items.forEach(function(item) {
              var title = (item.dataset.title || '').toLowerCase();
              var author = (item.dataset.author || '').toLowerCase();
              var matched = !q || title.includes(q) || author.includes(q);
              item.parentElement.style.display = matched ? 'block' : 'none';
              if (matched) {
                groupMatches++;
                matchCount++;
              }
            });
            group.style.display = (groupMatches > 0 || !q) ? 'block' : 'none';
          });

          if (searchEmpty) {
            searchEmpty.style.display = (matchCount === 0 && q) ? 'block' : 'none';
          }
        });

        if (searchClear) {
          searchClear.addEventListener('click', function() {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input'));
            searchInput.focus();
          });
        }
      }

      // Auto scroll active book into view on page load if already rendered
      var currentActive = document.querySelector('.sidebar-link.active');
      if (currentActive) {
        setTimeout(function() {
          currentActive.scrollIntoView({ block: 'center' });
        }, 120);
      }
    })();
  </script>
`;

// Client-side JS snippet for instant prefetching & silent analytics
const perfAndAnalyticsScript = `
  <script>
    (function() {
      // 1. Instant hover & touch prefetch for near-zero latency page switches
      var prefetched = new Set();
      function prefetch(url) {
        if (!url || prefetched.has(url)) return;
        prefetched.add(url);
        var link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = url;
        document.head.appendChild(link);
      }
      document.addEventListener('mouseover', function(e) {
        var a = e.target.closest('a');
        if (a && a.href && a.origin === location.origin && (a.pathname.endsWith('.html') || a.pathname.includes('/book-'))) {
          prefetch(a.href);
        }
      }, { passive: true });
      document.addEventListener('touchstart', function(e) {
        var a = e.target.closest('a');
        if (a && a.href && a.origin === location.origin && (a.pathname.endsWith('.html') || a.pathname.includes('/book-'))) {
          prefetch(a.href);
        }
      }, { passive: true });

      // 2. Idle deferred analytics loader with graceful error handling (silent on ad-blocker)
      function loadAnalytics() {
        try {
          var s = document.createElement('script');
          s.async = true;
          s.src = 'https://cloud.umami.is/script.js';
          s.setAttribute('data-website-id', 'e01c9f78-4607-4e60-b01c-77c8190b12b4');
          s.onerror = function() {}; // Silently catch ad-blocker rejections
          document.head.appendChild(s);
        } catch (e) {}
      }
      if ('requestIdleCallback' in window) {
        requestIdleCallback(loadAnalytics, { timeout: 3000 });
      } else {
        setTimeout(loadAnalytics, 2000);
      }
    })();
  </script>
`;

function renderNodeToMarkdown(node, depth = 1) {
  let md = '';
  let rawTitle = (node.title || node.name || '').trim();
  // Escape unescaped $ so KaTeX parser in markmap does not mistake code like $(...) for LaTeX math
  const title = rawTitle.replace(/(?<!\\)\$/g, '\\$');
  if (depth === 1) {
    const cleanTitle = title.startsWith('《') && title.endsWith('》') ? title : `《${title}》`;
    md += `# ${cleanTitle} 思维导图\n\n`;
    if (node.theme) md += `> 核心主题：${node.theme.replace(/(?<!\\)\$/g, '\\$')}\n\n`;
  } else if (depth <= 6) {
    md += `${'#'.repeat(depth)} ${title}\n`;
    if (node.desc && depth <= 3) md += `*${node.desc.replace(/(?<!\\)\$/g, '\\$')}*\n\n`;
  } else {
    const indent = '  '.repeat(depth - 7);
    md += `${indent}- ${title}\n`;
  }

  if (node.children && node.children.length > 0) {
    node.children.forEach(c => {
      md += renderNodeToMarkdown(c, depth + 1);
    });
    if (depth <= 4) md += '\n';
  } else if (node.points && node.points.length > 0) {
    node.points.forEach(pt => {
      if (typeof pt === 'string') {
        const indent = '  '.repeat(Math.max(0, depth - 6));
        md += `${indent}- ${pt}\n`;
      } else {
        md += renderNodeToMarkdown(pt, depth + 1);
      }
    });
    md += '\n';
  }
  return md;
}

// Mindmap Generator & Renderer supporting up to 8 levels
function generateMindmapMarkdown(mm, book) {
  if (mm.children) {
    return renderNodeToMarkdown(mm, 1).trim();
  }
  // Backward compatibility
  const cleanTitle = book.title.startsWith('《') && book.title.endsWith('》')
    ? book.title
    : `《${book.title}》`;
  let md = `# ${cleanTitle} 思维导图\n\n`;
  if (mm.theme) md += `> 核心主题：${mm.theme}\n\n`;
  if (mm.branches) {
    mm.branches.forEach((b) => {
      md += `## ${b.name}\n`;
      if (b.desc) md += `*${b.desc}*\n\n`;
      if (b.topics) {
        b.topics.forEach(t => {
          md += `### ${t.title}\n`;
          if (t.desc) md += `${t.desc}\n`;
          if (t.points) {
            t.points.forEach(pt => {
              md += `- ${pt}\n`;
            });
            md += '\n';
          }
        });
      }
    });
  }
  return md.trim();
}

function renderMindmapHtml(mm, book) {
  const mdOutline = generateMindmapMarkdown(mm, book);
  const { root } = transformer.transform(mdOutline);

  return `
    <section class="section-block mindmap-section" id="mindmapSection">
      <div class="mindmap-header">
        <div class="mindmap-header-left">
          <span class="mindmap-badge">树状思维导图</span>
          <h2 class="mindmap-title">全书思维导图 · 知识脉络树</h2>
        </div>
        <div class="mindmap-actions">
          <div class="mm-level-switch">
            <button type="button" class="mm-btn" id="mmBtnLevel1" title="折叠至一级主脉">主干</button>
            <button type="button" class="mm-btn" id="mmBtnLevel2" title="展开至二级分支">分支</button>
            <button type="button" class="mm-btn active" id="mmBtnExpandAll" title="展开全部细节要点">全部</button>
          </div>

          <button type="button" class="mm-btn mm-btn-standalone" id="mmCopyMarkdownBtn" title="复制思维导图大纲为 Markdown 文本">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            <span>复制大纲</span>
          </button>
          <button type="button" class="mm-btn mm-btn-standalone" id="mmFullscreenBtn" title="全屏沉浸式全景模式 (ESC 退出)">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
            <span class="mm-fs-text">全屏</span>
          </button>
        </div>
      </div>

      <div class="mm-viewport-wrapper">
        <div class="mm-viewport" id="mmViewport">
          <svg id="markmapSvg"></svg>
          <div class="mm-toolbar-wrap" id="mmToolbarWrap"></div>
          <div class="mm-canvas-hint">
            <span>💡 拖拽平移 · 滚轮缩放 · 点击分支圆点折叠/展开</span>
          </div>
        </div>
      </div>

      <script type="application/json" id="mmTreeData">${JSON.stringify(root)}</script>
      <textarea id="mmMarkdownSource" style="display:none;" aria-hidden="true">${escapeHtml(mdOutline)}</textarea>
      <div class="mm-toast" id="mmToast" role="status" aria-live="polite">已复制思维导图大纲到剪贴板！</div>
    </section>
  `.trim();
}

const mindmapScript = `
  <script src="vendor/markmap-bundle.js" defer></script>
  <script>
    (function() {
      var mmSection = document.getElementById('mindmapSection');
      if (!mmSection) return;

      var svgEl = document.getElementById('markmapSvg');
      var treeDataEl = document.getElementById('mmTreeData');
      if (!svgEl || !treeDataEl) return;

      function initMarkmap() {
        if (!window.markmap || !window.markmap.Markmap || !window.d3) {
          setTimeout(initMarkmap, 50);
          return;
        }

        var rawData = JSON.parse(treeDataEl.textContent);
        // Minimalist, elegant palette aligned with Douban Green and subtle slate tones
        var palette = ['#007722', '#2f6946', '#334155', '#245a3a', '#475569', '#1e3d29'];
        var colorScale = d3.scaleOrdinal(palette);

        function cloneData(obj) {
          return JSON.parse(JSON.stringify(obj));
        }

        function setFold(n, f) {
          if (n.children && n.children.length) {
            n.payload = Object.assign({}, n.payload, { fold: f ? 1 : 0 });
            n.children.forEach(function(c) { setFold(c, f); });
          }
        }

        // Default initial fold: "全部" (all expanded)
        var currentData = cloneData(rawData);
        setFold(currentData, false);

        var mm = window.markmap.Markmap.create(svgEl, {
          autoFit: true,
          duration: 350,
          color: function(node) {
            return colorScale(node.state.id);
          },
          paddingX: 16,
          spacingHorizontal: 75,
          spacingVertical: 12
        }, currentData);

        // Mount toolbar
        if (window.markmap.Toolbar) {
          var tb = window.markmap.Toolbar.create(mm);
          tb.setBrand(false);
          var tbWrap = document.getElementById('mmToolbarWrap');
          if (tbWrap) tbWrap.appendChild(tb.render());
        }

        // Level Preset Buttons
        var btnL1 = document.getElementById('mmBtnLevel1');
        var btnL2 = document.getElementById('mmBtnLevel2');
        var btnAll = document.getElementById('mmBtnExpandAll');

        function setActiveLevelBtn(activeBtn) {
          [btnL1, btnL2, btnAll].forEach(function(b) {
            if (b) b.classList.remove('active');
          });
          if (activeBtn) activeBtn.classList.add('active');
        }

        if (btnL1) {
          btnL1.addEventListener('click', function() {
            var d = cloneData(rawData);
            if (d.children) {
              d.children.forEach(function(b) { setFold(b, true); });
            }
            mm.setData(d);
            mm.fit();
            setActiveLevelBtn(btnL1);
          });
        }

        if (btnL2) {
          btnL2.addEventListener('click', function() {
            var d = cloneData(rawData);
            if (d.children) {
              d.children.forEach(function(b) {
                b.payload = Object.assign({}, b.payload, { fold: 0 });
                if (b.children) {
                  b.children.forEach(function(t) { setFold(t, true); });
                }
              });
            }
            mm.setData(d);
            mm.fit();
            setActiveLevelBtn(btnL2);
          });
        }

        if (btnAll) {
          btnAll.addEventListener('click', function() {
            var d = cloneData(rawData);
            setFold(d, false);
            mm.setData(d);
            mm.fit();
            setActiveLevelBtn(btnAll);
          });
        }

        // Fullscreen Toggle
        var fsBtn = document.getElementById('mmFullscreenBtn');
        var fsText = fsBtn ? fsBtn.querySelector('.mm-fs-text') : null;

        function toggleFullscreen() {
          var isFs = mmSection.classList.toggle('is-fullscreen');
          if (fsText) fsText.textContent = isFs ? '退出全屏' : '全屏';
          setTimeout(function() {
            mm.fit();
          }, 150);
        }

        if (fsBtn) {
          fsBtn.addEventListener('click', toggleFullscreen);
        }

        document.addEventListener('keydown', function(e) {
          if (e.key === 'Escape' && mmSection.classList.contains('is-fullscreen')) {
            toggleFullscreen();
          }
        });

        // Copy Markdown
        var copyBtn = document.getElementById('mmCopyMarkdownBtn');
        var mdSource = document.getElementById('mmMarkdownSource');
        var toast = document.getElementById('mmToast');

        function showToast(msg) {
          if (!toast) return;
          toast.textContent = msg;
          toast.classList.add('active');
          setTimeout(function() { toast.classList.remove('active'); }, 2200);
        }

        if (copyBtn && mdSource) {
          copyBtn.addEventListener('click', function() {
            var text = mdSource.value;
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(text).then(function() {
                showToast('✓ 已复制思维导图大纲到剪贴板！');
              }).catch(function() {
                fallbackCopy(text);
              });
            } else {
              fallbackCopy(text);
            }
          });
        }

        function fallbackCopy(text) {
          try {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            showToast('✓ 已复制思维导图大纲到剪贴板！');
          } catch (e) {
            showToast('复制失败，请手动选取');
          }
        }
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMarkmap);
      } else {
        initMarkmap();
      }
    })();
  </script>
`;

// Build Search Index (search-index.json) for Cmd+K instant search
function buildSearchIndex() {
  const searchList = books.map(b => ({
    id: b.id,
    slug: b.slug,
    title: b.title,
    author: b.author,
    domain: b.domain,
    rating: b.rating,
    ratingCount: formatRatingCountShort(b.ratingCount),
    cover: b.cover,
    publisher: b.publisher,
    publishYear: b.publishYear,
    intro: b.intro,
    originalTitle: b.originalTitle || ''
  }));
  fs.writeFileSync(path.join(ROOT_DIR, 'search-index.json'), JSON.stringify(searchList), 'utf-8');
  console.log('✓ Generated search-index.json');
}

// Global Cmd+K Dialog Modal HTML Template
function renderCmdkModalHtml() {
  const domainPillsHtml = site.domains.map(dom => {
    const label = dom.name.replace('主理人', '').replace('精选', '选');
    return `<button type="button" class="cmdk-pill" data-filter-type="domain" data-filter-val="${escapeHtml(dom.name)}">${escapeHtml(label)}</button>`;
  }).join('');

  return `
  <div class="cmdk-backdrop" id="cmdkBackdrop" aria-hidden="true">
    <div class="cmdk-dialog" id="cmdkDialog" role="dialog" aria-modal="true" aria-label="全书搜索与快速标记">
      <div class="cmdk-head">
        <div class="cmdk-input-wrap">
          <svg class="cmdk-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="search" class="cmdk-input" id="cmdkSearchInput" placeholder="搜索书名、作者、分类，或输入“想读 / 已读”..." autocomplete="off" spellcheck="false">
          <button type="button" class="cmdk-input-clear" id="cmdkInputClear" aria-label="清空">×</button>
        </div>
        <button type="button" class="cmdk-close-btn" id="cmdkCloseBtn" aria-label="关闭搜索">ESC</button>
      </div>

      <div class="cmdk-pills-bar" id="cmdkPillsBar">
        <button type="button" class="cmdk-pill active" data-filter-type="status" data-filter-val="all">全部</button>
        <button type="button" class="cmdk-pill pill-want" data-filter-type="status" data-filter-val="want">★ 想读 <span class="cmdk-pill-cnt" id="cmdkCountWant">0</span></button>
        <button type="button" class="cmdk-pill pill-read" data-filter-type="status" data-filter-val="read">✓ 已读 <span class="cmdk-pill-cnt" id="cmdkCountRead">0</span></button>
        <span class="cmdk-pill-sep"></span>
        ${domainPillsHtml}
      </div>

      <div class="cmdk-body" id="cmdkBody">
        <ul class="cmdk-results" id="cmdkResults" role="listbox"></ul>
        <div class="cmdk-empty" id="cmdkEmpty" style="display:none;">
          <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" stroke-width="1.5" fill="none"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <p class="cmdk-empty-text">未找到相关图书</p>
          <p class="cmdk-empty-sub">可尝试书名关键词、作者姓名或点击上方分类切换</p>
        </div>
      </div>

      <div class="cmdk-foot">
        <div class="cmdk-foot-hints">
          <span class="cmdk-hint"><kbd>↑</kbd><kbd>↓</kbd> 选择</span>
          <span class="cmdk-hint"><kbd>↵</kbd> 打开</span>
          <span class="cmdk-hint"><kbd>ESC</kbd> 退出</span>
        </div>
        <div class="cmdk-foot-stats" id="cmdkFootStats">共 ${books.length} 本经典书</div>
      </div>
    </div>
  </div>
  `.trim();
}

// Client-side script for User Book Store & Cmd+K Controller
const cmdkAndStoreScript = `
  <script>
    (function() {
      // 1. User Reading Status LocalStorage Management
      var STORAGE_KEY = 'classic_books_user_status';

      function getStatusMap() {
        try {
          var raw = localStorage.getItem(STORAGE_KEY);
          return raw ? JSON.parse(raw) : {};
        } catch (e) {
          return {};
        }
      }

      function setStatusMap(map) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
        } catch (e) {}
        broadcastStatus(map);
      }

      function getUserStatus(bookId) {
        var map = getStatusMap();
        return map[String(bookId)] || null;
      }

      function toggleUserStatus(bookId, targetStatus) {
        var map = getStatusMap();
        var idStr = String(bookId);
        var cur = map[idStr] || null;
        var newStatus = null;
        if (cur === targetStatus) {
          delete map[idStr];
          newStatus = null;
        } else {
          map[idStr] = targetStatus;
          newStatus = targetStatus;
        }
        setStatusMap(map);
        return newStatus;
      }

      function getStatusCounts() {
        var map = getStatusMap();
        var want = 0, read = 0;
        Object.keys(map).forEach(function(k) {
          if (map[k] === 'want') want++;
          else if (map[k] === 'read') read++;
        });
        return { want: want, read: read, total: want + read };
      }

      function broadcastStatus(map) {
        window.dispatchEvent(new CustomEvent('book-status-changed', { detail: map }));
      }

      window.addEventListener('storage', function(e) {
        if (e.key === STORAGE_KEY) {
          broadcastStatus(getStatusMap());
        }
      });

      // Toast Notification Component
      var toastTimer = null;
      function showToast(msg) {
        var toast = document.getElementById('statusToast');
        if (!toast) {
          toast = document.createElement('div');
          toast.id = 'statusToast';
          toast.className = 'status-toast';
          document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.classList.add('visible');
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(function() {
          toast.classList.remove('visible');
        }, 2200);
      }

      // 2. Search Index Loader (Lazy + Idle Preload)
      var searchIndex = null;
      var isIndexLoading = false;
      var indexCallbacks = [];

      function loadSearchIndex(cb) {
        if (searchIndex) {
          if (cb) cb(searchIndex);
          return;
        }
        if (cb) indexCallbacks.push(cb);
        if (isIndexLoading) return;
        isIndexLoading = true;

        fetch('search-index.json')
          .then(function(res) { return res.json(); })
          .then(function(data) {
            searchIndex = data;
            isIndexLoading = false;
            while (indexCallbacks.length) {
              var fn = indexCallbacks.shift();
              try { fn(searchIndex); } catch (e) {}
            }
          })
          .catch(function(err) {
            isIndexLoading = false;
          });
      }

      if ('requestIdleCallback' in window) {
        requestIdleCallback(function() { loadSearchIndex(); }, { timeout: 3000 });
      } else {
        setTimeout(function() { loadSearchIndex(); }, 2000);
      }

      // 3. Cmd+K Dialog Controller
      var backdrop = document.getElementById('cmdkBackdrop');
      var input = document.getElementById('cmdkSearchInput');
      var clearBtn = document.getElementById('cmdkInputClear');
      var closeBtn = document.getElementById('cmdkCloseBtn');
      var pillsBar = document.getElementById('cmdkPillsBar');
      var resultsList = document.getElementById('cmdkResults');
      var emptyEl = document.getElementById('cmdkEmpty');
      var footStats = document.getElementById('cmdkFootStats');
      var triggerBtn = document.getElementById('cmdkTriggerBtn');

      var currentStatusFilter = 'all';
      var currentDomainFilter = 'all';
      var selectedIndex = 0;
      var renderedItems = [];

      function updatePillCounts() {
        var counts = getStatusCounts();
        var cntWant = document.getElementById('cmdkCountWant');
        var cntRead = document.getElementById('cmdkCountRead');
        if (cntWant) cntWant.textContent = counts.want;
        if (cntRead) cntRead.textContent = counts.read;
      }

      function openCmdk() {
        if (!backdrop) return;
        backdrop.classList.add('is-open');
        document.body.classList.add('cmdk-modal-open');
        updatePillCounts();
        loadSearchIndex(function() {
          renderResults();
        });
        if (input) {
          input.focus();
          input.select();
        }
      }

      function closeCmdk() {
        if (!backdrop) return;
        backdrop.classList.remove('is-open');
        document.body.classList.remove('cmdk-modal-open');
      }

      function toggleCmdk() {
        if (backdrop && backdrop.classList.contains('is-open')) {
          closeCmdk();
        } else {
          openCmdk();
        }
      }

      // Global Keyboard shortcuts
      document.addEventListener('keydown', function(e) {
        if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
          e.preventDefault();
          toggleCmdk();
          return;
        }
        if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
          e.preventDefault();
          openCmdk();
          return;
        }
        if (e.key === 'Escape' && backdrop && backdrop.classList.contains('is-open')) {
          e.preventDefault();
          closeCmdk();
          return;
        }
        if (backdrop && backdrop.classList.contains('is-open')) {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            navigateResults(1);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            navigateResults(-1);
          } else if (e.key === 'Enter') {
            e.preventDefault();
            openSelectedResult();
          }
        }
      });

      if (triggerBtn) {
        triggerBtn.addEventListener('click', openCmdk);
      }
      if (closeBtn) {
        closeBtn.addEventListener('click', closeCmdk);
      }
      if (backdrop) {
        backdrop.addEventListener('click', function(e) {
          if (e.target === backdrop) closeCmdk();
        });
      }
      if (clearBtn) {
        clearBtn.addEventListener('click', function() {
          if (input) {
            input.value = '';
            input.focus();
            clearBtn.style.display = 'none';
            selectedIndex = 0;
            renderResults();
          }
        });
      }

      if (pillsBar) {
        pillsBar.addEventListener('click', function(e) {
          var pill = e.target.closest('.cmdk-pill');
          if (!pill) return;
          var fType = pill.getAttribute('data-filter-type');
          var fVal = pill.getAttribute('data-filter-val');

          if (fType === 'status') {
            currentStatusFilter = fVal;
            pillsBar.querySelectorAll('.cmdk-pill[data-filter-type="status"]').forEach(function(p) {
              p.classList.toggle('active', p === pill);
            });
          } else if (fType === 'domain') {
            if (currentDomainFilter === fVal) {
              currentDomainFilter = 'all';
              pill.classList.remove('active');
            } else {
              currentDomainFilter = fVal;
              pillsBar.querySelectorAll('.cmdk-pill[data-filter-type="domain"]').forEach(function(p) {
                p.classList.toggle('active', p === pill);
              });
            }
          }
          selectedIndex = 0;
          renderResults();
        });
      }

      if (input) {
        input.addEventListener('input', function() {
          if (clearBtn) clearBtn.style.display = input.value ? 'flex' : 'none';
          selectedIndex = 0;
          renderResults();
        });
      }

      function escapeRegex(str) {
        return str.replace(/[.*+?^$\\{}()|[\\]\\\\]/g, '\\\\$&');
      }

      function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      }

      function highlightText(text, q) {
        if (!text) return '';
        if (!q) return escapeHtml(text);
        var cleanQ = q.replace(/[《》]/g, '').trim();
        if (!cleanQ) return escapeHtml(text);
        var re = new RegExp('(' + escapeRegex(cleanQ) + ')', 'gi');
        return escapeHtml(text).replace(re, '<mark class="cmdk-highlight">$1</mark>');
      }

      function renderResults() {
        if (!searchIndex) return;
        var q = (input ? input.value : '').trim().toLowerCase();
        var statusMap = getStatusMap();

        var filtered = searchIndex.filter(function(b) {
          if (currentStatusFilter === 'want' && statusMap[b.id] !== 'want') return false;
          if (currentStatusFilter === 'read' && statusMap[b.id] !== 'read') return false;

          if (currentDomainFilter !== 'all') {
            if (!b.domain.includes(currentDomainFilter) && !currentDomainFilter.includes(b.domain.slice(0, 4))) return false;
          }

          if (!q) return true;

          var titleClean = b.title.replace(/[《》]/g, '').toLowerCase();
          var matchTitle = titleClean.includes(q);
          var matchAuthor = (b.author || '').toLowerCase().includes(q);
          var matchDomain = (b.domain || '').toLowerCase().includes(q);
          var matchIntro = (b.intro || '').toLowerCase().includes(q);
          var matchPub = (b.publisher || '').toLowerCase().includes(q);
          var matchOrig = (b.originalTitle || '').toLowerCase().includes(q);

          var matchKw = false;
          if (q === '想读' || q === '想看') matchKw = (statusMap[b.id] === 'want');
          if (q === '已读' || q === '看过') matchKw = (statusMap[b.id] === 'read');

          return matchTitle || matchAuthor || matchDomain || matchIntro || matchPub || matchOrig || matchKw;
        });

        if (q) {
          var scored = filtered.map(function(b) {
            var score = 0;
            var titleClean = b.title.replace(/[《》]/g, '').toLowerCase();
            if (titleClean === q) score += 200;
            else if (titleClean.startsWith(q)) score += 120;
            else if (titleClean.includes(q)) score += 80;

            if ((b.author || '').toLowerCase().includes(q)) score += 50;
            if ((b.domain || '').toLowerCase().includes(q)) score += 35;
            if ((b.intro || '').toLowerCase().includes(q)) score += 15;
            if ((b.originalTitle || '').toLowerCase().includes(q)) score += 20;

            var r = parseFloat(b.rating) || 0;
            score += r * 2;
            return { b: b, score: score };
          });
          scored.sort(function(a, b) { return b.score - a.score; });
          renderedItems = scored.slice(0, 40).map(function(item) { return item.b; });
        } else {
          renderedItems = filtered.slice(0, 40);
        }

        if (emptyEl) {
          emptyEl.style.display = renderedItems.length === 0 ? 'flex' : 'none';
          var emptyText = emptyEl.querySelector('.cmdk-empty-text');
          if (emptyText) {
            if (currentStatusFilter === 'want' && !q) {
              emptyText.textContent = '您还没有标记「想读」图书';
            } else if (currentStatusFilter === 'read' && !q) {
              emptyText.textContent = '您还没有标记「已读」图书';
            } else {
              emptyText.textContent = '未找到相关图书';
            }
          }
        }

        if (footStats) {
          footStats.textContent = renderedItems.length === 0
            ? '无匹配结果'
            : '显示 ' + renderedItems.length + ' / ' + filtered.length + ' 本书';
        }

        if (!resultsList) return;
        resultsList.innerHTML = '';

        renderedItems.forEach(function(b, idx) {
          var isSel = idx === selectedIndex;
          var userSt = statusMap[b.id] || null;
          var tagHtml = '';
          if (userSt === 'want') tagHtml = '<span class="cmdk-item-tag tag-want">★ 想读</span>';
          else if (userSt === 'read') tagHtml = '<span class="cmdk-item-tag tag-read">✓ 已读</span>';

          var li = document.createElement('li');
          li.className = 'cmdk-item' + (isSel ? ' is-selected' : '');
          li.setAttribute('role', 'option');
          li.setAttribute('aria-selected', isSel ? 'true' : 'false');
          li.setAttribute('data-index', idx);
          li.setAttribute('data-slug', b.slug);
          li.setAttribute('data-id', b.id);

          var coverBase = b.cover.split('/').pop().replace(/\\.[^.]+$/, '');
          var thumbWebp = 'covers/thumbs/' + coverBase + '.webp';

          li.innerHTML = 
            '<a class="cmdk-item-link" href="' + b.slug + '.html">' +
              '<div class="cmdk-item-cover">' +
                '<img src="' + thumbWebp + '" onerror="this.src=\\'' + b.cover + '\\'" alt="' + escapeHtml(b.title) + '" loading="lazy" width="38" height="54">' +
              '</div>' +
              '<div class="cmdk-item-info">' +
                '<div class="cmdk-item-title-row">' +
                  '<span class="cmdk-item-title">' + highlightText(b.title, q) + '</span>' +
                  '<span class="cmdk-item-domain">' + escapeHtml(b.domain) + '</span>' +
                  tagHtml +
                '</div>' +
                '<div class="cmdk-item-meta">' +
                  '<span class="cmdk-item-author">' + highlightText(b.author, q) + '</span>' +
                  '<span class="cmdk-item-sep">/</span>' +
                  '<span class="cmdk-item-rating">★ ' + b.rating + '</span>' +
                  '<span class="cmdk-item-count">(' + escapeHtml(b.ratingCount) + ')</span>' +
                '</div>' +
                '<div class="cmdk-item-intro">' + highlightText(b.intro, q) + '</div>' +
              '</div>' +
            '</a>' +
            '<div class="cmdk-item-actions">' +
              '<button type="button" class="cmdk-act-btn cmdk-act-want' + (userSt === 'want' ? ' active' : '') + '" data-status="want" data-id="' + b.id + '" title="标记为想读">★ 想读</button>' +
              '<button type="button" class="cmdk-act-btn cmdk-act-read' + (userSt === 'read' ? ' active' : '') + '" data-status="read" data-id="' + b.id + '" title="标记为已读">✓ 已读</button>' +
            '</div>';

          resultsList.appendChild(li);
        });
      }

      function navigateResults(dir) {
        if (renderedItems.length === 0) return;
        selectedIndex += dir;
        if (selectedIndex < 0) selectedIndex = renderedItems.length - 1;
        if (selectedIndex >= renderedItems.length) selectedIndex = 0;

        var items = resultsList ? resultsList.querySelectorAll('.cmdk-item') : [];
        items.forEach(function(item, idx) {
          var isSel = idx === selectedIndex;
          item.classList.toggle('is-selected', isSel);
          item.setAttribute('aria-selected', isSel ? 'true' : 'false');
          if (isSel) {
            item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        });
      }

      function openSelectedResult() {
        if (renderedItems.length === 0) return;
        var b = renderedItems[selectedIndex];
        if (b) {
          location.href = b.slug + '.html';
        }
      }

      if (resultsList) {
        resultsList.addEventListener('click', function(e) {
          var actBtn = e.target.closest('.cmdk-act-btn');
          if (actBtn) {
            e.preventDefault();
            e.stopPropagation();
            var bId = actBtn.getAttribute('data-id');
            var targetSt = actBtn.getAttribute('data-status');
            var newSt = toggleUserStatus(bId, targetSt);
            if (newSt === 'want') showToast('已加入「想读」');
            else if (newSt === 'read') showToast('已标记为「已读」');
            else showToast('已取消标记');
            updatePillCounts();
            renderResults();
            return;
          }

          var item = e.target.closest('.cmdk-item');
          if (item && !e.target.closest('.cmdk-item-actions')) {
            var slug = item.getAttribute('data-slug');
            if (slug) location.href = slug + '.html';
          }
        });

        resultsList.addEventListener('mousemove', function(e) {
          var item = e.target.closest('.cmdk-item');
          if (item) {
            var idx = parseInt(item.getAttribute('data-index'), 10);
            if (!isNaN(idx) && idx !== selectedIndex) {
              selectedIndex = idx;
              var all = resultsList.querySelectorAll('.cmdk-item');
              all.forEach(function(el, i) {
                el.classList.toggle('is-selected', i === selectedIndex);
              });
            }
          }
        });
      }

      // 4. Detail Page Shelf Sync Hook
      var detailShelf = document.querySelector('.detail-user-shelf');
      if (detailShelf) {
        var bookId = detailShelf.getAttribute('data-book-id');
        var badgeEl = document.getElementById('detailShelfBadge');
        var wantBtn = detailShelf.querySelector('.btn-want');
        var readBtn = detailShelf.querySelector('.btn-read');

        function syncDetailShelfUI() {
          var st = getUserStatus(bookId);
          if (wantBtn) {
            wantBtn.classList.toggle('active', st === 'want');
            wantBtn.setAttribute('aria-pressed', st === 'want' ? 'true' : 'false');
          }
          if (readBtn) {
            readBtn.classList.toggle('active', st === 'read');
            readBtn.setAttribute('aria-pressed', st === 'read' ? 'true' : 'false');
          }
          if (badgeEl) {
            if (st === 'want') {
              badgeEl.textContent = '★ 已标记想读';
              badgeEl.className = 'shelf-status-badge badge-want';
            } else if (st === 'read') {
              badgeEl.textContent = '✓ 已标记已读';
              badgeEl.className = 'shelf-status-badge badge-read';
            } else {
              badgeEl.textContent = '未标记阅读状态';
              badgeEl.className = 'shelf-status-badge';
            }
          }
        }

        if (wantBtn) {
          wantBtn.addEventListener('click', function() {
            var newSt = toggleUserStatus(bookId, 'want');
            if (newSt === 'want') showToast('已加入「想读」书单');
            else showToast('已取消「想读」标记');
            syncDetailShelfUI();
          });
        }
        if (readBtn) {
          readBtn.addEventListener('click', function() {
            var newSt = toggleUserStatus(bookId, 'read');
            if (newSt === 'read') showToast('已标记为「已读」图书');
            else showToast('已取消「已读」标记');
            syncDetailShelfUI();
          });
        }

        syncDetailShelfUI();
        window.addEventListener('book-status-changed', syncDetailShelfUI);
      }

      window.addEventListener('book-status-changed', updatePillCounts);

      // Expose globally for index page coordination
      window.ClassicUserStore = {
        getStatus: getUserStatus,
        toggleStatus: toggleUserStatus,
        getStatusMap: getStatusMap,
        getCounts: getStatusCounts,
        showToast: showToast,
        openCmdk: openCmdk
      };
    })();
  </script>
`;

// 1. Build Index HTML
function buildIndex() {
  const domainSections = site.domains.map(dom => {
    const domainBooks = books.filter(b => b.domain === dom.name);
    const bookRows = domainBooks.map((b, bIdx) => {
      const stars = getStars(b.rating);
      // Performance optimization: Prioritize LCP images above the fold (first 3 books); lazy-load offscreen images
      const isAboveFold = b.id <= 3;
      const pictureHtml = getCoverPicture(b.cover, b.title, isAboveFold, false);

      return `
        <a class="brow" href="${b.slug}.html" data-id="${b.id}" data-domain="${escapeHtml(b.domain)}">
          <div class="brow-cover-wrap">
            ${pictureHtml}
          </div>
          <div class="brow-body">
            <div class="brow-title-row">
              <h3 class="brow-title"><span class="brow-name">${escapeHtml(b.title)}</span></h3>
              <span class="brow-user-tag" data-tag-id="${b.id}"></span>
            </div>
            <div class="brow-meta">
              <span class="brow-meta-info">${escapeHtml(b.author)} / ${escapeHtml(b.publisher)} / ${escapeHtml(b.publishYear)}</span>
              <span class="brow-meta-sep">·</span>
              <span class="brow-rating-chip">
                <span class="brow-rating-stars">${stars}</span>
                <span class="brow-rating-score tabular">${b.rating}</span>
                <span class="brow-rating-count">(${formatRatingCountShort(b.ratingCount)})</span>
              </span>
            </div>
            <p class="brow-desc">${escapeHtml(b.intro)}</p>
          </div>
          <div class="brow-actions" data-act-id="${b.id}">
            <button type="button" class="brow-act-btn brow-act-want" data-status="want" title="标记为想读" aria-label="想读">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
              <span>想读</span>
            </button>
            <button type="button" class="brow-act-btn brow-act-read" data-status="read" title="标记为已读" aria-label="已读">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span>已读</span>
            </button>
          </div>
        </a>
      `.trim();
    }).join('\n');

    return `
      <section class="domain" id="${dom.id}">
        <div class="domain-header">
          <h2>${escapeHtml(dom.name)}</h2>
          <p class="intro">${escapeHtml(dom.intro)}</p>
        </div>
        <div class="book-list">
          ${bookRows}
        </div>
      </section>
    `.trim();
  }).join('\n');

  const navLinks = site.domains.map((dom, idx) => {
    return `<a href="#${dom.id}" data-target="${dom.id}" class="${idx === 0 ? 'active' : ''}">${escapeHtml(dom.name)}</a>`;
  }).join('');

  const sidebarHtml = renderSidebar(null, false);

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${escapeHtml(site.title)}</title>
  <link rel="stylesheet" href="${cssHref}">
</head>
<body>
  <div class="layout-container">
    ${sidebarHtml}

    <div class="main-wrapper">
      <div class="wrap">
        <header class="sitehead">
          <div class="sitehead-inner">
            <div class="sitehead-left">
              <button type="button" class="sidebar-toggle-btn" id="sidebarToggleBtn" aria-label="切换全书目录" title="打开/收起目录 (快捷键 M)">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                <span>目录</span>
                <span class="kbd-pill"><kbd>M</kbd></span>
              </button>
              <a class="brand" href="index.html">
                ${escapeHtml(site.brand)}
                <small>${escapeHtml(site.brandSub)}</small>
              </a>
            </div>
            <div class="sitehead-right">
              <button type="button" class="cmdk-trigger-btn" id="cmdkTriggerBtn" aria-label="搜索图书" title="全局搜索 (快捷键 ⌘K 或 /)">
                <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <span class="cmdk-trigger-text">搜索全书</span>
                <span class="cmdk-trigger-kbd"><kbd>⌘K</kbd></span>
              </button>
            </div>
          </div>
        </header>

        <div class="hero">
          <h1>${escapeHtml(site.heroTitle)}</h1>
          <p>${escapeHtml(site.heroDesc)}</p>

          <div class="search-box">
            <div class="search-input-wrap">
              <svg class="search-icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input type="search" class="search-input" id="bookSearch" placeholder="搜索书名、作者、出版社或关键词..." autocomplete="off">
              <button type="button" class="search-clear" id="searchClear" aria-label="清除搜索">×</button>
            </div>
            <div class="shelf-filter-bar" id="shelfFilterBar" role="tablist" aria-label="书架状态筛选">
              <button type="button" class="shelf-pill active" data-filter="all" role="tab" aria-selected="true">全部图书 <span class="shelf-count" id="shelfCountAll">${books.length}</span></button>
              <button type="button" class="shelf-pill pill-want" data-filter="want" role="tab" aria-selected="false">★ 想读 <span class="shelf-count" id="shelfCountWant">0</span></button>
              <button type="button" class="shelf-pill pill-read" data-filter="read" role="tab" aria-selected="false">✓ 已读 <span class="shelf-count" id="shelfCountRead">0</span></button>
            </div>
            <div class="search-meta" id="searchMeta">找到 <b id="matchCount">0</b> 本相关图书</div>
          </div>
        </div>
      </div>

      <nav class="dnav" id="stickyNav">
        <div class="dnav-inner">
          ${navLinks}
        </div>
      </nav>

      <main>
        <div class="wrap">
          <div id="domainsContainer">
            ${domainSections}
          </div>

          <div class="search-empty" id="searchEmpty">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <p>未找到匹配的图书，试试其他关键词或作者姓名</p>
          </div>
        </div>
      </main>

      <footer>
        <div class="wrap">
          <p>${escapeHtml(site.footerNote)}</p>
          <p>${escapeHtml(site.footerVerify)} · <a href="https://github.com/holynova/forty-classic-books" target="_blank" rel="noopener">GitHub 仓库</a> · <span class="footer-version">v${escapeHtml(pkg.version)}</span></p>
        </div>
      </footer>

      <button type="button" class="floating-menu-btn" id="floatingMenuBtn" aria-label="打开全部图书目录">
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        <span>目录</span>
      </button>
    </div>
  </div>

  <script>
    (function() {
      const searchInput = document.getElementById('bookSearch');
      const searchClear = document.getElementById('searchClear');
      const searchMeta = document.getElementById('searchMeta');
      const matchCountEl = document.getElementById('matchCount');
      const searchEmpty = document.getElementById('searchEmpty');
      const bookRows = Array.from(document.querySelectorAll('.brow'));
      const domainSections = Array.from(document.querySelectorAll('.domain'));

      // Cache search text for high performance
      const rowSearchText = new WeakMap();
      bookRows.forEach(row => {
        const domain = row.getAttribute('data-domain') || '';
        const text = (domain + ' ' + (row.textContent || '')).toLowerCase();
        rowSearchText.set(row, text);
      });

      var activeShelfFilter = 'all';
      const shelfFilterBar = document.getElementById('shelfFilterBar');

      function syncIndexCardsStatus() {
        if (!window.ClassicUserStore) return;
        var statusMap = window.ClassicUserStore.getStatusMap();
        var counts = window.ClassicUserStore.getCounts();
        var cntAll = document.getElementById('shelfCountAll');
        var cntWant = document.getElementById('shelfCountWant');
        var cntRead = document.getElementById('shelfCountRead');
        if (cntAll) cntAll.textContent = bookRows.length;
        if (cntWant) cntWant.textContent = counts.want;
        if (cntRead) cntRead.textContent = counts.read;

        bookRows.forEach(row => {
          var id = row.getAttribute('data-id');
          var st = statusMap[id] || null;
          var tag = row.querySelector('.brow-user-tag');
          if (tag) {
            if (st === 'want') {
              tag.textContent = '★ 想读';
              tag.className = 'brow-user-tag tag-want';
            } else if (st === 'read') {
              tag.textContent = '✓ 已读';
              tag.className = 'brow-user-tag tag-read';
            } else {
              tag.textContent = '';
              tag.className = 'brow-user-tag';
            }
          }
          var btnWant = row.querySelector('.brow-act-want');
          var btnRead = row.querySelector('.brow-act-read');
          if (btnWant) btnWant.classList.toggle('active', st === 'want');
          if (btnRead) btnRead.classList.toggle('active', st === 'read');
        });
      }

      function doSearch() {
        const query = (searchInput ? searchInput.value : '').trim().toLowerCase();
        const statusMap = window.ClassicUserStore ? window.ClassicUserStore.getStatusMap() : {};

        if (query.length > 0) {
          if (searchClear) searchClear.style.display = 'flex';
          if (searchMeta) searchMeta.style.display = 'block';
        } else {
          if (searchClear) searchClear.style.display = 'none';
          if (searchMeta) searchMeta.style.display = 'none';
        }

        let totalVisible = 0;
        domainSections.forEach(section => {
          const rows = Array.from(section.querySelectorAll('.brow'));
          let sectionVisibleCount = 0;

          rows.forEach(row => {
            const id = row.getAttribute('data-id');
            const st = statusMap[id] || null;

            let passShelf = true;
            if (activeShelfFilter === 'want') passShelf = (st === 'want');
            else if (activeShelfFilter === 'read') passShelf = (st === 'read');

            const text = rowSearchText.get(row) || '';
            const passQuery = !query || text.includes(query);

            const isVisible = passShelf && passQuery;
            row.style.display = isVisible ? 'flex' : 'none';
            if (isVisible) {
              sectionVisibleCount++;
              totalVisible++;
            }
          });

          section.style.display = sectionVisibleCount > 0 ? 'block' : 'none';
        });

        if (matchCountEl) matchCountEl.textContent = totalVisible;
        if (searchEmpty) {
          if (totalVisible === 0) {
            searchEmpty.style.display = 'block';
            if (activeShelfFilter === 'want' && !query) {
              searchEmpty.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg><p>您还没有标记任何「想读」图书。<br><button type="button" class="empty-action-btn" onclick="window.ClassicUserStore && window.ClassicUserStore.openCmdk()">按 ⌘K 全局搜索并标记</button></p>';
            } else if (activeShelfFilter === 'read' && !query) {
              searchEmpty.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg><p>您还没有标记任何「已读」图书。<br><button type="button" class="empty-action-btn" onclick="window.ClassicUserStore && window.ClassicUserStore.openCmdk()">按 ⌘K 全局搜索并标记</button></p>';
            } else {
              searchEmpty.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg><p>未找到匹配的图书，试试其他关键词或作者姓名</p>';
            }
          } else {
            searchEmpty.style.display = 'none';
          }
        }
      }

      if (shelfFilterBar) {
        shelfFilterBar.addEventListener('click', function(e) {
          var pill = e.target.closest('.shelf-pill');
          if (!pill) return;
          activeShelfFilter = pill.getAttribute('data-filter') || 'all';
          shelfFilterBar.querySelectorAll('.shelf-pill').forEach(function(p) {
            p.classList.toggle('active', p === pill);
            p.setAttribute('aria-selected', p === pill ? 'true' : 'false');
          });
          doSearch();
        });
      }

      // Quick card status toggle handler
      document.addEventListener('click', function(e) {
        var btn = e.target.closest('.brow-act-btn');
        if (!btn || !window.ClassicUserStore) return;
        e.preventDefault();
        e.stopPropagation();
        var actionsWrap = btn.closest('.brow-actions');
        var id = actionsWrap ? actionsWrap.getAttribute('data-act-id') : null;
        var targetSt = btn.getAttribute('data-status');
        if (id) {
          var newSt = window.ClassicUserStore.toggleStatus(id, targetSt);
          if (newSt === 'want') window.ClassicUserStore.showToast('已加入「想读」');
          else if (newSt === 'read') window.ClassicUserStore.showToast('已标记为「已读」');
          else window.ClassicUserStore.showToast('已取消标记');
          syncIndexCardsStatus();
          if (activeShelfFilter !== 'all') {
            doSearch();
          }
        }
      });

      window.addEventListener('book-status-changed', function() {
        syncIndexCardsStatus();
        if (activeShelfFilter !== 'all') doSearch();
      });

      setTimeout(syncIndexCardsStatus, 0);

      let searchRaf = null;
      function debouncedSearch() {
        if (searchRaf) cancelAnimationFrame(searchRaf);
        searchRaf = requestAnimationFrame(doSearch);
      }

      if (searchInput) searchInput.addEventListener('input', debouncedSearch);
      if (searchClear) searchClear.addEventListener('click', function() {
        searchInput.value = '';
        searchInput.focus();
        doSearch();
      });

      // 2. Sticky Nav Navigation & ScrollSpy
      const dnav = document.getElementById('stickyNav');
      const dnavInner = dnav ? dnav.querySelector('.dnav-inner') : null;
      const navLinks = Array.from(document.querySelectorAll('.dnav a'));
      let isClickScrolling = false;
      let clickScrollTimer = null;

      function centerActiveTab(activeLink) {
        if (!activeLink || !dnavInner) return;
        // Scroll ONLY the horizontal dnav-inner container! NEVER call scrollIntoView which aborts window scrolling.
        const targetLeft = activeLink.offsetLeft - (dnavInner.clientWidth - activeLink.offsetWidth) / 2;
        dnavInner.scrollTo({
          left: Math.max(0, targetLeft),
          behavior: 'smooth'
        });
      }

      function setActiveNav(targetId) {
        let activeEl = null;
        navLinks.forEach(link => {
          if (link.getAttribute('data-target') === targetId) {
            link.classList.add('active');
            activeEl = link;
          } else {
            link.classList.remove('active');
          }
        });
        if (activeEl) centerActiveTab(activeEl);
      }

      navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
          const targetId = this.getAttribute('data-target');
          const targetSection = document.getElementById(targetId);
          if (!targetSection) return;

          e.preventDefault();
          setActiveNav(targetId);

          isClickScrolling = true;
          if (clickScrollTimer) clearTimeout(clickScrollTimer);
          clickScrollTimer = setTimeout(() => {
            isClickScrolling = false;
            updateScrollSpy();
          }, 1200);

          const navHeight = dnav ? dnav.offsetHeight : 56;
          const targetTop = targetSection.getBoundingClientRect().top + window.scrollY - navHeight;

          window.scrollTo({
            top: Math.max(0, Math.round(targetTop)),
            behavior: 'smooth'
          });

          if (history.pushState) {
            history.pushState(null, '', '#' + targetId);
          }
        });
      });

      // Clear click scroll lock on scrollend
      window.addEventListener('scrollend', function() {
        if (isClickScrolling) {
          isClickScrolling = false;
          if (clickScrollTimer) clearTimeout(clickScrollTimer);
          updateScrollSpy();
        }
      });

      // ScrollSpy: update active tab when user manually scrolls
      let scrollTicking = false;
      function updateScrollSpy() {
        if (isClickScrolling) return;
        const navHeight = dnav ? dnav.offsetHeight : 56;
        const threshold = navHeight + 80;

        // Bottom of page check
        if ((window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - 60)) {
          const visibleSections = domainSections.filter(s => s.style.display !== 'none');
          if (visibleSections.length > 0) {
            const lastSec = visibleSections[visibleSections.length - 1];
            setActiveNav(lastSec.id);
            return;
          }
        }

        let currentId = null;
        for (const sec of domainSections) {
          if (sec.style.display === 'none') continue;
          const rect = sec.getBoundingClientRect();
          if (rect.top <= threshold) {
            currentId = sec.id;
          } else {
            break;
          }
        }

        if (!currentId && domainSections.length > 0) {
          const firstVisible = domainSections.find(s => s.style.display !== 'none');
          if (firstVisible) currentId = firstVisible.id;
        }

        if (currentId) {
          const currentActive = document.querySelector('.dnav a.active');
          if (!currentActive || currentActive.getAttribute('data-target') !== currentId) {
            setActiveNav(currentId);
          }
        }
      }

      window.addEventListener('scroll', function() {
        if (isClickScrolling) return;
        if (!scrollTicking) {
          requestAnimationFrame(() => {
            updateScrollSpy();
            scrollTicking = false;
          });
          scrollTicking = true;
        }
      }, { passive: true });

      // 3. Scroll position preservation & Hash navigation
      function restoreScroll() {
        if (location.hash) {
          const hashId = location.hash.replace('#', '');
          setActiveNav(hashId);
          return;
        }
        try {
          const y = sessionStorage.getItem('idxScroll');
          if (y !== null) {
            sessionStorage.removeItem('idxScroll');
            window.scrollTo(0, parseInt(y, 10));
          }
        } catch (e) {}
      }
      function saveScroll() {
        try {
          sessionStorage.setItem('idxScroll', String(window.scrollY));
        } catch (e) {}
      }
      window.addEventListener('hashchange', function() {
        if (location.hash) {
          const hashId = location.hash.replace('#', '');
          setActiveNav(hashId);
        }
      });
      window.addEventListener('DOMContentLoaded', restoreScroll);
      window.addEventListener('pageshow', function(e) { if (e.persisted) restoreScroll(); });
      window.addEventListener('pagehide', saveScroll);
    })();
  </script>

  ${renderCmdkModalHtml()}
  ${cmdkAndStoreScript}
  ${sidebarScript}
  ${perfAndAnalyticsScript}
</body>
</html>
`;

  fs.writeFileSync(path.join(ROOT_DIR, 'index.html'), html, 'utf-8');
  console.log('✓ Generated index.html');
}

// 2. Build Book Detail Pages
function buildBooks() {
  books.forEach((book, idx) => {
    const prevBook = idx > 0 ? books[idx - 1] : null;
    const nextBook = idx < books.length - 1 ? books[idx + 1] : null;
    const stars = getStars(book.rating);

    // Mindmap support (for books with verified mindmaps)
    const mm = mindmaps[book.id];
    const mindmapHtml = mm ? renderMindmapHtml(mm, book) : '';
    const mindmapScriptHtml = mm ? mindmapScript : '';

    // Thesis paragraphs
    const thesisHtml = book.thesis.map(p => `<p>${escapeHtml(p)}</p>`).join('\n');

    // Ideas list
    const ideasHtml = book.ideas.map(idea => `
      <li class="idea-item">
        <h3 class="idea-title">${idea.num}. ${escapeHtml(idea.title)}</h3>
        <p class="idea-desc">${escapeHtml(idea.desc)}</p>
        <div class="example-box">${escapeHtml(idea.example)}</div>
      </li>
    `.trim()).join('\n');

    // Structure list
    const structureHtml = book.structure.map(part => `
      <li class="part-item">
        <h3 class="part-title">${escapeHtml(part.title)}</h3>
        <p class="part-desc">${escapeHtml(part.desc)}</p>
        <div class="example-box">${escapeHtml(part.example)}</div>
      </li>
    `.trim()).join('\n');

    // Prev / Next Nav (Cover Cards)
    const prevHtml = prevBook
      ? `<a class="prev${!nextBook ? ' solo' : ''}" href="${prevBook.slug}.html">
          ${getCoverPicture(prevBook.cover, prevBook.title, false, false)}
          <span class="t"><span>← 上一本</span>${escapeHtml(prevBook.title)}</span>
         </a>`
      : '';

    const nextHtml = nextBook
      ? `<a class="next${!prevBook ? ' solo' : ''}" href="${nextBook.slug}.html">
          ${getCoverPicture(nextBook.cover, nextBook.title, false, false)}
          <span class="t"><span>下一本 →</span>${escapeHtml(nextBook.title)}</span>
         </a>`
      : '';

    // Target domain anchor on index
    const domObj = site.domains.find(d => d.name === book.domain);
    const domainAnchor = domObj ? `index.html#${domObj.id}` : 'index.html';

    const origTitleRow = book.originalTitle ? `
      <div class="detail-meta-item">
        <span class="label">原作名：</span>
        <span class="value">${escapeHtml(book.originalTitle)}</span>
      </div>
    `.trim() : '';

    const sidebarHtml = renderSidebar(book.id, true);

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${escapeHtml(book.title)} · 经典书导读</title>
  <link rel="stylesheet" href="${cssHref}">
</head>
<body>
  <div class="layout-container">
    ${sidebarHtml}

    <div class="main-wrapper">
      <div class="wrap">
        <header class="sitehead">
          <div class="sitehead-inner">
            <div class="sitehead-left">
              <button type="button" class="sidebar-toggle-btn" id="sidebarToggleBtn" aria-label="切换全书目录" title="打开/收起目录 (快捷键 M)">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                <span>目录</span>
                <span class="kbd-pill"><kbd>M</kbd></span>
              </button>
              <a class="brand" href="index.html">
                ${escapeHtml(site.brand)}
                <small>${escapeHtml(site.brandSub)}</small>
              </a>
            </div>
            <div class="sitehead-right">
              <button type="button" class="cmdk-trigger-btn" id="cmdkTriggerBtn" aria-label="搜索图书" title="全局搜索 (快捷键 ⌘K 或 /)">
                <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <span class="cmdk-trigger-text">搜索全书</span>
                <span class="cmdk-trigger-kbd"><kbd>⌘K</kbd></span>
              </button>
            </div>
          </div>
        </header>

        <main>
          <div class="back-nav">
            <a class="back-link" href="${domainAnchor}">← 全部书单</a>
            <span class="breadcrumb-sep">/</span>
            <span class="breadcrumb-domain">${escapeHtml(book.domain)}</span>
          </div>

          <div class="book-title-header">
            <h1>${escapeHtml(book.title)}</h1>
          </div>

          <div class="detail-top">
            <div class="detail-cover-wrap">
              ${getCoverPicture(book.cover, book.title, true, true)}
            </div>
            <div class="detail-meta">
              <div class="detail-meta-item">
                <span class="label">作者：</span>
                <span class="value">${escapeHtml(book.author)}</span>
              </div>
              <div class="detail-meta-item">
                <span class="label">出版社：</span>
                <span class="value">${escapeHtml(book.publisher)}</span>
              </div>
              <div class="detail-meta-item">
                <span class="label">出版年：</span>
                <span class="value">${escapeHtml(book.publishYear)}</span>
              </div>
              ${origTitleRow}
              <div class="detail-meta-item detail-meta-link">
                <a class="douban-link" href="${book.doubanUrl}" target="_blank" rel="noopener">豆瓣读书条目 →</a>
              </div>
            </div>
          </div>

          <div class="ratebox">
            <span class="ratebox-num tabular">${book.rating}</span>
            <div class="ratebox-info">
              <div class="ratebox-stars" aria-label="评分星级">${stars}</div>
              <div class="ratebox-label">豆瓣评分 · ${formatRatingCount(book.ratingCount)}</div>
            </div>
          </div>

          <div class="detail-user-shelf" data-book-id="${book.id}">
            <div class="shelf-action-group">
              <button type="button" class="detail-shelf-btn btn-want" data-status="want" aria-pressed="false" aria-label="标记为想读">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                <span>想读</span>
              </button>
              <button type="button" class="detail-shelf-btn btn-read" data-status="read" aria-pressed="false" aria-label="标记为已读">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>已读</span>
              </button>
            </div>
            <div class="shelf-status-badge" id="detailShelfBadge">未标记阅读状态</div>
          </div>

          <div class="intro-quote">
            ${escapeHtml(book.intro)}
          </div>

          <section class="section-block">
            <h2>总体观点</h2>
            <div class="thesis-body">
              ${thesisHtml}
            </div>
          </section>

          <section class="section-block">
            <h2>核心观点</h2>
            <ol class="idea-list">
              ${ideasHtml}
            </ol>
          </section>

          ${mindmapHtml}

          <section class="section-block">
            <h2>全书结构</h2>
            <ol class="part-list">
              ${structureHtml}
            </ol>
          </section>

          <nav class="pn">
            ${prevHtml}
            ${nextHtml}
          </nav>

          <a class="nav-back-catalog" href="${domainAnchor}">返回 ${escapeHtml(book.domain)} 目录</a>
        </main>

        <footer>
          <p>${escapeHtml(site.footerNote)}</p>
          <p>${escapeHtml(site.footerVerify)} · <a href="https://github.com/holynova/forty-classic-books" target="_blank" rel="noopener">GitHub 仓库</a> · <span class="footer-version">v${escapeHtml(pkg.version)}</span></p>
        </footer>
      </div>

      <button type="button" class="floating-menu-btn" id="floatingMenuBtn" aria-label="打开全部图书目录">
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        <span>目录</span>
      </button>
    </div>
  </div>

  <script>
    document.addEventListener('keydown', function(e) {
      var p = document.querySelector('.pn a.prev'), n = document.querySelector('.pn a.next');
      if (e.key === 'ArrowLeft' && p) { location.href = p.href; }
      if (e.key === 'ArrowRight' && n) { location.href = n.href; }
    });
  </script>

  ${mindmapScriptHtml}
  ${renderCmdkModalHtml()}
  ${cmdkAndStoreScript}
  ${sidebarScript}
  ${perfAndAnalyticsScript}
</body>
</html>
`;

    fs.writeFileSync(path.join(ROOT_DIR, `${book.slug}.html`), html, 'utf-8');
  });

  console.log(`✓ Generated ${books.length} book detail pages`);
}

// 3. Build Shared Sidebar Nav Component
function buildSidebarNav() {
  const html = generateSidebarGroupsHtml();
  fs.writeFileSync(path.join(ROOT_DIR, 'sidebar-nav.html'), html, 'utf-8');
  console.log('✓ Generated sidebar-nav.html');
}

// Run build
console.log('Building classic-books-guide static website with performance optimizations...');
buildSearchIndex();
buildSidebarNav();
buildIndex();
buildBooks();
console.log('Build completed successfully!');

