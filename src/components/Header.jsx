import React,{useRef,useEffect} from 'react';
import {ShoppingBag,Pause,Play,Settings2} from 'lucide-react';
import {useStore} from '../context/StoreContext';
export default function Header({paused,onToggleMotion}) {
  const {cartItemCount,setIsCartOpen,setIsAdminAuthModalOpen,isAdminAuthenticated,setIsAdminOpen}=useStore();
  const taps=useRef(0),timer=useRef(null);
  useEffect(()=>()=>clearTimeout(timer.current),[]);
  function openAdmin(){isAdminAuthenticated?setIsAdminOpen(true):setIsAdminAuthModalOpen(true);}
  function logoTap(){clearTimeout(timer.current);taps.current++;if(taps.current>=3){taps.current=0;openAdmin();}else timer.current=setTimeout(()=>{taps.current=0;},800);}
  return <header className="site-header"><div className="header-inner">
    <button className="wordmark" onClick={logoTap} aria-label="AI Store">AI Store<span className="wordmark-dot">.</span></button>
    <div className="header-actions"><button className="icon-button motion-button" onClick={onToggleMotion} aria-label={paused?'Включить анимацию':'Остановить анимацию'} aria-pressed={paused}>{paused?<Play size={17}/>:<Pause size={17}/>}</button>
    <button className="icon-button" aria-label="Управление магазином" onClick={()=>isAdminAuthenticated?setIsAdminOpen(true):setIsAdminAuthModalOpen(true)}><Settings2 size={18}/></button>
    <button className="icon-button cart-button" onClick={()=>setIsCartOpen(true)} aria-label={'Корзина: '+cartItemCount}><ShoppingBag size={23}/>{cartItemCount>0&&<span>{cartItemCount}</span>}</button></div>
  </div></header>;
}
