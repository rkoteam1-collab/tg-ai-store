import React, { useRef } from 'react';
import { ShoppingBag, Sparkles, SlidersHorizontal, LogOut, ShieldCheck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useTelegram } from '../hooks/useTelegram';

export default function Header() {
  const {
    cartItemCount,
    setIsCartOpen,
    setIsAdminOpen,
    isAdminOpen,
    isAdminAuthenticated,
    setIsAdminAuthModalOpen,
    logoutAdmin
  } = useStore();

  const { user, haptic } = useTelegram();

  // Secret triple-tap detection on logo
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef(null);

  const handleSecretLogoClick = () => {
    clickCountRef.current += 1;
    haptic.selection();

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }

    clickTimerRef.current = setTimeout(() => {
      clickCountRef.current = 0;
    }, 800);

    // 3 rapid taps unlocks the secret PIN modal or directly opens if already authenticated
    if (clickCountRef.current >= 3) {
      clickCountRef.current = 0;
      haptic.notification('success');
      if (isAdminAuthenticated) {
        setIsAdminOpen(true);
      } else {
        setIsAdminAuthModalOpen(true);
      }
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#08090d]/85 backdrop-blur-xl border-b border-white/5 px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        {/* Brand & User info with secret 3-tap admin trigger */}
        <div
          onClick={handleSecretLogoClick}
          className="flex items-center gap-3 cursor-pointer select-none group"
          title="AI Store"
        >
          <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 shadow-lg shadow-cyan-500/20 text-white font-black text-lg group-active:scale-95 transition-transform">
            <Sparkles className="w-5 h-5 text-cyan-200 animate-pulse" />
            <span className="absolute -bottom-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                AI Store
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                PRO
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <span>Привет, {user.first_name || 'Гость'}</span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Admin Panel button ONLY visible if owner is authenticated! */}
          {isAdminAuthenticated && (
            <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95">
              <button
                onClick={() => setIsAdminOpen(!isAdminOpen)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                  isAdminOpen
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-lg shadow-cyan-500/20'
                    : 'bg-slate-800/80 text-cyan-400 border-cyan-500/30 hover:bg-slate-800'
                }`}
                title="Панель управления магазином"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Управление</span>
              </button>

              <button
                onClick={logoutAdmin}
                className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-rose-400 border border-white/5 transition-colors"
                title="Выйти из админки"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Cart Button */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white font-medium shadow-md shadow-blue-600/30 hover:brightness-110 active:scale-95 transition-all"
            aria-label="Корзина"
          >
            <ShoppingBag className="w-5 h-5" />
            {cartItemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-rose-500 text-white text-[11px] font-bold border-2 border-[#08090d] shadow-sm animate-scale">
                {cartItemCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
