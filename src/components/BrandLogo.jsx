import React from 'react';
import claudeIcon from '../assets/brands/claude.svg';
import chatgptIcon from '../assets/brands/chatgpt.svg';
import geminiIcon from '../assets/brands/gemini.svg';
import kimiIcon from '../assets/brands/kimi.svg';

const icons = {
  claude: claudeIcon,
  chatgpt: chatgptIcon,
  gemini: geminiIcon,
  kimi: kimiIcon,
};

export default function BrandLogo({logo, category, brand, className = '', imageUrl, size = 26}) {
  const key = String(logo || category || '').toLowerCase();
  const src = imageUrl || icons[key];
  if (src) return <img aria-hidden="true" className={`brand-mark brand-mark--${key} ${className}`} style={{'--mark-size': `${size}px`}} src={src} alt="" decoding="async" />;
  const name = String(brand || logo || category || 'AI');
  const initials = /claude|anthropic/i.test(name) ? 'C' : /chatgpt|openai/i.test(name) ? 'G' : /gemini|google/i.test(name) ? 'G' : /kimi|moonshot/i.test(name) ? 'K' : /midjourney/i.test(name) ? 'M' : 'AI';
  return <span aria-hidden="true" className={`brand-mark brand-mark--other ${className}`} style={{'--mark-size': `${size}px`,fontSize: Math.max(18, Math.round(size * 0.7))}}>{initials}</span>;
}
