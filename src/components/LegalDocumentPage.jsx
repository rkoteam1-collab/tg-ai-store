import React,{useEffect} from 'react';
import PrivacyPolicyContent from './PrivacyPolicyContent';
import {PRIVACY_CONSENT_TEXT,PRIVACY_CONSENT_VERSION} from '../../shared/privacyConsent.js';

export default function LegalDocumentPage({kind}){
 const consent=kind==='privacy-consent';
 useEffect(()=>{
  const previousTitle=document.title;
  document.title=(consent?'Согласие на обработку персональных данных':'Политика обработки персональных данных')+' · AIshopify';
  window.aiShopifyBootComplete?.();
  return()=>{document.title=previousTitle;};
 },[consent]);
 return <main className="legal-page">
  <a href="./" className="legal-page-back">← Вернуться в AIshopify</a>
  <div className="legal-page-heading"><span>AIshopify · документы</span><h1>{consent?'Согласие на обработку персональных данных':'Политика обработки персональных данных'}</h1><p>Редакция от 3 ноября 2026 года{consent?' · версия '+PRIVACY_CONSENT_VERSION:''}</p></div>
  <article className="legal-copy legal-page-content">
   {consent?PRIVACY_CONSENT_TEXT.split('\n').filter(Boolean).map((paragraph,index)=><p key={index}>{paragraph}</p>):<PrivacyPolicyContent/>}
  </article>
  <div className="legal-page-footer"><a href="./">Вернуться в магазин</a><a href="mailto:MAXIM.SELEZNYOV.07@GMAIL.COM">Вопросы об обработке данных</a></div>
 </main>;
}
