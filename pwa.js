(() => {
  let deferredPrompt = null;

  const isInstalled = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

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
      if (!deferredPrompt) {
        toastInstallHint();
        return;
      }
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      button.remove();
    };
    host.appendChild(button);
  };

  const toastInstallHint = () => {
    const box = document.getElementById('toast');
    if (box) box.innerHTML = '<div class="toast">Use your browser menu and choose “Install app” or “Add to Home screen”.</div>';
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
