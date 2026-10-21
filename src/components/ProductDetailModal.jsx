import React from 'react';
import { X, Check, Zap, Clock, Plus, Minus, AlertTriangle } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useTelegram } from '../hooks/useTelegram';
import BrandLogo from './BrandLogo';

export default function ProductDetailModal() {
  const { selectedProduct, setSelectedProduct, cart, addToCart, removeFromCart } = useStore();
  const { haptic } = useTelegram();

  if (!selectedProduct) return null;

  const cartItem = cart.find(i => i.id === selectedProduct.id);
  const inCartQty = cartItem ? cartItem.quantity : 0;
  const isAvailable = selectedProduct.inStock && selectedProduct.stock > 0;

  const handleClose = () => {
    haptic.selection();
    setSelectedProduct(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-[#0e121d] border border-white/10 rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="p-5 pb-3 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800/90 border border-white/10 p-1.5 flex items-center justify-center shadow-md">
              <BrandLogo
                logo={selectedProduct.logo}
                category={selectedProduct.category}
                brand={selectedProduct.brand}
                imageUrl={selectedProduct.imageUrl}
                className="w-full h-full"
              />
            </div>
            <div>
              <span className="text-[10px] uppercase font-black tracking-wider text-cyan-400">
                {selectedProduct.brand} • {selectedProduct.tier}
              </span>
              <h3 className="text-base font-bold text-white leading-tight">
                {selectedProduct.name}
              </h3>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 text-slate-400 hover:text-white flex items-center justify-center transition-colors active:scale-90"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          <p className="text-xs text-slate-400 font-medium">{selectedProduct.tagline}</p>

          {/* Description */}
          <div className="bg-slate-900/90 p-4 rounded-2xl border border-white/5 text-xs sm:text-sm leading-relaxed text-slate-200">
            {selectedProduct.description}
          </div>

          {/* Stock & Availability pill */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/60 border border-white/5">
            <span className="text-xs font-medium text-slate-400">Наличие на складе:</span>
            {isAvailable ? (
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                В наличии ({selectedProduct.stock} шт.)
              </span>
            ) : (
              <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                Нет в наличии
              </span>
            )}
          </div>

          {/* Features list */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Возможности тарифа:
            </h4>
            <div className="space-y-2">
              {selectedProduct.features?.map((f, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs text-slate-200">
                  <div className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery speed info */}
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/5 flex items-start gap-3">
            <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-white">Выдача доступа</p>
              <p className="text-[11px] text-slate-400">{selectedProduct.delivery}</p>
            </div>
          </div>
        </div>

        {/* Footer / Add to Cart */}
        <div className="p-5 border-t border-white/5 bg-[#080a11] flex items-center justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">
                {selectedProduct.price?.toLocaleString('ru-RU')} ₽
              </span>
              {selectedProduct.isDiscountActive && selectedProduct.originalPrice > selectedProduct.price && (
                <span className="text-xs text-slate-500 line-through">
                  {selectedProduct.originalPrice?.toLocaleString('ru-RU')} ₽
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-400">Срок: {selectedProduct.duration}</span>
          </div>

          <div>
            {!isAvailable ? (
              <button
                disabled
                className="px-5 py-3 rounded-xl text-xs font-bold bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
              >
                Нет в наличии
              </button>
            ) : inCartQty > 0 ? (
              <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl overflow-hidden p-1 shadow-inner">
                <button
                  onClick={() => removeFromCart(selectedProduct.id)}
                  className="w-9 h-9 flex items-center justify-center text-slate-300 hover:text-white rounded-lg transition-colors active:scale-90"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-9 text-center text-sm font-bold text-white">{inCartQty}</span>
                <button
                  onClick={() => addToCart(selectedProduct)}
                  className="w-9 h-9 flex items-center justify-center text-slate-300 hover:text-white rounded-lg transition-colors active:scale-90"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => addToCart(selectedProduct)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:brightness-110 shadow-lg shadow-blue-600/30 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>В корзину</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
