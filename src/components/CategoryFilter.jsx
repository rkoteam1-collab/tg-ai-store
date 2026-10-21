import React from 'react';
import {Search,X} from 'lucide-react';
export default function CategoryFilter({selectedCategory,onSelectCategory,searchQuery,onSearchChange,onlyInStock,onToggleInStock}) {
 return <section className="filters" aria-label="Поиск и фильтры"><div className="search-box"><Search size={20}/><input aria-label="Найти сервис или модель" placeholder="Найти сервис или модель…" value={searchQuery} onChange={e=>onSearchChange(e.target.value)}/>{searchQuery&&<button className="icon-button" aria-label="Очистить поиск" onClick={()=>onSearchChange('')}><X size={16}/></button>}</div>
 <div className="category-row">{[['all','Все'],['claude','Claude'],['chatgpt','ChatGPT'],['gemini','Gemini'],['kimi','Kimi'],['midjourney','Midjourney']].map(([id,label])=><button key={id} aria-pressed={selectedCategory===id} className={selectedCategory===id?'selected':''} onClick={()=>onSelectCategory(id)}>{label}</button>)}</div>
 <label className="stock-toggle"><input type="checkbox" checked={onlyInStock} onChange={onToggleInStock}/> Только доступные к заказу</label></section>;
}
