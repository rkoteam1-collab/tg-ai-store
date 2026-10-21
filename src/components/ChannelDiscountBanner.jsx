import React, { useState, useEffect } from 'react';
import { Send, CheckCircle, Sparkles, AlertCircle, ArrowUpRight, Gift } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useStore } from '../context/StoreContext';
import { useTelegram } from '../hooks/useTelegram';

export default function ChannelDiscountBanner() {
  const {
    channelDiscountApplied,
    isChannelDiscountClaimed,
    applyChannelDiscount,
    showToast
  } = useStore();

  const { user, tg, haptic } = useTelegram();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const channelUrl = 'https://t.me/AIshopifystore';

  const handleOpenChannel = () => {
    haptic.selection();
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(channelUrl);
    } else {
      window.open(channelUrl, '_blank');
    }
  };

  const handleVerifySubscription = async () => {
    if (!user?.id) {
      showToast('Откройте магазин внутри Telegram-бота для проверки подписки', 'warning');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    haptic.selection();

    try {
      const res = await fetch('/api/check-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await res.json();
      setLoading(false);

      if (data.success) {
        applyChannelDiscount(5);
        showToast('Поздравляем! Скидка 5% за подписку начислена!', 'success');
        haptic.notification('success');

        try {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.7 }
          });
        } catch (e) {}
      } else {
        haptic.notification('warning');
        setErrorMessage(data.message || 'Вы еще не подписались на канал');
        showToast(data.message || 'Подписка не найдена', 'warning');
      }
    } catch (err) {
      setLoading(false);
      setErrorMessage('Сетевая ошибка при проверке');
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-[#0e1322] to-purple-950/40 backdrop-blur-xl shadow-xl transition-all duration-300">
      {/* Ambient background animation */}
      <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-cyan-500/15 rounded-full blur-2xl pointer-events-none animate-pulse-slow" />

      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/20 animate-badge">
            <Gift className="w-5 h-5 text-white" />
          </div>

          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs sm:text-sm font-black text-white tracking-tight">
                Скидка 5% за подписку на канал
              </span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                Разовая акция
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
              Подпишитесь на наш официальный канал <b className="text-cyan-400">@AIshopifystore</b> и получите -5% на заказ
            </p>
          </div>
        </div>

        {/* Buttons / Status */}
        <div className="w-full sm:w-auto flex items-center gap-2 pt-1 sm:pt-0">
          {channelDiscountApplied ? (
            <div className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-bold shadow-md shadow-emerald-500/10">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Скидка 5% активна!</span>
            </div>
          ) : isChannelDiscountClaimed ? (
            <div className="w-full sm:w-auto text-center px-3 py-2 rounded-xl bg-slate-800 text-slate-400 text-[11px] font-medium border border-white/5">
              Скидка уже использована ранее
            </div>
          ) : (
            <div className="w-full sm:w-auto flex items-center gap-2">
              <button
                onClick={handleOpenChannel}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-200 bg-slate-800/80 hover:bg-slate-700 hover:text-white border border-slate-700 transition-colors active:scale-95"
              >
                <span>В канал</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleVerifySubscription}
                disabled={loading}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:brightness-110 shadow-lg shadow-cyan-500/30 active:scale-95 transition-all disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-200 animate-pulse" />
                <span>{loading ? 'Проверка...' : 'Проверить -5%'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="mt-2.5 p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[11px] text-rose-300 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
