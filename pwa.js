(() => {
  let deferredPrompt = null;
  let installButton = null;

  const isInstalled = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  const browserName = () => {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
    if (/OPR\//i.test(ua)) return 'opera';
    if (/Edg\//i.test(ua)) return 'edge';
    if (/Chrome\//i.test(ua)) return 'chrome';
    if (/Firefox\//i.test(ua)) return 'firefox';
    if (/Safari\//i.test(ua)) return 'safari';
    return 'browser';
  };

  const showInstallHelp = () => {
    const box = document.getElementById('toast');
    if (!box) return;
    const browser = browserName();
    let text = 'Open your browser menu and choose “Install app” or “Add to Home screen”.';
    if (browser === 'ios') text = 'Tap Share, then choose “Add to Home Screen”.';
    else if (browser === 'opera') text = 'Open Opera’s menu, then choose “Add to Home screen” or “Install”.';
    else if (browser === 'firefox') text = 'Open the browser menu and choose the available “Install” or “Add to Home screen” option.';
    else if (browser === 'safari') text = 'Choose Share, then “Add to Dock” or “Add to Home Screen”, depending on your device.';
    box.innerHTML = `<div class="toast"><strong>Install EduX as an app</strong><br><span>${text}</span></div>`;
    clearTimeout(showInstallHelp.timer);
    showInstallHelp.timer = setTimeout(() => { box.innerHTML = ''; }, 7000);
  };

  const addButton = () => {
    if (isInstalled() || document.getElementById('installApp')) return;
    const host = document.querySelector('.topbar');
    if (!host) return;
    const button = document.createElement('button');
    button.id = 'installApp';
    button.className = 'secondary';
    button.type = 'button';
    button.textContent = 'Install app';
    button.style.cssText = 'margin-left:auto;white-space:nowrap;padding:9px 12px;border-radius:10px;';
    button.addEventListener('click', async () => {
      if (!deferredPrompt) { showInstallHelp(); return; }
      deferredPrompt.prompt();
      try { await deferredPrompt.userChoice; } catch (_) {}
      deferredPrompt = null;
      button.remove();
      installButton = null;
    });
    host.appendChild(button);
    installButton = button;
  };

  window.addEventListener('beforeinstallprompt', event => {
    if (isInstalled()) return;
    event.preventDefault();
    deferredPrompt = event;
    addButton();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installButton?.remove();
    installButton = null;
  });

  const standaloneQuery = window.matchMedia('(display-mode: standalone)');
  standaloneQuery.addEventListener?.('change', event => {
    if (event.matches) { installButton?.remove(); installButton = null; }
    else addButton();
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
        if (registration.waiting) registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          worker?.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
          });
        });
      } catch (_) {}
    });
  }

  const observer = new MutationObserver(addButton);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  addButton();
})();
