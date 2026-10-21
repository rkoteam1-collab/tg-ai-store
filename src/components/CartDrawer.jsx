import React, { useState } from 'react';
import { X, Trash2, Plus, Minus, ArrowRight, Tag, ShoppingBag, CheckCircle, Gift } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useTelegram } from '../hooks/useTelegram';
import BrandLogo from './BrandLogo';

export default function CartDrawer({ onProceedToCheckout }) {
  const {
    cart,
    products,
    cartTotal,
    cartSubtotal,
    promoDiscountAmount,
    channelDiscountAmount,
    channelDiscountApplied,
    cartItemCount,
    isCartOpen,
    setIsCartOpen,
    addToCart,
    removeFromCart,
    removeItemCompletely,
    clearCart,
    appliedPromo,
    applyPromoCode,
    removePromoCode
  } = useStore();

  const { haptic } = useTelegram();
  const [promoInput, setPromoInput] = useState('');

  if (!isCartOpen) return null;

  const handleApplyPromo = (e) => {
    e.preventDefault();
    if (!promoInput.trim()) return;
    if (applyPromoCode(promoInput)) {
      setPromoInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-[#0a0d17] h-full flex flex-col shadow-2xl border-l border-white/10 animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 px-5 border-b border-white/5 flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">Корзина</h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              {cartItemCount}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1 transition-colors"
                title="Очистить корзину"
              >
                Очистить
              </button>
            )}
            <button
              onClick={() => {
                haptic.selection();
                setIsCartOpen(false);
              }}
              className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors active:scale-90"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <div className="w-16 h-16 rounded-3xl bg-slate-900/80 border border-white/5 flex items-center justify-center text-slate-500 mb-4 animate-bounce">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Корзина пуста</h3>
              <p className="text-xs text-slate-400 max-w-xs mb-6">
                Выберите тариф Claude, ChatGPT, Gemini или Kimi в каталоге и добавьте его в заказ.
              </p>
              <button
                onClick={() => setIsCartOpen(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white transition-all shadow-lg shadow-blue-600/30 hover:brightness-110 active:scale-95"
              >
                Перейти к каталогу
              </button>
            </div>
          ) : (
            cart.map((item) => {
              const product = products.find(p => p.id === item.id) || item.product;

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/70 border border-white/5 hover:border-slate-700 transition-all"
                >
                  <div className="w-9 h-9 rounded-xl bg-slate-800 border border-white/10 p-1 flex items-center justify-center shrink-0">
                    <BrandLogo
                      logo={product.logo}
                      category={product.category}
                      brand={product.brand}
                      imageUrl={product.imageUrl}
                      size={20}
                      className="w-full h-full"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">{product.name}</h4>
                    <p className="text-xs font-black text-cyan-400 mt-0.5">
                      {product.price?.toLocaleString('ru-RU')} ₽
                    </p>
                  </div>

                  {/* Quantity & Delete */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-slate-800/90 border border-slate-700 rounded-xl overflow-hidden p-0.5">
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-white rounded-lg transition-colors active:scale-90"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-white">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => addToCart(product)}
                        className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-white rounded-lg transition-colors active:scale-90"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeItemCompletely(item.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors active:scale-90"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Promo code & Summary Section */}
        {cart.length > 0 && (
          <div className="p-4 border-t border-white/5 bg-[#08090d]/95 space-y-3.5">
            {/* Active Channel discount pill */}
            {channelDiscountApplied > 0 && (
              <div className="flex items-center justify-between p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300">
                <div className="flex items-center gap-1.5">
                  <Gift className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Скидка за подписку на @AIshopifystore (-{channelDiscountApplied}%)</span>
                </div>
                <span className="font-bold text-cyan-400">-{channelDiscountAmount} ₽</span>
              </div>
            )}

            {/* Promo code input */}
            <div>
              {appliedPromo ? (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>Промокод <b>{appliedPromo.code}</b> (-{appliedPromo.discountPercent}%)</span>
                  </div>
                  <button
                    onClick={removePromoCode}
                    className="text-xs text-rose-400 hover:underline font-medium"
                  >
                    Отменить
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyPromo} className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                      placeholder="Промокод (START, AI2026)"
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-colors active:scale-95"
                  >
                    Применить
                  </button>
                </form>
              )}
            </div>

            {/* Calculations */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Товары ({cartItemCount} шт.)</span>
                <span>{cartSubtotal.toLocaleString('ru-RU')} ₽</span>
              </div>
              {appliedPromo && (
                <div className="flex justify-between text-emerald-400 font-medium">
                  <span>Скидка по промокоду ({appliedPromo.discountPercent}%)</span>
                  <span>-{promoDiscountAmount.toLocaleString('ru-RU')} ₽</span>
                </div>
              )}
              {channelDiscountApplied > 0 && (
                <div className="flex justify-between text-cyan-400 font-medium">
                  <span>Скидка за подписку ({channelDiscountApplied}%)</span>
                  <span>-{channelDiscountAmount.toLocaleString('ru-RU')} ₽</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-white pt-2 border-t border-white/5">
                <span>Итого к оплате</span>
                <span className="text-cyan-400">{cartTotal.toLocaleString('ru-RU')} ₽</span>
              </div>
            </div>

            {/* Checkout Button */}
            <button
              onClick={() => {
                haptic.impact('heavy');
                onProceedToCheckout();
              }}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:brightness-110 shadow-lg shadow-blue-600/30 active:scale-[0.98] transition-all"
            >
              <span>Оформить заказ</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
