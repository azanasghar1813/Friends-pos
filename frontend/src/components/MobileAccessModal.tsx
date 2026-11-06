import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Smartphone, Globe, Wifi, RefreshCw, ShieldCheck } from 'lucide-react';
import { apiClient } from '../api/client';

interface TunnelStatus {
  status: string;
  url: string | null;
  lanIp: string;
  allLanIps?: string[];
  port: number;
}

interface MobileAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileAccessModal: React.FC<MobileAccessModalProps> = ({ isOpen, onClose }) => {
  const [tunnel, setTunnel] = useState<TunnelStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedIp, setCopiedIp] = useState(false);

  const fetchTunnel = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/health/tunnel');
      if (res.data?.success && res.data?.data) {
        setTunnel(res.data.data);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-white relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Mobile & Waiter Ordering</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold px-2 py-0.5 rounded-full">
                PWA Ready
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
              <QRCodeSVG value={activeUrl} size={170} level="M" />
            ) : (
              <div className="w-[170px] h-[170px] flex items-center justify-center text-slate-400 text-xs">
                Generating QR...
              </div>
            )}
          </div>

          {/* Secure Cloudflare Link (Primary) */}
          <div className="w-full">
            <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
              <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
                <Globe className="h-3.5 w-3.5" />
                <span>Secure Cloudflare Link (Direct Install):</span>
              </span>
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>SSL Active</span>
              </span>
            </div>
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs">
              <span className="flex-1 truncate font-mono text-emerald-300">
                {tunnel?.url || 'Connecting tunnel...'}
              </span>
              <button
                disabled={!tunnel?.url}
                onClick={() => tunnel?.url && copyToClipboard(tunnel.url, false)}
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

        {/* Instructions */}
        <div className="mt-4 bg-slate-800/40 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 flex flex-col gap-1.5">
          <div className="font-semibold text-white flex items-center gap-1.5">
            <span>💡 How Staff / Waiters Connect:</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            1. Waiter mobile camera se upar diya gaya <strong>QR Code</strong> scan karega.
            <br />
            2. Mobile par green <strong>"Install POS App"</strong> button par tap karein.
            <br />
            3. App home screen par install ho jayegi aur orders live kitchen mein punch honge!
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between mt-5 pt-3 border-t border-slate-800">
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
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
