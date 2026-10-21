import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import CategoryFilter from './components/CategoryFilter';
import ProductCard from './components/ProductCard';
import ProductDetailModal from './components/ProductDetailModal';
import CartDrawer from './components/CartDrawer';
import CheckoutModal from './components/CheckoutModal';
import AdminPanel from './components/AdminPanel';
import AdminAuthModal from './components/AdminAuthModal';
import ChannelDiscountBanner from './components/ChannelDiscountBanner';
import Footer from './components/Footer';
import LegalModal from './components/LegalModal';
import Toast from './components/Toast';
import { useStore } from './context/StoreContext';
import { useTelegram } from './hooks/useTelegram';
import { Zap, Headphones, Sparkles, AlertCircle, Lock, Globe, Send } from 'lucide-react';

export default function App() {
  const {
    products,
    cart,
    cartTotal,
    cartItemCount,
    isCartOpen,
    setIsCartOpen,
    isAdminAuthModalOpen,
    setIsAdminAuthModalOpen
  } = useStore();
  const { tg } = useTelegram();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyDiscount, setOnlyDiscount] = useState(false);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState('offer');

  const handleOpenLegal = (tab = 'offer') => {
    setLegalTab(tab);
    setIsLegalOpen(true);
  };

  // Telegram MainButton sync
  useEffect(() => {
    if (tg && tg.MainButton) {
      if (cartItemCount > 0 && !isCheckoutOpen) {
        tg.MainButton.setText(`КОРЗИНА (${cartItemCount}) • ${cartTotal.toLocaleString('ru-RU')} ₽`);
        tg.MainButton.show();
        const handleMainClick = () => {
          setIsCartOpen(true);
        };
        tg.MainButton.onClick(handleMainClick);
        return () => {
          tg.MainButton.offClick(handleMainClick);
        };
      } else {
        tg.MainButton.hide();
      }
    }
  }, [tg, cartItemCount, cartTotal, isCheckoutOpen, setIsCartOpen]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category match
      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }
      // Discount filter
      if (onlyDiscount && (!p.isDiscountActive || p.originalPrice <= p.price)) {
        return false;
      }
      // In stock filter
      if (onlyInStock && (!p.inStock || p.stock <= 0)) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = p.name?.toLowerCase().includes(query);
        const matchTier = p.tier?.toLowerCase().includes(query);
        const matchDesc = p.description?.toLowerCase().includes(query);
        const matchTag = p.tagline?.toLowerCase().includes(query);
        const matchBrand = p.brand?.toLowerCase().includes(query);
        if (!matchName && !matchTier && !matchDesc && !matchTag && !matchBrand) {
          return false;
        }
      }
      return true;
    });
  }, [products, selectedCategory, searchQuery, onlyDiscount, onlyInStock]);

  const handleProceedToCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  return (
    <div className="relative min-h-screen bg-[#08090d] text-slate-100 flex flex-col pb-24 overflow-x-hidden selection:bg-cyan-500 selection:text-black">
      {/* Dynamic Animated Ambient Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-10 left-1/4 w-80 h-80 rounded-full bg-cyan-600/15 blur-[100px] animate-float-slow" />
        <div className="absolute top-1/3 -right-20 w-96 h-96 rounded-full bg-purple-600/15 blur-[120px] animate-float-reverse" />
        <div className="absolute bottom-20 left-10 w-72 h-72 rounded-full bg-blue-600/10 blur-[90px] animate-pulse-slow" />
      </div>

      {/* Toast notifications */}
      <Toast />

      {/* Main sticky navigation header */}
      <div className="relative z-40">
        <Header />
      </div>

      <main className="relative z-10 max-w-4xl mx-auto w-full px-2.5 sm:px-4 pt-3 sm:pt-4 space-y-4 sm:space-y-5 flex-1">
        {/* Banner Promo Announcement */}
        <div className="relative overflow-hidden rounded-3xl p-5 border border-white/10 bg-gradient-to-r from-[#0d1322]/90 via-[#141829]/80 to-[#1b152d]/90 backdrop-blur-xl shadow-2xl group hover:border-cyan-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-48 h-48 bg-gradient-to-br from-cyan-500/20 to-purple-600/20 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700 pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-[10px] font-black tracking-widest uppercase text-cyan-400">
                  Мгновенная выдача 24/7
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Премиальный доступ к ИИ (2026)
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
                Актуальные флагманы 2026: Claude 3.7 Sonnet (Hybrid Thinking), ChatGPT Plus & Pro (o3-mini / o1), Gemini 2.0 Pro, Kimi k1.5. Высокая скорость и официальный доступ.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/25 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>Промокод START: -10%</span>
              </span>
            </div>
          </div>
        </div>

        {/* Channel 5% Discount Subscription Banner */}
        <ChannelDiscountBanner />

        {/* Filter & Search controls */}
        <CategoryFilter
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onlyDiscount={onlyDiscount}
          onToggleDiscount={() => setOnlyDiscount(prev => !prev)}
          onlyInStock={onlyInStock}
          onToggleInStock={() => setOnlyInStock(prev => !prev)}
        />

        {/* Products Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <span>Каталог тарифов</span>
              <span className="text-xs font-semibold text-slate-400 bg-slate-900/60 px-2 py-0.5 rounded-md border border-white/5">
                {filteredProducts.length} позиций
              </span>
            </h3>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-white/5 space-y-3 animate-fade-in-up">
              <AlertCircle className="w-10 h-10 text-slate-500 mx-auto" />
              <h4 className="text-base font-bold text-white">Ничего не найдено</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Попробуйте изменить категорию или сбросить фильтры поиска.
              </p>
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                  setOnlyDiscount(false);
                  setOnlyInStock(false);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white"
              >
                Сбросить фильтры
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
              {filteredProducts.map((product) => (
                <div key={product.id} className="animate-fade-in-up">
                  <ProductCard product={product} />
                </div>
              ))}

              {/* Wide Card: Other Custom Service (spans 2 columns) */}
              <div className="col-span-2 relative overflow-hidden rounded-3xl p-4 sm:p-5 border border-cyan-500/20 bg-gradient-to-br from-[#0c1220] via-[#10162a] to-[#18112b] shadow-xl hover:border-cyan-500/40 transition-all duration-300 animate-fade-in-up group">
                <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-gradient-to-br from-cyan-500/15 to-purple-600/15 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700 pointer-events-none" />
                
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-600/20 border border-cyan-500/30 flex items-center justify-center shrink-0 text-cyan-400 shadow-md shadow-cyan-500/10">
                      <Globe className="w-5 h-5 text-cyan-300" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                          Под заказ
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Любая зарубежная подписка
                        </span>
                      </div>
                      <h4 className="text-base sm:text-lg font-black text-white tracking-tight">
                        Другой сервис
                      </h4>
                      <p className="text-xs text-slate-300 mt-0.5 max-w-md leading-relaxed">
                        Пополнить другой зарубежный сервис: Midjourney, Cursor, Spotify, Netflix, GitHub Copilot, Runway или любой другой софт зарубежной картой.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (tg?.openTelegramLink) {
                        tg.openTelegramLink('https://t.me/MaximRkoTeam');
                      } else {
                        window.open('https://t.me/MaximRkoTeam', '_blank');
                      }
                    }}
                    className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs shadow-lg shadow-cyan-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Написать @MaximRkoTeam</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Feature Badges (No warranty, purely service features) */}
        <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-[#0f1320]/60 border border-white/5 flex items-start gap-3 backdrop-blur-md">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/20">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-white">Мгновенная выдача</h5>
              <p className="text-[11px] text-slate-400 mt-0.5">Данные отправляются автоматически после оформления</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0f1320]/60 border border-white/5 flex items-start gap-3 backdrop-blur-md">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-white">Безопасный доступ</h5>
              <p className="text-[11px] text-slate-400 mt-0.5">Индивидуальные чистые аккаунты без общих очередей</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0f1320]/60 border border-white/5 flex items-start gap-3 backdrop-blur-md">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
              <Headphones className="w-4 h-4" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-white">Поддержка 24/7</h5>
              <p className="text-[11px] text-slate-400 mt-0.5">Помощь с подключением и настройкой в любое время</p>
            </div>
          </div>
        </div>
      </main>

      {/* Legal & Business Footer */}
      <Footer onOpenLegal={handleOpenLegal} />

      {/* Floating Bottom Cart Bar */}
      {cartItemCount > 0 && !isCheckoutOpen && !isCartOpen && (
        <div className="fixed bottom-4 left-0 right-0 px-4 z-30 pointer-events-none animate-fade-in-up">
          <div className="max-w-md mx-auto pointer-events-auto">
            <button
              onClick={() => setIsCartOpen(true)}
              className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold text-sm shadow-xl shadow-blue-600/40 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">
                  {cartItemCount}
                </span>
                <span>В корзине {cartItemCount} позиций</span>
              </div>
              <div className="flex items-center gap-1">
                <span>{cartTotal.toLocaleString('ru-RU')} ₽</span>
                <span className="text-xs opacity-75">›</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Modals & Drawers */}
      <ProductDetailModal />
      <CartDrawer onProceedToCheckout={handleProceedToCheckout} />
      <CheckoutModal 
        isOpen={isCheckoutOpen} 
        onClose={() => setIsCheckoutOpen(false)} 
        onOpenLegal={handleOpenLegal}
      />
      <LegalModal
        isOpen={isLegalOpen}
        onClose={() => setIsLegalOpen(false)}
        initialTab={legalTab}
      />
      <AdminPanel />
      <AdminAuthModal
        isOpen={isAdminAuthModalOpen}
        onClose={() => setIsAdminAuthModalOpen(false)}
      />
    </div>
  );
}
