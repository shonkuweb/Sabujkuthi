let loading;
export function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    const timer = setTimeout(() => fail(), 15000);
    const fail = () => { clearTimeout(timer); script.remove(); loading = undefined; reject(new Error('Unable to load Razorpay. Check your connection and try again.')); };
    script.onerror = fail;
    script.onload = () => { clearTimeout(timer); if (window.Razorpay) resolve(window.Razorpay); else fail(); };
    document.head.appendChild(script);
  });
  return loading;
}
export async function checkoutPost(path, data) {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), cache: 'no-store' });
  const result = await response.json().catch(() => ({ error: 'Payment confirmation is unavailable. Please check the payment status before retrying.' }));
  if (!response.ok) {
    const error = new Error(result.error || 'Unable to complete checkout.');
    error.status = response.status;
    error.code = result.code;
    throw error;
  }
  return result;
}
