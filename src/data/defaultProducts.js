// Same catalog for offline rendering and server seed; no divergent fallback claims.
import products from '../../server/data/products.json';
export const defaultProducts = products;
export const defaultPromoCodes = [{code:'START',discountPercent:10},{code:'AI2026',discountPercent:15},{code:'VIPAI',discountPercent:20}];
