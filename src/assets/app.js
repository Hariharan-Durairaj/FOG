(() => {
  'use strict';

  const root = document.body.dataset.root || './';
  const $ = (selector) => document.querySelector(selector);

  /* Toast */

  const toast = $('#toast');
  let toastTimer;
  function showToast(message, action) {
    if (!toast) return;
    toast.textContent = message;
    if (action) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = action.label;
      button.addEventListener('click', action.onClick);
      toast.append(button);
    }
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast.hidden = true), action ? 10000 : 4000);
  }

  /* Online / offline */

  const offlineBar = $('#offline-bar');
  const updateOnline = () => offlineBar && (offlineBar.hidden = navigator.onLine);
  addEventListener('online', updateOnline);
  addEventListener('offline', updateOnline);
  updateOnline();

  /* Offline storage and updates */

  if ('serviceWorker' in navigator) {
    const firstInstall = !navigator.serviceWorker.controller;
    let refreshing = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      if (firstInstall) {
        showToast('Saved for offline use');
      } else {
        showToast('Information has been updated', {
          label: 'Reload',
          onClick: () => {
            refreshing = true;
            location.reload();
          },
        });
      }
    });

    addEventListener('load', () => {
      navigator.serviceWorker
        .register(`${root}sw.js`)
        .then((registration) => {
          const check = () => navigator.onLine && registration.update().catch(() => {});
          document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check());
          addEventListener('online', check);
        })
        .catch(() => {});
    });
  }

  /* Download app */

  const installButton = $('#install-button');
  const sheet = $('#install-sheet');
  const steps = $('#install-steps');
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isStandalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  let installPrompt = null;

  const shareIcon =
    '<svg class="inline-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3"/><path d="M8 7l4-4 4 4"/><path d="M6 11H5v10h14V11h-1"/></svg>';
  const menuIcon =
    '<svg class="inline-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/></svg>';

  function instructions() {
    if (isIOS) {
      const safari = !/CriOS|FxiOS|EdgiOS/.test(ua);
      return `<ol>
        <li>Tap the <strong>Share</strong> button ${shareIcon} ${safari ? 'at the bottom of Safari' : 'in the address bar'}.</li>
        <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
        <li>Tap <strong>Add</strong>.</li>
      </ol>
      <p>The app will appear on your home screen and works without internet.</p>`;
    }
    if (isAndroid) {
      return `<ol>
        <li>Tap the browser menu ${menuIcon} at the top right.</li>
        <li>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
        <li>Tap <strong>Install</strong>.</li>
      </ol>
      <p>The app will appear on your home screen and works without internet.</p>`;
    }
    return `<ol>
      <li>Open this page in Chrome or Edge.</li>
      <li>Select the install icon at the right of the address bar, or open the browser menu and choose <strong>Install</strong>.</li>
    </ol>
    <p>On a phone, open this page and tap the download icon at the top.</p>`;
  }

  const isPhone = isIOS || isAndroid || matchMedia('(pointer: coarse)').matches;
  if (installButton && !isStandalone && isPhone) {
    installButton.hidden = false;

    addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      installPrompt = event;
    });

    installButton.addEventListener('click', async () => {
      if (installPrompt) {
        installPrompt.prompt();
        const choice = await installPrompt.userChoice.catch(() => null);
        installPrompt = null;
        if (choice?.outcome === 'accepted') installButton.hidden = true;
        return;
      }
      steps.innerHTML = instructions();
      sheet.showModal();
    });

    addEventListener('appinstalled', () => {
      installButton.hidden = true;
      showToast('App installed');
    });
  }

  /* Dialogs */

  document.querySelectorAll('dialog').forEach((dialog) => {
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog || event.target.closest('[data-close]')) dialog.close();
    });
  });

  /* Image viewer */

  const lightbox = $('#lightbox');
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-lightbox], .doc img');
    if (!link || !lightbox) return;
    event.preventDefault();
    const img = link.tagName === 'IMG' ? link : link.querySelector('img');
    lightbox.querySelector('img').src = img.currentSrc || img.src;
    lightbox.querySelector('img').alt = img.alt;
    lightbox.showModal();
  });

  /* Filter on long section pages */

  const filter = $('#section-filter');
  if (filter) {
    const items = [...document.querySelectorAll('[data-filter]')];
    const none = $('#filter-empty');
    filter.addEventListener('input', () => {
      const q = filter.value.trim().toLowerCase();
      let shown = 0;
      for (const item of items) {
        const match = !q || item.dataset.filter.includes(q);
        item.hidden = !match;
        if (match) shown++;
      }
      if (none) none.hidden = shown > 0;
    });
  }

  /* Search */

  const form = $('#search-form');
  const input = $('#search-input');
  const results = $('#search-results');
  const content = $('#home-content');
  const clear = $('#search-clear');
  if (!form || !input) return;

  let engine = null;
  let loading = null;

  function loadEngine() {
    if (engine) return Promise.resolve(engine);
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `${root}assets/minisearch.js`;
      script.onload = resolve;
      script.onerror = reject;
      document.head.append(script);
    })
      .then(() => fetch(`${root}search-index.json`))
      .then((response) => response.text())
      .then((json) => {
        engine = MiniSearch.loadJSON(json, {
          fields: ['title', 'trail', 'text'],
          storeFields: ['kind', 'title', 'trail', 'url', 'text'],
        });
        return engine;
      })
      .catch((error) => {
        loading = null;
        throw error;
      });
    return loading;
  }

  const escapeHtml = (value) =>
    String(value || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  function highlight(text, terms) {
    if (!terms.length) return escapeHtml(text);
    const pattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi');
    return escapeHtml(text).replace(pattern, '<mark>$1</mark>');
  }

  function snippet(text, terms) {
    if (!text) return '';
    const lower = text.toLowerCase();
    let at = -1;
    for (const term of terms) {
      at = lower.indexOf(term.toLowerCase());
      if (at >= 0) break;
    }
    if (at < 0) return text.length > 140 ? `${text.slice(0, 140).trim()}…` : text;
    const start = Math.max(0, at - 50);
    const end = Math.min(text.length, at + 110);
    return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`;
  }

  function render(query) {
    const hits = engine.search(query, { prefix: true, fuzzy: 0.2, boost: { title: 3, trail: 1.5 }, combineWith: 'AND' });
    const list = hits.length ? hits : engine.search(query, { prefix: true, fuzzy: 0.2, boost: { title: 3 } });
    const words = query.split(/\s+/).filter((w) => w.length > 1);
    if (!list.length) {
      results.innerHTML = `<p class="results-empty">No results for “${escapeHtml(query)}”</p>`;
      return;
    }
    results.innerHTML = list
      .slice(0, 30)
      .map((hit) => {
        const terms = [...new Set([...hit.terms, ...words])];
        return `<a class="result" href="${root}${hit.url}">
          <span class="result-title">${highlight(hit.title, terms)}</span>
          ${hit.trail ? `<span class="result-trail">${escapeHtml(hit.trail)}</span>` : ''}
          ${hit.kind === 'doc' && hit.text ? `<span class="result-snippet">${highlight(snippet(hit.text, terms), terms)}</span>` : ''}
        </a>`;
      })
      .join('');
  }

  async function update() {
    const query = input.value.trim();
    clear.hidden = !input.value;
    if (query.length < 2) {
      results.hidden = true;
      content.hidden = false;
      return;
    }
    try {
      await loadEngine();
    } catch {
      results.innerHTML = '<p class="results-empty">Search is not available right now.</p>';
      results.hidden = false;
      return;
    }
    if (input.value.trim() !== query) return;
    render(query);
    results.hidden = false;
    content.hidden = true;
  }

  input.addEventListener('focus', () => loadEngine().catch(() => {}), { once: true });
  input.addEventListener('input', update);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    input.blur();
    update();
  });
  clear.addEventListener('click', () => {
    input.value = '';
    update();
    input.focus();
  });
  if (input.value) update();
})();
