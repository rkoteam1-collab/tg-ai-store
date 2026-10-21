import React,{useEffect,useState} from 'react';
import {X,Info} from 'lucide-react';
import {useStore} from '../context/StoreContext';
export default function Toast(){
 const {toastMessage}=useStore();const [visible,setVisible]=useState(false);
 useEffect(()=>{if(!toastMessage)return;setVisible(true);const timer=setTimeout(()=>setVisible(false),6000);return()=>clearTimeout(timer);},[toastMessage]);
 if(!toastMessage||!visible)return null;
 return <div role="status" className="toast"><Info size={19}/><span>{toastMessage.text}</span><button className="icon-button" aria-label="Закрыть уведомление" onClick={()=>setVisible(false)}><X size={17}/></button></div>;
}
