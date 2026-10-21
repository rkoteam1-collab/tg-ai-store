import React, { useState } from 'react';
import { X, FileText, Shield, Info, Scale, Check } from 'lucide-react';

export default function LegalModal({ isOpen, onClose, initialTab = 'offer' }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-[#0c0f17] border border-white/10 rounded-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 px-5 border-b border-white/5 flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Правовая информация</h3>
              <p className="text-[11px] text-slate-400">ИП Селезнев М. М. • 2026</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5 bg-slate-950/60 px-3 pt-2 gap-1 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('offer')}
            className={`px-3 py-2 rounded-t-xl font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'offer'
                ? 'bg-[#141926] text-cyan-400 border-t border-x border-white/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Публичная оферта</span>
          </button>

          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-3 py-2 rounded-t-xl font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'privacy'
                ? 'bg-[#141926] text-cyan-400 border-t border-x border-white/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Политика конфиденциальности</span>
          </button>

          <button
            onClick={() => setActiveTab('requisites')}
            className={`px-3 py-2 rounded-t-xl font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'requisites'
                ? 'bg-[#141926] text-cyan-400 border-t border-x border-white/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>Реквизиты и оплата</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed font-normal">
          {activeTab === 'offer' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 text-cyan-200 text-[11px]">
                <strong>Внимание:</strong> Настоящий документ является публичной офертой в соответствии со ст. 437 Гражданского кодекса РФ. Оформление заказа и оплата услуг подтверждают полное и безоговорочное согласие с настоящими условиями.
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1">1. Предмет договора</h4>
                <p>
                  1.1. Исполнитель (Индивидуальный предприниматель Селезнев Максим Маркович) обязуется оказать Заказчику консультационные, технические и информационные услуги по содействию в получении, активации и настройке доступа к зарубежным платформам и сервисам искусственного интеллекта (включая Claude, ChatGPT, Gemini, Kimi), а Заказчик обязуется принять и оплатить оказанные услуги.
                </p>
                <p className="mt-1.5">
                  1.2. Исполнитель не является разработчиком или правообладателем вышеуказанных сервисов, не продает исключительные либо сублицензионные права на программное обеспечение, а оказывает независимые консультационно-технические услуги.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1">2. Порядок оформления и оплаты</h4>
                <p>
                  2.1. Заказ оформляется Заказчиком через Telegram Mini App интерфейс сервиса.
                </p>
                <p className="mt-1.5">
                  2.2. Оплата производится в рублях РФ с использованием Системы быстрых платежей (СБП), банковских карт РФ либо иных доступных на момент платежа способов.
                </p>
                <p className="mt-1.5">
                  2.3. В соответствии с Федеральным законом № 54-ФЗ электронный кассовый чек направляется Заказчику на указанный при оформлении контактный адрес (email или Telegram).
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1">3. Порядок оказания услуг и выдачи</h4>
                <p>
                  3.1. Услуга считается оказанной в полном объеме с момента передачи Заказчику аутентификационных данных / инструкций по активации доступа через интерфейс Telegram-бота или на указанный Заказчиком email.
                </p>
                <p className="mt-1.5">
                  3.2. Срок предоставления доступа — от 1 до 60 минут с момента подтверждения оплаты (при отсутствии технических сбоев внешних систем).
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white text-sm mb-1">4. Ответственность и ограничения</h4>
                <p>
                  4.1. Исполнитель не несет ответственности за технические перебои, регламентные работы или изменения политики использования на стороне зарубежных сервисов (OpenAI, Anthropic, Google, Moonshot AI).
                </p>
                <p className="mt-1.5">
                  4.2. Заказчик обязуется соблюдать правила пользования целевыми платформами и законодательство РФ.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-white text-sm mb-1">Политика обработки персональных данных (152-ФЗ)</h4>
                <p>
                  Настоящая Политика определяет порядок обработки и защиты персональных данных физических лиц, пользующихся услугами сервиса AI Store (ИП Селезнев М. М.).
                </p>
              </div>

              <div>
                <h5 className="font-semibold text-white mb-1">1. Какие данные обрабатываются:</h5>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  <li>Идентификатор пользователя в Telegram (Telegram ID, имя пользователя);</li>
                  <li>Адрес электронной почты (для отправки данных заказа и электронного чека);</li>
                  <li>История и состав совершенных заказов.</li>
                </ul>
              </div>

              <div>
                <h5 className="font-semibold text-white mb-1">2. Цели обработки:</h5>
                <p>
                  Данные используются исключительно для исполнения обязательств по заказу, коммуникации с Заказчиком и соблюдения требований налогового законодательства РФ (54-ФЗ).
                </p>
              </div>

              <div>
                <h5 className="font-semibold text-white mb-1">3. Конфиденциальность:</h5>
                <p>
                  Исполнитель гарантирует сохранность данных и обязуется не передавать их третьим лицам, за исключением случаев, предусмотренных законодательством РФ и уполномоченными платежными шлюзами для фискализации.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'requisites' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-white text-sm mb-2">Официальные реквизиты исполнителя</h4>
                <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-white/5 space-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Исполнитель:</span>
                    <span className="font-semibold text-white">Индивидуальный предприниматель Селезнев Максим Маркович</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
                    <div>
                      <span className="text-slate-400 block text-[11px]">ИНН:</span>
                      <span className="font-mono text-cyan-300">420543694740</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">ОГРНИП:</span>
                      <span className="font-mono text-cyan-300">326420500115962</span>
                    </div>
                  </div>
                  <div className="pt-1 border-t border-white/5">
                    <span className="text-slate-400 block text-[11px]">Контактный email / поддержка:</span>
                    <a href="mailto:MAXIM.SELEZNYOV.07@GMAIL.COM" className="text-cyan-400 hover:underline">
                      MAXIM.SELEZNYOV.07@GMAIL.COM
                    </a>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Telegram поддержки:</span>
                    <a href="https://t.me/AIshopify1_bot" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">
                      @AIshopify1_bot
                    </a>
                  </div>
                </div>
              </div>

              <div>
                <h5 className="font-semibold text-white mb-1">Отказ от ответственности по товарным знакам:</h5>
                <p className="text-[11px] text-slate-400">
                  Все упомянутые товарные знаки, логотипы и наименования сервисов (включая Anthropic Claude, OpenAI ChatGPT, Google Gemini, Moonshot Kimi) являются интеллектуальной собственностью соответствующих компаний. Сервис не претендует на права на данные знаки и использует их исключительно в информационных целях для описания совместимости консультационно-технических услуг.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 px-5 border-t border-white/5 bg-slate-950/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">© 2026 AI Store • Защищено законами РФ</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Понятно</span>
          </button>
        </div>
      </div>
    </div>
  );
}
