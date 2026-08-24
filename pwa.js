(() => {
  let deferredPrompt = null;

  const isInstalled = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  const isOpera = /OPR\//i.test(navigator.userAgent);

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
    button.onclick = async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
        button.remove();
        return;
      }
      toastInstallHint();
    };
    host.appendChild(button);
  };

  const toastInstallHint = () => {
    const box = document.getElementById('toast');
    if (!box) return;
    const message = isOpera
      ? 'Opera does not expose the install prompt here. Open Opera menu ⋮ and choose “Add to Home screen” or “Install”.'
      : 'Your browser does not expose the install prompt. Open the browser menu and choose “Install app” or “Add to Home screen”.';
    box.innerHTML = `<div class="toast">${message}</div>`;
    setTimeout(() => { if (box) box.innerHTML = ''; }, 5000);
  };

  window.addEventListener('beforeinstallprompt', event => {
    if (isInstalled()) return;
    event.preventDefault();
    deferredPrompt = event;
    addButton();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    document.getElementById('installApp')?.remove();
  });

  const standaloneQuery = window.matchMedia('(display-mode: standalone)');
  standaloneQuery.addEventListener?.('change', event => {
    if (event.matches) document.getElementById('installApp')?.remove();
    else addButton();
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }

  const observer = new MutationObserver(addButton);
  observer.observe(document.documentElement, {childList:true, subtree:true});
  addButton();
})();
