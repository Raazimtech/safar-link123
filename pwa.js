(() => {
  let deferredPrompt = null;
  const addButton = () => {
    if (document.getElementById('installApp')) return;
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
    event.preventDefault();
    deferredPrompt = event;
    addButton();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    document.getElementById('installApp')?.remove();
  });
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }
  const observer = new MutationObserver(addButton);
  observer.observe(document.documentElement, {childList:true, subtree:true});
  addButton();
})();
