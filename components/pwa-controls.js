'use client';

import { useEffect, useState } from 'react';

export default function PWAControls() {
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});

    const onBeforeInstall = event => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  if (!installPrompt) return null;
  return (
    <button type="button" onClick={install} className="fixed bottom-4 right-4 z-50 rounded-xl bg-saffron-gradient px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:scale-[1.02]">
      Install Gokulam360
    </button>
  );
}
