import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRobokassaPayment,verifyRobokassaResult} from './robokassa.js';

test('signs a payment including the encoded fiscal receipt and explicit test flag',()=>{
  const receipt={items:[{name:'Подключение Claude',quantity:1,sum:2190,tax:'none'}]};
  const payment=createRobokassaPayment({merchantLogin:'shop',password1:'test-secret-1',invId:'123',amount:2190,email:'buyer@example.com',receipt,isTest:true});
  const params=new URL(payment.url).searchParams;
  assert.equal(payment.isTest,true);
  assert.equal(params.get('IsTest'),'1');
  assert.equal(params.get('Receipt'),encodeURIComponent(JSON.stringify(receipt)));
  assert.equal(params.get('SignatureValue'),createHash('md5').update(`shop:2190.00:123:${params.get('Receipt')}:test-secret-1`).digest('hex'));
});

test('accepts only a signed notification for the exact invoice and amount',()=>{
  const fields={outSum:'2190.000000',invId:'123',password2:'test-secret-2',expectedAmount:2190,expectedInvId:'123'};
  const signatureValue=createHash('md5').update('2190.000000:123:test-secret-2').digest('hex').toUpperCase();
  assert.equal(verifyRobokassaResult({...fields,signatureValue}),true);
  assert.equal(verifyRobokassaResult({...fields,outSum:'2191.000000',signatureValue}),false);
  assert.equal(verifyRobokassaResult({...fields,expectedInvId:'124',signatureValue}),false);
  assert.equal(verifyRobokassaResult({...fields,signatureValue:'0'.repeat(32)}),false);
});
