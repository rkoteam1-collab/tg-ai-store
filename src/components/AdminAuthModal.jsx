import React, { useState } from 'react';
import { X, Lock, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useTelegram } from '../hooks/useTelegram';

export default function AdminAuthModal({ isOpen, onClose }) {
  const { verifyAdminPin, setIsAdminOpen } = useStore();
  const { haptic } = useTelegram();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pin.trim()) return;

    setLoading(true);
    setError(false);

    const success = await verifyAdminPin(pin);
    setLoading(false);

    if (success) {
      haptic.notification('success');
      onClose();
      setIsAdminOpen(true);
    } else {
      haptic.notification('error');
      setError(true);
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-xs bg-[#0e1322] border border-cyan-500/30 rounded-3xl p-6 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-cyan-500/20">
          <KeyRound className="w-6 h-6" />
        </div>

        <h3 className="text-base font-extrabold text-white">Доступ владельца</h3>
        <p className="text-[11px] text-slate-400 mt-1 mb-4">
          Введите секретный PIN-код для входа в панель управления
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError(false);
              }}
              placeholder="••••"
              autoFocus
              className={`w-full text-center tracking-[0.5em] text-xl font-bold py-3 bg-slate-900 border rounded-2xl text-white placeholder-slate-600 focus:outline-none transition-all ${
                error
                  ? 'border-rose-500/80 shadow-rose-500/20 shadow-lg'
                  : 'border-slate-700 focus:border-cyan-500'
              }`}
            />
          </div>

          {error && (
            <p className="text-[11px] text-rose-400 font-semibold flex items-center justify-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Неверный PIN-код</span>
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs font-bold transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading || !pin}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold shadow-lg shadow-cyan-500/30 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? 'Проверка...' : 'Войти'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
