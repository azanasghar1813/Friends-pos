import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Smartphone, Globe, Wifi, RefreshCw, ShieldCheck, Settings, Key, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../api/client';

interface TunnelStatus {
  status: string;
  url: string | null;
  lanIp: string;
  allLanIps?: string[];
  port: number;
  isPermanent?: boolean;
  tokenConfigured?: boolean;
  customDomain?: string;
}

interface MobileAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileAccessModal: React.FC<MobileAccessModalProps> = ({ isOpen, onClose }) => {
  const [tunnel, setTunnel] = useState<TunnelStatus>({
    status: 'CONNECTED',
    url: 'https://friends.corevex.tech',
    lanIp: '127.0.0.1',
    port: 5000,
    isPermanent: true,
    tokenConfigured: true,
    customDomain: 'https://friends.corevex.tech'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedIp, setCopiedIp] = useState(false);

  // Custom Domain & Token Configuration State
  const [showConfig, setShowConfig] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [domainInput, setDomainInput] = useState('friends.corevex.tech');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(false);

  const fetchTunnel = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/health/tunnel');
      if (res.data?.success && res.data?.data) {
        setTunnel(res.data.data);
        if (res.data.data.customDomain) {
          setDomainInput(res.data.data.customDomain.replace(/^https?:\/\//, ''));
        }
      }
    } catch (err) {
      console.warn('[MobileAccess] Failed to fetch tunnel status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTunnel();
      setShowConfig(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleStatusChanged = (e: Event) => {
      const customEvent = e as CustomEvent<TunnelStatus>;
      if (customEvent.detail) {
        setTunnel(customEvent.detail);
      }
    };
    window.addEventListener('tunnel-status-changed', handleStatusChanged);
    return () => {
      window.removeEventListener('tunnel-status-changed', handleStatusChanged);
    };
  }, []);

  if (!isOpen) return null;

  const activeUrl = tunnel?.url || (tunnel?.lanIp ? `http://${tunnel.lanIp}:${tunnel.port || 5000}` : window.location.origin);
  const localIpUrl = `http://${tunnel?.lanIp || '127.0.0.1'}:${tunnel?.port || 5000}`;

  const copyToClipboard = (text: string, isIp = false) => {
    navigator.clipboard.writeText(text);
    if (isIp) {
      setCopiedIp(true);
      setTimeout(() => setCopiedIp(false), 2000);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleSaveTunnelConfig = async () => {
    setIsSavingConfig(true);
    setConfigSuccess(false);
    try {
      const formattedDomain = domainInput.trim().startsWith('http') 
        ? domainInput.trim() 
        : `https://${domainInput.trim()}`;

      const res = await apiClient.post('/health/tunnel/config', {
        token: tokenInput.trim(),
        customDomain: domainInput.trim() ? formattedDomain : ''
      });
      if (res.data?.success) {
        setConfigSuccess(true);
        setTimeout(() => {
          setConfigSuccess(false);
          setShowConfig(false);
          fetchTunnel();
        }, 1500);
      }
    } catch (err) {
      console.error('Failed to save tunnel config:', err);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleResetToAuto = async () => {
    setIsSavingConfig(true);
    setTokenInput('');
    try {
      await apiClient.post('/health/tunnel/config', {
        token: '',
        customDomain: ''
      });
      setShowConfig(false);
      setTimeout(() => fetchTunnel(), 1000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingConfig(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-4 sm:p-6 shadow-2xl text-white relative custom-scrollbar">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 flex-wrap">
              <span>Mobile & Waiter Ordering</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold px-2 py-0.5 rounded-full">
                {tunnel?.isPermanent ? 'Permanent Domain' : 'Quick PWA'}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Scan QR code with any phone camera to install & take orders.
            </p>
          </div>
        </div>

        {/* QR Code and Cloudflare Link Box */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col items-center gap-4">
          {/* QR Code Card */}
          <div className="p-3 bg-white rounded-xl shadow-lg flex items-center justify-center">
            {activeUrl ? (
              <QRCodeSVG value={activeUrl} size={160} level="M" />
            ) : (
              <div className="w-[160px] h-[160px] flex items-center justify-center text-slate-400 text-xs">
                Generating QR...
              </div>
            )}
          </div>

          {/* Secure Cloudflare Link (Primary) */}
          <div className="w-full">
            <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
              <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
                <Globe className="h-3.5 w-3.5" />
                <span>{tunnel?.isPermanent ? 'Permanent URL (Custom Domain):' : 'Cloudflare Tunnel Link:'}</span>
              </span>
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>SSL Active</span>
              </span>
            </div>
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs">
              <span className="flex-1 truncate font-mono text-emerald-300 font-bold">
                {tunnel?.url || 'https://friends.corevex.tech'}
              </span>
              <button
                onClick={() => copyToClipboard(tunnel?.url || 'https://friends.corevex.tech', false)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs flex items-center gap-1 shrink-0 transition cursor-pointer"
              >
                {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Local WiFi IP Address (Preserved as requested) */}
          <div className="w-full pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="flex items-center gap-1.5">
                <Wifi className="h-3.5 w-3.5 text-blue-400" />
                <span>Local WiFi IP (Offline / LAN Fallback):</span>
              </span>
            </div>
            <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800 rounded-lg p-2 text-xs">
              <span className="flex-1 truncate font-mono text-slate-300">
                {localIpUrl}
              </span>
              <button
                onClick={() => copyToClipboard(localIpUrl, true)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs flex items-center gap-1 shrink-0 transition cursor-pointer"
              >
                {copiedIp ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedIp ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Toggle Custom Domain / Token Configuration */}
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className="w-full flex items-center justify-between py-2 px-3 bg-slate-800/40 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-xs text-slate-300 transition cursor-pointer font-medium"
          >
            <span className="flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-orange-400" />
              <span>Configure Permanent Domain ({tunnel?.isPermanent ? 'friends.corevex.tech Active' : 'Setup Domain'})</span>
            </span>
            <span className="text-[11px] text-orange-400 font-bold">
              {showConfig ? 'Hide' : 'Configure'}
            </span>
          </button>

          {showConfig && (
            <div className="mt-2 p-3 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs flex flex-col gap-2.5 animate-in fade-in duration-150">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                  Domain / Subdomain:
                </label>
                <input
                  type="text"
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  placeholder="e.g. friends.corevex.tech"
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:ring-1 focus:ring-orange-500 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                  Cloudflare Tunnel Token:
                </label>
                <textarea
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Paste Cloudflare Zero Trust Tunnel Token (eyJh...)"
                  rows={2}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:ring-1 focus:ring-orange-500 outline-none resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={isSavingConfig || !tokenInput.trim()}
                  onClick={handleSaveTunnelConfig}
                  className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {configSuccess ? <CheckCircle2 className="w-4 h-4 text-white" /> : <RefreshCw className={`w-3.5 h-3.5 ${isSavingConfig ? 'animate-spin' : ''}`} />}
                  <span>{configSuccess ? 'Saved & Connected!' : 'Save & Connect'}</span>
                </button>
                {tunnel?.isPermanent && (
                  <button
                    type="button"
                    onClick={handleResetToAuto}
                    className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-xs transition cursor-pointer"
                  >
                    Reset to Quick Tunnel
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-3 bg-slate-800/40 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 flex flex-col gap-1.5">
          <div className="font-semibold text-white flex items-center gap-1.5">
            <span>💡 Waiters / Staff Connect:</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            1. Waiter mobile camera se <strong>QR Code</strong> scan karega.
            <br />
            2. Mobile browser me green <strong>"Install POS App"</strong> banner pr tap karein.
            <br />
            3. App install ho jayegi aur bina kisi login/config k direct orders kitchen mein jayenge!
          </p>
        </div>

        {/* Footer Actions */}
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={fetchTunnel}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Status</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
