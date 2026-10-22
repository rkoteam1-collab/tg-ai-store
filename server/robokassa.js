import {createHash,timingSafeEqual} from 'node:crypto';

const PAYMENT_URL='https://auth.robokassa.ru/Merchant/Index.aspx';
const ALGORITHMS=new Set(['md5','sha256','sha512']);

function digest(value,algorithm) {
  const name=String(algorithm||'md5').toLowerCase();
  if (!ALGORITHMS.has(name)) throw new Error('Unsupported Robokassa hash algorithm');
  return createHash(name).update(value,'utf8').digest('hex');
}

function money(value) {
  const amount=Number(value);
  if (!Number.isFinite(amount)||amount<=0||Math.abs(amount*100-Math.round(amount*100))>1e-7) throw new Error('Invalid payment amount');
  return amount.toFixed(2);
}

function invoiceId(value) {
  const id=String(value);
  if (!/^[1-9]\d{0,18}$/.test(id)||BigInt(id)>9223372036854775807n) throw new Error('Invalid Robokassa invoice ID');
  return id;
}

export function createRobokassaPayment({merchantLogin,password1,algorithm='md5',invId,amount,email,description,receipt,isTest=false}) {
  if (!merchantLogin||!password1||!email||!receipt) throw new Error('Incomplete Robokassa payment configuration');
  const id=invoiceId(invId),sum=money(amount);
  // Robokassa signs the URL-encoded receipt value, not the original JSON.
  const encodedReceipt=encodeURIComponent(JSON.stringify(receipt));
  const signature=digest(`${merchantLogin}:${sum}:${id}:${encodedReceipt}:${password1}`,algorithm);
  const params=new URLSearchParams({MerchantLogin:merchantLogin,OutSum:sum,InvId:id,Description:String(description||`Заказ ${id}`).slice(0,100),Email:email,Receipt:encodedReceipt,SignatureValue:signature});
  if (isTest) params.set('IsTest','1');
  return {url:`${PAYMENT_URL}?${params}`,invId:id,amount:sum,isTest:!!isTest};
}

export function verifyRobokassaResult({outSum,invId,signatureValue,password2,algorithm='md5',expectedAmount,expectedInvId}) {
  if (!password2||typeof signatureValue!=='string') return false;
  let id,expectedId,paid,expected;
  try {id=invoiceId(invId);expectedId=invoiceId(expectedInvId);paid=Number(outSum);expected=Number(expectedAmount);}
  catch {return false;}
  if (id!==expectedId||!Number.isFinite(paid)||!Number.isFinite(expected)||Math.round(paid*100)!==Math.round(expected*100)) return false;
  if (!/^\d+(?:\.\d{1,6})?$/.test(String(outSum))) return false;
  const calculated=digest(`${outSum}:${id}:${password2}`,algorithm);
  const got=Buffer.from(signatureValue.toLowerCase(),'utf8'),want=Buffer.from(calculated,'utf8');
  return got.length===want.length&&timingSafeEqual(got,want);
}
