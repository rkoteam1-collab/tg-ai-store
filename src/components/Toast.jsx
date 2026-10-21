import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export default function Toast() {
  const { toastMessage } = useStore();

  if (!toastMessage) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-400 shrink-0" />
  };

  const borders = {
    success: 'border-emerald-500/40 bg-emerald-950/90 text-emerald-100 shadow-emerald-950/50',
    warning: 'border-amber-500/40 bg-amber-950/90 text-amber-100 shadow-amber-950/50',
    error: 'border-rose-500/40 bg-rose-950/90 text-rose-100 shadow-rose-950/50',
    info: 'border-blue-500/40 bg-slate-900/95 text-slate-100 shadow-slate-950/50'
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-sm pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-top-4">
      <div className={`flex items-center gap-3 p-3.5 rounded-2xl border shadow-xl backdrop-blur-xl pointer-events-auto ${borders[toastMessage.type] || borders.info}`}>
        {icons[toastMessage.type] || icons.info}
        <p className="text-sm font-medium leading-snug flex-1">{toastMessage.text}</p>
      </div>
    </div>
  );
}
