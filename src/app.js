(() => {
  'use strict';

  const root = new URL(document.documentElement.dataset.root || './', location.href).href;
  const $ = (selector, el = document) => el.querySelector(selector);
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const ICON_CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  const ICON_SHARE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V4"/><path d="M8 8l4-4 4 4"/><path d="M6 12v7a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-7"/></svg>';

  // ---------- Messages ----------
  const toastEl = $('#toast');
  let toastTimer;
  function toast(message, { keep = false } = {}) {
    if (!toastEl) return;
    clearTimeout(toastTimer);
    toastEl.textContent = message;
    toastEl.hidden = false;
    if (!keep) toastTimer = setTimeout(() => (toastEl.hidden = true), 7000);
  }

  // ---------- Offline notice ----------
  const offlineEl = $('#offline');
  const showConnection = () => offlineEl && (offlineEl.hidden = navigator.onLine);
  addEventListener('online', showConnection);
  addEventListener('offline', showConnection);
  showConnection();

  // ---------- Offline copy and updates ----------
  const UPDATED = 'The guide has been updated with the latest information.';
  if ('serviceWorker' in navigator) {
    const sw = navigator.serviceWorker;
    const firstVisit = !sw.controller;
    const here = decodeURIComponent(location.href.split(/[?#]/)[0].slice(root.length)).replace(/(^|\/)$/, '$1index.html');

    try {
      if (sessionStorage.getItem('fog-updated')) {
        sessionStorage.removeItem('fog-updated');
        toast(UPDATED);
      }
    } catch {}

    sw.addEventListener('message', (event) => {
      const data = event.data || {};
      if (data.type === 'progress' && firstVisit) {
        toast(`Saving the guide to this device… ${Math.round((data.done / data.total) * 100)}%`, { keep: true });
      } else if (data.type === 'ready') {
        if (firstVisit) return toast('Saved to this device. The guide now works without a connection.');
        const affectsPage = data.changed.some((file) => file === here || file.startsWith('assets/'));
        if (!affectsPage) return toast(UPDATED);
        try {
          sessionStorage.setItem('fog-updated', '1');
        } catch {}
        location.reload();
      }
    });

    sw.register(`${root}sw.js`, { scope: root, updateViaCache: 'none' })
      .then((registration) => {
        const check = () => navigator.onLine && registration.update().catch(() => {});
        addEventListener('online', check);
        document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check());
        setInterval(check, 15 * 60 * 1000);
      })
      .catch(() => {});
    navigator.storage?.persist?.().catch(() => {});
  }

  // ---------- Download app ----------
  const installBtn = $('#install');
  if (installBtn) {
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const phone = ios || /Android/.test(ua) || navigator.userAgentData?.mobile === true;
    const standalone = matchMedia('(display-mode: standalone)');
    const installed = () => standalone.matches || navigator.standalone === true;
    let prompt = null;

    const refresh = () => (installBtn.hidden = !phone || installed());
    addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      prompt = event;
    });
    addEventListener('appinstalled', () => {
      prompt = null;
      installBtn.hidden = true;
    });
    standalone.addEventListener?.('change', refresh);
    refresh();

    installBtn.addEventListener('click', async () => {
      if (prompt) {
        prompt.prompt();
        await prompt.userChoice.catch(() => {});
        prompt = null;
        return;
      }
      const steps = ios
        ? [`Tap <strong>Share</strong> ${ICON_SHARE}`, 'Choose <strong>Add to Home Screen</strong>', 'Tap <strong>Add</strong>']
        : ['Open the browser menu <strong>⋮</strong>', 'Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>', 'Tap <strong>Install</strong>'];
      const sheet = document.createElement('dialog');
      sheet.className = 'sheet';
      sheet.innerHTML = `<h2>Add the guide to your phone</h2><ol>${steps.map((s) => `<li>${s}</li>`).join('')}</ol><form method="dialog"><button>Close</button></form>`;
      sheet.addEventListener('close', () => sheet.remove());
      sheet.addEventListener('click', (event) => event.target === sheet && sheet.close());
      document.body.append(sheet);
      sheet.showModal();
    });
  }

  // ---------- Search (every page) ----------
  const searchForm = $('#search');
  if (searchForm) {
    const input = $('#q');
    const clear = $('#q-clear');
    const results = $('#results');
    const resultsWrap = $('#results-wrap');
    const content = $('#content');
    const toggle = $('#search-toggle');
    const phone = matchMedia('(max-width: 699px)');
    const setOpen = (open) => {
      document.body.classList.toggle('search-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    };
    const show = (showResults) => {
      resultsWrap.hidden = !showResults;
      content.hidden = showResults;
    };
    toggle.addEventListener('click', () => {
      const open = !document.body.classList.contains('search-open');
      setOpen(open);
      if (open) input.focus();
      else if (input.value) {
        input.value = '';
        run();
      }
    });
    const WORD = /[\p{L}\p{N}]+/gu;
    let engine;
    let latest = 0;

    const loadScript = (src) =>
      new Promise((resolve, reject) => {
        const el = document.createElement('script');
        el.src = src;
        el.onload = resolve;
        el.onerror = reject;
        document.head.append(el);
      });

    function load() {
      engine ||= Promise.all([fetch(`${root}search.json`).then((r) => r.json()), loadScript(`${root}assets/minisearch.js`)])
        .then(([items]) => {
          const index = new MiniSearch({
            idField: 'id',
            fields: ['title', 'where', 'text'],
            searchOptions: { boost: { title: 6, where: 2 }, prefix: true, fuzzy: (term) => (term.length > 3 ? 0.2 : 0), combineWith: 'AND' },
          });
          index.addAll(items.map((item, id) => ({ id, ...item })));
          return { index, items };
        })
        .catch((error) => {
          engine = null;
          throw error;
        });
      return engine;
    }

    function highlight(text, terms) {
      let out = '';
      let last = 0;
      for (const match of text.matchAll(WORD)) {
        if (!terms.has(match[0].toLowerCase())) continue;
        out += `${escapeHtml(text.slice(last, match.index))}<mark>${escapeHtml(match[0])}</mark>`;
        last = match.index + match[0].length;
      }
      return out + escapeHtml(text.slice(last));
    }

    function snippet(text, terms) {
      if (!text) return '';
      let at = -1;
      for (const match of text.matchAll(WORD)) {
        if (terms.has(match[0].toLowerCase())) {
          at = match.index;
          break;
        }
      }
      let start = Math.max(0, (at < 0 ? 0 : at) - 70);
      if (start > 0) start = text.indexOf(' ', start) + 1 || start;
      let end = Math.min(text.length, start + 180);
      if (end < text.length) end = text.lastIndexOf(' ', end) > start ? text.lastIndexOf(' ', end) : end;
      return `${start > 0 ? '… ' : ''}${highlight(text.slice(start, end), terms)}${end < text.length ? ' …' : ''}`;
    }

    async function run() {
      const query = input.value.trim();
      const ticket = ++latest;
      clear.hidden = !input.value;
      history.replaceState(null, '', query ? `#q=${encodeURIComponent(query)}` : location.pathname + location.search);
      if (!query) {
        show(false);
        return;
      }
      let found;
      try {
        const { index, items } = await load();
        if (ticket !== latest) return;
        let hits = index.search(query);
        if (!hits.length) hits = index.search(query, { combineWith: 'OR' });
        found = hits.slice(0, 50).map((hit) => ({ item: items[hit.id], terms: new Set(hit.terms) }));
      } catch {
        results.innerHTML = '<p class="empty">Search is not available right now.</p>';
        show(true);
        return;
      }
      results.innerHTML = found.length
        ? `<p class="results-count">${found.length} result${found.length === 1 ? '' : 's'}</p>` +
          found
            .map(({ item, terms }) => {
              const text = snippet(item.text, terms);
              return `<a class="result" href="${escapeHtml(root + item.url)}"><span class="result-title">${highlight(item.title, terms)}</span>${
                item.where ? `<span class="result-where">${highlight(item.where, terms)}</span>` : ''
              }${text ? `<span class="result-text">${text}</span>` : ''}</a>`;
            })
            .join('')
        : `<p class="empty">Nothing found for “${escapeHtml(query)}”.</p>`;
      show(true);
      if (ticket === latest) scrollTo(0, 0);
    }

    let timer;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(run, 90);
    });
    input.addEventListener('focus', () => load().catch(() => {}), { once: true });
    searchForm.addEventListener('submit', (event) => {
      event.preventDefault();
      run();
      input.blur();
    });
    clear.addEventListener('click', () => {
      input.value = '';
      run();
      input.focus();
    });

    const fromAddress = () => {
      const hash = location.hash;
      if (hash === '#search') {
        history.replaceState(null, '', location.pathname + location.search);
        setOpen(true);
        input.focus();
      } else if (hash.startsWith('#q=')) {
        let query = '';
        try {
          query = decodeURIComponent(hash.slice(3));
        } catch {}
        if (query !== input.value.trim()) input.value = query;
        if (query && phone.matches) setOpen(true);
        run();
      } else if (input.value) {
        run();
      }
    };
    addEventListener('hashchange', fromAddress);
    addEventListener('pageshow', fromAddress);
  }

  // ---------- Filter (section) ----------
  const filter = $('#filter');
  if (filter) {
    const rows = [...document.querySelectorAll('#topics > li')].map((el) => ({ el, text: el.textContent.toLowerCase() }));
    const list = $('#topics');
    const none = $('#filter-empty');
    const apply = () => {
      const words = filter.value.toLowerCase().split(/\s+/).filter(Boolean);
      let shown = 0;
      for (const row of rows) {
        const match = words.every((w) => row.text.includes(w));
        row.el.hidden = !match;
        if (match) shown++;
      }
      list.hidden = shown === 0;
      none.hidden = shown !== 0;
    };
    filter.addEventListener('input', apply);
    addEventListener('pageshow', apply);
  }

  // ---------- Full-screen pictures ----------
  // PDF pages are part of the page, and small inline symbols are not pictures to enlarge
  const pictures = [...document.querySelectorAll('.prose img, .gallery img')].filter((img) => !img.closest('.pdf-page') && !img.classList.contains('icon-inline'));
  if (pictures.length) {
    let viewer;
    const open = (source) => {
      if (!viewer) {
        viewer = document.createElement('dialog');
        viewer.className = 'viewer';
        viewer.innerHTML = `<div class="viewer-scroll"><img alt=""></div><button class="viewer-close" type="button" aria-label="Close picture">${ICON_CLOSE}</button>`;
        viewer.addEventListener('click', (event) => {
          if (event.target.tagName === 'IMG') viewer.classList.toggle('zoomed');
          else viewer.close();
        });
        document.body.append(viewer);
      }
      const img = $('img', viewer);
      img.src = source.currentSrc || source.src;
      img.alt = source.alt;
      viewer.classList.remove('zoomed');
      viewer.showModal();
    };
    for (const picture of pictures) {
      picture.tabIndex = 0;
      picture.setAttribute('role', 'button');
      picture.setAttribute('aria-label', picture.alt ? `${picture.alt} (show full screen)` : 'Show picture full screen');
      picture.addEventListener('click', () => open(picture));
      picture.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          open(picture);
        }
      });
    }
  }
})();
