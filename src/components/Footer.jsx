import React from 'react';
import { ShieldCheck, FileText, Info, ExternalLink } from 'lucide-react';

export default function Footer({ onOpenLegal }) {
  return (
    <footer className="w-full mt-10 border-t border-white/5 bg-[#090b11]/90 backdrop-blur-md pt-8 pb-12 px-4 text-slate-400">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Top Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Business details */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-white font-semibold">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>ИП Селезнев Максим Маркович</span>
            </div>
            <div className="text-[11px] text-slate-400 space-y-0.5 font-mono">
              <p>ОГРНИП: <span className="text-slate-300">326420500115962</span></p>
              <p>ИНН: <span className="text-slate-300">420543694740</span></p>
              <p>Поддержка: <a href="mailto:MAXIM.SELEZNYOV.07@GMAIL.COM" className="text-cyan-400 hover:underline">MAXIM.SELEZNYOV.07@GMAIL.COM</a></p>
            </div>
          </div>

          {/* Legal Document Links */}
          <div className="flex flex-col sm:items-end justify-center gap-2">
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <button
                onClick={() => onOpenLegal('offer')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/5 transition-colors flex items-center gap-1"
              >
                <FileText className="w-3 h-3 text-cyan-400" />
                <span>Публичная оферта</span>
              </button>

              <button
                onClick={() => onOpenLegal('privacy')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/5 transition-colors flex items-center gap-1"
              >
                <ShieldCheck className="w-3 h-3 text-cyan-400" />
                <span>152-ФЗ Конфиденциальность</span>
              </button>

              <button
                onClick={() => onOpenLegal('requisites')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/5 transition-colors flex items-center gap-1"
              >
                <Info className="w-3 h-3 text-cyan-400" />
                <span>Реквизиты</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-400">
              Электронные чеки формируются в соответствии с 54-ФЗ
            </p>
          </div>
        </div>

        {/* Disclaimer on trademarks */}
        <div className="pt-4 border-t border-white/5 text-[10px] text-slate-400 leading-relaxed">
          <p>
            Все наименования брендов, сервисов и товарные знаки (включая Anthropic Claude, OpenAI ChatGPT, Google Gemini, Moonshot Kimi) принадлежат их законным правообладателям. Сервис AI Store (ИП Селезнев М. М.) не является официальным дистрибьютором или аффилированным представителем указанных сервисов и оказывает независимые консультационные и технические услуги по содействию в настройке и оплате доступа.
          </p>
        </div>

        {/* Copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
          <span>© 2026 AI Store • Все права защищены</span>
          <span className="text-[10px] text-slate-400">Лицензировано для ИП в соответствии с законами РФ</span>
        </div>

      </div>
    </footer>
  );
}
