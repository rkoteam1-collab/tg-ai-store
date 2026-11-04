import {REMINDER_CONSENT_TEXT,REMINDER_CONSENT_VERSION} from '../shared/reminderConsent.js';
import {launchUrl} from './launch.js';

export const REMINDERS_ENABLE_CALLBACK='reminders_on:'+REMINDER_CONSENT_VERSION;
const privateUser=ctx=>ctx.chat?.type==='private'&&Number.isSafeInteger(ctx.from?.id)&&ctx.from.id>0;
export async function showReminderSettings(ctx,reminders,config={}){
 if(!privateUser(ctx))return;
 if(!reminders)return ctx.reply('Настройки уведомлений временно недоступны.');
 const enabled=reminders.status(ctx.from.id).enabled;
 const policy=new URL(launchUrl(config));policy.searchParams.set('document','privacy');
 return ctx.reply(`Уведомления AIshopify\n\nНапоминания: ${enabled?'включены':'выключены'}. Подтверждения оплаченных заказов приходят отдельно.\n\n${REMINDER_CONSENT_TEXT}`,{
  link_preview_options:{is_disabled:true},
  reply_markup:{inline_keyboard:[[{text:enabled?'Обновить разрешение на напоминания':'Разрешить напоминания',callback_data:REMINDERS_ENABLE_CALLBACK}],[{text:'Отключить напоминания',callback_data:'reminders_off'}],[{text:'Политика обработки данных',url:policy.href}]]},
 });
}
export async function enableReminderSettings(ctx,reminders){
 if(!privateUser(ctx))return ctx.answerCbQuery('Настройки доступны в личном чате с ботом.');
 if(ctx.callbackQuery?.data!==REMINDERS_ENABLE_CALLBACK)return ctx.answerCbQuery('Откройте актуальные настройки командой /notifications.');
 if(!reminders)return ctx.answerCbQuery('Напоминания временно недоступны.');
 try{
  reminders.consent(ctx.from.id,true,REMINDER_CONSENT_VERSION,{channel:'telegram',messageId:ctx.callbackQuery?.message?.message_id});
 }catch{return ctx.answerCbQuery('Не удалось сохранить настройку. Повторите позже.');}
 await ctx.answerCbQuery('Напоминания включены');
 await ctx.editMessageReplyMarkup({inline_keyboard:[[{text:'Отключить напоминания',callback_data:'reminders_off'}]]}).catch(()=>{});
 return ctx.reply('Напоминания включены. После посещения магазина сообщение придёт автоматически примерно через 2 часа, если покупка не завершена. Выключить: /stop_reminders.');
}
