import {MAX_OUTPUT_TOKENS, providerUsage, trimmedHistory} from './core.js';

function responseText(parts) {
  return parts.filter(part => part?.type === 'output_text' || part?.type === 'text').map(part => part.text || '').join('\n').trim();
}

async function postJson(fetchImpl, url, headers, body) {
  const response = await fetchImpl(url, {
    method: 'POST', headers: {'Content-Type': 'application/json', ...headers},
    body: JSON.stringify(body), signal: AbortSignal.timeout(50000),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Provider HTTP ${response.status}`);
  if (!data) throw new Error('Provider response is empty');
  return data;
}

export function providerConfigured(provider, config) {
  const vars = {
    openai: ['OPENAI_API_KEY', 'OPENAI_MODEL'],
    claude: ['ANTHROPIC_API_KEY', 'ANTHROPIC_MODEL'],
    gemini: ['GEMINI_API_KEY', 'GEMINI_MODEL'],
  }[provider];
  return !!vars?.every(name => config[name]);
}

export async function generateReply(provider, prompt, history, config, fetchImpl = fetch) {
  if (config.CHAT_DEMO_MODE === 'true') {
    return {text: `Тестовый ответ ${provider}. Вы написали: ${prompt}`, usage: Math.max(1, Math.ceil(Buffer.byteLength(prompt) / 3) + 24)};
  }
  if (!providerConfigured(provider, config)) throw new Error('Provider is not configured');
  const messages = [...trimmedHistory(history), {role: 'user', text: prompt}];
  let text, usage;
  if (provider === 'openai') {
    const data = await postJson(fetchImpl, 'https://api.openai.com/v1/responses',
      {Authorization: `Bearer ${config.OPENAI_API_KEY}`},
      {model: config.OPENAI_MODEL, store: false, max_output_tokens: MAX_OUTPUT_TOKENS,
        input: messages.map(item => ({role: item.role, content: item.text}))});
    text = responseText((data.output || []).flatMap(item => item.content || []));
    usage = providerUsage(provider, data.usage);
  } else if (provider === 'claude') {
    const data = await postJson(fetchImpl, 'https://api.anthropic.com/v1/messages',
      {Authorization: `Bearer ${config.ANTHROPIC_API_KEY}`, 'anthropic-version': '2026-10-21',
        ...(config.ANTHROPIC_WORKSPACE_ID ? {'anthropic-workspace-id':config.ANTHROPIC_WORKSPACE_ID} : {})},
      {model: config.ANTHROPIC_MODEL, max_tokens: MAX_OUTPUT_TOKENS,
        messages: messages.map(item => ({role: item.role, content: item.text}))});
    text = responseText(data.content || []);
    usage = providerUsage(provider, data.usage);
  } else if (provider === 'gemini') {
    const data = await postJson(fetchImpl,
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.GEMINI_MODEL)}:generateContent`,
      {'x-goog-api-key': config.GEMINI_API_KEY},
      {contents: messages.map(item => ({role: item.role === 'assistant' ? 'model' : 'user', parts: [{text: item.text}]})),
        generationConfig: {maxOutputTokens: MAX_OUTPUT_TOKENS}});
    text = (data.candidates?.[0]?.content?.parts || []).map(part => part.text || '').join('\n').trim();
    usage = providerUsage(provider, data.usageMetadata);
  } else throw new Error('Unknown provider');
  if (!text) throw new Error('Provider returned no text');
  return {text, usage};
}
