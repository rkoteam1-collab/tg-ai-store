import {createHash} from 'node:crypto';
// Minimal readiness bridge: no user data, auth, storage or third-party requests.
export const BOOTSTRAP_SOURCE=String.raw`(function(){
  var complete=false,ready=false,tries=0;
  function nativeReady(){
    if(ready)return true;
    try{if(window.Telegram&&window.Telegram.WebApp){window.Telegram.WebApp.ready();ready=true;return true;}}catch(e){}
    try{if(window.TelegramWebviewProxy&&typeof window.TelegramWebviewProxy.postEvent==='function'){window.TelegramWebviewProxy.postEvent('web_app_ready','""');ready=true;return true;}}catch(e){}
    try{if(window.external&&typeof window.external.notify==='function'){window.external.notify(JSON.stringify({eventType:'web_app_ready',eventData:''}));ready=true;return true;}}catch(e){}
    try{if(window.parent!==window){window.parent.postMessage(JSON.stringify({eventType:'web_app_ready',eventData:''}),'https://web.telegram.org');ready=true;return true;}}catch(e){}
    return false;
  }
  nativeReady();
  var bridgeTimer=setInterval(function(){tries++;if(nativeReady()||tries>=30)clearInterval(bridgeTimer);},100);
  function fail(){if(complete)return;var status=document.getElementById('boot-status'),recovery=document.getElementById('boot-recovery');if(status)status.textContent='Приложение не загрузилось. Попробуйте ещё раз или откройте запасной адрес.';if(recovery)recovery.hidden=false;nativeReady();}
  var timer=setTimeout(fail,10000);
  window.aiShopifyBootComplete=function(){complete=true;clearTimeout(timer);if(nativeReady())clearInterval(bridgeTimer);};
  window.addEventListener('error',function(e){if(e.message||(e.target&&e.target.tagName==='SCRIPT'))fail();},true);
  window.addEventListener('unhandledrejection',fail);
  document.addEventListener('click',function(e){if(e.target&&e.target.id==='boot-retry'){var u=new URL(window.location.href);u.searchParams.set('reload',String(Date.now()));window.location.replace(u.href);}});
})();`;
export const BOOTSTRAP_HASH="'sha256-"+createHash('sha256').update(BOOTSTRAP_SOURCE).digest('base64')+"'";
