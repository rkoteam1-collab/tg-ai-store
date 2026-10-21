export const APP_RELEASE='20261021.2';
export const STATIC_ORIGIN='https://rkoteam1-collab.github.io';
export function launchUrl(config={}){const url=new URL(config.FRONTEND_URL||'https://rkoteam1-collab.github.io/tg-ai-store/');url.searchParams.set('v',APP_RELEASE);return url.href;}
export async function configureMenus(telegram,config={}){
 const menu={type:'web_app',text:'Магазин ИИ',web_app:{url:launchUrl(config)}};
 await telegram.setChatMenuButton({menuButton:menu});
 if(config.ADMIN_ID)await telegram.setChatMenuButton({chatId:Number(config.ADMIN_ID),menuButton:menu});
}
