import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, UtensilsCrossed, X } from 'lucide-react';

interface WaiterOrderAlert {
  id: string;
  orderNumber: string | number;
  tableNumber: string | number;
  waiterName?: string;
  grandTotal: number;
  itemCount: number;
  orderType?: string;
}

export const WaiterOrderToast: React.FC = () => {
  const [alerts, setAlerts] = useState<WaiterOrderAlert[]>([]);

  useEffect(() => {
    const handleWaiterOrder = (event: Event) => {
      const customEvent = event as CustomEvent<WaiterOrderAlert>;
      const order = customEvent.detail;
      if (!order) return;

      const newAlert = {
        ...order,
        id: `${order.orderNumber}-${Date.now()}`
      };

      setAlerts((prev) => [newAlert, ...prev.slice(0, 2)]); // Keep at most 3 alerts

      // Try playing a gentle chime
      try {
        const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      } catch (_) {}

      // Auto dismiss after 6 seconds
      setTimeout(() => {
        setAlerts((current) => current.filter((a) => a.id !== newAlert.id));
      }, 6000);
    };

    window.addEventListener('waiter-order-received', handleWaiterOrder);
    return () => {
      window.removeEventListener('waiter-order-received', handleWaiterOrder);
    };
  }, []);

  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-16 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="pointer-events-auto bg-slate-900/95 border border-emerald-500/50 rounded-xl p-3 shadow-xl shadow-black/40 backdrop-blur-md animate-in slide-in-from-top-3 fade-in duration-200 text-white flex items-start gap-3"
        >
          <div className="h-9 w-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-400 mt-0.5">
            <Bell className="h-4 w-4 animate-bounce" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="font-bold text-xs text-emerald-400 flex items-center gap-1">
                <span>New Order #{alert.orderNumber}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              </span>
              <button
                onClick={() => setAlerts((prev) => prev.filter((a) => a.id !== alert.id))}
                className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                title="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="text-xs text-slate-200 font-medium mt-0.5 truncate flex items-center gap-1.5">
              <UtensilsCrossed className="h-3 w-3 text-slate-400 shrink-0" />
              <span>
                {alert.tableNumber ? `Table: ${alert.tableNumber}` : 'Dine-In'}
                {alert.waiterName ? ` • ${alert.waiterName}` : ''}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 pt-1 border-t border-slate-800">
              <span className="font-semibold text-white">
                Rs {Number(alert.grandTotal || 0).toLocaleString()} ({alert.itemCount} items)
              </span>
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <CheckCircle2 className="h-3 w-3" />
                <span>KOT Sent</span>
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
