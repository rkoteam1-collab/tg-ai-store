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
      <p>Единый чат с моделями OpenAI, Anthropic и Google. Переключайтесь между провайдерами и оплачивайте фактическое использование после запуска сервиса.</p>
      <div className="chat-pack-providers" aria-label="Планируемые провайдеры">
        {providers.map(provider=><div key={provider.name}><BrandLogo logo={provider.logo} size={28}/><span>{provider.name}</span></div>)}
      </div>
      <div className="chat-pack-estimates">
        <div><strong>≈ 500–1 000</strong><span>коротких обменов сообщениями, если на запрос и ответ уходит 1–2 тыс. токенов</span></div>
        <div><strong>до ≈ 890</strong><span>изображений 1K в Gemini 3.1 Flash Image, если считать только 1 120 выходных токенов на изображение</span></div>
      </div>
      <p className="chat-pack-note">Это примеры, а не лимиты пакета: история чата, входные токены, выбранная модель и размер картинки меняют расход. Claude не генерирует фото или иллюстрации. Тарифы для входящих и исходящих токенов и цену пакета объявим после подключения API.</p>
      <button type="button" className="primary-button" disabled>Купить 1 млн токенов — скоро</button>
      <p className="chat-pack-note">Сейчас оплата и начисление токенов не работают. Деньги за этот пакет не принимаются.</p>
    </div>
  </Dialog>;
}
