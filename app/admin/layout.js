import { business } from "../../lib/business.mjs";
export const metadata = { title: { absolute: `${business.name} Admin` } };
export default function AdminLayout({ children }) {
  return <div style={{ minHeight: '100vh', background: '#fff' }}>{children}</div>;
}
