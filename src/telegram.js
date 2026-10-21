let sdk;
export function loadTelegram(){
 if(window.Telegram?.WebApp)return Promise.resolve(window.Telegram.WebApp);
 if(!sdk)sdk=new Promise(resolve=>{
  const script=document.createElement('script');script.src='https://telegram.org/js/telegram-web-app.js';script.async=true;
  const timeout=setTimeout(()=>resolve(null),12000);
  script.onload=()=>{clearTimeout(timeout);const tg=window.Telegram?.WebApp;if(tg){try{tg.ready();tg.expand();}catch{}window.dispatchEvent(new Event('telegram-ready'));}resolve(tg||null);};
  script.onerror=()=>{clearTimeout(timeout);resolve(null);};document.head.appendChild(script);
 });return sdk;
}

export function getTelegramInitData(){
 const sdk=window.Telegram?.WebApp?.initData;if(sdk)return sdk;
 try{const raw=new URLSearchParams(window.location.hash.slice(1)).get('tgWebAppData');return raw&&raw.length<=10000?raw:'';}catch{return '';}
}
