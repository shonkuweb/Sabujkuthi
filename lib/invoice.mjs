import PDFDocument from 'pdfkit';
import fs from 'node:fs';
import path from 'node:path';
import { business } from './business.mjs';
import { orderReference } from './order-reference.mjs';

const green = '#224d36', ink = '#263b32', muted = '#758278', border = '#dee7df';
const money = amount => `₹${(amount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
export const invoiceNumber = order => `INV-${orderReference(order)}`;
export function validateInvoiceOrder(order) {
  if (order.currency !== 'INR' || !Number.isFinite(new Date(order.paidAt).getTime())) throw new Error('Invalid invoice currency or date.');
  if (order.status !== 'paid' || !order.razorpayPaymentId || !order.paidAt) throw new Error('Invoices require a confirmed paid order.');
  if (!Array.isArray(order.items) || !order.items.length) throw new Error('Invoice has no order items.');
  let subtotal = 0;
  for (const item of order.items) {
    if (!Number.isSafeInteger(item.qty) || item.qty < 1 || !Number.isSafeInteger(item.unitAmount) || item.unitAmount < 0) throw new Error('Invalid invoice line.');
    subtotal += item.qty * item.unitAmount;
  }
  if (!Number.isSafeInteger(subtotal) || !Number.isSafeInteger(order.total) || subtotal !== order.subtotal || !Number.isSafeInteger(order.shipping) || order.shipping < 0 || order.total !== subtotal + order.shipping) throw new Error('Invoice totals do not match the paid order snapshot.');
}
export async function createInvoice(order) {
  validateInvoiceOrder(order);
  order = { ...order, receipt: orderReference(order) };
  const fonts = path.join(process.cwd(), 'public/fonts');
  const font = fs.readFileSync(path.join(fonts, 'NotoSans-Regular.ttf'));
  const bold = fs.readFileSync(path.join(fonts, 'NotoSans-Bold.ttf'));
  const bengali = fs.readFileSync(path.join(fonts, 'NotoSansBengali-Regular.ttf'));
  const bengaliBold = fs.readFileSync(path.join(fonts, 'NotoSansBengali-Bold.ttf'));
  const logo = fs.readFileSync(path.join(process.cwd(), 'public', business.logo));
  const doc = new PDFDocument({ size: 'A4', margins: { top: 40, right: 44, bottom: 30, left: 44 }, font, bufferPages: true, info: { Title: `Invoice ${order.receipt}`, Author: business.name, Subject: 'Paid order invoice', Creator: business.name } });
  doc.registerFont('Body', font); doc.registerFont('Bold', bold); doc.registerFont('Bangla', bengali); doc.registerFont('BanglaBold', bengaliBold);
  const chunks = [];
  const completed = new Promise((resolve, reject) => { doc.on('data', chunk => chunks.push(chunk)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject); });
  const width = doc.page.width - 88, right = doc.page.width - 44;
  const parts = value => value.split(/([\u0980-\u09ff\u200c\u200d]+)/).filter(Boolean);
  const fontFor = (value, bold) => /[\u0980-\u09ff]/.test(value) ? bold ? 'BanglaBold' : 'Bangla' : bold ? 'Bold' : 'Body';
  const widthOf = (value, size, bold) => parts(value).reduce((sum, run) => sum + doc.font(fontFor(run,bold)).fontSize(size).widthOfString(run), 0);
  const layouts = new Map();
  const layout = (value, w, size, bold) => {
    const valueText = clean(value);
    const key = JSON.stringify([valueText,w,size,bold]);
    if(layouts.has(key)) return layouts.get(key);
    const lines=[]; let current='';
    for(const word of valueText.split(' ')) {
      const candidate=current ? `${current} ${word}` : word;
      if(widthOf(candidate,size,bold)<=w) { current=candidate; continue; }
      if(current) { lines.push(current); current=''; }
      if(widthOf(word,size,bold)<=w) { current=word; continue; }
      for(const {segment} of new Intl.Segmenter('bn',{granularity:'grapheme'}).segment(word)) {
        if(current && widthOf(current+segment,size,bold)>w) { lines.push(current); current=''; }
        current+=segment;
      }
    }
    if(current || !lines.length)lines.push(current);
    const lineHeight=size*(/[\u0980-\u09ff]/.test(valueText)?1.55:1.35)+2;
    const result={lines,lineHeight,height:lines.length*lineHeight}; layouts.set(key,result); return result;
  };
  const measure = (value,w,size=9,bold=false) => layout(value,w,size,bold).height;
  const text = (value,x,y,w,size=9,color=ink,bold=false,align='left') => {
    const block=layout(value,w,size,bold);
    block.lines.forEach((line,index)=>{
      const lineWidth=widthOf(line,size,bold);
      let at=x+(align==='right'?w-lineWidth:align==='center'?(w-lineWidth)/2:0);
      for(const run of parts(line)) {
        doc.font(fontFor(run,bold)).fontSize(size).fillColor(color).text(run,at,y+index*block.lineHeight,{lineBreak:false});
        at+=doc.widthOfString(run);
      }
    });
  };
  const line = y => doc.moveTo(44, y).lineTo(right, y).lineWidth(.7).strokeColor(border).stroke();
  const date = new Date(order.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
  const pill = (label, x, y, w, color, fill) => { doc.roundedRect(x,y,w,22,6).fill(fill); text(label,x+8,y+5,w-16,8,color,true,'center'); };
  doc.rect(0,0,doc.page.width,7).fill(green);
  doc.image(logo, 38, 30, { fit: [190,64] });
  text('INVOICE',340,40,right-340,29,green,true,'right');
  pill(order.paymentMode === 'test' ? 'TEST PAYMENT / SAMPLE' : 'PAYMENT RECEIVED',right-167,86,167,order.paymentMode === 'test'?'#9b6c20':green,order.paymentMode === 'test'?'#fff2d4':'#eaf3ec');
  text(business.name,44,106,285,15,green,true);
  text(business.address,44,132,285,9,muted);
  text(`${business.phoneDisplay}  |  ${business.email}`,44,149,310,8,muted);
  text('Invoice number',340,121,right-340,8,muted,false,'right');
  text(invoiceNumber(order),320,135,right-320,8,ink,true,'right');
  text(`Invoice date: ${date}`,340,151,right-340,8,muted,false,'right');
  line(176);

  text('BILL TO',44,195,230,8,muted,true);
  let customerY = 215;
  for (const [value, size, weight] of [[order.customerName,12,true],[order.address,9,false],[`Pincode: ${order.pincode}`,9,false],[`Phone: ${order.phone}`,9,false],...(order.email?[[order.email,9,false]]:[])]) {
    text(value,44,customerY,238,size,ink,weight);
    customerY += measure(value,238,size,weight)+6;
  }
  text('PAYMENT DETAILS',328,195,right-328,8,muted,true);
  let paymentY=215;
  for(const [label,value] of [['Order reference',order.receipt],['Payment method','Razorpay'],['Payment reference',order.razorpayPaymentId],['Paid on',date]]){
    text(label,328,paymentY,right-328,8,muted);paymentY+=14;
    text(value,328,paymentY,right-328,9,ink,true);paymentY+=measure(value,right-328,9,true)+10;
  }
  let y = Math.max(customerY,paymentY)+18;
  const tableHeader = at => {
    doc.roundedRect(44,at,width,28,5).fill(green);
    for(const [label,x,w,align] of [['#',52,20,'left'],['PLANT / PRODUCT',78,240,'left'],['QTY',328,35,'center'],['UNIT PRICE',370,75,'right'],['AMOUNT',455,right-463,'right']])text(label,x,at+9,w,7.5,'#ffffff',true,align);
    return at+28;
  };
  const continuePage = () => {
    doc.addPage(); doc.rect(0,0,doc.page.width,5).fill(green);
    text(business.name,44,35,260,13,green,true);
    text(invoiceNumber(order),300,38,right-300,8,muted,false,'right');
    return tableHeader(72);
  };
  if(y>650)y=continuePage();else y=tableHeader(y);
  order.items.forEach((item,index)=>{
    const title=clean(item.title);const variant=item.variant?`Option: ${clean(item.variant)}`:'';
    const titleHeight=measure(title,240,9.5,true), variantHeight=variant?measure(variant,240,8)+5:0;
    const height=Math.max(44,titleHeight+variantHeight+22);
    if(y+height>710)y=continuePage();
    if(index%2===0)doc.rect(44,y,width,height).fill('#f5f8f3');
    text(index+1,52,y+12,20,8,muted);
    text(title,78,y+11,240,9.5,ink,true);
    if(variant)text(variant,78,y+titleHeight+16,240,8,muted);
    text(item.qty,328,y+12,35,9,ink,false,'center');
    text(money(item.unitAmount),370,y+12,75,9,ink,false,'right');
    text(money(item.unitAmount*item.qty),455,y+12,right-463,9,ink,true,'right');
    y+=height;line(y);
  });
  if(y+160>745){doc.addPage();text(business.name,44,35,250,13,green,true);text(invoiceNumber(order),300,38,right-300,8,muted,false,'right');y=80;}
  y+=22;
  const totalsX=325,totalsW=right-totalsX;
  text('Items subtotal',totalsX,y,110,9,muted);text(money(order.subtotal),totalsX+115,y,totalsW-115,10,ink,false,'right');y+=25;
  text('Delivery',totalsX,y,110,9,muted);text(order.shipping?money(order.shipping):'FREE',totalsX+115,y,totalsW-115,10,ink,false,'right');y+=27;
  doc.roundedRect(totalsX-12,y-8,totalsW+12,38,6).fill('#eaf3e8');
  text('TOTAL PAID',totalsX,y+3,100,10,green,true);text(money(order.total),totalsX+105,y+1,totalsW-105,14,green,true,'right');
  y+=48;text('Balance due: ₹0.00',totalsX,y,totalsW,8,muted,false,'right');
  if(order.paymentMode==='test')text('This is a test-mode invoice. No real money was collected.',44,y+24,width,8,'#9b6c20');
  const range=doc.bufferedPageRange();
  for(let page=0;page<range.count;page++){
    doc.switchToPage(page);line(775);
    text(`Thank you for growing with ${business.name}.`,44,782,390,8,green,true);
    text(`${business.email}  |  ${business.phoneDisplay}`,44,798,390,7.5,muted);
    text(`${page+1} / ${range.count}`,right-55,793,55,8,muted,false,'right');
  }
  doc.end();
  return completed;
}
