import React from 'react';
import { Plus, Minus, Check, Clock, AlertTriangle } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useTelegram } from '../hooks/useTelegram';
import BrandLogo from './BrandLogo';

export default function ProductCard({ product }) {
  const { cart, addToCart, removeFromCart, setSelectedProduct } = useStore();
  const { haptic } = useTelegram();

  const cartItem = cart.find(item => item.id === product.id);
  const inCartQty = cartItem ? cartItem.quantity : 0;
  const isAvailable = product.inStock && product.stock > 0;

  const brandThemes = {
    claude: {
      accent: 'text-amber-400',
      badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      gradient: 'from-[#1a1412]/80 via-[#121520]/80 to-[#0c0e17]/90',
      border: 'border-amber-500/20 hover:border-amber-500/60 hover:shadow-glow-claude',
      iconBox: 'bg-gradient-to-br from-amber-600/30 to-orange-700/20 text-amber-300 border-amber-500/30',
      tag: 'Anthropic'
    },
    chatgpt: {
      accent: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      gradient: 'from-[#0d1a16]/80 via-[#121520]/80 to-[#0c0e17]/90',
      border: 'border-emerald-500/20 hover:border-emerald-500/60 hover:shadow-glow-chatgpt',
      iconBox: 'bg-gradient-to-br from-emerald-600/30 to-teal-700/20 text-emerald-300 border-emerald-500/30',
      tag: 'OpenAI'
    },
    gemini: {
      accent: 'text-indigo-400',
      badgeBg: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
      gradient: 'from-[#141224]/80 via-[#121520]/80 to-[#0c0e17]/90',
      border: 'border-indigo-500/20 hover:border-indigo-500/60 hover:shadow-glow-gemini',
      iconBox: 'bg-gradient-to-br from-indigo-600/30 to-blue-700/20 text-indigo-300 border-indigo-500/30',
      tag: 'Google'
    },
    kimi: {
      accent: 'text-cyan-400',
      badgeBg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
      gradient: 'from-[#0b1b22]/80 via-[#121520]/80 to-[#0c0e17]/90',
      border: 'border-cyan-500/20 hover:border-cyan-500/60 hover:shadow-glow-kimi',
      iconBox: 'bg-gradient-to-br from-cyan-600/30 to-sky-700/20 text-cyan-300 border-cyan-500/30',
      tag: 'Moonshot AI'
    }
  };

  const theme = brandThemes[product.category] || brandThemes.claude;

  const handleCardClick = () => {
    haptic.selection();
    setSelectedProduct(product);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group relative rounded-2xl sm:rounded-3xl p-3 sm:p-5 border transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-xl ${theme.border} bg-gradient-to-b ${theme.gradient} shadow-lg hover:-translate-y-1 hover:shadow-2xl active:scale-[0.99] flex flex-col justify-between`}
    >
      {/* Dynamic ambient flare */}
      <div className="absolute -top-10 -right-10 w-24 sm:w-32 h-24 sm:h-32 bg-white/5 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />

      <div>
        {/* Top bar: Brand Logo & Badges */}
        <div className="flex items-start justify-between gap-1.5 mb-2 sm:mb-3">
          {/* Logo */}
          <div className={`w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center p-1 sm:p-2 border shadow-md group-hover:scale-105 transition-all duration-300 ${theme.iconBox}`}>
            <BrandLogo
              logo={product.logo}
              category={product.category}
              brand={product.brand}
              imageUrl={product.imageUrl}
              size={22}
              className="w-full h-full"
            />
          </div>

          {/* Badges / Stock */}
          <div className="flex flex-col items-end gap-1">
            {product.badge && (
              <span className="px-1.5 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black tracking-wide uppercase bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-sm shadow-rose-500/20 animate-badge">
                {product.badge}
              </span>
            )}

            {isAvailable ? (
              <span className="flex items-center gap-1 text-[9px] sm:text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>{product.stock} шт.</span>
              </span>
            ) : (
              <span className="flex items-center gap-0.5 text-[9px] sm:text-[11px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 whitespace-nowrap">
                <AlertTriangle className="w-2.5 h-2.5 text-rose-400 shrink-0" />
                <span>Нет</span>
              </span>
            )}
          </div>
        </div>

        {/* Brand tag & Tier */}
        <div className="flex items-center gap-1 mb-0.5">
          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-400 truncate">
            {product.brand || theme.tag}
          </span>
          <span className="text-[9px] sm:text-[10px] text-slate-500">•</span>
          <span className={`text-[9px] sm:text-[10px] px-1 py-0.2 rounded font-semibold border ${theme.badgeBg} truncate`}>
            {product.tier}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-xs sm:text-base font-black text-white tracking-tight leading-tight mb-1 truncate">
          {product.name}
        </h3>

        {/* Tagline */}
        <p className="text-[10px] sm:text-xs text-slate-300 font-medium line-clamp-1 mb-2">
          {product.tagline}
        </p>

        {/* Features preview (1-2 bullets on mobile, 3 on larger) */}
        <ul className="space-y-1 mb-3">
          {product.features?.slice(0, 2).map((feat, idx) => (
            <li key={idx} className="flex items-start gap-1.5 text-[10px] sm:text-xs text-slate-300 leading-tight">
              <Check className={`w-3 h-3 mt-0.5 shrink-0 ${theme.accent}`} />
              <span className="line-clamp-1">{feat}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Price & Action Button Footer */}
      <div
        className="flex items-center justify-between pt-2.5 border-t border-white/5 gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0">
          <div className="flex items-baseline gap-1 flex-wrap">
            <span className="text-sm sm:text-xl font-black text-white tracking-tight whitespace-nowrap">
              {product.price?.toLocaleString('ru-RU')} ₽
            </span>
            {product.isDiscountActive && product.originalPrice > product.price && (
              <span className="text-[9px] sm:text-xs text-slate-500 line-through whitespace-nowrap">
                {product.originalPrice?.toLocaleString('ru-RU')} ₽
              </span>
            )}
          </div>
          <span className="text-[9px] sm:text-[10px] text-slate-400 flex items-center gap-0.5 mt-0.5">
            <Clock className="w-2.5 h-2.5 text-slate-500 shrink-0" />
            <span className="truncate">{product.duration || '1 мес'}</span>
          </span>
        </div>

        {/* Cart button */}
        <div className="shrink-0">
          {!isAvailable ? (
            <button
              disabled
              className="px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl text-[10px] sm:text-xs font-semibold bg-slate-800/60 text-slate-500 border border-slate-700/40 cursor-not-allowed"
            >
              Распродано
            </button>
          ) : inCartQty > 0 ? (
            <div className="flex items-center bg-slate-800/90 border border-slate-700 rounded-xl overflow-hidden p-0.5 shadow-inner">
              <button
                onClick={() => removeFromCart(product.id)}
                className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors active:scale-90"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-5 sm:w-6 text-center text-[11px] sm:text-xs font-bold text-white">
                {inCartQty}
              </span>
              <button
                onClick={() => addToCart(product)}
                className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors active:scale-90"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => addToCart(product)}
              className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:brightness-110 shadow-md shadow-blue-600/30 active:scale-95 transition-all duration-200"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">В корзину</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
