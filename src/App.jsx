import React,{useMemo,useState} from 'react';
import {ArrowUpRight,ArrowRight} from 'lucide-react';
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
import {useStore} from './context/StoreContext';
import {useTelegram} from './hooks/useTelegram';
export default function App(){
 useTelegram();
 const {products,cartItemCount,cartTotal,setIsCartOpen,isAdminAuthModalOpen,setIsAdminAuthModalOpen}=useStore();
 const [category,setCategory]=useState('all'),[search,setSearch]=useState(''),[stock,setStock]=useState(false),[checkout,setCheckout]=useState(false),[legal,setLegal]=useState(null),[paused,setPaused]=useState(false);
 const filtered=useMemo(()=>products.filter(p=>(category==='all'||p.category===category)&&(!stock||(p.inStock&&p.stock>0))&&[p.name,p.model,p.brand,p.tagline].join(' ').toLowerCase().includes(search.trim().toLowerCase())),[products,category,search,stock]);
 return <div className={'store-shell '+(paused?'motion-paused':'')}><a className="skip-link" href="#catalog">Перейти к каталогу</a><div className="ambient" aria-hidden="true">{Array.from({length:14},(_,i)=><i key={i} style={{left:(i*37%100)+'%',top:(i*23%100)+'%',animationDelay:-i*2+'s'}}/>)}</div>
 <Header paused={paused} onToggleMotion={()=>setPaused(v=>!v)}/><Toast/>
 <main className="store-main"><section className="hero"><div className="hero-copy"><h1>Ваш следующий<br/><em>инструмент.</em></h1><p>Подписки на ИИ для работы,<br className="desktop-break"/> идей и исследований.</p><a href="#catalog" className="hero-link">Найти своё <ArrowRight size={18}/></a></div><div className="orbit-art" aria-hidden="true"><div className="orbit-core">{Array.from({length:7},(_,i)=><span key={i} style={{'--angle':i*25+'deg'}}/>)}</div><i className="orbit-dot"/></div></section>
 <section id="catalog"><div className="catalog-heading"><h2>Каталог</h2><span>Проверено 21.10.2026</span></div><CategoryFilter selectedCategory={category} onSelectCategory={setCategory} searchQuery={search} onSearchChange={setSearch} onlyInStock={stock} onToggleInStock={()=>setStock(v=>!v)}/>
 <div className="product-grid">{filtered.map((p,i)=><ProductCard key={p.id} product={p} index={i}/>)}{!filtered.length&&<div className="empty-state wide"><h3>Ничего не найдено</h3><button className="outline-button" onClick={()=>{setCategory('all');setSearch('');setStock(false);}}>Сбросить фильтры</button></div>}
 <a className="custom-card" href="https://t.me/MaximRkoTeam" target="_blank" rel="noreferrer"><div className="custom-symbol">↗</div><div><h3>Другой сервис</h3><p>Не нашли нужный инструмент?<br/>Обсудим задачу и условия подключения.</p><span>Обсудить задачу <ArrowUpRight size={15}/></span></div><ArrowUpRight className="custom-arrow" size={24}/></a></div><p className="catalog-note">Модели и лимиты зависят от региона и аккаунта. Источники и условия — в карточках.</p><ChannelDiscountBanner/></section></main>
 <Footer onOpenLegal={setLegal}/>{cartItemCount>0&&!checkout&&<button className="floating-cart" onClick={()=>setIsCartOpen(true)}><span>Корзина · {cartItemCount}</span><strong>{cartTotal.toLocaleString('ru-RU')} ₽</strong><ArrowRight size={18}/></button>}
 <ProductDetailModal/><CartDrawer onProceedToCheckout={()=>{setIsCartOpen(false);setCheckout(true);}}/><CheckoutModal isOpen={checkout} onClose={()=>setCheckout(false)} onOpenLegal={setLegal}/><LegalModal isOpen={!!legal} initialTab={legal||'offer'} onClose={()=>setLegal(null)}/><AdminPanel/><AdminAuthModal isOpen={isAdminAuthModalOpen} onClose={()=>setIsAdminAuthModalOpen(false)}/></div>;
}
