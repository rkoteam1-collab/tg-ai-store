export const APP_RELEASE='20261021.4';
export const STATIC_ORIGIN='https://rkoteam1-collab.github.io';
export function launchUrl(config={}){const url=new URL(config.FRONTEND_URL||'https://rkoteam1-collab.github.io/tg-ai-store/');url.searchParams.set('v',APP_RELEASE);return url.href;}
export async function resetPersonalMenu(telegram,chatId){
 if(!Number.isSafeInteger(Number(chatId))||Number(chatId)<=0)return;
 await telegram.setChatMenuButton({chatId:Number(chatId),menuButton:{type:'default'}});
}
export async function configureMenus(telegram,config={},knownChatIds=[]){
 const menu={type:'web_app',text:'Магазин ИИ',web_app:{url:launchUrl(config)}};
 await telegram.setChatMenuButton({menuButton:menu});
 const chats=new Set([config.ADMIN_ID,...knownChatIds].map(Number).filter(n=>Number.isSafeInteger(n)&&n>0));
 for(const id of chats)try{await resetPersonalMenu(telegram,id);}catch{console.error('Known chat menu repair failed');}
}
export function menuRepairMiddleware(telegram){
 const repaired=new Set();
 return async(ctx,next)=>{
  const id=ctx.chat?.id;
  if(ctx.chat?.type==='private'&&Number.isSafeInteger(id)&&id>0&&!repaired.has(id)){
   try{await resetPersonalMenu(telegram,id);repaired.add(id);if(repaired.size>10000)repaired.delete(repaired.values().next().value);}catch{console.error('Personal menu repair failed');}
  }
  return next();
 };
}
export function startStore(ctx,config={}){
 return ctx.reply('AIshopify — каталог подписок и технических услуг. Поддержка: @MaximRkoTeam.',{reply_markup:{keyboard:[[{text:'Открыть магазин',web_app:{url:launchUrl(config)}}]],resize_keyboard:true,is_persistent:true}});
}
