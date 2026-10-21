import React, { useState } from 'react';
import {
  X,
  Plus,
  Minus,
  Percent,
  Package,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Save,
  Trash2,
  DollarSign,
  Tag,
  Layers,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useTelegram } from '../hooks/useTelegram';
import BrandLogo from './BrandLogo';

export default function AdminPanel() {
  const {
    products,
    isAdminOpen,
    setIsAdminOpen,
    updateStock,
    toggleInStock,
    updateDiscount,
    updatePrice,
    updateFullProduct,
    addNewProduct,
    deleteProduct,
    resetToDefaults,
    promoCodes,
    showToast
  } = useStore();

  const { haptic } = useTelegram();

  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'add' | 'promos'
  const [editingProductId, setEditingProductId] = useState(null);

  // New product form state
  const [newProdName, setNewProdName] = useState('');
  const [newProdBrand, setNewProdBrand] = useState('Anthropic');
  const [newProdCategory, setNewProdCategory] = useState('claude');
  const [newProdLogo, setNewProdLogo] = useState('claude');
  const [newProdImageUrl, setNewProdImageUrl] = useState('');
  const [newProdTier, setNewProdTier] = useState('Pro');
  const [newProdTagline, setNewProdTagline] = useState('');
  const [newProdDescription, setNewProdDescription] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('2490');
  const [newProdOriginalPrice, setNewProdOriginalPrice] = useState('2990');
  const [newProdStock, setNewProdStock] = useState('10');
  const [newProdBadge, setNewProdBadge] = useState('НОВИНКА');
  const [newProdFeatures, setNewProdFeatures] = useState('Мгновенный доступ к модели\nВысокая скорость генерации\nБез очередей и ограничений');

  if (!isAdminOpen) return null;

  const handleAddNewProductSubmit = (e) => {
    e.preventDefault();
    if (!newProdName.trim()) {
      showToast('Укажите название тарифа', 'warning');
      return;
    }

    const price = Math.max(1, parseInt(newProdPrice) || 990);
    const origPrice = newProdOriginalPrice ? Math.max(price, parseInt(newProdOriginalPrice)) : price;
    const stock = Math.max(0, parseInt(newProdStock) || 0);

    const featuresList = newProdFeatures
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    addNewProduct({
      id: `${newProdCategory}-${Date.now()}`,
      category: newProdCategory,
      brand: newProdBrand,
      logo: newProdLogo,
      imageUrl: newProdImageUrl.trim() || null,
      name: newProdName.trim(),
      tier: newProdTier.trim() || 'Pro',
      tagline: newProdTagline.trim() || 'Премиум доступ к ИИ',
      description: newProdDescription.trim() || 'Быстрый доступ к аккаунту с полным функционалом.',
      price: price,
      originalPrice: origPrice,
      isDiscountActive: origPrice > price,
      discount: origPrice > price ? Math.round(((origPrice - price) / origPrice) * 100) : 0,
      stock: stock,
      inStock: stock > 0,
      badge: newProdBadge.trim() || null,
      duration: '1 месяц',
      delivery: 'Автоматическая выдача на почту или аккаунт',
      features: featuresList.length > 0 ? featuresList : ['Полный доступ к ИИ', 'Высокая скорость']
    });

    // Reset form
    setNewProdName('');
    setNewProdTagline('');
    setNewProdDescription('');
    setNewProdImageUrl('');
    setActiveTab('inventory');
    haptic.notification('success');
  };

  const handleDelete = (id, name) => {
    deleteProduct(id);
    haptic.notification('warning');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-[#0c101c] border border-cyan-500/30 rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 px-5 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-cyan-950/40 via-slate-900 to-indigo-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>Управление магазином</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Добавление новых ИИ, удаление, цены, скидки и пополнение остатков
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              haptic.selection();
              setIsAdminOpen(false);
            }}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors active:scale-90"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/5 bg-slate-900/60 px-4 pt-2 gap-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'inventory'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Каталог и остатки ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('add')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'add'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Добавить новый товар</span>
          </button>

          <button
            onClick={() => setActiveTab('promos')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'promos'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Промокоды</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'inventory' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                <span>Товаров в витрине: <b className="text-white">{products.length} шт.</b></span>
                <button
                  onClick={resetToDefaults}
                  className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Сбросить к исходным</span>
                </button>
              </div>

              {/* Product Cards List */}
              <div className="space-y-3">
                {products.map((product) => {
                  const isAvailable = product.inStock && product.stock > 0;
                  const isExpanded = editingProductId === product.id;

                  return (
                    <div
                      key={product.id}
                      className="p-4 rounded-2xl bg-slate-900/70 border border-white/5 hover:border-slate-700 transition-all space-y-3"
                    >
                      {/* Top row: Brand logo, Name, Availability, Delete */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 p-1 flex items-center justify-center border border-white/10 shrink-0">
                            <BrandLogo
                              logo={product.logo}
                              category={product.category}
                              brand={product.brand}
                              imageUrl={product.imageUrl}
                              className="w-full h-full"
                            />
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-black uppercase text-cyan-400">
                                {product.brand}
                              </span>
                              <span className="text-[10px] text-slate-500">•</span>
                              <span className="text-[10px] px-1 rounded bg-slate-800 text-slate-300">
                                {product.tier}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-white leading-tight">
                              {product.name}
                            </h4>
                          </div>
                        </div>

                        {/* Actions: Toggle In-Stock & Delete Button */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleInStock(product.id)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all border ${
                              isAvailable
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                                : 'bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25'
                            }`}
                          >
                            {isAvailable ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>В наличии</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                                <span>Нет в наличии</span>
                              </>
                            )}
                          </button>

                          {/* Delete product button */}
                          <button
                            onClick={() => handleDelete(product.id, product.name)}
                            className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
                            title="Удалить товар"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Stock Adjustment Controls */}
                      <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-cyan-400 shrink-0" />
                          <span className="text-slate-300 font-semibold">Остаток на складе:</span>
                          <span className="font-mono text-sm font-black text-white px-2 py-0.5 bg-slate-800 rounded">
                            {product.stock} шт.
                          </span>
                        </div>

                        {/* Stepper buttons */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => updateStock(product.id, Math.max(0, product.stock - 1))}
                            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold"
                          >
                            -1
                          </button>
                          <button
                            onClick={() => updateStock(product.id, product.stock + 1)}
                            className="px-2 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold"
                          >
                            +1
                          </button>
                          <button
                            onClick={() => updateStock(product.id, product.stock + 5)}
                            className="px-2.5 h-7 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border border-cyan-500/30 flex items-center justify-center font-bold"
                          >
                            +5
                          </button>
                          <button
                            onClick={() => updateStock(product.id, product.stock + 10)}
                            className="px-2.5 h-7 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/30 flex items-center justify-center font-bold"
                          >
                            +10
                          </button>
                          <button
                            onClick={() => updateStock(product.id, 0)}
                            className="px-2 h-7 rounded-lg bg-rose-900/30 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-[10px]"
                          >
                            Обнулить
                          </button>
                        </div>
                      </div>

                      {/* Pricing & Discounts Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {/* Custom Price editor */}
                        <div className="p-2.5 bg-slate-950/40 rounded-xl border border-white/5 flex items-center justify-between gap-2">
                          <span className="text-slate-400">Ваша цена:</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              defaultValue={product.price}
                              onBlur={(e) => updatePrice(product.id, e.target.value, product.originalPrice)}
                              className="w-24 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-right font-mono font-bold text-white focus:outline-none focus:border-cyan-500"
                            />
                            <span className="text-slate-400">₽</span>
                          </div>
                        </div>

                        {/* Discount controller */}
                        <div className="p-2.5 bg-slate-950/40 rounded-xl border border-white/5 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <Percent className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-slate-400">Скидка:</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              max="90"
                              defaultValue={product.discount || 0}
                              onBlur={(e) => updateDiscount(product.id, e.target.value, product.isDiscountActive)}
                              className="w-14 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-center font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-500"
                            />
                            <span className="text-slate-400">%</span>

                            <button
                              onClick={() => updateDiscount(product.id, product.discount, !product.isDiscountActive)}
                              className={`px-2 py-1 rounded text-[10px] font-bold ${
                                product.isDiscountActive
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-slate-800 text-slate-500'
                              }`}
                            >
                              {product.isDiscountActive ? 'Вкл' : 'Выкл'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expand / Extra controls */}
                      <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                        <button
                          onClick={() => setEditingProductId(isExpanded ? null : product.id)}
                          className="hover:text-cyan-400 flex items-center gap-1 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          <span>{isExpanded ? 'Скрыть настройки' : 'Изменить бейдж, слоган или лого'}</span>
                        </button>
                      </div>

                      {/* Expanded form */}
                      {isExpanded && (
                        <div className="p-3 bg-slate-950/80 rounded-xl border border-white/5 space-y-2.5 text-xs">
                          <div>
                            <label className="block text-slate-400 mb-1">Бейдж карточки (ХИТ, АКЦИЯ, ТОП):</label>
                            <input
                              type="text"
                              defaultValue={product.badge || ''}
                              onBlur={(e) => updateFullProduct({ ...product, badge: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-200"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 mb-1">Слоган:</label>
                            <input
                              type="text"
                              defaultValue={product.tagline || ''}
                              onBlur={(e) => updateFullProduct({ ...product, tagline: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-200"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 mb-1">Ссылка на картинку/логотип (если своя):</label>
                            <input
                              type="text"
                              defaultValue={product.imageUrl || ''}
                              onBlur={(e) => updateFullProduct({ ...product, imageUrl: e.target.value })}
                              placeholder="https://...png / jpg"
                              className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-200"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ADD NEW PRODUCT FORM */}
          {activeTab === 'add' && (
            <form onSubmit={handleAddNewProductSubmit} className="space-y-4">
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-xs text-cyan-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0 text-cyan-400" />
                <span>
                  Заполните поля ниже, чтобы добавить в магазин совершенно новый ИИ или тариф.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Категория:
                  </label>
                  <select
                    value={newProdCategory}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewProdCategory(val);
                      setNewProdLogo(val);
                      const brandMap = {
                        claude: 'Anthropic',
                        chatgpt: 'OpenAI',
                        gemini: 'Google',
                        kimi: 'Moonshot AI',
                        other: 'Custom AI'
                      };
                      setNewProdBrand(brandMap[val] || 'Custom');
                    }}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-cyan-500"
                  >
                    <option value="claude">Claude (Anthropic)</option>
                    <option value="chatgpt">ChatGPT (OpenAI)</option>
                    <option value="gemini">Gemini (Google)</option>
                    <option value="kimi">Kimi (Moonshot AI)</option>
                    <option value="other">Другая нейросеть</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Логотип для квадратика в углу:
                  </label>
                  <select
                    value={newProdLogo}
                    onChange={(e) => setNewProdLogo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-cyan-500"
                  >
                    <option value="claude">🟧 Логотип Claude (Anthropic)</option>
                    <option value="chatgpt">🟩 Логотип ChatGPT (OpenAI)</option>
                    <option value="gemini">🟦 Логотип Gemini (Google)</option>
                    <option value="kimi">🩵 Логотип Kimi (Moonshot)</option>
                    <option value="other">⚡ Иконка молнии (Custom AI)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Название тарифа:
                  </label>
                  <input
                    type="text"
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    placeholder="Например: Midjourney Pro, Grok 3"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-cyan-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Бренд / Компания:
                  </label>
                  <input
                    type="text"
                    value={newProdBrand}
                    onChange={(e) => setNewProdBrand(e.target.value)}
                    placeholder="Midjourney, xAI, Cursor..."
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Custom Image URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>Или своя картинка для логотипа (URL, необязательно):</span>
                </label>
                <input
                  type="text"
                  value={newProdImageUrl}
                  onChange={(e) => setNewProdImageUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Уровень тарифа:
                  </label>
                  <input
                    type="text"
                    value={newProdTier}
                    onChange={(e) => setNewProdTier(e.target.value)}
                    placeholder="Pro / Max / Plus / Ultra"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Бейдж на карточке:
                  </label>
                  <input
                    type="text"
                    value={newProdBadge}
                    onChange={(e) => setNewProdBadge(e.target.value)}
                    placeholder="ХИТ, НОВИНКА, АКЦИЯ"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              {/* Price, Original Price, Stock */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-emerald-400 mb-1">
                    Цена продажи (₽):
                  </label>
                  <input
                    type="number"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    placeholder="1990"
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-500/50 rounded-xl text-xs text-white font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Старая цена (₽):
                  </label>
                  <input
                    type="number"
                    value={newProdOriginalPrice}
                    onChange={(e) => setNewProdOriginalPrice(e.target.value)}
                    placeholder="2490"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-cyan-400 mb-1">
                    Остаток на складе:
                  </label>
                  <input
                    type="number"
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(e.target.value)}
                    placeholder="10"
                    className="w-full px-3 py-2 bg-slate-900 border border-cyan-500/50 rounded-xl text-xs text-white font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Слоган (короткая фраза):
                </label>
                <input
                  type="text"
                  value={newProdTagline}
                  onChange={(e) => setNewProdTagline(e.target.value)}
                  placeholder="Неограниченная генерация и высший приоритет"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Описание:
                </label>
                <textarea
                  value={newProdDescription}
                  onChange={(e) => setNewProdDescription(e.target.value)}
                  rows="2"
                  placeholder="Подробное описание тарифа..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Возможности (каждый пункт с новой строки):
                </label>
                <textarea
                  value={newProdFeatures}
                  onChange={(e) => setNewProdFeatures(e.target.value)}
                  rows="3"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:brightness-110 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Добавить товар в витрину магазина</span>
              </button>
            </form>
          )}

          {/* Promo Codes Tab */}
          {activeTab === 'promos' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Активные промокоды для покупателей:
              </p>

              <div className="space-y-2">
                {promoCodes.map((pr, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        {pr.code}
                      </span>
                      <p className="text-[11px] text-slate-400">{pr.description}</p>
                    </div>
                    <span className="text-xs font-black px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      -{pr.discountPercent}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
