const base=(import.meta.env.VITE_API_BASE_URL||'').replace(/\/$/,'');
export function authHeaders(){const init=window.Telegram?.WebApp?.initData;return init?{'X-Telegram-Init-Data':init}:{};}
export async function api(url,options={}){
 const {timeoutMs=20000,anonymous=false,...request}=options;
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetch(base+url,{...request,signal:controller.signal,headers:{...(request.body?{'Content-Type':'application/json'}:{}),...(!anonymous?authHeaders():{}),...request.headers}});
  const type=response.headers.get('content-type')||'';
  if(!type.includes('application/json'))throw new Error('Сервер запускается. Повторите через несколько секунд.');
  const data=await response.json();if(!response.ok)throw new Error(data.message||'Не удалось выполнить запрос');return data;
 }catch(e){if(e.name==='AbortError')throw new Error('Сервер долго отвечает. Повторите запрос через несколько секунд.');throw e;}finally{clearTimeout(timer);}
}
