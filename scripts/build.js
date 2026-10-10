const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');

const site = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'site.json'), 'utf-8'));
const books = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'books.json'), 'utf-8'));
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf-8'));

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

// 1. Build Index HTML
function buildIndex() {
  const domainSections = site.domains.map(dom => {
    const domainBooks = books.filter(b => b.domain === dom.name);
    const bookRows = domainBooks.map(b => {
      const padId = String(b.id).padStart(2, '0');
      const stars = getStars(b.rating);
      // Performance optimization: Prioritize LCP images above the fold (first 3 books); lazy-load offscreen images
      const isAboveFold = b.id <= 3;
      const pictureHtml = getCoverPicture(b.cover, b.title, isAboveFold, false);
      return `
        <a class="brow" href="${b.slug}.html" data-domain="${escapeHtml(b.domain)}">
          <div class="brow-cover-wrap">
            ${pictureHtml}
          </div>
          <div class="brow-body">
            <h3 class="brow-title"><span class="tabular">${padId}.</span> ${escapeHtml(b.title)}${b.verified ? '<span class="brow-verified-badge" title="原书目录已严格校准">✓ 官方目录已核验</span>' : ''}</h3>
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

  const sidebarHtml = renderSidebar(null, false);

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(site.title)}</title>
  <link rel="stylesheet" href="style.css">
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
            <span class="sitehead-tag">${books.length} 本精选</span>
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
      // 1. Instant Search on Index
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
            const text = rowSearchText.get(row) || '';
            const isMatch = !query || text.includes(query);

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

      let searchRaf = null;
      function debouncedSearch() {
        if (searchRaf) cancelAnimationFrame(searchRaf);
        searchRaf = requestAnimationFrame(handleSearch);
      }

      if (searchInput) searchInput.addEventListener('input', debouncedSearch);
      if (searchClear) searchClear.addEventListener('click', function() {
        searchInput.value = '';
        searchInput.focus();
        handleSearch();
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
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(book.title)} · 经典书导读</title>
  <link rel="stylesheet" href="style.css">
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
            <span class="sitehead-tag">${escapeHtml(book.domain)}</span>
          </div>
        </header>

        <main>
          <div class="back-nav">
            <a class="back-link" href="${domainAnchor}">← 全部书单</a>
            <span class="detail-domain-tag">${escapeHtml(book.domain)} · ${escapeHtml(book.domainOrder)}</span>
            ${book.verified ? `<span class="verified-badge"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> 官方目录已核验</span>` : ''}
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
            <h2>全书结构 <span class="badge">${book.structure.length} 部分</span>${book.verified ? ` <span class="verified-badge-inline"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> 官方目录已核验</span>` : ''}</h2>
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
buildSidebarNav();
buildIndex();
buildBooks();
console.log('Build completed successfully!');
