import { useEffect, useState } from 'react';
import { Download, RefreshCw, WifiOff } from 'lucide-react';
import { setServerAvailable } from '../../services/connectivity';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [serverReachable, setServerReachable] = useState(true);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    const check = async () => {
      if (!navigator.onLine) { setOnline(false); setServerReachable(false); setServerAvailable(false); return; }
      setOnline(true);
      try {
        const response = await fetch('/api/health', { cache: 'no-store', signal: AbortSignal.timeout(5000) });
        const payload = await response.json();
        const reachable = response.ok && payload?.api === 'ok' && payload?.database === 'ok';
        setServerReachable(reachable);
        setServerAvailable(reachable);
      } catch { setServerReachable(false); setServerAvailable(false); }
    };
    const connected = () => { setOnline(true); void check(); };
    const disconnected = () => { setOnline(false); setServerReachable(false); setServerAvailable(false); };
    const install = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent); };
    const updated = () => setUpdateReady(true);
    window.addEventListener('online', connected);
    window.addEventListener('offline', disconnected);
    window.addEventListener('beforeinstallprompt', install);
    window.addEventListener('pravia:sw-update', updated);
    void check();
    const timer = window.setInterval(check, 30_000);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('online', connected);
      window.removeEventListener('offline', disconnected);
      window.removeEventListener('beforeinstallprompt', install);
      window.removeEventListener('pravia:sw-update', updated);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const update = async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
  };

  return <>
    {(!online || !serverReachable) && <div className="connectivity-banner" role="alert"><WifiOff size={17} /><span><strong>Sin conexión al servidor.</strong> Las operaciones están bloqueadas para proteger la información.</span></div>}
    {(installPrompt || updateReady) && <div className="pwa-action" role="status">
      <span>{updateReady ? 'Hay una actualización de PRAVIA lista.' : 'Instala PRAVIA como aplicación en este equipo.'}</span>
      <button className="btn btn-primary btn-sm" type="button" onClick={() => void (updateReady ? update() : install())}>{updateReady ? <RefreshCw size={15} /> : <Download size={15} />}{updateReady ? 'Actualizar' : 'Instalar'}</button>
    </div>}
  </>;
}
