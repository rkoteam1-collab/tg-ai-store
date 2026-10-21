import React, {useEffect, useRef} from 'react';
import {X} from 'lucide-react';
import Toast from './Toast';
export default function Dialog({title,children,onClose,wide=false}) {
  const ref=useRef(null);
  useEffect(()=>{
    const dialog=ref.current, previous=document.activeElement;
    dialog.showModal();
    return ()=>{dialog.close();previous?.focus?.();};
  },[]);
  return <dialog ref={ref} aria-label={title} className={'dialog '+(wide?'dialog-wide':'')} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===ref.current)onClose();}}>
    <div className="dialog-top"><h2>{title}</h2><button className="icon-button" aria-label="Закрыть" onClick={onClose}><X size={20}/></button></div>
    <div className="dialog-body">{children}</div>
    <Toast/>
  </dialog>;
}
