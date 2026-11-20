(() => {
  const key = 'manasoft-theme';
  const root = document.documentElement;
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const buttons = [];
  const media = [];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let selectedTheme;
  let transition;
  let fallbackTimer;
  const assetRoot = new URL('assets/', document.currentScript.src);
  const darkImages = {
    'manasoft-logo.png': 'manasoft-logo.png',
    'brands/brand-1.png': 'brand-1.png',
    'brands/brand-3.png': 'brand-3.png',
    'brands/brand-4.png': 'brand-4.png',
    'brands/brand-5.png': 'brand-5.png',
    'products/accounting.jpg': 'accounting.webp',
    'products/business.jpg': 'bitrix-site.webp',
    'products/crm.jpg': 'crm.webp',
    'products/salary.jpg': 'salary.webp',
    'products/shtrih.png': 'shtrih.webp',
    'products/small-business.jpg': 'bitrix-site.webp',
    'products/standard.jpg': 'bitrix-site.webp',
    'products/start.jpg': 'bitrix-site.webp',
    'products/trade.jpg': 'trade.webp',
    'products/unf.jpg': 'unf.webp',
    'equipment/retail.png': 'retail.webp',
    'equipment/wholesale.png': 'wholesale.webp'
  };

  function registerMedia(element, attribute) {
    const light = element[attribute];
    if (!light.startsWith(assetRoot.href)) return;
    const variant = darkImages[light.slice(assetRoot.href.length)];
    if (variant) media.push({ element, attribute, light, dark: new URL(`dark/${variant}`, assetRoot).href });
  }

  function applyTheme(theme) {
    const dark = theme === 'dark';
    root.dataset.theme = dark ? 'dark' : 'light';
    if (themeColor) themeColor.content = dark ? '#15141d' : '#f6f7f9';
    for (const item of media) {
      const source = dark ? item.dark : item.light;
      if (item.element[item.attribute] !== source) item.element[item.attribute] = source;
    }
    for (const button of buttons) {
      button.querySelector('.theme-toggle-label').textContent = dark ? 'Светлая тема' : 'Тёмная тема';
      const action = dark ? 'Включить светлую тему' : 'Включить тёмную тему';
      button.setAttribute('aria-label', action);
      button.title = action;
    }
  }

  function switchTheme() {
    const theme = (selectedTheme || root.dataset.theme) === 'dark' ? 'light' : 'dark';
    selectedTheme = theme;
    try { localStorage.setItem(key, theme); } catch { /* An in-page switch still works. */ }
    transition?.skipTransition();
    transition = undefined;

    if (reduceMotion.matches || document.visibilityState !== 'visible') {
      applyTheme(theme);
      return;
    }
    if (!document.startViewTransition) {
      root.classList.add('theme-color-transition');
      clearTimeout(fallbackTimer);
      fallbackTimer = setTimeout(() => root.classList.remove('theme-color-transition'), 380);
      applyTheme(theme);
      return;
    }

    const current = document.startViewTransition(async () => {
      if (transition !== current) return;
      // Decode only images currently on screen, without delaying the switch on slow loads.
      const visible = media.filter(({ element, attribute }) => {
        if (attribute !== 'src') return false;
        const box = element.getBoundingClientRect();
        return box.width && box.height && box.bottom > 0 && box.top < innerHeight && box.right > 0 && box.left < innerWidth;
      });
      applyTheme(theme);
      if (!visible.length) return;
      let timer;
      await Promise.race([
        Promise.allSettled(visible.map(({ element }) => element.decode())),
        new Promise(resolve => { timer = setTimeout(resolve, 120); })
      ]);
      clearTimeout(timer);
    });
    transition = current;
    const clear = () => { if (transition === current) transition = undefined; };
    current.ready.catch(() => { /* A rapid second click can skip the snapshot. */ });
    current.finished.then(clear, clear);
  }

  function restoreTheme() {
    try {
      selectedTheme = localStorage.getItem(key) === 'dark' ? 'dark' : 'light';
      transition?.skipTransition();
      transition = undefined;
      applyTheme(selectedTheme);
    }
    catch { /* Storage may be disabled; the current page can still switch themes. */ }
  }

  // Read the preference before the stylesheets load to avoid a flash on navigation.
  document.querySelectorAll('link[rel="icon"]').forEach(link => registerMedia(link, 'href'));
  restoreTheme();
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) restoreTheme();
  });
  window.addEventListener('pageshow', event => { if (event.persisted) restoreTheme(); });
  reduceMotion.addEventListener('change', () => { if (reduceMotion.matches) transition?.skipTransition(); });

  function createToggle() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-toggle';
    button.innerHTML = `<svg class="theme-moon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.9 13.3A9 9 0 0 1 10.7 3.1a9 9 0 1 0 10.2 10.2Z"/></svg>
      <svg class="theme-sun" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4m0-14.2-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>
      <span class="theme-toggle-label"></span>`;
    button.addEventListener('click', switchTheme);
    buttons.push(button);
    return button;
  }

  document.addEventListener('DOMContentLoaded', () => {
    for (const image of document.images) registerMedia(image, 'src');

    const topbar = document.querySelector('.topbar');
    if (topbar) {
      const actions = document.createElement('div');
      actions.className = 'topbar-actions';
      actions.append(topbar.querySelector('a'), createToggle());
      topbar.append(actions);
    }

    const menu = document.querySelector('.mobile-header .menu-button');
    if (menu) {
      const actions = document.createElement('div');
      actions.className = 'mobile-header-actions';
      menu.before(actions);
      actions.append(createToggle(), menu);
    }

    const errorHeader = document.querySelector('.error-header');
    if (errorHeader) errorHeader.append(createToggle());
    applyTheme(root.dataset.theme);
  });
})();
