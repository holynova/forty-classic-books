const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');

const site = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'site.json'), 'utf-8'));
const books = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'books.json'), 'utf-8'));

function getStars(ratingStr) {
  const r = parseFloat(ratingStr) || 0;
  const stars5 = r / 2; // out of 5
  const full = Math.floor(stars5);
  const half = (stars5 - full) >= 0.3 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '★' : '') + '☆'.repeat(empty);
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Global Sidebar Component
function renderSidebar(currentBookId = null) {
  const groupsHtml = site.domains.map(dom => {
    const domainBooks = books.filter(b => b.domain === dom.name);
    const listHtml = domainBooks.map(b => {
      const padId = String(b.id).padStart(2, '0');
      const isActive = currentBookId === b.id;
      return `
        <li>
          <a href="${b.slug}.html" class="sidebar-link${isActive ? ' active' : ''}" data-id="${b.id}" data-title="${escapeHtml(b.title)}" data-author="${escapeHtml(b.author)}"${isActive ? ' aria-current="page"' : ''}>
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

  return `
  <div class="sidebar-backdrop" id="sidebarBackdrop"></div>
  <aside class="global-sidebar" id="globalSidebar" aria-label="全书目录导航">
    <div class="sidebar-header">
      <a class="sidebar-brand" href="index.html">
        <span class="sidebar-brand-title">${escapeHtml(site.brand)}</span>
        <span class="sidebar-brand-sub">4 领域 × 10 本 · 经典书导读</span>
      </a>
      <button type="button" class="sidebar-close-btn" id="sidebarCloseBtn" aria-label="关闭目录">×</button>
    </div>

    <div class="sidebar-search">
      <div class="sidebar-search-wrap">
        <svg viewBox="0 0 24 24" class="sb-search-icon"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="search" id="sidebarSearchInput" placeholder="快速检索 40 本书..." autocomplete="off">
        <button type="button" id="sidebarSearchClear" class="sb-search-clear" aria-label="清除">×</button>
      </div>
      <div class="sidebar-search-empty" id="sidebarSearchEmpty">无匹配图书</div>
    </div>

    <nav class="sidebar-nav" id="sidebarNav">
      ${groupsHtml}
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
      // Sidebar drawer & collapse controls
      const sidebar = document.getElementById('globalSidebar');
      const backdrop = document.getElementById('sidebarBackdrop');
      const toggleBtn = document.getElementById('sidebarToggleBtn');
      const floatBtn = document.getElementById('floatingMenuBtn');
      const closeBtn = document.getElementById('sidebarCloseBtn');
      const searchInput = document.getElementById('sidebarSearchInput');
      const searchClear = document.getElementById('sidebarSearchClear');
      const searchEmpty = document.getElementById('sidebarSearchEmpty');
      const groups = Array.from(document.querySelectorAll('.sidebar-group'));

      // Check desktop saved preference
      try {
        if (window.innerWidth >= 1200 && localStorage.getItem('sidebarCollapsed') === '1') {
          document.body.classList.add('sidebar-collapsed');
        }
      } catch (e) {}

      function isDesktop() {
        return window.innerWidth >= 1200;
      }

      function openMobileSidebar() {
        document.body.classList.add('sidebar-open');
        const activeLink = document.querySelector('.sidebar-link.active');
        if (activeLink) {
          activeLink.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }

      function closeMobileSidebar() {
        document.body.classList.remove('sidebar-open');
      }

      function toggleSidebar() {
        if (isDesktop()) {
          const isCollapsed = document.body.classList.toggle('sidebar-collapsed');
          try {
            localStorage.setItem('sidebarCollapsed', isCollapsed ? '1' : '0');
          } catch (e) {}
        } else {
          if (document.body.classList.contains('sidebar-open')) {
            closeMobileSidebar();
          } else {
            openMobileSidebar();
          }
        }
      }

      if (toggleBtn) toggleBtn.addEventListener('click', toggleSidebar);
      if (floatBtn) floatBtn.addEventListener('click', openMobileSidebar);
      if (closeBtn) closeBtn.addEventListener('click', closeMobileSidebar);
      if (backdrop) backdrop.addEventListener('click', closeMobileSidebar);

      // Keyboard shortcuts
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          closeMobileSidebar();
        }
        if ((e.key === 'm' || e.key === 'M') && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
          toggleSidebar();
        }
      });

      // Quick search within sidebar
      if (searchInput) {
        searchInput.addEventListener('input', function() {
          const q = (this.value || '').trim().toLowerCase();
          if (searchClear) searchClear.style.display = q ? 'block' : 'none';
          let matchCount = 0;

          groups.forEach(group => {
            let groupMatches = 0;
            const items = Array.from(group.querySelectorAll('.sidebar-link'));
            items.forEach(item => {
              const title = (item.dataset.title || '').toLowerCase();
              const author = (item.dataset.author || '').toLowerCase();
              const matched = !q || title.includes(q) || author.includes(q);
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

      // Auto scroll active book into view on page load
      const currentActive = document.querySelector('.sidebar-link.active');
      if (currentActive) {
        setTimeout(function() {
          currentActive.scrollIntoView({ block: 'center' });
        }, 120);
      }
    })();
  </script>
`;

// 1. Build Index HTML
function buildIndex() {
  const domainSections = site.domains.map(dom => {
    const domainBooks = books.filter(b => b.domain === dom.name);
    const bookRows = domainBooks.map(b => {
      const padId = String(b.id).padStart(2, '0');
      const stars = getStars(b.rating);
      return `
        <a class="brow" href="${b.slug}.html" data-title="${escapeHtml(b.title)}" data-author="${escapeHtml(b.author)}" data-publisher="${escapeHtml(b.publisher)}" data-domain="${escapeHtml(b.domain)}" data-intro="${escapeHtml(b.intro)}">
          <div class="brow-cover-wrap">
            <img src="${b.cover}" alt="${escapeHtml(b.title)}封面" loading="lazy" width="68" height="98">
          </div>
          <div class="brow-body">
            <h3 class="brow-title"><span class="tabular">${padId}.</span> ${escapeHtml(b.title)}</h3>
            <p class="brow-meta">${escapeHtml(b.author)} / ${escapeHtml(b.publisher)} / ${escapeHtml(b.publishYear)}</p>
            <p class="brow-desc">${escapeHtml(b.intro)}</p>
          </div>
          <div class="brow-rating">
            <span class="brow-rating-num tabular">${b.rating}</span>
            <div class="brow-rating-stars" aria-label="评分星级">${stars}</div>
            <span class="brow-rating-count">${escapeHtml(b.ratingCount)}</span>
          </div>
        </a>
      `.trim();
    }).join('\n');

    return `
      <section class="domain" id="${dom.id}">
        <div class="domain-header">
          <h2>${escapeHtml(dom.name)}<span class="count">${escapeHtml(dom.count)}</span></h2>
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

  const sidebarHtml = renderSidebar(null);

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(site.title)}</title>
  <link rel="stylesheet" href="style.css">
  <script defer src="https://cloud.umami.is/script.js" data-website-id="e01c9f78-4607-4e60-b01c-77c8190b12b4"></script>
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
              </button>
              <a class="brand" href="index.html">
                ${escapeHtml(site.brand)}
                <small>${escapeHtml(site.brandSub)}</small>
              </a>
            </div>
            <span class="sitehead-tag">40 本精选</span>
          </div>
        </header>

        <div class="hero">
          <h1>
            ${escapeHtml(site.heroTitle)}
            <span class="hero-subtitle">${escapeHtml(site.heroTag)}</span>
          </h1>
          <p>${escapeHtml(site.heroDesc)}</p>

          <div class="search-box">
            <div class="search-input-wrap">
              <svg class="search-icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input type="search" class="search-input" id="bookSearch" placeholder="搜索书名、作者、出版社或关键词..." autocomplete="off">
              <button type="button" class="search-clear" id="searchClear" aria-label="清除搜索">×</button>
            </div>
            <div class="search-meta" id="searchMeta">共找到 <b id="matchCount">0</b> 本相关图书</div>
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
          <p>${escapeHtml(site.footerVerify)} · <a href="https://github.com/holynova/forty-classic-books" target="_blank" rel="noopener">GitHub 仓库</a></p>
        </div>
      </footer>

      <button type="button" class="floating-menu-btn" id="floatingMenuBtn" aria-label="打开40本书目录">
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        <span>40本目录</span>
      </button>
    </div>
  </div>

  <script>
    (function() {
      // 1. Instant Search on Index
      const searchInput = document.getElementById('bookSearch');
      const searchClear = document.getElementById('searchClear');
      const searchMeta = document.getElementById('searchMeta');
      const matchCountEl = document.getElementById('matchCount');
      const searchEmpty = document.getElementById('searchEmpty');
      const bookRows = Array.from(document.querySelectorAll('.brow'));
      const domainSections = Array.from(document.querySelectorAll('.domain'));

      function handleSearch() {
        const query = (searchInput.value || '').trim().toLowerCase();
        
        if (query.length > 0) {
          searchClear.style.display = 'flex';
          searchMeta.style.display = 'block';
        } else {
          searchClear.style.display = 'none';
          searchMeta.style.display = 'none';
        }

        let matchCount = 0;

        domainSections.forEach(section => {
          const rows = Array.from(section.querySelectorAll('.brow'));
          let sectionMatchCount = 0;

          rows.forEach(row => {
            const title = (row.dataset.title || '').toLowerCase();
            const author = (row.dataset.author || '').toLowerCase();
            const pub = (row.dataset.publisher || '').toLowerCase();
            const dom = (row.dataset.domain || '').toLowerCase();
            const intro = (row.dataset.intro || '').toLowerCase();

            const isMatch = !query || 
              title.includes(query) || 
              author.includes(query) || 
              pub.includes(query) || 
              dom.includes(query) || 
              intro.includes(query);

            if (isMatch) {
              row.style.display = 'flex';
              sectionMatchCount++;
              matchCount++;
            } else {
              row.style.display = 'none';
            }
          });

          section.style.display = (sectionMatchCount > 0 || !query) ? 'block' : 'none';
        });

        matchCountEl.textContent = matchCount;
        searchEmpty.style.display = (matchCount === 0 && query) ? 'block' : 'none';
      }

      if (searchInput) searchInput.addEventListener('input', handleSearch);
      if (searchClear) searchClear.addEventListener('click', function() {
        searchInput.value = '';
        searchInput.focus();
        handleSearch();
      });

      // 2. Sticky Nav ScrollSpy
      const navLinks = Array.from(document.querySelectorAll('.dnav a'));
      const observerOptions = {
        root: null,
        rootMargin: '-80px 0px -60% 0px',
        threshold: 0
      };

      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            navLinks.forEach(link => {
              if (link.getAttribute('data-target') === id) {
                link.classList.add('active');
                link.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
              } else {
                link.classList.remove('active');
              }
            });
          }
        });
      }, observerOptions);

      domainSections.forEach(sec => observer.observe(sec));

      // 3. Scroll position preservation
      function restoreScroll() {
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
      window.addEventListener('DOMContentLoaded', restoreScroll);
      window.addEventListener('pageshow', function(e) { if (e.persisted) restoreScroll(); });
      window.addEventListener('pagehide', saveScroll);
    })();
  </script>

  ${sidebarScript}
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

    // Thesis paragraphs
    const thesisHtml = book.thesis.map(p => `<p>${escapeHtml(p)}</p>`).join('\n');

    // Ideas list
    const ideasHtml = book.ideas.map(idea => `
      <li class="idea-item">
        <p class="idea-title"><b>${idea.num}. ${escapeHtml(idea.title)}</b></p>
        <p class="idea-desc">${escapeHtml(idea.desc)}</p>
        <div class="example-box"><span class="tag">例 ·</span>${escapeHtml(idea.example)}</div>
      </li>
    `.trim()).join('\n');

    // Structure list
    const structureHtml = book.structure.map(part => `
      <li class="part-item">
        <p class="part-title"><b>${escapeHtml(part.title)}</b></p>
        <p class="part-desc">${escapeHtml(part.desc)}</p>
        <div class="example-box"><span class="tag">例 ·</span>${escapeHtml(part.example)}</div>
      </li>
    `.trim()).join('\n');

    // Prev / Next Nav (Cover Cards)
    const prevHtml = prevBook
      ? `<a class="prev${!nextBook ? ' solo' : ''}" href="${prevBook.slug}.html">
          <img src="${prevBook.cover}" alt="${escapeHtml(prevBook.title)}封面" loading="lazy">
          <span class="t"><span>← 上一本</span>${escapeHtml(prevBook.title)}</span>
         </a>`
      : '';

    const nextHtml = nextBook
      ? `<a class="next${!prevBook ? ' solo' : ''}" href="${nextBook.slug}.html">
          <img src="${nextBook.cover}" alt="${escapeHtml(nextBook.title)}封面" loading="lazy">
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

    const sidebarHtml = renderSidebar(book.id);

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(book.title)} · 四十本经典书</title>
  <link rel="stylesheet" href="style.css">
  <script defer src="https://cloud.umami.is/script.js" data-website-id="e01c9f78-4607-4e60-b01c-77c8190b12b4"></script>
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
              </button>
              <a class="brand" href="index.html">
                ${escapeHtml(site.brand)}
                <small>${escapeHtml(site.brandSub)}</small>
              </a>
            </div>
            <span class="sitehead-tag">${escapeHtml(book.domain)}</span>
          </div>
        </header>

        <main>
          <div class="back-nav">
            <a class="back-link" href="${domainAnchor}">← 全部 40 本</a>
            <span class="detail-domain-tag">${escapeHtml(book.domain)} · ${escapeHtml(book.domainOrder)}</span>
          </div>

          <div class="book-title-header">
            <h1>${escapeHtml(book.title)}</h1>
          </div>

          <div class="detail-top">
            <div class="detail-cover-wrap">
              <img class="detail-cover" src="${book.cover}" alt="${escapeHtml(book.title)}封面" width="138" height="200">
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
              <div class="detail-meta-item">
                <span class="label">领域：</span>
                <span class="value">${escapeHtml(book.domain)} · ${escapeHtml(book.domainOrder)}</span>
              </div>
              <div class="detail-meta-item" style="margin-top: 0.4rem;">
                <a class="douban-link" href="${book.doubanUrl}" target="_blank" rel="noopener">豆瓣读书条目 →</a>
              </div>
            </div>
          </div>

          <div class="ratebox">
            <span class="ratebox-num">${book.rating}</span>
            <div class="ratebox-info">
              <div class="ratebox-stars" aria-label="评分星级">${stars}</div>
              <div class="ratebox-label"><b>豆瓣评分</b> · ${escapeHtml(book.ratingCount)}</div>
            </div>
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
            <h2>核心观点 <span class="badge">共 ${book.ideas.length} 条</span></h2>
            <ol class="idea-list">
              ${ideasHtml}
            </ol>
          </section>

          <section class="section-block">
            <h2>全书结构 <span class="badge">${book.structure.length} 部分</span></h2>
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
          <p>${escapeHtml(site.footerVerify)} · <a href="https://github.com/holynova/forty-classic-books" target="_blank" rel="noopener">GitHub 仓库</a></p>
        </footer>
      </div>

      <button type="button" class="floating-menu-btn" id="floatingMenuBtn" aria-label="打开40本书目录">
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        <span>40本目录</span>
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

  ${sidebarScript}
</body>
</html>
`;

    fs.writeFileSync(path.join(ROOT_DIR, `${book.slug}.html`), html, 'utf-8');
  });

  console.log(`✓ Generated 40 book detail pages`);
}

// Run build
console.log('Building forty-classic-books static website with global navigation...');
buildIndex();
buildBooks();
console.log('Build completed successfully!');
