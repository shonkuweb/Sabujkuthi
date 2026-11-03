export const business = Object.freeze({
  name: 'SabujKuthi Nursery',
  shortName: 'SabujKuthi',
  logo: '/images/sabujkuthi-logo.png',
  logoCdn: 'https://pub-ce8688bc6c654bcfb99716f7c9373bcd.r2.dev/SabujKuthi/assets/sabujkuthi-logo.png',
  footerLogo: '/images/sabujkuthi-footer-logo.png',
  footerLogoCdn: 'https://pub-ce8688bc6c654bcfb99716f7c9373bcd.r2.dev/SabujKuthi/assets/sabujkuthi-footer-logo.png',
  phone: '+918637054105',
  phoneDisplay: '+91 86370 54105',
  whatsapp: '918637054105',
  email: 'sabujkuthi@gmail.com',
  address: 'Nayabasat, West Bengal 721253, India',
  locality: 'Nayabasat',
  region: 'West Bengal',
  postalCode: '721253',
  country: 'India',
});
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
export const whatsappUrl = message => `https://wa.me/${business.whatsapp}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
