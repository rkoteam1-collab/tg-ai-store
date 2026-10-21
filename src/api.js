export function authHeaders() {
  const init = window.Telegram?.WebApp?.initData;
  return init ? {'X-Telegram-Init-Data': init} : {};
}
export async function api(url, options={}) {
  const response = await fetch(url, {...options, headers: {'Content-Type':'application/json', ...authHeaders(), ...options.headers}});
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Не удалось выполнить запрос');
  return data;
}
