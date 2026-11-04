import React from 'react';
import {Search,X} from 'lucide-react';
export default function CategoryFilter({selectedType,onSelectType,services,selectedCategory,onSelectCategory,searchQuery,onSearchChange}) {
 return <section className="filters" aria-label="Поиск и фильтры"><div className="search-box"><Search size={20}/><input aria-label="Найти сервис или модель" placeholder="Найти сервис или модель…" value={searchQuery} onChange={e=>onSearchChange(e.target.value)}/>{searchQuery&&<button className="icon-button" aria-label="Очистить поиск" onClick={()=>onSearchChange('')}><X size={16}/></button>}</div>
 <div className="purchase-type-row" role="group" aria-label="Формат покупки">{[['accounts','Аккаунты'],['activation','Активация']].map(([id,label])=><button key={id} type="button" aria-pressed={selectedType===id} className={selectedType===id?'selected':''} onClick={()=>onSelectType(id)}>{label}</button>)}</div>
 <p className="purchase-type-caption">{selectedType==='accounts'?'Готовые аккаунты с доступом к сервису':'Подключение на ваш аккаунт, коды и ссылки'}</p>
 <div className="category-row" role="group" aria-label="Сервис">{services.map(([id,label])=><button key={id} type="button" aria-pressed={selectedCategory===id} className={selectedCategory===id?'selected':''} onClick={()=>onSelectCategory(id)}>{label}</button>)}</div>
 </section>;
}
