const accountSkus=new Set(['g-4','g-10','g-18','g-19','g-31','g-32']);
const services=[['claude','Claude'],['chatgpt','ChatGPT'],['gemini','Gemini'],['kimi','Kimi'],['perplexity','Perplexity'],['grok','Grok'],['capcut','CapCut'],['duolingo','Duolingo'],['opencode','OpenCode'],['midjourney','Midjourney']];
export function purchaseType(product){
 if(['accounts','activation'].includes(product.purchaseType))return product.purchaseType;
 return product.supplier==='socrate'&&accountSkus.has(product.supplierSku)?'accounts':'activation';
}
export function serviceOptions(products,type){
 const group=products.filter(p=>purchaseType(p)===type),categories=new Set(group.map(p=>p.category||'other'));
 const known=services.filter(([id])=>categories.has(id));
 const knownIds=new Set(services.map(([id])=>id));
 const other=[...categories].filter(id=>!knownIds.has(id)).map(id=>[id,group.find(p=>(p.category||'other')===id)?.brand||'Другие']);
 return [['all','Все'],...known,...other];
}
export function filterCatalog(products,{type='activation',category='all',search=''}={}){
 const query=search.trim().toLocaleLowerCase('ru-RU');
 return products.filter(p=>purchaseType(p)===type&&(category==='all'||(p.category||'other')===category)&&[p.name,p.model,p.brand,p.tagline].join(' ').toLocaleLowerCase('ru-RU').includes(query));
}
