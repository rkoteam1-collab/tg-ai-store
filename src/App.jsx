import React,{lazy,Suspense,useEffect,useMemo,useState} from 'react';
import {ArrowUpRight,ArrowRight} from 'lucide-react';
import Header from './components/Header';
import CategoryFilter from './components/CategoryFilter';
import ProductCard from './components/ProductCard';
const ProductDetailModal=lazy(()=>import('./components/ProductDetailModal'));
const CartDrawer=lazy(()=>import('./components/CartDrawer'));
const CheckoutModal=lazy(()=>import('./components/CheckoutModal'));
const AdminPanel=lazy(()=>import('./components/AdminPanel'));
const AdminAuthModal=lazy(()=>import('./components/AdminAuthModal'));
import ChannelDiscountBanner from './components/ChannelDiscountBanner';
import Footer from './components/Footer';
const LegalModal=lazy(()=>import('./components/LegalModal'));
import Toast from './components/Toast';
import {useStore} from './context/StoreContext';
import {useTelegram} from './hooks/useTelegram';
export default function App(){
 useTelegram();
 useEffect(()=>{window.aiShopifyBootComplete?.();},[]);
 const {products,connection,refreshCatalog,cartItemCount,cartTotal,setIsCartOpen,isAdminAuthModalOpen,setIsAdminAuthModalOpen,isAdminOpen,isCartOpen,selectedProduct}=useStore();
 const [category,setCategory]=useState('all'),[search,setSearch]=useState(''),[stock,setStock]=useState(false),[checkout,setCheckout]=useState(false),[legal,setLegal]=useState(null),[paused,setPaused]=useState(false);
 const [hidden,setHidden]=useState(document.hidden);
 useEffect(()=>{const update=()=>setHidden(document.hidden);document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update);},[]);
 const motionStopped=paused||hidden||checkout||legal||isAdminOpen||isAdminAuthModalOpen||isCartOpen||!!selectedProduct;
 const filtered=useMemo(()=>products.filter(p=>(category==='all'||p.category===category)&&(!stock||(p.inStock&&p.stock>0))&&[p.name,p.model,p.brand,p.tagline].join(' ').toLowerCase().includes(search.trim().toLowerCase())),[products,category,search,stock]);
 return <div className={'store-shell '+(motionStopped?'motion-paused':'')}><a className="skip-link" href="#catalog">Перейти к каталогу</a><div className="ambient" aria-hidden="true">{Array.from({length:6},(_,i)=><i key={i} style={{left:(i*37%100)+'%',top:(i*23%100)+'%',animationDelay:-i*2+'s'}}/>)}</div>
 <Header paused={paused} onToggleMotion={()=>setPaused(v=>!v)}/><Toast/>
 <main className="store-main"><section className="hero"><div className="hero-copy"><h1>Ваш следующий<br/><em>инструмент.</em></h1><p>Подписки на ИИ для работы,<br className="desktop-break"/> идей и исследований.</p><a href="#catalog" className="hero-link">Найти своё <ArrowRight size={18}/></a></div><div className="orbit-art" aria-hidden="true"><div className="orbit-core">{Array.from({length:7},(_,i)=><span key={i} style={{'--angle':i*25+'deg'}}/>)}</div><i className="orbit-dot"/></div></section>
 <section id="catalog">{connection!=='ready'&&<div className="connection-status" role="status">{connection==='connecting'?'Соединяемся с сервером. Каталог уже можно смотреть.':'Сервер пока недоступен. Цены и наличие требуют обновления.'}{connection==='offline'&&<button className="text-button" onClick={refreshCatalog}>Повторить</button>}</div>}<div className="catalog-heading"><h2>Каталог</h2><span>Наличие обновляется на сервере</span></div><CategoryFilter selectedCategory={category} onSelectCategory={setCategory} searchQuery={search} onSearchChange={setSearch} onlyInStock={stock} onToggleInStock={()=>setStock(v=>!v)}/>
 <div className="product-grid">{filtered.map((p,i)=><ProductCard key={p.id} product={p} index={i}/>)}{!filtered.length&&<div className="empty-state wide"><h3>Ничего не найдено</h3><button className="outline-button" onClick={()=>{setCategory('all');setSearch('');setStock(false);}}>Сбросить фильтры</button></div>}
 <a className="custom-card" href="https://t.me/MaximRkoTeam" target="_blank" rel="noreferrer"><div className="custom-symbol">↗</div><div><h3>Другой сервис</h3><p>Не нашли нужный инструмент?<br/>Обсудим задачу и условия подключения.</p><span>Обсудить задачу <ArrowUpRight size={15}/></span></div><ArrowUpRight className="custom-arrow" size={24}/></a></div><p className="catalog-note">Модели и лимиты зависят от региона и аккаунта. Источники и условия — в карточках.</p><ChannelDiscountBanner/></section></main>
 <Footer onOpenLegal={setLegal}/>{cartItemCount>0&&!checkout&&<button className="floating-cart" onClick={()=>setIsCartOpen(true)}><span>Корзина · {cartItemCount}</span><strong>{cartTotal.toLocaleString('ru-RU')} ₽</strong><ArrowRight size={18}/></button>}
 <Suspense fallback={<div className="loading-notice" role="status">Открываем…</div>}>{selectedProduct&&<ProductDetailModal/>}{isCartOpen&&<CartDrawer onProceedToCheckout={()=>{setIsCartOpen(false);setCheckout(true);}}/>}{checkout&&<CheckoutModal isOpen={checkout} onClose={()=>setCheckout(false)} onOpenLegal={setLegal}/>}{legal&&<LegalModal isOpen={!!legal} initialTab={legal||'offer'} onClose={()=>setLegal(null)}/>}{isAdminOpen&&<AdminPanel/>}{isAdminAuthModalOpen&&<AdminAuthModal isOpen={isAdminAuthModalOpen} onClose={()=>setIsAdminAuthModalOpen(false)}/>}</Suspense></div>;
}
