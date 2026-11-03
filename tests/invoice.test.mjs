import test from 'node:test';
import assert from 'node:assert/strict';
import { createInvoice, invoiceNumber, validateInvoiceOrder } from '../lib/invoice.mjs';
import { orderStageIndex, orderStages } from '../lib/order-status.mjs';
const order={receipt:'SK-TEST',status:'paid',razorpayPaymentId:'pay_TEST',paidAt:'2026-11-03T11:00:00Z',currency:'INR',customerName:'Invoice Test',phone:'9000000000',address:'10 Example Street, West Bengal',pincode:'721253',items:[{title:'Test Plant',qty:2,unitAmount:19900}],subtotal:39800,shipping:4000,total:43800,paymentMode:'test'};
test('invoices can only be generated for confirmed paid orders',()=>{
 assert.doesNotThrow(()=>validateInvoiceOrder(order));
 for(const status of ['pending','failed'])assert.throws(()=>validateInvoiceOrder({...order,status}));
 assert.throws(()=>validateInvoiceOrder({...order,razorpayPaymentId:null}));
});
test('invoice prices must match the saved line items, shipping and paid total',()=>{
 assert.throws(()=>validateInvoiceOrder({...order,total:1}));
 assert.throws(()=>validateInvoiceOrder({...order,subtotal:1}));
 assert.throws(()=>validateInvoiceOrder({...order,items:[{title:'Test',qty:-1,unitAmount:100}]}));
 assert.throws(()=>validateInvoiceOrder({...order,currency:'USD'}));
 assert.equal(invoiceNumber(order),'INV-SK-TEST');
});
test('the invoice renderer creates a PDF from the original order snapshot',async()=>{
 const pdf=await createInvoice(order);assert.equal(pdf.subarray(0,5).toString(),'%PDF-');assert.ok(pdf.length>5000);
});
test('existing fulfilment statuses map to the new five-step progress bar',()=>{
 assert.equal(orderStageIndex('New'),0);assert.equal(orderStageIndex('Processing'),1);assert.equal(orderStageIndex('Shipped'),3);
 assert.equal(orderStages[orderStageIndex('Packaging')].badge,'Botanical Packaging');assert.equal(orderStageIndex('Delivered'),4);
});
