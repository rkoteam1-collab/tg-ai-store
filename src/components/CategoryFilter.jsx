import React from 'react';
import { Sparkles, Search, Percent, CheckCircle2 } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';

export default function CategoryFilter({
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  onlyDiscount,
  onToggleDiscount,
  onlyInStock,
  onToggleInStock
}) {
  const { haptic } = useTelegram();

  const categories = [
    { id: 'all', label: 'Все нейросети', icon: '✨', count: null },
    { id: 'claude', label: 'Claude', icon: '🟧', brand: 'Anthropic', color: 'hover:border-orange-500/50' },
    { id: 'chatgpt', label: 'ChatGPT', icon: '🟩', brand: 'OpenAI', color: 'hover:border-emerald-500/50' },
    { id: 'gemini', label: 'Gemini', icon: '🟦', brand: 'Google', color: 'hover:border-indigo-500/50' },
    { id: 'kimi', label: 'Kimi', icon: '🩵', brand: 'Moonshot', color: 'hover:border-cyan-500/50' },
  ];

  const handleCategoryClick = (id) => {
    haptic.selection();
    onSelectCategory(id);
  };

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Поиск нейросети (Claude, ChatGPT, o1, 2M context...)"
          className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-2xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
          >
            Очистить
          </button>
        )}
      </div>

      {/* Main Categories Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 border ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-lg shadow-blue-600/20 scale-[1.02]'
                  : 'bg-slate-900/60 text-slate-300 border-slate-800/80 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Quick Filters: Discounts and Stock */}
      <div className="flex items-center gap-2 pt-0.5">
        <button
          onClick={() => {
            haptic.selection();
            onToggleDiscount();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
            onlyDiscount
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-slate-900/40 text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
        >
          <Percent className="w-3 h-3 text-amber-400" />
          <span>Только со скидкой</span>
        </button>

        <button
          onClick={() => {
            haptic.selection();
            onToggleInStock();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
            onlyInStock
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-slate-900/40 text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
        >
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span>В наличии</span>
        </button>
      </div>
    </div>
  );
}
