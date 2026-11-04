import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const PWAInstallBanner: React.FC = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Never show inside Electron desktop app
    if (window.navigator.userAgent.includes('Electron')) {
      return;
    }

    // 2. Check if already installed / running in standalone mode
    const standaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    
    setIsStandalone(Boolean(standaloneMode));
    if (standaloneMode) return;

    // 3. Check dismissed flag (dismissed in the last 12 hours)
    const dismissedTime = localStorage.getItem('friends_pos_pwa_dismissed');
    if (dismissedTime && Date.now() - parseInt(dismissedTime, 10) < 12 * 60 * 60 * 1000) {
      return;
    }

    // 4. Check iOS Safari
    const ua = window.navigator.userAgent;
    const isAppleMobile = /iPhone|iPad|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    if (isAppleMobile) {
      setIsIOS(true);
      setIsVisible(true);
      return;
    }

    // 5. Android / Chrome beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsVisible(false);
      }
    } catch (err) {
      console.warn('[PWA] Prompt error:', err);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('friends_pos_pwa_dismissed', Date.now().toString());
  };

  if (!isVisible || isStandalone) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-6 sm:w-96 animate-in fade-in slide-in-from-bottom duration-300">
      <div className="bg-slate-900/95 backdrop-blur-md border border-emerald-500/40 rounded-2xl p-4 shadow-2xl shadow-emerald-950/50 flex flex-col gap-3 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-1.5 flex items-center justify-center shrink-0">
              <img src="/pwa-192x192.png" alt="POS Logo" className="h-full w-full object-contain rounded-lg" />
            </div>
            <div>
              <h4 className="font-bold text-sm tracking-wide text-white flex items-center gap-1.5">
                <span>Friend's POS App</span>
                <span className="text-[10px] bg-emerald-500 text-slate-950 font-extrabold px-1.5 py-0.5 rounded-full uppercase">PWA</span>
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                Install as app for faster access, full screen & tablet mode.
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isIOS ? (
          <div className="bg-slate-800/80 rounded-xl p-2.5 text-xs text-slate-300 flex items-center gap-2 border border-slate-700/60">
            <Share className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>
              Tap <strong className="text-white">Share</strong> button in Safari, then tap <strong className="text-white">Add to Home Screen</strong>.
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleInstallClick}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs py-2.5 px-4 rounded-xl shadow-lg shadow-emerald-500/20 transition active:scale-95 cursor-pointer"
            >
              <Download className="h-4 w-4 stroke-[2.5]" />
              <span>Install POS App</span>
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-2.5 text-xs text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition font-medium"
            >
              Later
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
