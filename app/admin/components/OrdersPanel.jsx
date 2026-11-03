"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { FiCheck, FiDownload, FiPhone, FiRefreshCw, FiShoppingBag, FiTrash2, FiX } from "react-icons/fi";
import { FaLeaf } from "react-icons/fa";
import { orderStages, orderStageIndex } from "../../../lib/order-status.mjs";
import styles from "./OrdersPanel.module.css";
const money = value => `₹${(value / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = value => new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

function OrderProgress({ stage }) {
  return <div className={styles.progressWrap}><span className={styles.progressLine} aria-hidden="true"><span style={{ width: `${stage / (orderStages.length - 1) * 100}%` }} /></span><ol className={styles.progress} aria-label="Order fulfilment progress">{orderStages.map((item,index) => <li key={item.key} className={index <= stage ? styles.reached : ''} aria-current={index === stage ? 'step' : undefined}><span className={styles.step}>{index <= stage ? <FiCheck aria-hidden="true" /> : index + 1}</span><span className={styles.stepLabel}>{item.label}</span></li>)}</ol></div>;
}

function OrderDetails({ order, close, updated, deleted }) {
  const ref = useRef(null);
  const [stage, setStage] = useState(orderStageIndex(order.fulfillmentStatus));
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const busy = saving || downloading;
  useEffect(() => { setStage(orderStageIndex(order.fulfillmentStatus)); }, [order.id,order.fulfillmentStatus]);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.body.style.overflow;
    dialog.showModal(); document.body.style.overflow='hidden';
    return () => { dialog.close(); document.body.style.overflow=previous; };
  }, []);
  const save = async () => {
    setSaving(true);setError('');setNotice('');
    try {
      const response=await fetch(`/api/admin/orders/${order.id}`, { method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({fulfillmentStatus:orderStages[stage].key}) });
      const data=await response.json();if(!response.ok)throw new Error(data.error||'Unable to update status.');
      updated(order.id,data.fulfillmentStatus);setNotice('Order status updated.');
    }catch(error){setError(error.message);}finally{setSaving(false);}
  };
  const download = async () => {
    setDownloading(true);setError('');
    try {
      const response=await fetch(`/api/admin/orders/${order.id}/invoice`,{cache:'no-store',signal:AbortSignal.timeout(30000)});
      if(!response.ok){const data=await response.json();throw new Error(data.error||'Unable to download invoice.');}
      const blob=await response.blob();const url=URL.createObjectURL(blob);const link=document.createElement('a');
      link.href=url;link.download=`INV-${order.receipt.replace(/[^A-Za-z0-9_-]/g,'')}.pdf`;
      document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch(error){setError(error.message);}finally{setDownloading(false);}
  };
  const deleteOrder = async () => {
    if (!window.confirm(`Permanently delete order #${order.receipt} for ${order.customerName}? This action cannot be undone.`)) return;
    setSaving(true); setError('');
    try {
      const response = await fetch(`/api/admin/orders/${order.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to delete order.');
      deleted(order.id);
      close();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };
  return <dialog ref={ref} className={styles.modal} aria-labelledby="order-detail-title" onCancel={event=>{event.preventDefault();if(!busy)close();}} onClick={event=>{if(event.target===event.currentTarget&&!busy)close();}}>
    <header className={styles.modalHeader}><div><span>ORDER DETAILS</span><h2 id="order-detail-title">#{order.receipt}</h2></div><button type="button" aria-label="Close order details" onClick={close} disabled={busy}><FiX /></button></header>
    <div className={styles.modalBody}>
      <div className={styles.detailSummary}><div><strong>{money(order.total)}</strong><span>Paid on {date(order.paidAt)}</span></div><div className={styles.paid}>Payment confirmed{order.paymentMode==='test'&&<em>Test payment</em>}</div></div>
      <section className={styles.statusPanel}><div className={styles.statusHeading}><h3>Order status</h3><span className={styles.badge}>{orderStages[stage].badge}</span></div><OrderProgress stage={stage} /><label className={styles.sliderLabel} htmlFor="order-status-slider">Slide to choose a fulfilment stage</label><input id="order-status-slider" className={styles.slider} type="range" min={0} max={orderStages.length-1} step={1} value={stage} aria-valuetext={orderStages[stage].label} disabled={busy} onChange={event=>{setStage(Number(event.target.value));setNotice('');}} /><button type="button" className={styles.save} onClick={save} disabled={busy||stage===orderStageIndex(order.fulfillmentStatus)}>{saving?'Saving…':'Save order status'}</button></section>
      {error&&<p role="alert" className={styles.error}>{error}</p>}{notice&&<p role="status" className={styles.notice}>{notice}</p>}
      <div className={styles.detailColumns}><section><h3>Customer & delivery</h3><strong>{order.customerName}</strong><p>{order.phone}{order.email&&<><br/>{order.email}</>}</p><p>{order.address}<br/>Pincode: {order.pincode}</p></section><section><h3>Payment details</h3><p><span>Method</span>Razorpay</p><p><span>Payment reference</span>{order.razorpayPaymentId}</p><p><span>Gateway order reference</span>{order.razorpayOrderId}</p><p><span>Placed</span>{date(order.createdAt||order.paidAt)}</p></section></div>
      <section className={styles.fullItems}><h3>Order items</h3>{order.items.map((item,index)=><div key={JSON.stringify([item.slug,item.variant,index])}><div><strong>{item.title}</strong>{item.variant&&<span>{item.variant}</span>}<span>Qty: {item.qty} · {money(item.unitAmount)} each</span></div><strong>{money(item.unitAmount*item.qty)}</strong></div>)}</section>
      <div className={styles.totals}><p><span>Items subtotal</span><strong>{money(order.subtotal)}</strong></p><p><span>Delivery</span><strong>{order.shipping?money(order.shipping):'FREE'}</strong></p><p><span>Total paid</span><strong>{money(order.total)}</strong></p></div>
      <button type="button" className={styles.download} disabled={busy} onClick={download}><FiDownload aria-hidden="true" />{downloading?'Preparing invoice…':'Download invoice PDF'}</button>
      <button type="button" className={styles.deleteOrder} disabled={busy} onClick={deleteOrder}><FiTrash2 aria-hidden="true" />{order.fulfillmentStatus === 'Delivered' ? 'Delete completed order' : 'Delete order'}</button>
    </div>
  </dialog>;
}

export default function OrdersPanel({ active }) {
  const [orders,setOrders]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [needsLogin,setNeedsLogin]=useState(false);
  const [selectedId,setSelectedId]=useState(null);
  const trigger=useRef(null);
  const load=useCallback(async signal=>{
    try{const response=await fetch('/api/admin/orders',{cache:'no-store',signal});const data=await response.json();if(response.status===401)setNeedsLogin(true);if(!response.ok||!Array.isArray(data))throw new Error(data.error||'Unable to load orders.');setOrders(data);setError('');setNeedsLogin(false);}
    catch(error){if(error.name!=='AbortError')setError(error.message);}
    finally{if(!signal?.aborted)setLoading(false);}
  },[]);
  useEffect(()=>{if(!active){setSelectedId(null);return;}const controller=new AbortController();load(controller.signal);const refresh=()=>load(controller.signal);const timer=setInterval(refresh,15000);window.addEventListener('focus',refresh);return()=>{controller.abort();clearInterval(timer);window.removeEventListener('focus',refresh);};},[active,load]);
  const close=()=>{setSelectedId(null);trigger.current?.focus();};
  const selected=orders.find(order=>order.id===selectedId);
  return <div>
    <div className={styles.toolbar}><p>Paid orders and their fulfilment progress.</p><button type="button" onClick={()=>load()} aria-label="Refresh paid orders"><FiRefreshCw aria-hidden="true" />Refresh</button></div>
    {loading?<p className={styles.empty} role="status">Loading paid orders…</p>:error?<div className={styles.empty}><p role="alert">{error}</p>{needsLogin&&<Link href="/admin/login">Sign in again</Link>}</div>:!orders.length?<div className={styles.empty}><FiShoppingBag aria-hidden="true" /><h2>No paid orders yet</h2><p>Orders appear here after payment is confirmed.</p></div>:<><p className={styles.count}>{orders.length} paid {orders.length===1?'order':'orders'}</p><div className={styles.list}>{orders.map(order=>{const stage=orderStageIndex(order.fulfillmentStatus);const initials=order.customerName.trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase();return <article key={order.id} className={styles.card}>
      <button type="button" className={styles.cardOpen} aria-label={`View order ${order.receipt} for ${order.customerName}`} aria-haspopup="dialog" onClick={event=>{trigger.current=event.currentTarget;setSelectedId(order.id);}} />
      <div className={styles.cardHeader}>
        <div><strong title={order.receipt}>#{order.receipt}</strong><span>{date(order.paidAt)}</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <strong>{money(order.total)}</strong>
          {order.fulfillmentStatus === 'Delivered' && (
            <button
              type="button"
              className={styles.cardDelete}
              title="Delete completed order"
              aria-label={`Delete order ${order.receipt}`}
              onClick={event => {
                event.stopPropagation();
                if (window.confirm(`Delete completed order #${order.receipt}?`)) {
                  fetch(`/api/admin/orders/${order.id}`, { method: 'DELETE' })
                    .then(r => r.json())
                    .then(data => {
                      if (data.success) setOrders(current => current.filter(o => o.id !== order.id));
                    });
                }
              }}
            >
              <FiTrash2 aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      <div className={styles.buyer}><span className={styles.avatar}>{initials}</span><div><strong>{order.customerName}</strong><span><FiPhone aria-hidden="true" />{order.phone}</span></div>{order.paymentMode==='test'&&<em>Test</em>}</div>
      <div className={styles.preview}><h3>ORDER ITEMS:</h3>{order.items.slice(0,2).map((item,index)=><p key={index}><FaLeaf aria-hidden="true" /><span>{item.title} (Qty: {item.qty}, {money(item.unitAmount)} each)</span></p>)}{order.items.length>2&&<span className={styles.more}>+{order.items.length-2} more items</span>}</div>
      <div className={styles.statusHeading}><h3>ORDER STATUS</h3><span className={styles.badge}><i aria-hidden="true" />{orderStages[stage].badge}</span></div>
      <OrderProgress stage={stage} />
    </article>;})}</div></>}
    {selected&&<OrderDetails key={selected.id} order={selected} close={close} updated={(id,fulfillmentStatus)=>setOrders(current=>current.map(order=>order.id===id?{...order,fulfillmentStatus}:order))} deleted={id=>setOrders(current=>current.filter(order=>order.id!==id))} />}
  </div>;
}
