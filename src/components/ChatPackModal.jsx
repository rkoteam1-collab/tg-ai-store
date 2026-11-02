import React from 'react';
import Dialog from './Dialog';
import BrandLogo from './BrandLogo';

const providers = [
  {name:'ChatGPT', logo:'chatgpt'},
  {name:'Claude', logo:'claude'},
  {name:'Gemini', logo:'gemini'},
];

export default function ChatPackModal({onClose}) {
  return <Dialog title="AIshopify Chat" onClose={onClose}>
    <div className="chat-pack-detail">
      <span className="chat-pack-eyebrow">Новый продукт · готовится к запуску</span>
      <h3>1 000 000 токенов</h3>
      <p>Один общий лимит для ChatGPT, Claude и Gemini. Учитываются входящие и исходящие токены всех трёх моделей вместе.</p>
      <div className="chat-pack-providers" aria-label="Планируемые провайдеры">
        {providers.map(provider=><div key={provider.name}><BrandLogo logo={provider.logo} size={28}/><span>{provider.name}</span></div>)}
      </div>
      <div className="chat-pack-estimates">
        <div><strong>≈ 500–1 000</strong><span>коротких обменов сообщениями, если на запрос и ответ уходит 1–2 тыс. токенов</span></div>
        <div><strong>3 модели</strong><span>переключение между ChatGPT, Claude и Gemini в отдельном Telegram-боте</span></div>
      </div>
      <p className="chat-pack-note">Число сообщений приблизительное: история диалога тоже расходует входящие токены. После подтверждённой оплаты вы получите код и инструкцию. Код привязан к Telegram-аккаунту покупателя.</p>
      <button type="button" className="primary-button" disabled>Покупка пока недоступна</button>
      <p className="chat-pack-note">Оплата и начисление токенов пока не включены. Деньги за этот пакет не принимаются.</p>
    </div>
  </Dialog>;
}
