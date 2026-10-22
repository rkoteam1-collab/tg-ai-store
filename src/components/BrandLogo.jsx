import React from 'react';

// Neutral text marks avoid implying an official partnership with a provider.
export default function BrandLogo({logo, category, brand, className = '', imageUrl, size = 26}) {
  if (imageUrl) return <img src={imageUrl} alt="" className={`${className} object-contain rounded-lg`} onError={event => { event.currentTarget.style.display = 'none'; }} />;
  const name = String(brand || logo || category || 'AI');
  const initials = /claude|anthropic/i.test(name) ? 'C' : /chatgpt|openai/i.test(name) ? 'G' : /gemini|google/i.test(name) ? 'G' : /kimi|moonshot/i.test(name) ? 'K' : /midjourney/i.test(name) ? 'M' : 'AI';
  return <span aria-hidden="true" className={`brand-initial ${className}`} style={{fontSize: Math.max(18, Math.round(size * 0.7))}}>{initials}</span>;
}
