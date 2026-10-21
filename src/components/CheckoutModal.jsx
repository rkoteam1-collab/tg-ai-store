import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle, CreditCard, Sparkles, Send, ShieldCheck, Mail, User, Info, ArrowLeft, ExternalLink, Copy, Check, Loader2, QrCode } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useStore } from '../context/StoreContext';
import { useTelegram } from '../hooks/useTelegram';

export default function CheckoutModal({ isOpen, onClose, onOpenLegal }) {
  const { cart, products, cartTotal, appliedPromo, clearCart, showToast } = useStore();
  const { user, tg, isTelegram, haptic } = useTelegram();

  const [email, setEmail] = useState('');
  const [selectedPayment, setSelectedPayment] = useState('sbp');
  const [isGenerating, setIsGenerating] = useState(false);
  const [sbpInvoice, setSbpInvoice] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderReceipt, setOrderReceipt] = useState(null);
  const [copied, setCopied] = useState(false);
  const pollIntervalRef = useRef(null);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const paymentMethods = [
    {
      id: 'sbp',
      name: 'СБП Альфа-Банк (Сумма автоматически)',
      tag: '0.4% комиссия • 1 клик • МИР, Сбер, Т-Банк, Альфа',
      icon: '⚡',
      status: 'Автоматически',
      isDefault: true
    },
    {
      id: 'stars',
      name: 'Telegram Stars (Звёзды)',
      tag: 'Внутри Telegram',
      icon: '⭐',
      status: 'Скоро'
    },
    {
      id: 'crypto',
      name: 'Криптовалюта (USDT / TON)',
      tag: 'CryptoBot / Web3',
      icon: '💎',
      status: 'Скоро'
    }
  ];

  // Start payment generation via Alfa-Bank SBP API
  const handleProceedToPayment = async () => {
    if (!email.trim() || !email.includes('@')) {
      showToast('Пожалуйста, укажите email для отправки чека и доступа', 'warning');
      return;
    }

    if (selectedPayment !== 'sbp') {
      showToast('В данный момент доступна оплата через СБП Альфа-Банк', 'info');
      return;
    }

    setIsGenerating(true);
    haptic.selection();

    try {
      const itemsSummary = cart.map(item => {
        const p = products.find(prod => prod.id === item.id) || item.product;
        return {
          id: item.id,
          name: p?.name || 'AI Подписка',
          quantity: item.quantity,
          price: p?.price || 0
        };
      });

      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: cartTotal,
          email,
          items: itemsSummary,
          telegramId: user?.id,
          username: user?.username || user?.first_name
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Ошибка создания счета в СБП');
      }

      setSbpInvoice({
        orderId: data.orderId,
        amount: data.amount,
        qrUrl: data.qrUrl,
        qrImage: data.qrImage
      });

      // Start automatic polling for payment confirmation every 2.5s
      startPaymentPolling(data.orderId);
    } catch (err) {
      console.error('Payment create error:', err);
      showToast(err.message || 'Не удалось сформировать счет СБП', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Poll server for payment status
  const startPaymentPolling = (orderId) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/status/${orderId}`);
        const data = await res.json();
        if (data.success && data.status === 'paid') {
          clearInterval(pollIntervalRef.current);
          handlePaymentSuccess(orderId);
        }
      } catch (e) {}
    }, 2500);
  };

  const handlePaymentSuccess = (orderId) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    const itemsSummary = cart.map(item => {
      const p = products.find(prod => prod.id === item.id) || item.product;
      return `${p.name} (x${item.quantity}) - ${p.price * item.quantity} ₽`;
    });

    const receipt = {
      orderId,
      date: new Date().toLocaleString('ru-RU'),
      email,
      total: cartTotal,
      promo: appliedPromo?.code || null,
      items: itemsSummary,
      paymentMethod: 'СБП Альфа-Банк'
    };

    setOrderReceipt(receipt);
    setIsSuccess(true);
    setSbpInvoice(null);
    haptic.notification('success');

    try {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    } catch (e) {}

    clearCart();
  };

  const handleCopyLink = () => {
    if (sbpInvoice?.qrUrl) {
      navigator.clipboard.writeText(sbpInvoice.qrUrl);
      setCopied(true);
      showToast('Ссылка СБП скопирована', 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenBankApp = () => {
    if (!sbpInvoice?.qrUrl) return;
    haptic.impact('medium');
    if (isTelegram && tg?.openLink) {
      tg.openLink(sbpInvoice.qrUrl);
    } else {
      window.open(sbpInvoice.qrUrl, '_blank');
    }
  };

  const handleClose = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setIsSuccess(false);
    setOrderReceipt(null);
    setSbpInvoice(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-[#0c0f17] border border-white/10 rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 px-5 border-b border-white/5 flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center gap-2">
            {sbpInvoice && !isSuccess && (
              <button
                onClick={() => {
                  if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                  setSbpInvoice(null);
                }}
                className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center mr-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            )}
            <h3 className="text-sm font-bold text-white">
              {isSuccess ? 'Заказ успешно оплачен!' : sbpInvoice ? 'Оплата через СБП' : 'Оформление заказа'}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* 1. Success Receipt View */}
          {isSuccess && orderReceipt ? (
            <div className="space-y-4 text-center animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <CheckCircle className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-lg font-black text-white">Оплата получена!</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Заказ <span className="font-mono text-cyan-400 font-bold">{orderReceipt.orderId}</span> принят в обработку
                </p>
              </div>

              <div className="bg-slate-900/80 border border-white/5 rounded-2xl p-4 text-left space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Сумма платежа:</span>
                  <span className="font-bold text-white">{orderReceipt.total.toLocaleString('ru-RU')} ₽</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Способ оплаты:</span>
                  <span className="text-cyan-400 font-semibold">{orderReceipt.paymentMethod}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Email для чека:</span>
                  <span className="text-slate-200">{orderReceipt.email}</span>
                </div>
                <div className="pt-2 border-t border-white/5">
                  <span className="text-slate-400 block mb-1">Оплаченные подписки:</span>
                  <ul className="space-y-1 font-medium text-slate-200 pl-2">
                    {orderReceipt.items.map((it, idx) => (
                      <li key={idx} className="list-disc text-[11px]">{it}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-left text-[11px] text-emerald-300 flex items-start gap-2">
                <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                <span>
                  Электронный чек сформирован по 54-ФЗ. Данные для активации отправляются на вашу почту и в личные сообщения бота.
                </span>
              </div>

              <button
                onClick={handleClose}
                className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/30 transition-all"
              >
                Вернуться в магазин
              </button>
            </div>
          ) : sbpInvoice ? (
            /* 2. Dynamic SBP Payment Screen (Exact sum locked!) */
            <div className="space-y-4 text-center animate-in fade-in duration-300">
              
              <div className="p-4 rounded-2xl bg-gradient-to-br from-red-950/30 via-slate-900/80 to-slate-950 border border-red-500/20 text-center space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-xs text-red-400 font-semibold mb-1">
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                  <span>СБП Альфа-Банк • Сумма зафиксирована</span>
                </div>
                <div className="text-2xl font-black text-white tracking-tight">
                  {sbpInvoice.amount.toLocaleString('ru-RU')} ₽
                </div>
                <div className="text-[11px] text-slate-400">
                  Заказ: <span className="font-mono text-cyan-300">{sbpInvoice.orderId}</span>
                </div>
              </div>

              {/* QR Code Presentation */}
              <div className="p-4 bg-white rounded-2xl mx-auto w-56 h-56 flex items-center justify-center shadow-xl shadow-red-500/10 relative group">
                {sbpInvoice.qrImage ? (
                  <img
                    src={sbpInvoice.qrImage}
                    alt="СБП QR Код"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-slate-900 text-center p-3">
                    <QrCode className="w-12 h-12 mx-auto text-slate-800 mb-2" />
                    <p className="text-[11px] font-bold">Нажмите кнопку оплаты ниже</p>
                  </div>
                )}
              </div>

              {/* Direct App Launch Button */}
              <div className="space-y-2">
                <button
                  onClick={handleOpenBankApp}
                  className="w-full py-3.5 rounded-2xl font-black text-xs text-white bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:brightness-110 shadow-lg shadow-red-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Оплатить в приложении банка (СБП)</span>
                </button>

                <button
                  onClick={handleCopyLink}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs border border-white/5 transition-all flex items-center justify-center gap-2"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{copied ? 'Ссылка СБП скопирована' : 'Скопировать ссылку СБП'}</span>
                </button>
              </div>

              {/* Polling / Waiting Indicator */}
              <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5 flex items-center justify-center gap-2.5 text-xs text-slate-400">
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                <span>Ожидаем подтверждения оплаты банком...</span>
              </div>
            </div>
          ) : (
            /* 3. Checkout Form View */
            <div className="space-y-4">
              {/* Telegram User Details */}
              <div className="p-3 rounded-2xl bg-slate-900/60 border border-white/5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold border border-cyan-500/20">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">
                    {user?.first_name || 'Покупатель'} {user?.last_name || ''}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {user?.username ? `@${user.username}` : (user?.id ? `ID: ${user.id}` : 'Telegram клиент')}
                  </p>
                </div>
              </div>

              {/* Email Input for 54-FZ Check & Account Credentials */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Куда отправить чек (54-ФЗ) и доступы:</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your-email@gmail.com"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all font-medium"
                  required
                />
              </div>

              {/* Payment Methods */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Способ оплаты:</span>
                  </label>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                    СБП Подключено
                  </span>
                </div>

                <div className="space-y-2">
                  {paymentMethods.map((method) => {
                    const isSelected = selectedPayment === method.id;
                    return (
                      <div
                        key={method.id}
                        onClick={() => {
                          haptic.selection();
                          setSelectedPayment(method.id);
                        }}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-red-950/20 border-red-500/50 shadow-md shadow-red-500/10'
                            : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{method.icon}</span>
                          <div>
                            <p className="text-xs font-bold text-white">{method.name}</p>
                            <p className="text-[10px] text-slate-400">{method.tag}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                            {method.status}
                          </span>
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? 'border-red-500 bg-red-500 text-white'
                                : 'border-slate-600'
                            }`}
                          >
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Order total */}
              <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5 flex items-center justify-between text-xs">
                <span className="text-slate-400">Итого к оплате:</span>
                <span className="text-base font-black text-white">
                  {cartTotal.toLocaleString('ru-RU')} ₽
                </span>
              </div>

              {/* Legal Consent Notice */}
              <div className="text-[10px] text-slate-400 text-center leading-normal px-1">
                Оформляя заказ, вы безоговорочно соглашаетесь с условиями{' '}
                <button
                  type="button"
                  onClick={() => onOpenLegal && onOpenLegal('offer')}
                  className="text-cyan-400 underline hover:text-cyan-300"
                >
                  Публичной оферты
                </button>{' '}
                и даете{' '}
                <button
                  type="button"
                  onClick={() => onOpenLegal && onOpenLegal('privacy')}
                  className="text-cyan-400 underline hover:text-cyan-300"
                >
                  согласие на обработку данных (152-ФЗ)
                </button>
                .
              </div>

              {/* Payment Submit Button */}
              <button
                onClick={handleProceedToPayment}
                disabled={isGenerating}
                className="w-full py-3.5 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:brightness-110 shadow-lg shadow-red-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Связываемся с банком...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Оплатить {cartTotal.toLocaleString('ru-RU')} ₽ через СБП</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
